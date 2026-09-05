  /* ===================== S6 필터 ===================== */
  function fitCanvas(c) { const r = c.getBoundingClientRect(); const w = Math.round(r.width * DPR) || 900; c.width = w; c.height = Math.round(w * 2 / 3); }
  ENTER.s6 = () => {
    const pv = $('#filter-preview'); fitCanvas(pv);
    const showFilter = () => { compose(pv); const f = filterDef(S.filter); $('#fname').textContent = f.id === 'none' ? '필터 없음' : f.name + ' 필터'; };
    showFilter();
    const wrap = $('#filters'); wrap.innerHTML = '';
    const shot = S.shots[S.picked[0]] || S.shots[0];
    // 썸네일은 먼저 작게 잘라 둔 뒤 필터를 적용 (픽셀 방식이어도 가볍게)
    const small = document.createElement('canvas'); small.width = small.height = 220;
    drawCover(small.getContext('2d'), shot, { x: 0, y: 0, w: 220, h: 220 });
    FILTERS.forEach(f => {
      const t = document.createElement('button'); t.className = 'ftile' + (f.id === S.filter ? ' sel' : '');
      const c = document.createElement('canvas'); c.width = c.height = 220;
      const ctx = c.getContext('2d');
      if (FILTER_OK) { ctx.filter = filterCss(f.id, false); ctx.drawImage(small, 0, 0); ctx.filter = 'none'; }
      else { ctx.drawImage(small, 0, 0); applyPixelFilter(c, f.id, false); }
      t.appendChild(c); t.insertAdjacentHTML('beforeend', `<b>${f.name}</b>`);
      t.addEventListener('click', () => {
        pop(); S.filter = f.id; $$('#filters .ftile').forEach(x => x.classList.remove('sel')); t.classList.add('sel');
        showFilter(); pv.classList.remove('blink'); void pv.offsetWidth; pv.classList.add('blink');
      });
      wrap.appendChild(t);
    });
  };
  $('#btn-filter-ok').addEventListener('click', () => { pop(); decorLimit = T.decorate; go('s7'); });

