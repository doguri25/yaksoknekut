  /* ===================== 캔버스 도우미 ===================== */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  const FONT = px => `${px}px "Jua", "Gowun Dodum", "Noto Sans KR", sans-serif`;
  function isLight(hex) { const n = parseInt(String(hex).replace('#', ''), 16); if (isNaN(n)) return true; const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (r * .299 + g * .587 + b * .114) > 140; }

  function drawCover(ctx, img, sl) {
    const iw = img.width, ih = img.height; if (!iw || !ih) return;
    const r = sl.w / sl.h; let sw = iw, sh = iw / r;
    if (sh > ih) { sh = ih; sw = ih * r; }
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, sl.x, sl.y, sl.w, sl.h);
  }
  const PASTELS = [['#FFDCC8', '#FFB99A'], ['#BFEBDC', '#8ED9C1'], ['#E6DEFF', '#C3B4FF'], ['#D3EAFF', '#9FCBFF']];
  function paintPlaceholder(ctx, x, y, w, h, i) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    const p = PASTELS[i % PASTELS.length]; g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h * .55, r = Math.min(w, h) * .26;
    ctx.fillStyle = '#FFF3E6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27403A';
    ctx.beginPath(); ctx.arc(cx - r * .35, cy - r * .15, r * .1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * .35, cy - r * .15, r * .1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#27403A'; ctx.lineWidth = r * .09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + r * .1, r * .45, Math.PI * .15, Math.PI * .85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,170,.6)';
    ctx.beginPath(); ctx.arc(cx - r * .6, cy + r * .15, r * .14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * .6, cy + r * .15, r * .14, 0, Math.PI * 2); ctx.fill();
  }
  function placeholderShot(i) {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200;
    paintPlaceholder(c.getContext('2d'), 0, 0, 1600, 1200, i);
    return c;
  }
  const filterDef = id => FILTERS.find(x => x.id === id) || FILTERS[0];
  const extraBright = print => 1 + settings.brightness * 0.06 + (print ? 0.05 : 0);
  function filterCss(id, print) {
    const p = filterDef(id).p, parts = [];
    if (p.grayscale) parts.push(`grayscale(${p.grayscale})`);
    if (p.sepia) parts.push(`sepia(${p.sepia})`);
    if (p.saturate) parts.push(`saturate(${p.saturate})`);
    if (p.contrast) parts.push(`contrast(${p.contrast})`);
    const b = (p.brightness || 1) * extraBright(print);
    if (Math.abs(b - 1) > 0.001) parts.push(`brightness(${b.toFixed(2)})`);
    return parts.length ? parts.join(' ') : 'none';
  }
  // 캔버스 필터가 실제로 적용되는 브라우저인지 확인 (빨강을 흑백으로 만들어 봄)
  const FILTER_OK = (() => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 2; const x = c.getContext('2d');
      if (!('filter' in x)) return false; x.filter = 'grayscale(1)'; if (x.filter !== 'grayscale(1)') return false;
      x.fillStyle = '#f00'; x.fillRect(0, 0, 2, 2); const d = x.getImageData(0, 0, 1, 1).data; return Math.abs(d[0] - d[1]) < 40;
    } catch (e) { return false; }
  })();
  function applyPixelFilter(canvas, id, print) {
    const p = filterDef(id).p, b = (p.brightness || 1) * extraBright(print);
    if (!Object.keys(p).length && Math.abs(b - 1) < .001) return;
    const ctx = canvas.getContext('2d'), img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    const g = p.grayscale || 0, sp = p.sepia || 0, sa = p.saturate == null ? 1 : p.saturate, ct = p.contrast == null ? 1 : p.contrast;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], gg = d[i + 1], bb = d[i + 2];
      if (g) { const l = .2126 * r + .7152 * gg + .0722 * bb; r += (l - r) * g; gg += (l - gg) * g; bb += (l - bb) * g; }
      if (sp) { const r2 = r * (1 - .607 * sp) + gg * .769 * sp + bb * .189 * sp, g2 = r * .349 * sp + gg * (1 - .314 * sp) + bb * .168 * sp, b2 = r * .272 * sp + gg * .534 * sp + bb * (1 - .869 * sp); r = r2; gg = g2; bb = b2; }
      if (sa !== 1) { const r2 = (.213 + .787 * sa) * r + (.715 - .715 * sa) * gg + (.072 - .072 * sa) * bb, g2 = (.213 - .213 * sa) * r + (.715 + .285 * sa) * gg + (.072 - .072 * sa) * bb, b2 = (.213 - .213 * sa) * r + (.715 - .715 * sa) * gg + (.072 + .928 * sa) * bb; r = r2; gg = g2; bb = b2; }
      if (ct !== 1) { r = (r - 128) * ct + 128; gg = (gg - 128) * ct + 128; bb = (bb - 128) * ct + 128; }
      if (b !== 1) { r *= b; gg *= b; bb *= b; }
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg; d[i + 2] = bb < 0 ? 0 : bb > 255 ? 255 : bb;
    }
    ctx.putImageData(img, 0, 0);
  }
  const shotCache = new WeakMap();
  function filteredShot(shot, id, print) {   // 필터 미지원 브라우저용: 축소 복사본에 픽셀 필터를 적용해 캐시
    const key = id + (print ? '/p' : '') + '/' + settings.brightness;
    let m = shotCache.get(shot); if (!m) { m = {}; shotCache.set(shot, m); }
    if (m[key]) return m[key];
    const sc = Math.min(1, 1200 / shot.width), c = document.createElement('canvas');
    c.width = Math.round(shot.width * sc); c.height = Math.round(shot.height * sc);
    c.getContext('2d').drawImage(shot, 0, 0, c.width, c.height); applyPixelFilter(c, id, print);
    m[key] = c; return c;
  }
  function drawFiltered(ctx, shot, sl, id, print) {
    if (FILTER_OK) { ctx.filter = filterCss(id, print); drawCover(ctx, shot, sl); ctx.filter = 'none'; }
    else drawCover(ctx, filteredShot(shot, id, print), sl);
    if (print && settings.printSharpen !== false) sharpenRect(ctx, sl);   // 사진 품질 › 인쇄용 선명하게 (인화하면 살짝 뭉개지는 것을 미리 보정)
  }
  // 약한 언샵 마스크 — 사진 칸 영역만 (원본 + 0.45×(원본 − 3×3 흐림))
  function sharpenRect(ctx, sl) {
    const m = ctx.getTransform(), x0 = Math.round(m.a * sl.x + m.e), y0 = Math.round(m.d * sl.y + m.f), w = Math.round(m.a * sl.w), h = Math.round(m.d * sl.h);
    if (w < 8 || h < 8) return;
    let img; try { img = ctx.getImageData(x0, y0, w, h); } catch (e) { return; }
    // 3×3 흐림을 가로 합(3) → 세로 합(3)으로 나눠 계산 — 픽셀마다 9번 읽던 것을 6번으로 (결과는 같음)
    const s = img.data, o = new Uint8ClampedArray(s), amt = .45, W4 = w * 4;
    const hs = new Uint16Array(s.length);   // 가로 3픽셀 합 (채널별)
    for (let y = 0; y < h; y++) {
      const row = y * W4;
      for (let x = 1; x < w - 1; x++) { const i = row + x * 4; hs[i] = s[i - 4] + s[i] + s[i + 4]; hs[i + 1] = s[i - 3] + s[i + 1] + s[i + 5]; hs[i + 2] = s[i - 2] + s[i + 2] + s[i + 6]; }
    }
    for (let y = 1; y < h - 1; y++) {
      const row = y * W4;
      for (let x = 1; x < w - 1; x++) {
        const i = row + x * 4, up = i - W4, dn = i + W4;
        let v = s[i]; o[i] = v + amt * (v - (hs[up] + hs[i] + hs[dn]) / 9);
        v = s[i + 1]; o[i + 1] = v + amt * (v - (hs[up + 1] + hs[i + 1] + hs[dn + 1]) / 9);
        v = s[i + 2]; o[i + 2] = v + amt * (v - (hs[up + 2] + hs[i + 2] + hs[dn + 2]) / 9);
      }
    }
    img.data.set(o); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.putImageData(img, x0, y0); ctx.restore();
  }

  /* ---------- 액자 장식 ---------- */
  const DECOR = {
    dots(ctx) {
      ctx.fillStyle = 'rgba(126,214,190,.35)';
      for (let y = 30; y < PH; y += 60) for (let x = 30 + ((y / 60) % 2) * 30; x < PW; x += 60) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    },
    film(ctx, frame, bg) {
      ctx.fillStyle = isLight(bg || frame.bg) ? 'rgba(39,64,58,.22)' : '#F4F1E8';
      for (let x = 60; x < PW - 60; x += 110) { rr(ctx, x, 28, 60, 44, 10); ctx.fill(); rr(ctx, x, 1128, 60, 44, 10); ctx.fill(); }
    },
    ribbon(ctx) {
      DECOR.dots(ctx);
      ctx.save(); ctx.translate(1580, 1010); ctx.strokeStyle = '#FFD54A'; ctx.lineWidth = 34; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-70, 110); ctx.lineTo(-10, -60); ctx.bezierCurveTo(10, -120, 70, -100, 60, -50); ctx.lineTo(0, 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(70, 110); ctx.lineTo(10, -60); ctx.stroke();
      ctx.restore();
    },
    bubbles(ctx, frame) {
      const b = (x, y, w, t, flip) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#FF7A59'; ctx.lineWidth = 6;
        rr(ctx, x, y, w, 96, 48); ctx.fill(); ctx.stroke();
        ctx.beginPath(); const tx = flip ? x + w - 120 : x + 120;
        ctx.moveTo(tx - 22, y + 94); ctx.lineTo(tx + 22, y + 94); ctx.lineTo(tx + (flip ? 30 : -30), y + 132); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#FF7A59'; ctx.beginPath(); ctx.moveTo(tx - 22, y + 94); ctx.lineTo(tx + (flip ? 30 : -30), y + 132); ctx.lineTo(tx + 22, y + 94); ctx.stroke();
        ctx.fillStyle = '#27403A'; ctx.font = FONT(54); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + w / 2, y + 50);
      };
      const t = (arguments[1] && arguments[1].bubbles) || ['고마워!', '같이 놀자!']; b(170, 26, 420, t[0], false); b(1210, 26, 420, t[1], true);
      ctx.fillStyle = 'rgba(255,122,89,.18)';
      [[60, 700], [1740, 120], [900, 40], [30, 1150], [1770, 1150]].forEach(([x, y]) => { ctx.save(); ctx.translate(x, y); heartPath(ctx, 60); ctx.fill(); ctx.restore(); });
    },
    moon(ctx) {   // 밤하늘: 보름달 + 작은 별
      ctx.save(); ctx.fillStyle = '#FFE066'; ctx.shadowColor = 'rgba(255,224,102,.6)'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(1700, 105, 62, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      [[80, 50, 4], [300, 30, 3], [600, 45, 5], [900, 25, 3], [1250, 40, 4], [1500, 60, 3], [40, 600, 3], [1760, 640, 4], [200, 1150, 3], [1000, 1165, 4], [1550, 1160, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
    },
    leaves(ctx) {   // 가을 잎 (은행·단풍 색)
      const cols = ['#E8A33C', '#D97A3C', '#C9B24A', '#C95E3C'];
      [[60, 50, .4], [1740, 60, -.6], [40, 1150, .9], [1750, 1140, -1.1], [900, 30, .2], [900, 1170, 2.9], [30, 600, 1.4], [1770, 600, -1.4]].forEach(([x, y, a], i) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = .55; ctx.fillStyle = cols[i % 4];
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.bezierCurveTo(30, -20, 30, 20, 0, 34); ctx.bezierCurveTo(-30, 20, -30, -20, 0, -34); ctx.fill();
        ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 26); ctx.stroke(); ctx.restore();
      });
    },
    books(ctx) {   // 귀퉁이에 작은 책 더미
      const stack = (x, y, flip) => { ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.globalAlpha = .75;
        [['#6FB8FF', 0], ['#FF9ECF', -26], ['#FFD93D', -52]].forEach(([c, dy], i) => { ctx.fillStyle = c; rr(ctx, -60 + i * 6, dy, 120 - i * 8, 24, 5); ctx.fill(); ctx.strokeStyle = 'rgba(39,64,58,.35)'; ctx.lineWidth = 3; ctx.stroke(); });
        ctx.restore(); };
      stack(110, 1120, false); stack(1690, 1120, true);
      ctx.fillStyle = 'rgba(63,107,79,.18)'; [[60, 60], [1740, 60], [900, 40]].forEach(([x, y], i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(i * .7); starPath(ctx, 4, 22, 8); ctx.fill(); ctx.restore(); });
    },
    snow(ctx, frame, bg) {   // 눈송이 — 어두운 바탕은 흰색, 밝은 바탕은 하늘색
      const light = isLight(bg || frame.bg);
      let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < 64; i++) {
        const x = rnd() * PW, y = rnd() * PH, r = 4 + rnd() * 6;
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = light ? .7 : .35 + rnd() * .5;
        if (i % 4 === 0) {   // 여섯 갈래 눈 결정
          ctx.strokeStyle = light ? '#8CB8F2' : '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.rotate(rnd() * Math.PI);
          for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 4); ctx.moveTo(0, -r * 2.4); ctx.lineTo(r * 1.2, -r * 3.2); ctx.moveTo(0, -r * 2.4); ctx.lineTo(-r * 1.2, -r * 3.2); ctx.stroke(); ctx.rotate(Math.PI / 3); }
        } else { ctx.fillStyle = light ? '#B8D6F8' : '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    },
    holly(ctx) {   // 귀퉁이 호랑가시 잎·빨간 열매 + 작은 트리
      const leaf = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#2F7D4F';
        ctx.beginPath(); ctx.moveTo(0, -46); for (let i = 0; i < 6; i++) { const t = -Math.PI / 2 + (i + 1) * Math.PI / 3.5; ctx.quadraticCurveTo(Math.cos(t - .3) * 20, Math.sin(t - .3) * 20, Math.cos(t) * 44, Math.sin(t) * 44); } ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(20,70,40,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 30); ctx.stroke(); ctx.restore(); };
      const berries = (x, y) => [[0, 0], [22, 8], [8, 24]].forEach(([dx, dy]) => { ctx.fillStyle = '#D94A4A'; ctx.beginPath(); ctx.arc(x + dx, y + dy, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x + dx - 4, y + dy - 4, 4, 0, Math.PI * 2); ctx.fill(); });
      [[70, 70, -.6], [1730, 70, .6], [70, 1130, -2.5], [1730, 1130, 2.5]].forEach(([x, y, a]) => { leaf(x - 26, y, a); leaf(x + 26, y, a + 1.2); berries(x - 12, y - 8); });
      const tree = (x, y) => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#3E8E5A'; [[0, 0, 60], [0, -40, 48], [0, -76, 36]].forEach(([dx, dy, w]) => { ctx.beginPath(); ctx.moveTo(dx, dy - w * 1.1); ctx.lineTo(dx + w, dy + 10); ctx.lineTo(dx - w, dy + 10); ctx.closePath(); ctx.fill(); });
        ctx.fillStyle = '#8B5A2B'; ctx.fillRect(-10, 10, 20, 24); ctx.fillStyle = '#FFD93D'; ctx.save(); ctx.translate(0, -118); starPath(ctx, 5, 16, 7); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#D94A4A'; [[-20, -10], [18, -30], [-8, -58], [24, 0]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI * 2); ctx.fill(); }); ctx.restore(); };
      tree(200, 1100); tree(1090, 1100);   // 문구 양옆 (오른쪽 약속 카드는 1220부터)
    },
    balloons(ctx) {   // 가장자리에 둥실 떠 있는 풍선
      const cols = ['#FF6B8A', '#6FB8FF', '#FFD93D', '#7ED6BE', '#B39DFF', '#FF9ECF'];
      [[60, 140, 0], [110, 420, 1], [50, 700, 2], [1740, 160, 3], [1690, 440, 4], [1750, 720, 5], [900, 60, 1], [420, 1120, 4], [1380, 1120, 0]].forEach(([x, y, c], i) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate((i % 2 ? 1 : -1) * .12); ctx.globalAlpha = .85;
        ctx.strokeStyle = 'rgba(39,64,58,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(-14, 90, 0, 120); ctx.stroke();
        ctx.fillStyle = cols[c]; ctx.beginPath(); ctx.ellipse(0, 0, 40, 50, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, 48); ctx.lineTo(8, 48); ctx.lineTo(0, 60); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-14, -20, 8, 14, -.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
    },
    rainbow(ctx) {   // 양쪽 아래 귀퉁이 무지개 + 구름
      const cols = ['#FF6B6B', '#FFB347', '#FFE66D', '#7ED6BE', '#6FB8FF', '#B39DFF'];
      const arc = (x, y, a0, a1) => { ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .8; ctx.lineWidth = 22;
        cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(0, 0, 230 - i * 22, a0, a1); ctx.stroke(); });
        ctx.restore(); };
      arc(0, 1200, Math.PI * 1.5, Math.PI * 2);   // 왼쪽 아래 (오른쪽은 약속 카드가 덮음)
      const cloud = (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = 'rgba(255,255,255,.95)'; [[0, 0, 34], [-36, 10, 26], [36, 10, 26], [-10, -18, 24], [18, -14, 22]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill(); }); ctx.restore(); };
      cloud(160, 1130, 1.3); cloud(1120, 1120, 1.1); cloud(900, 50, 1); cloud(300, 40, .8); cloud(1500, 40, .8);
    },
    stars(ctx) {
      const cols = ['#FFD93D', '#FFB347', '#7ED6BE', '#6FB8FF'];
      [[60, 60], [1740, 60], [60, 1140], [1740, 1140], [900, 30], [900, 1170], [30, 600], [1770, 600], [1180, 1040], [640, 1040]].forEach(([x, y], i) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(i * .5); ctx.fillStyle = cols[i % 4]; starPath(ctx, 5, 24 + (i % 3) * 6, 10 + (i % 3) * 2); ctx.fill(); ctx.restore();
      });
    },
    confetti(ctx) {
      const cols = ['#FF6B6B', '#6FB8FF', '#FFE66D', '#7ED6BE', '#B39DFF', '#FF9ECF'];
      let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < 46; i++) { const x = rnd() * PW, y = rnd() * PH; ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI); ctx.fillStyle = cols[i % 6]; ctx.globalAlpha = .55; if (i % 3) ctx.fillRect(-9, -5, 18, 10); else { ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    },
    hearts(ctx) {
      const cols = ['#FFB3C1', '#FF7A59', '#C3B4FF', '#7ED6BE'];
      [[80, 120], [120, 330], [70, 520], [1720, 120], [1690, 330], [1730, 520], [900, 40], [900, 610]].forEach(([x, y], i) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate((i % 2 ? 1 : -1) * .3); ctx.fillStyle = cols[i % 4]; heartPath(ctx, 70 + (i % 3) * 14); ctx.fill(); ctx.restore();
      });
    }
  };

  function wrapLines(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    const push = w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } };
    words.forEach(w => { if (ctx.measureText(w).width > maxW) { for (const ch of w) { const t = cur + ch; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = ch; } } } else push(w); });
    if (cur) lines.push(cur); return lines;
  }
  function drawPromise(ctx, p, text, ink) {
    ctx.fillStyle = '#fff'; rr(ctx, p.x, p.y, p.w, p.h, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(39,64,58,.12)'; ctx.lineWidth = 3; ctx.stroke();
    const vertical = p.h > p.w;
    ctx.fillStyle = '#27403A'; ctx.textBaseline = 'middle';
    const labelSize = Math.min(48, p.w / (p.label.length * .62));
    ctx.font = FONT(labelSize);
    ctx.textAlign = vertical ? 'center' : 'left';
    ctx.fillText(p.label, vertical ? p.x + p.w / 2 : p.x + 40, p.y + 60);
    ctx.strokeStyle = 'rgba(39,64,58,.28)'; ctx.lineWidth = 3; ctx.setLineDash([16, 14]);
    const top = p.y + 120, bottom = p.y + p.h - 50, gap = (bottom - top) / p.lines;
    for (let i = 1; i <= p.lines; i++) { const y = top + gap * i; ctx.beginPath(); ctx.moveTo(p.x + 40, y); ctx.lineTo(p.x + p.w - 40, y); ctx.stroke(); }
    ctx.setLineDash([]);
    if (text) {   // 화면에서 고른 약속 문장을 점선 위에 인쇄 (남는 줄은 손글씨용)
      let size = vertical ? 44 : 56, lines;
      for (;;) { ctx.font = FONT(size); lines = wrapLines(ctx, text, p.w - 90); if (lines.length <= p.lines || size <= 26) break; size -= 4; }
      ctx.fillStyle = '#E2603F'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      lines.forEach((ln, i) => ctx.fillText(ln, p.x + 44, top + gap * (i + 1) - 12));
    }
    if (ink) ctx.drawImage(ink, p.x + 30, p.y + 100, p.w - 60, p.h - 130);   // 화면에서 손으로 쓴 약속
  }
  const inkBox = p => ({ w: p.w - 60, h: p.h - 130, lines: p.lines, top: 20, bottom: p.h - 150 });   // drawPromise의 점선 위치를 손글씨 판 좌표로 옮긴 것

  // 합성: 액자 + 사진(필터) + 문구 + (스티커). canvas 크기에 맞춰 1800×1200을 비례 축소
  function compose(canvas, o) {
    o = o || {};
    const frame = o.frame || S.frame, shots = o.shots || S.shots, picked = o.picked || S.picked;
    const filter = o.filter !== undefined ? o.filter : S.filter;
    const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d'), s = W / PW;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = o.bg || frame.bg; ctx.fillRect(0, 0, PW, PH);
    if (frame.decor && DECOR[frame.decor]) DECOR[frame.decor](ctx, frame, o.bg || frame.bg);
    frame.slots.forEach((sl, i) => {
      const shot = !o.placeholder && shots[picked[i]];
      ctx.save(); rr(ctx, sl.x, sl.y, sl.w, sl.h, frame.radius || 28); ctx.clip();
      if (shot && shot.width) drawFiltered(ctx, shot, sl, filter, !!o.print);
      else if (o.emptySlots) drawEmptySlot(ctx, sl, i);
      else paintPlaceholder(ctx, sl.x, sl.y, sl.w, sl.h, i);
      ctx.restore();
      if (frame.slotBorder) { ctx.strokeStyle = frame.slotBorder; ctx.lineWidth = 12; rr(ctx, sl.x, sl.y, sl.w, sl.h, frame.radius || 28); ctx.stroke(); }
    });
    if (frame.caption) {
      const c = frame.caption; ctx.fillStyle = c.color; ctx.font = FONT(c.size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(resolveText(c.text), c.x, c.y);
    }
    if (frame.promise) {
      const lbl = (settings.promiseLabels && settings.promiseLabels[frame.id]) || frame.promise.label;
      drawPromise(ctx, Object.assign({}, frame.promise, { label: lbl }), o.promiseText || '', o.promiseInk || null);
    }
    if (o.stickers) o.stickers.forEach(st => drawSticker(ctx, st));
    ctx.restore();
  }
  // 고르기 화면용: 아직 안 채운 칸은 연한 바탕에 번호만
  function drawEmptySlot(ctx, sl, i) {
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(sl.x, sl.y, sl.w, sl.h);
    ctx.strokeStyle = 'rgba(39,64,58,.35)'; ctx.lineWidth = 8; ctx.setLineDash([28, 20]); rr(ctx, sl.x + 10, sl.y + 10, sl.w - 20, sl.h - 20, 22); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(39,64,58,.35)'; ctx.font = FONT(Math.min(sl.w, sl.h) * .45); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('①②③④'[i], sl.x + sl.w / 2, sl.y + sl.h / 2);
  }
  // 액자 문구의 {campaign}, {school}은 교사 메뉴에서 정한 값으로 바뀜
  const resolveText = t => String(t).replace('{campaign}', settings.campaignLine || CAMPAIGN_LINE).replace('{school}', settings.schoolName || '우리 학교');
  function frameBounds(frame) {
    let x0 = PW, y0 = PH, x1 = 0, y1 = 0;
    frame.slots.forEach(s => { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h); });
    return { x0: x0 / PW, y0: y0 / PH, x1: x1 / PW, y1: y1 / PH };
  }

  /* ---------- 스티커 (ctx는 1800×1200 단위, 중심 0,0 / s = 크기) ---------- */
  function heartPath(ctx, s) {
    const t = s / 2; ctx.beginPath(); ctx.moveTo(0, t * .95);
    ctx.bezierCurveTo(-t * 1.15, t * .15, -t * .95, -t * .95, 0, -t * .38);
    ctx.bezierCurveTo(t * .95, -t * .95, t * 1.15, t * .15, 0, t * .95); ctx.closePath();
  }
  function starPath(ctx, n, R, r) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r : R; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    ctx.closePath();
  }
  function outline(ctx, w) { ctx.strokeStyle = 'rgba(39,64,58,.85)'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); }
  const DRAW = {
    heart(ctx, s) { heartPath(ctx, s); ctx.fillStyle = '#FF6B8A'; ctx.fill(); outline(ctx, s * .04); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-s * .2, -s * .22, s * .1, s * .06, -.6, 0, Math.PI * 2); ctx.fill(); },
    star(ctx, s) { starPath(ctx, 5, s / 2, s * .22); ctx.fillStyle = '#FFC93C'; ctx.fill(); outline(ctx, s * .04); },
    rainbow(ctx, s) {
      const cols = ['#FF6B6B', '#FFB347', '#FFE66D', '#7ED6BE', '#6FB8FF', '#B39DFF']; ctx.lineWidth = s * .075; ctx.lineCap = 'butt';
      cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(0, s * .22, s * .47 - i * s * .075, Math.PI, Math.PI * 2); ctx.stroke(); });
      ctx.fillStyle = '#fff'; [[-s * .3, s * .25], [s * .3, s * .25]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .13, 0, Math.PI * 2); ctx.arc(x + s * .12, y + s * .02, s * .1, 0, Math.PI * 2); ctx.arc(x - s * .12, y + s * .02, s * .1, 0, Math.PI * 2); ctx.fill(); });
    },
    sparkle(ctx, s) {
      const R = s / 2, r = s * .09; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.quadraticCurveTo(Math.cos(a + Math.PI / 4) * r, Math.sin(a + Math.PI / 4) * r, Math.cos(a + Math.PI / 2) * R, Math.sin(a + Math.PI / 2) * R); }
      ctx.closePath(); ctx.fillStyle = '#FFD93D'; ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#FFF7CF'; ctx.beginPath(); ctx.arc(s * .3, -s * .3, s * .07, 0, Math.PI * 2); ctx.fill();
    },
    flower(ctx, s) {
      ctx.fillStyle = '#FF9ECF';
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * .27, Math.sin(a) * s * .27, s * .2, s * .14, a, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03); }
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(0, 0, s * .16, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
    },
    sun(ctx, s) {
      ctx.strokeStyle = '#FFB347'; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .32, Math.sin(a) * s * .32); ctx.lineTo(Math.cos(a) * s * .48, Math.sin(a) * s * .48); ctx.stroke(); }
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(0, 0, s * .26, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#27403A'; ctx.beginPath(); ctx.arc(-s * .09, -s * .04, s * .03, 0, Math.PI * 2); ctx.arc(s * .09, -s * .04, s * .03, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .025; ctx.beginPath(); ctx.arc(0, s * .02, s * .1, Math.PI * .2, Math.PI * .8); ctx.stroke();
    },
    bubble(ctx, s, text) {
      const w = s * 1.15, h = s * .55; ctx.fillStyle = '#fff';
      rr(ctx, -w / 2, -h / 2 - s * .05, w, h, h / 2); ctx.fill(); outline(ctx, s * .035);
      ctx.beginPath(); ctx.moveTo(-w * .25, h / 2 - s * .06); ctx.lineTo(-w * .1, h / 2 - s * .06); ctx.lineTo(-w * .28, h / 2 + s * .15); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = 'rgba(39,64,58,.85)'; ctx.lineWidth = s * .035; ctx.beginPath(); ctx.moveTo(-w * .25, h / 2 - s * .06); ctx.lineTo(-w * .28, h / 2 + s * .15); ctx.lineTo(-w * .1, h / 2 - s * .06); ctx.stroke();
      const fs = Math.min(s * .24, (w - s * .16) / (text.length * .92));
      ctx.fillStyle = '#27403A'; ctx.font = FONT(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, -s * .05);
    },
    fullmoon(ctx, s) {   // 보름달 + 떡방아 토끼 그림자
      ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(0, 0, s * .44, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = 'rgba(200,150,40,.55)';
      ctx.beginPath(); ctx.ellipse(-s * .04, s * .08, s * .13, s * .16, 0, 0, Math.PI * 2); ctx.fill();   // 몸
      ctx.beginPath(); ctx.arc(-s * .04, -s * .1, s * .09, 0, Math.PI * 2); ctx.fill();   // 머리
      ctx.beginPath(); ctx.ellipse(-s * .1, -s * .24, s * .03, s * .09, -.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -s * .25, s * .03, s * .09, .3, 0, Math.PI * 2); ctx.fill();   // 귀
      ctx.strokeStyle = 'rgba(200,150,40,.7)'; ctx.lineWidth = s * .04; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * .06, -s * .02); ctx.lineTo(s * .22, -s * .16); ctx.stroke();   // 방아
      ctx.fillStyle = 'rgba(200,150,40,.7)'; ctx.beginPath(); ctx.ellipse(s * .24, -s * .18, s * .07, s * .05, .6, 0, Math.PI * 2); ctx.fill();
    },
    songpyeon(ctx, s) {   // 송편 셋 (흰·쑥·분홍)
      [['#FFF8EE', -s * .22, s * .06], ['#BFE3B4', s * .18, s * .04], ['#FFD1DC', -s * .02, -s * .18]].forEach(([c, x, y]) => {
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-s * .2, s * .08); ctx.quadraticCurveTo(0, -s * .26, s * .2, s * .08); ctx.quadraticCurveTo(0, s * .16, -s * .2, s * .08); ctx.closePath(); ctx.fill(); outline(ctx, s * .03);
        ctx.strokeStyle = 'rgba(39,64,58,.35)'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.moveTo(-s * .16, s * .07); ctx.quadraticCurveTo(0, -s * .02, s * .16, s * .07); ctx.stroke(); ctx.restore();
      });
    },
    persimmon(ctx, s) {   // 감
      ctx.fillStyle = '#F28C28'; ctx.beginPath(); ctx.ellipse(0, s * .06, s * .36, s * .32, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-s * .14, -s * .06, s * .08, s * .05, -.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4E8C3A'; for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2 + Math.PI / 4); ctx.beginPath(); ctx.ellipse(0, -s * .28, s * .07, s * .13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      outline(ctx, s * .025); ctx.fillStyle = '#6B4A2B'; ctx.beginPath(); ctx.arc(0, -s * .3, s * .04, 0, Math.PI * 2); ctx.fill();
    },
    rabbit(ctx, s) {   // 토끼 얼굴
      ctx.fillStyle = '#fff';
      [[-s * .16, -s * .3, -.15], [s * .16, -s * .3, .15]].forEach(([x, y, a]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, s * .08, s * .22, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03); ctx.fillStyle = '#FFC0CB'; ctx.beginPath(); ctx.ellipse(0, s * .02, s * .04, s * .15, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, s * .1, s * .3, s * .27, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#27403A'; [[-s * .11, s * .04], [s * .11, s * .04]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .035, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#FF9FB0'; ctx.beginPath(); ctx.arc(0, s * .14, s * .035, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .025; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s * .06, s * .2); ctx.quadraticCurveTo(0, s * .26, s * .06, s * .2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,170,.6)'; [[-s * .2, s * .14], [s * .2, s * .14]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .05, 0, Math.PI * 2); ctx.fill(); });
    },
    book(ctx, s) {   // 펼친 책
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-s * .42, -s * .22); ctx.quadraticCurveTo(-s * .2, -s * .3, 0, -s * .2); ctx.quadraticCurveTo(s * .2, -s * .3, s * .42, -s * .22); ctx.lineTo(s * .42, s * .22); ctx.quadraticCurveTo(s * .2, s * .14, 0, s * .24); ctx.quadraticCurveTo(-s * .2, s * .14, -s * .42, s * .22); ctx.closePath(); ctx.fill(); outline(ctx, s * .035);
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .03; ctx.beginPath(); ctx.moveTo(0, -s * .2); ctx.lineTo(0, s * .24); ctx.stroke();
      ctx.strokeStyle = 'rgba(39,64,58,.35)'; ctx.lineWidth = s * .02; [-s * .1, -s * .02, s * .06].forEach(y => { ctx.beginPath(); ctx.moveTo(-s * .34, y); ctx.lineTo(-s * .08, y); ctx.moveTo(s * .08, y); ctx.lineTo(s * .34, y); ctx.stroke(); });
      ctx.fillStyle = '#6FB8FF'; rr(ctx, -s * .44, s * .2, s * .88, s * .08, s * .03); ctx.fill(); outline(ctx, s * .025);
    },
    pencil(ctx, s) {   // 연필
      ctx.save(); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#FFD93D'; rr(ctx, -s * .1, -s * .3, s * .2, s * .5, s * .02); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#FF9ECF'; rr(ctx, -s * .1, -s * .42, s * .2, s * .12, s * .04); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#FFE0B2'; ctx.beginPath(); ctx.moveTo(-s * .1, s * .2); ctx.lineTo(s * .1, s * .2); ctx.lineTo(0, s * .42); ctx.closePath(); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#27403A'; ctx.beginPath(); ctx.moveTo(-s * .035, s * .34); ctx.lineTo(s * .035, s * .34); ctx.lineTo(0, s * .42); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    bulb(ctx, s) {   // 반짝 전구 (아이디어)
      ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(0, -s * .1, s * .26, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#B0BEC5'; rr(ctx, -s * .12, s * .12, s * .24, s * .16, s * .04); ctx.fill(); outline(ctx, s * .03);
      ctx.strokeStyle = '#FFB347'; ctx.lineWidth = s * .035; ctx.lineCap = 'round';
      [[-.42, -.36], [.42, -.36], [0, -.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x * s * .8, y * s * .8); ctx.lineTo(x * s, y * s); ctx.stroke(); });
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-s * .09, -s * .18, s * .06, s * .09, -.4, 0, Math.PI * 2); ctx.fill();
    },
    moon(ctx, s) {
      ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(0, 0, s * .42, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .035; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-s * .14, -s * .02, s * .07, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * .14, -s * .02, s * .07, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s * .1, s * .09, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.fillStyle = '#FFB3C1'; ctx.beginPath(); ctx.arc(-s * .24, s * .1, s * .05, 0, Math.PI * 2); ctx.arc(s * .24, s * .1, s * .05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; [[-s * .38, -s * .34], [s * .4, -s * .3], [s * .34, s * .38]].forEach(([x, y]) => { ctx.save(); ctx.translate(x, y); starPath(ctx, 4, s * .07, s * .025); ctx.fill(); ctx.restore(); });
    },
    cloud(ctx, s) {
      const path = () => { ctx.beginPath(); ctx.arc(-s * .22, s * .06, s * .17, 0, Math.PI * 2); ctx.arc(-s * .04, -s * .1, s * .22, 0, Math.PI * 2); ctx.arc(s * .2, s * .04, s * .18, 0, Math.PI * 2); ctx.arc(0, s * .12, s * .2, 0, Math.PI * 2); };
      path(); ctx.strokeStyle = 'rgba(39,64,58,.85)'; ctx.lineWidth = s * .07; ctx.stroke(); path(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#27403A'; ctx.beginPath(); ctx.arc(-s * .08, 0, s * .03, 0, Math.PI * 2); ctx.arc(s * .1, 0, s * .03, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .025; ctx.beginPath(); ctx.arc(s * .01, s * .06, s * .07, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.fillStyle = '#FFB3C1'; ctx.beginPath(); ctx.arc(-s * .18, s * .08, s * .04, 0, Math.PI * 2); ctx.arc(s * .2, s * .08, s * .04, 0, Math.PI * 2); ctx.fill();
    },
    clover(ctx, s) {
      ctx.strokeStyle = '#3E8E4C'; ctx.lineWidth = s * .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * .02, s * .1); ctx.quadraticCurveTo(s * .06, s * .3, s * .16, s * .46); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.translate(0, -s * .17); heartPath(ctx, s * .34); ctx.strokeStyle = 'rgba(39,64,58,.85)'; ctx.lineWidth = s * .05; ctx.stroke(); ctx.fillStyle = '#5CC46A'; ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#3E8E4C'; ctx.beginPath(); ctx.arc(0, 0, s * .04, 0, Math.PI * 2); ctx.fill();
    },
    note(ctx, s) {
      ctx.fillStyle = '#27403A'; ctx.beginPath(); ctx.ellipse(-s * .14, s * .3, s * .17, s * .12, -.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-s * .01, -s * .42, s * .07, s * .72);
      ctx.beginPath(); ctx.moveTo(s * .06, -s * .42); ctx.bezierCurveTo(s * .3, -s * .34, s * .34, -s * .12, s * .12, -s * .02); ctx.bezierCurveTo(s * .3, -s * .14, s * .22, -s * .3, s * .06, -s * .3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.arc(s * .3, s * .28, s * .07, 0, Math.PI * 2); ctx.fill();
    },
    balloon(ctx, s) {
      ctx.strokeStyle = 'rgba(39,64,58,.6)'; ctx.lineWidth = s * .025; ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.quadraticCurveTo(-s * .12, s * .4, 0, s * .48); ctx.stroke();
      ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.ellipse(0, -s * .1, s * .3, s * .36, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.beginPath(); ctx.moveTo(-s * .06, s * .26); ctx.lineTo(s * .06, s * .26); ctx.lineTo(0, s * .33); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-s * .12, -s * .26, s * .06, s * .1, -.5, 0, Math.PI * 2); ctx.fill();
    },
    smiley(ctx, s) {
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(0, 0, s * .42, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#27403A'; ctx.beginPath(); ctx.arc(-s * .15, -s * .08, s * .05, 0, Math.PI * 2); ctx.arc(s * .15, -s * .08, s * .05, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .04; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, s * .04, s * .22, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.fillStyle = '#FFB3C1'; ctx.beginPath(); ctx.arc(-s * .27, s * .1, s * .06, 0, Math.PI * 2); ctx.arc(s * .27, s * .1, s * .06, 0, Math.PI * 2); ctx.fill();
    },
    shield(ctx, s) {
      ctx.beginPath(); ctx.moveTo(-s * .4, -s * .34); ctx.lineTo(0, -s * .46); ctx.lineTo(s * .4, -s * .34); ctx.lineTo(s * .4, s * .05); ctx.quadraticCurveTo(s * .4, s * .36, 0, s * .48); ctx.quadraticCurveTo(-s * .4, s * .36, -s * .4, s * .05); ctx.closePath();
      ctx.fillStyle = '#6FB8FF'; ctx.fill(); outline(ctx, s * .04);
      ctx.save(); ctx.translate(0, s * .03); heartPath(ctx, s * .4); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    },
    stop(ctx, s) {
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.cos(a) * s * .46, Math.sin(a) * s * .46); } ctx.closePath();
      ctx.fillStyle = '#E5484D'; ctx.fill(); outline(ctx, s * .04);
      ctx.fillStyle = '#fff'; ctx.font = FONT(s * .26); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('멈춰!', 0, s * .01);
    },
    medal(ctx, s) {
      ctx.fillStyle = '#E5484D'; ctx.fillRect(-s * .17, -s * .48, s * .15, s * .42); ctx.fillStyle = '#6FB8FF'; ctx.fillRect(s * .02, -s * .48, s * .15, s * .42);
      ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(0, s * .16, s * .3, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.strokeStyle = '#E2A300'; ctx.lineWidth = s * .03; ctx.beginPath(); ctx.arc(0, s * .16, s * .22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#27403A'; ctx.font = FONT(s * .16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('지킴이', 0, s * .17);
    },
    tag(ctx, s) {
      rr(ctx, -s * .55, -s * .2, s * 1.1, s * .4, s * .2); ctx.fillStyle = '#7ED6BE'; ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#27403A'; ctx.font = FONT(s * .22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('사이좋게', 0, s * .01);
    },
    hand(ctx, s) {
      ctx.fillStyle = '#FFCBA4'; ctx.strokeStyle = 'rgba(39,64,58,.85)'; ctx.lineWidth = s * .035; ctx.lineJoin = 'round';
      const f = (x, y, w, h, r) => { rr(ctx, x, y, w, h, r); ctx.fill(); ctx.stroke(); };
      [[-s * .26, -s * .3], [-s * .1, -s * .46], [s * .06, -s * .44], [s * .2, -s * .32]].forEach(([x, y]) => f(x, y, s * .13, s * .5, s * .065));
      f(-s * .27, -s * .05, s * .58, s * .48, s * .14);
      ctx.save(); ctx.translate(-s * .3, s * .1); ctx.rotate(-.7); f(-s * .07, -s * .18, s * .14, s * .36, s * .07); ctx.restore();
      ctx.fillStyle = '#FFCBA4'; rr(ctx, -s * .24, -s * .02, s * .52, s * .3, s * .1); ctx.fill();
    },
    sunglasses(ctx, s) {
      ctx.fillStyle = '#27403A'; rr(ctx, -s * .48, -s * .14, s * .42, s * .3, s * .1); ctx.fill(); rr(ctx, s * .06, -s * .14, s * .42, s * .3, s * .1); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s * .06, -s * .06); ctx.lineTo(s * .06, -s * .06); ctx.moveTo(-s * .48, -s * .08); ctx.lineTo(-s * .5, -s * .12); ctx.moveTo(s * .48, -s * .08); ctx.lineTo(s * .5, -s * .12); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-s * .36, -s * .06, s * .06, s * .03, -.5, 0, Math.PI * 2); ctx.ellipse(s * .18, -s * .06, s * .06, s * .03, -.5, 0, Math.PI * 2); ctx.fill();
    },
    catears(ctx, s) {
      [[-1, 0], [1, 0]].forEach(([d]) => {
        ctx.beginPath(); ctx.moveTo(d * s * .12, s * .3); ctx.lineTo(d * s * .34, -s * .42); ctx.lineTo(d * s * .5, s * .22); ctx.closePath(); ctx.fillStyle = '#FFB347'; ctx.fill(); outline(ctx, s * .035);
        ctx.beginPath(); ctx.moveTo(d * s * .2, s * .22); ctx.lineTo(d * s * .34, -s * .22); ctx.lineTo(d * s * .43, s * .18); ctx.closePath(); ctx.fillStyle = '#FFB3C1'; ctx.fill();
      });
    },
    bunnyears(ctx, s) {
      [[-1, 0], [1, 0]].forEach(([d]) => {
        ctx.save(); ctx.translate(d * s * .2, 0); ctx.rotate(d * .18);
        ctx.beginPath(); ctx.ellipse(0, 0, s * .14, s * .46, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); outline(ctx, s * .035);
        ctx.beginPath(); ctx.ellipse(0, s * .02, s * .07, s * .34, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFB3C1'; ctx.fill(); ctx.restore();
      });
    },
    popper(ctx, s) {
      ctx.save(); ctx.rotate(.6);
      ctx.beginPath(); ctx.moveTo(0, -s * .1); ctx.lineTo(s * .18, s * .46); ctx.lineTo(-s * .18, s * .46); ctx.closePath(); ctx.fillStyle = '#FF7BAC'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#FFE66D'; for (let y = 0; y < s * .5; y += s * .16) ctx.fillRect(-s * .3, y, s * .6, s * .07); ctx.restore(); outline(ctx, s * .035); ctx.restore();
      const cols = ['#FF6B6B', '#6FB8FF', '#FFE66D', '#7ED6BE', '#B39DFF'];
      [[-s * .1, -s * .3], [s * .1, -s * .42], [s * .3, -s * .3], [-s * .32, -s * .18], [s * .38, -s * .06], [-s * .22, -s * .4]].forEach(([x, y], i) => { ctx.fillStyle = cols[i % 5]; ctx.beginPath(); ctx.arc(x, y, s * .045, 0, Math.PI * 2); ctx.fill(); });
    },
    icecream(ctx, s) {
      ctx.beginPath(); ctx.moveTo(-s * .2, s * .02); ctx.lineTo(s * .2, s * .02); ctx.lineTo(0, s * .48); ctx.closePath(); ctx.fillStyle = '#E0A96D'; ctx.fill(); outline(ctx, s * .035);
      ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.moveTo(-s * .14, s * .1); ctx.lineTo(s * .06, s * .36); ctx.moveTo(-s * .04, s * .04); ctx.lineTo(s * .13, s * .24); ctx.moveTo(s * .14, s * .1); ctx.lineTo(-s * .06, s * .36); ctx.moveTo(s * .04, s * .04); ctx.lineTo(-s * .13, s * .24); ctx.stroke();
      ctx.fillStyle = '#BFEBDC'; ctx.beginPath(); ctx.arc(-s * .1, -s * .1, s * .17, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#FFB3C1'; ctx.beginPath(); ctx.arc(s * .1, -s * .12, s * .17, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#FFF3B0'; ctx.beginPath(); ctx.arc(0, -s * .3, s * .17, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#E5484D'; ctx.beginPath(); ctx.arc(0, -s * .44, s * .05, 0, Math.PI * 2); ctx.fill();
    },
    cake(ctx, s) {
      rr(ctx, -s * .4, -s * .02, s * .8, s * .42, s * .08); ctx.fillStyle = '#FFD9C2'; ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#FF7BAC'; ctx.beginPath(); ctx.moveTo(-s * .4, s * .02); for (let i = 0; i < 5; i++) ctx.arc(-s * .32 + i * s * .16, s * .06, s * .08, Math.PI, 0, true); ctx.lineTo(s * .4, s * .02); ctx.lineTo(s * .4, -s * .02); ctx.lineTo(-s * .4, -s * .02); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6FB8FF'; ctx.fillRect(-s * .04, -s * .3, s * .08, s * .3);
      ctx.fillStyle = '#FFB347'; ctx.beginPath(); ctx.ellipse(0, -s * .38, s * .05, s * .09, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#E5484D'; [[-s * .24, s * .3], [0, s * .3], [s * .24, s * .3]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .04, 0, Math.PI * 2); ctx.fill(); });
    },
    mascot(ctx, s) {
      ctx.fillStyle = '#7ED6BE'; ctx.beginPath(); ctx.ellipse(0, s * .04, s * .4, s * .44, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
      ctx.fillStyle = '#27403A'; ctx.beginPath(); ctx.arc(-s * .14, -s * .04, s * .06, 0, Math.PI * 2); ctx.arc(s * .14, -s * .04, s * .06, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFB3C1'; ctx.beginPath(); ctx.arc(-s * .24, s * .1, s * .06, 0, Math.PI * 2); ctx.arc(s * .24, s * .1, s * .06, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .03; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s * .1, s * .14); ctx.quadraticCurveTo(0, s * .26, s * .1, s * .14); ctx.stroke();
    },
    handheart(ctx, s) {
      ctx.fillStyle = '#FFCBA4'; [[-s * .22, s * .3], [s * .22, s * .3]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, s * .16, s * .11, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03); });
      ctx.save(); ctx.translate(0, -s * .05); heartPath(ctx, s * .72); ctx.fillStyle = '#FF6B8A'; ctx.fill(); outline(ctx, s * .035); ctx.restore();
    },
    stamp(ctx, s) {
      ctx.save(); ctx.rotate(-.25); ctx.strokeStyle = '#E5484D'; ctx.lineWidth = s * .06; ctx.beginPath(); ctx.arc(0, 0, s * .44, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = s * .02; ctx.beginPath(); ctx.arc(0, 0, s * .36, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#E5484D'; ctx.font = FONT(s * .3); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('약속', 0, s * .01); ctx.restore();
    },
    ribbon(ctx, s) {
      ctx.strokeStyle = '#FFD54A'; ctx.lineWidth = s * .13; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * .22, s * .45); ctx.lineTo(-s * .02, -s * .15); ctx.bezierCurveTo(s * .04, -s * .5, s * .28, -s * .42, s * .22, -s * .12); ctx.lineTo(0, s * .3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * .24, s * .45); ctx.lineTo(s * .04, -s * .15); ctx.stroke();
    },
    crown(ctx, s) {
      ctx.beginPath(); ctx.moveTo(-s * .42, s * .3); ctx.lineTo(-s * .45, -s * .25); ctx.lineTo(-s * .2, -s * .02); ctx.lineTo(0, -s * .4); ctx.lineTo(s * .2, -s * .02); ctx.lineTo(s * .45, -s * .25); ctx.lineTo(s * .42, s * .3); ctx.closePath();
      ctx.fillStyle = '#FFC93C'; ctx.fill(); outline(ctx, s * .04);
      ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.arc(0, s * .12, s * .07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6FB8FF'; ctx.beginPath(); ctx.arc(-s * .24, s * .14, s * .05, 0, Math.PI * 2); ctx.arc(s * .24, s * .14, s * .05, 0, Math.PI * 2); ctx.fill();
    },
    glasses(ctx, s) {
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-s * .22, 0, s * .18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * .22, 0, s * .18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * .04, 0); ctx.lineTo(s * .04, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * .4, -s * .03); ctx.lineTo(-s * .5, -s * .08); ctx.moveTo(s * .4, -s * .03); ctx.lineTo(s * .5, -s * .08); ctx.stroke();
      ctx.fillStyle = 'rgba(111,184,255,.25)'; ctx.beginPath(); ctx.arc(-s * .22, 0, s * .16, 0, Math.PI * 2); ctx.arc(s * .22, 0, s * .16, 0, Math.PI * 2); ctx.fill();
    },
    bow(ctx, s) {
      ctx.fillStyle = '#FF7BAC';
      [[-1, 0], [1, 0]].forEach(([d]) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * s * .48, -s * .28); ctx.quadraticCurveTo(d * s * .5, 0, d * s * .48, s * .28); ctx.closePath(); ctx.fill(); outline(ctx, s * .035); });
      ctx.fillStyle = '#FF4F8B'; ctx.beginPath(); ctx.arc(0, 0, s * .12, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
    },
    hat(ctx, s) {
      ctx.beginPath(); ctx.moveTo(0, -s * .46); ctx.lineTo(s * .34, s * .36); ctx.lineTo(-s * .34, s * .36); ctx.closePath(); ctx.fillStyle = '#6FB8FF'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#FFE66D'; for (let y = -s * .3; y < s * .4; y += s * .2) ctx.fillRect(-s * .5, y, s, s * .08); ctx.restore(); outline(ctx, s * .035);
      ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.arc(0, -s * .44, s * .09, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
    },
    santahat(ctx, s) {   // 산타 모자 (머리에 얹는 용)
      ctx.fillStyle = '#E5484D'; ctx.beginPath(); ctx.moveTo(-s * .34, s * .22); ctx.quadraticCurveTo(-s * .3, -s * .3, s * .02, -s * .42); ctx.quadraticCurveTo(s * .3, -s * .5, s * .38, -s * .3); ctx.quadraticCurveTo(s * .2, -s * .3, s * .1, -s * .1); ctx.lineTo(s * .34, s * .22); ctx.closePath(); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#fff'; rr(ctx, -s * .42, s * .16, s * .84, s * .18, s * .09); ctx.fill(); outline(ctx, s * .03);
      ctx.beginPath(); ctx.arc(s * .4, -s * .3, s * .09, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03);
    },
    xtree(ctx, s) {   // 크리스마스 트리
      ctx.save(); ctx.scale(1.25, 1.25); ctx.translate(0, s * .04); ctx.fillStyle = '#3E8E5A'; [[s * .3, 0], [s * .24, -s * .18], [s * .17, -s * .32]].forEach(([w, dy]) => { ctx.beginPath(); ctx.moveTo(0, dy - w * 1.1); ctx.lineTo(w, dy + s * .06); ctx.lineTo(-w, dy + s * .06); ctx.closePath(); ctx.fill(); outline(ctx, s * .03); });
      ctx.fillStyle = '#8B5A2B'; rr(ctx, -s * .06, s * .06, s * .12, s * .14, s * .02); ctx.fill(); outline(ctx, s * .03);
      ctx.save(); ctx.translate(0, -s * .48); starPath(ctx, 5, s * .09, s * .04); ctx.fillStyle = '#FFD93D'; ctx.fill(); outline(ctx, s * .025); ctx.restore();
      ['#E5484D', '#FFD93D', '#6FB8FF', '#FF9ECF'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc([-s * .1, s * .08, -s * .04, s * .14][i], [-s * .04, -s * .14, -s * .26, s * .0][i], s * .035, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    },
    gift(ctx, s) {   // 선물 상자
      ctx.fillStyle = '#6FB8FF'; rr(ctx, -s * .34, -s * .1, s * .68, s * .46, s * .04); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#4A9BEB'; rr(ctx, -s * .4, -s * .24, s * .8, s * .16, s * .04); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#FFD93D'; ctx.fillRect(-s * .06, -s * .24, s * .12, s * .6); ctx.fillRect(-s * .4, -s * .2, s * .8, s * .08);
      ctx.strokeStyle = '#FFD93D'; ctx.lineWidth = s * .06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -s * .26); ctx.quadraticCurveTo(-s * .22, -s * .46, -s * .1, -s * .3); ctx.moveTo(0, -s * .26); ctx.quadraticCurveTo(s * .22, -s * .46, s * .1, -s * .3); ctx.stroke();
    },
    snowman(ctx, s) {   // 눈사람
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, s * .2, s * .28, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.beginPath(); ctx.arc(0, -s * .18, s * .2, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#27403A'; [[-s * .07, -s * .22], [s * .07, -s * .22], [0, s * .1], [0, s * .24]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .028, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#FF8C42'; ctx.beginPath(); ctx.moveTo(0, -s * .17); ctx.lineTo(s * .16, -s * .13); ctx.lineTo(0, -s * .1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E5484D'; rr(ctx, -s * .2, -s * .04, s * .4, s * .08, s * .03); ctx.fill(); outline(ctx, s * .025);
      ctx.fillStyle = '#2B3A36'; ctx.fillRect(-s * .22, -s * .36, s * .44, s * .05); ctx.fillRect(-s * .14, -s * .52, s * .28, s * .18);
    },
    pinwheel(ctx, s) {   // 바람개비
      ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = s * .05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * .48); ctx.stroke();
      ['#FF6B8A', '#FFD93D', '#6FB8FF', '#7ED6BE'].forEach((c, i) => { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * .38, -s * .38); ctx.lineTo(s * .38, 0); ctx.closePath(); ctx.fill(); outline(ctx, s * .03); ctx.restore(); });
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * .06, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .025);
    },
    lollipop(ctx, s) {   // 막대사탕
      ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, s * .1); ctx.lineTo(0, s * .48); ctx.stroke(); ctx.strokeStyle = 'rgba(39,64,58,.6)'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.moveTo(-s * .035, s * .12); ctx.lineTo(-s * .035, s * .48); ctx.moveTo(s * .035, s * .12); ctx.lineTo(s * .035, s * .48); ctx.stroke();
      ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.arc(0, -s * .16, s * .3, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = s * .06; ctx.beginPath(); for (let a = 0; a < Math.PI * 5; a += .2) { const r = a / (Math.PI * 5) * s * .26; ctx.lineTo(Math.cos(a) * r, -s * .16 + Math.sin(a) * r); } ctx.stroke();
    },
    teddy(ctx, s) {   // 곰 인형 얼굴
      ctx.fillStyle = '#C48A55'; [[-s * .28, -s * .28], [s * .28, -s * .28]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .13, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .03); ctx.fillStyle = '#E8B98A'; ctx.beginPath(); ctx.arc(x, y, s * .06, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#C48A55'; });
      ctx.beginPath(); ctx.arc(0, 0, s * .36, 0, Math.PI * 2); ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#E8B98A'; ctx.beginPath(); ctx.ellipse(0, s * .12, s * .16, s * .12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#27403A'; [[-s * .13, -s * .06], [s * .13, -s * .06]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, s * .035, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.ellipse(0, s * .08, s * .05, s * .035, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27403A'; ctx.lineWidth = s * .025; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, s * .12); ctx.lineTo(0, s * .17); ctx.moveTo(-s * .06, s * .2); ctx.quadraticCurveTo(0, s * .25, s * .06, s * .2); ctx.stroke();
    },
    kite(ctx, s) {   // 연
      ctx.save(); ctx.rotate(.35);
      ctx.strokeStyle = 'rgba(39,64,58,.6)'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.quadraticCurveTo(-s * .1, s * .42, s * .02, s * .5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * .42); ctx.lineTo(s * .26, -s * .06); ctx.lineTo(0, s * .3); ctx.lineTo(-s * .26, -s * .06); ctx.closePath(); ctx.fillStyle = '#FFD93D'; ctx.fill(); outline(ctx, s * .035);
      ctx.fillStyle = '#FF6B8A'; ctx.beginPath(); ctx.moveTo(0, -s * .42); ctx.lineTo(s * .26, -s * .06); ctx.lineTo(0, -s * .06); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.lineTo(-s * .26, -s * .06); ctx.lineTo(0, -s * .06); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(39,64,58,.6)'; ctx.beginPath(); ctx.moveTo(0, -s * .42); ctx.lineTo(0, s * .3); ctx.moveTo(-s * .26, -s * .06); ctx.lineTo(s * .26, -s * .06); ctx.stroke();
      ['#6FB8FF', '#7ED6BE', '#B39DFF'].forEach((c, i) => { ctx.fillStyle = c; ctx.save(); ctx.translate(-s * .02 + i * s * .02, s * .34 + i * s * .07); ctx.rotate(.5); ctx.fillRect(-s * .05, -s * .02, s * .1, s * .04); ctx.restore(); });
      ctx.restore();
    },
    mustache(ctx, s) {
      ctx.fillStyle = '#5B3A29'; ctx.beginPath(); ctx.moveTo(0, s * .05);
      ctx.bezierCurveTo(s * .1, -s * .2, s * .38, -s * .2, s * .45, -s * .02); ctx.bezierCurveTo(s * .3, s * .02, s * .2, s * .22, 0, s * .12);
      ctx.bezierCurveTo(-s * .2, s * .22, -s * .3, s * .02, -s * .45, -s * .02); ctx.bezierCurveTo(-s * .38, -s * .2, -s * .1, -s * .2, 0, s * .05); ctx.closePath(); ctx.fill();
    }
  };
  const STICKERS = [
    ...['heart', 'star', 'rainbow', 'sparkle', 'flower', 'sun', 'moon', 'cloud', 'clover', 'note', 'balloon', 'smiley'].map(id => ({ id, cat: 'heart' })),
    ...BUBBLE_TEXTS.map((t, i) => ({ id: 'bubble' + i, cat: 'talk', text: t })),
    ...['mascot', 'handheart', 'stamp', 'ribbon', 'shield', 'stop', 'medal', 'tag', 'hand'].map(id => ({ id, cat: 'camp' })),
    ...['crown', 'glasses', 'sunglasses', 'bow', 'hat', 'mustache', 'catears', 'bunnyears', 'popper', 'icecream', 'cake'].map(id => ({ id, cat: 'fun' })),
    ...['fullmoon', 'songpyeon', 'persimmon', 'rabbit'].map(id => ({ id, cat: 'fun', sets: ['chuseok'] })),   // 추석 세트에서만
    ...['book', 'pencil', 'bulb'].map(id => ({ id, cat: 'fun', sets: ['reading'] })),   // 독서 세트에서만
    ...['santahat', 'xtree', 'gift', 'snowman'].map(id => ({ id, cat: 'fun', sets: ['xmas'] })),   // 크리스마스·새해 세트에서만
    ...['pinwheel', 'lollipop', 'teddy', 'kite'].map(id => ({ id, cat: 'fun', sets: ['children'] }))   // 어린이날 세트에서만
  ];
  const stickerOn = def => !def.sets || def.sets.includes(settings.frameSet || 'promise');
  const STICKER_MAP = Object.fromEntries(STICKERS.map(s => [s.id, s]));
  function drawStickerDef(ctx, def, px) { if (def.text) DRAW.bubble(ctx, px, def.text); else DRAW[def.id](ctx, px); }
  function drawSticker(ctx, st) {
    const def = STICKER_MAP[st.id]; if (!def) return;
    ctx.save(); ctx.translate(st.x * PW, st.y * PH); ctx.rotate(st.rot); drawStickerDef(ctx, def, st.sz * st.scale * PW); ctx.restore();
  }

