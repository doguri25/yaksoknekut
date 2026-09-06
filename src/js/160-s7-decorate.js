  /* ===================== S7 꾸미기 ===================== */
  const dcv = $('#decor-canvas'), stool = $('#stool'), drawer = $('#drawer');
  let base = null, selected = null, decorHistory = [], decorLimit = T.decorate, activeCat = 'heart';
  let cW = 0, cH = 0, bounds = null;
  const PAPER_BOUNDS = { x0: .03, y0: .045, x1: .97, y1: .955 };   // 스티커는 포토용지 전체(액자 포함)에 붙일 수 있음
  function rebuildBase() {
    base = document.createElement('canvas'); base.width = cW; base.height = cH; compose(base, { bg: S.paperBg, promiseText: S.promiseText, promiseInk: S.promiseInk });
  }
  ENTER.s7 = () => {
    fitCanvas(dcv); cW = dcv.width; cH = dcv.height;
    rebuildBase();
    bounds = PAPER_BOUNDS; selected = null; hideDel();
    renderDecor(); renderDrawer();
    if (decorLimit === T.decorate) speak(VOICE.decorate);
    const bar = $('#bar'); const start = Date.now(); bar.style.width = '100%';
    every(() => {
      const p = 1 - (Date.now() - start) / (decorLimit * 1000);
      bar.style.width = Math.max(0, p * 100) + '%';
      if (p <= 0) { chime(); go('s8'); }
    }, 250);
  };
  function renderDecor() {
    const ctx = dcv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cW, cH);
    if (base) ctx.drawImage(base, 0, 0);
    ctx.save(); ctx.scale(cW / PW, cW / PW);
    S.stickers.forEach(st => drawSticker(ctx, st));
    if (selected) {
      ctx.save(); ctx.translate(selected.x * PW, selected.y * PH);
      ctx.strokeStyle = 'rgba(255,122,89,.9)'; ctx.lineWidth = 6; ctx.setLineDash([18, 12]);
      ctx.beginPath(); ctx.arc(0, 0, selected.sz * selected.scale * PW * .62, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  /* ---------- 약속 손글씨 — 판에 쓴 획을 액자 약속 칸 좌표로 저장해 인쇄 때 그려 넣음 ---------- */
  const INK_W = 18;   // 획 굵기 (1800×1200 기준)
  const ink = { color: '#E2603F', box: null, k: 1, cur: null, strokes: [] };
  const inkPad = $('#ink-pad'), inkCtx = inkPad.getContext('2d');
  function inkDrawStroke(ctx, s, k) {
    if (!s.pts.length) return; ctx.strokeStyle = s.color; ctx.lineWidth = INK_W * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    const p0 = s.pts[0]; ctx.moveTo(p0.x * k, p0.y * k);
    if (s.pts.length === 1) ctx.lineTo(p0.x * k + .1, p0.y * k);
    for (let i = 1; i < s.pts.length - 1; i++) { const a = s.pts[i], b = s.pts[i + 1]; ctx.quadraticCurveTo(a.x * k, a.y * k, (a.x + b.x) / 2 * k, (a.y + b.y) / 2 * k); }
    if (s.pts.length > 1) { const l = s.pts[s.pts.length - 1]; ctx.lineTo(l.x * k, l.y * k); }
    ctx.stroke();
  }
  function inkRedraw() {
    const bx = ink.box, k = ink.k, W = inkPad.width, H = inkPad.height; inkCtx.clearRect(0, 0, W, H);
    inkCtx.strokeStyle = 'rgba(39,64,58,.28)'; inkCtx.lineWidth = 3 * k; inkCtx.setLineDash([16 * k, 14 * k]);
    const gap = (bx.bottom - bx.top) / bx.lines;
    for (let i = 1; i <= bx.lines; i++) { const y = (bx.top + gap * i) * k; inkCtx.beginPath(); inkCtx.moveTo(10 * k, y); inkCtx.lineTo(W - 10 * k, y); inkCtx.stroke(); }
    inkCtx.setLineDash([]);
    ink.strokes.forEach(s => inkDrawStroke(inkCtx, s, k));
  }
  function openInk() {
    if (!S.frame || !S.frame.promise) return;
    ink.box = inkBox(S.frame.promise); ink.strokes = (S.inkStrokes || []).map(s => ({ color: s.color, pts: s.pts.slice() }));
    const maxW = 1120, maxH = 540; let w = maxW, h = w * ink.box.h / ink.box.w; if (h > maxH) { h = maxH; w = h * ink.box.w / ink.box.h; }
    inkPad.style.width = Math.round(w) + 'px'; inkPad.style.height = Math.round(h) + 'px';
    inkPad.width = Math.round(w * 2); inkPad.height = Math.round(h * 2); ink.k = inkPad.width / ink.box.w;
    $$('#ink .ink-colors button').forEach(b => b.classList.toggle('on', b.dataset.ink === ink.color));
    inkRedraw(); $('#ink').classList.add('on');
  }
  function closeInk() { $('#ink').classList.remove('on'); ink.cur = null; }
  const inkPos = e => { const r = inkPad.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) / r.width * ink.box.w), y: Math.round((e.clientY - r.top) / r.height * ink.box.h) }; };
  inkPad.addEventListener('pointerdown', e => { e.preventDefault(); inkPad.setPointerCapture(e.pointerId); ink.cur = { color: ink.color, pts: [inkPos(e)] }; ink.strokes.push(ink.cur); inkRedraw(); });
  inkPad.addEventListener('pointermove', e => { if (!ink.cur) return; const p = inkPos(e), l = ink.cur.pts[ink.cur.pts.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) < 3) return; ink.cur.pts.push(p); inkRedraw(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => inkPad.addEventListener(ev, () => { ink.cur = null; }));
  $$('#ink .ink-colors button').forEach(b => b.addEventListener('click', () => { pop(); ink.color = b.dataset.ink; $$('#ink .ink-colors button').forEach(x => x.classList.toggle('on', x === b)); }));
  $('#ink-undo').addEventListener('click', () => { pop(); ink.strokes.pop(); inkRedraw(); });
  $('#ink-clear').addEventListener('click', () => { pop(); ink.strokes = []; inkRedraw(); });
  $('#ink-cancel').addEventListener('click', () => { pop(); closeInk(); });
  $('#ink-ok').addEventListener('click', () => {
    pop(); const has = ink.strokes.some(s => s.pts.length);
    if (!has) { S.promiseInk = null; S.inkStrokes = []; }
    else {   // 액자 약속 칸 크기의 그림으로 굽기
      const c = document.createElement('canvas'); c.width = ink.box.w; c.height = ink.box.h; const cx = c.getContext('2d');
      ink.strokes.forEach(s => inkDrawStroke(cx, s, 1)); S.promiseInk = c; S.inkStrokes = ink.strokes.map(s => ({ color: s.color, pts: s.pts.slice() })); S.promiseText = '';
      buddySay('promise');
    }
    closeInk(); rebuildBase(); renderDecor(); renderDrawer();
  });
  function renderDrawer() {
    const cats = STICKER_CATS.filter(catOn);
    if (!cats.find(c => c.id === activeCat)) activeCat = cats.length ? cats[0].id : null;
    $('#tabs').innerHTML = cats.map(c => `<button class="tab${c.id === activeCat ? ' on' : ''}" data-cat="${c.id}">${c.name}</button>`).join('');
    $$('#tabs .tab').forEach(t => t.addEventListener('click', () => { pop(); activeCat = t.dataset.cat; renderDrawer(); }));
    const grid = $('#sgrid'); grid.innerHTML = '';
    if (activeCat === 'promise') {
      const list = promisesFor(S.frame.set || 'promise');
      grid.style.gridTemplateColumns = '1fr 1fr'; grid.style.gridTemplateRows = 'none'; grid.style.gridAutoRows = 'auto'; grid.style.alignContent = 'start'; grid.classList.add('plist');
      const mk = (t, on) => { const b = document.createElement('button'); b.className = 'pbtn' + (on ? ' on' : ''); b.textContent = t || '나중에 펜으로 쓸게요'; if (!t) b.classList.add('empty');
        b.addEventListener('click', () => { pop(); S.promiseText = t || ''; S.promiseInk = null; S.inkStrokes = []; rebuildBase(); renderDecor(); renderDrawer(); if (t) buddySay('promise'); }); return b; };
      const ib = document.createElement('button'); ib.className = 'pbtn ink' + (S.promiseInk ? ' on' : ''); ib.innerHTML = S.promiseInk ? '✎ 손글씨 다시 쓰기' : '✎ 손글씨로 쓸래요'; ib.addEventListener('click', () => { pop(); openInk(); });
      grid.appendChild(ib); grid.appendChild(mk('', !S.promiseText && !S.promiseInk)); list.forEach(t => grid.appendChild(mk(t, S.promiseText === t)));
      $('#full-note').textContent = S.promiseInk ? '손으로 쓴 약속이 약속 칸에 인쇄돼요' : '고른 문장이 약속 칸에 인쇄돼요 · 손가락으로 직접 써도 돼요'; $('#full-note').style.color = '';
      return;
    }
    grid.style.gridTemplateColumns = ''; grid.style.gridTemplateRows = ''; grid.style.gridAutoRows = ''; grid.style.alignContent = ''; grid.classList.remove('plist');
    if (activeCat === 'paper') {
      const colors = [S.frame.bg].concat(PAPER_COLORS.filter(c => c.toLowerCase() !== S.frame.bg.toLowerCase()));
      colors.forEach((col, i) => {
        const b = document.createElement('button'); b.className = 'cbtn' + ((S.paperBg || S.frame.bg) === col ? ' on' : '');
        b.style.background = col; b.setAttribute('aria-label', i === 0 ? '원래 색' : '액자색 ' + i);
        if (i === 0) b.innerHTML = `<span style="font:20px Jua,sans-serif;color:${isLight(col) ? '#27403A' : '#fff'}">원래</span>`;
        b.addEventListener('click', () => { pop(); S.paperBg = i === 0 ? null : col; rebuildBase(); renderDecor(); $$('#sgrid .cbtn').forEach(x => x.classList.toggle('on', x === b)); if (i) buddySay('paper'); });
        grid.appendChild(b);
      });
      $('#full-note').textContent = '액자 바탕색을 골라요';
      return;
    }
    STICKERS.filter(s => s.cat === activeCat && stickerOn(s)).forEach(def => {
      const b = document.createElement('button'); b.className = 'sbtn'; b.setAttribute('aria-label', def.text || def.id);
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const ctx = c.getContext('2d'); ctx.translate(80, 80); drawStickerDef(ctx, def, 128);
      b.appendChild(c); b.addEventListener('click', () => addSticker(def.id)); grid.appendChild(b);
    });
    $('#full-note').textContent = '스티커를 누르면 크기·회전 버튼이 나와요'; $('#full-note').style.color = '';
  }
  function pushHistory() { decorHistory.push(JSON.stringify(S.stickers)); if (decorHistory.length > 30) decorHistory.shift(); }
  function addSticker(id) {
    if (S.stickers.length >= MAX_STICKERS) {
      drawer.classList.remove('shake'); void drawer.offsetWidth; drawer.classList.add('shake');
      $('#full-note').textContent = '스티커는 12개까지만 붙일 수 있어요'; $('#full-note').style.color = 'var(--coral)'; tone(220, .2, 'square', .1); return;
    }
    pop(); pushHistory();
    const fb = frameBounds(S.frame);   // 처음엔 사진 영역 가운데에 붙고, 이후 액자 어디로든 옮길 수 있음
    const st = { id, x: (fb.x0 + fb.x1) / 2 + (Math.random() - .5) * .06, y: (fb.y0 + fb.y1) / 2 + (Math.random() - .5) * .08, sz: .14, scale: 1, rot: (Math.random() - .5) * .35 };
    S.stickers.push(st); selected = st; renderDecor(); showDel(); buddySay('sticker');
  }
  $('#btn-undo').addEventListener('click', () => { pop(); if (decorHistory.length) { S.stickers = JSON.parse(decorHistory.pop()); selected = null; hideDel(); renderDecor(); } });
  $('#btn-clear').addEventListener('click', () => { pop(); if (S.stickers.length) { pushHistory(); S.stickers = []; selected = null; hideDel(); renderDecor(); buddySay('clear'); } });
  $('#btn-decor-ok').addEventListener('click', () => { chime(); go('s8'); });
  // 스티커 도구 (선택한 스티커 아래에 뜸)
  stool.addEventListener('pointerdown', e => e.stopPropagation());
  stool.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if (!selected) return; const op = b.dataset.op; pop(); pushHistory();
    if (op === 'grow') selected.scale = clamp(selected.scale * 1.18, minScale(), 3.2);
    else if (op === 'shrink') selected.scale = clamp(selected.scale / 1.18, minScale(), 3.2);
    else if (op === 'rotl') selected.rot -= Math.PI / 12;
    else if (op === 'rotr') selected.rot += Math.PI / 12;
    else if (op === 'del') { S.stickers = S.stickers.filter(s => s !== selected); selected = null; }
    renderDecor(); if (selected) showDel(); else hideDel();
  }));
  function showDel() {
    if (!selected) return; const r = dcv.getBoundingClientRect(), sc = appScale();
    const W = r.width / sc, H = r.height / sc;   // 화면 배율을 뺀 앱 좌표
    const half = selected.sz * selected.scale * W * .62, tw = 370, th = 82;
    let ty = selected.y * H + half + 12;
    if (ty + th > H - 6) ty = selected.y * H - half - th - 12;
    if (ty < 6) ty = 6;
    stool.style.left = clamp(selected.x * W, tw / 2 + 4, W - tw / 2 - 4) + 'px';
    stool.style.top = ty + 'px';
    stool.classList.add('on');
  }
  function hideDel() { stool.classList.remove('on'); }

  // 포인터: 탭=선택, 드래그=이동, 두 손가락=크기·회전, 길게=지우기
  const ptrs = new Map(); let drag = null, pinch = null, lpT = null, moved = false, before = null;
  const toUnit = e => { const r = dcv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, px: e.clientX, py: e.clientY }; };
  function hitTest(p) {
    for (let i = S.stickers.length - 1; i >= 0; i--) {
      const st = S.stickers[i]; const rad = st.sz * st.scale * .62;
      const dx = (p.x - st.x), dy = (p.y - st.y) * (PH / PW);
      if (dx * dx + dy * dy <= rad * rad) return st;
    }
    return null;
  }
  const minScale = () => (80 * DPR) / (.14 * cW);
  dcv.addEventListener('pointerdown', e => {
    e.preventDefault(); dcv.setPointerCapture(e.pointerId);
    const p = toUnit(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      const hit = hitTest(p); moved = false; hideDel();
      if (hit) {
        selected = hit; S.stickers.splice(S.stickers.indexOf(hit), 1); S.stickers.push(hit);
        drag = { dx: hit.x - p.x, dy: hit.y - p.y, x0: p.x, y0: p.y }; before = JSON.stringify(S.stickers);
        clearTimeout(lpT); lpT = setTimeout(() => { if (!moved) showDel(); }, 500);
      } else { selected = null; drag = null; }
      renderDecor();
    } else if (ptrs.size === 2 && selected) {
      clearTimeout(lpT); const [a, b] = [...ptrs.values()];
      pinch = { d0: Math.hypot(a.px - b.px, a.py - b.py), a0: Math.atan2(b.py - a.py, b.px - a.px), s0: selected.scale, r0: selected.rot };
      if (!before) before = JSON.stringify(S.stickers);
    }
  });
  dcv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; const p = toUnit(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 2 && pinch && selected) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.px - b.px, a.py - b.py), ang = Math.atan2(b.py - a.py, b.px - a.px);
      selected.scale = clamp(pinch.s0 * d / pinch.d0, minScale(), 3.2); selected.rot = pinch.r0 + (ang - pinch.a0); moved = true; renderDecor();
    } else if (ptrs.size === 1 && drag && selected) {
      if (!moved && Math.hypot(p.x - drag.x0, p.y - drag.y0) > .012) moved = true;
      if (moved) clearTimeout(lpT); else return;
      selected.x = clamp(p.x + drag.dx, bounds.x0, bounds.x1); selected.y = clamp(p.y + drag.dy, bounds.y0, bounds.y1); renderDecor();
    }
  });
  const endPtr = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) { clearTimeout(lpT); if (before && moved) { decorHistory.push(before); if (decorHistory.length > 30) decorHistory.shift(); } before = null; drag = null; if (selected) showDel(); }
  };
  dcv.addEventListener('pointerup', endPtr); dcv.addEventListener('pointercancel', endPtr);

