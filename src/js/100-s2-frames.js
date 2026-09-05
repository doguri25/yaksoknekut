  /* ===================== S2 액자 ===================== */
  ENTER.s2 = () => {
    const list = FRAMES.filter(f => f.set === (settings.frameSet || 'promise') && f.cuts === S.cuts && frameOn(f));
    const wrap = $('#frame-tiles'); wrap.innerHTML = '';
    const n = Math.max(1, list.length);
    wrap.style.gridTemplateColumns = `repeat(${Math.min(n, 3)}, 1fr)`;
    wrap.style.width = n <= 2 ? '1000px' : '1200px';
    list.forEach(f => {
      const b = document.createElement('button'); b.className = 'tile';
      const c = document.createElement('canvas'); c.width = 600; c.height = 400;
      compose(c, { frame: f, placeholder: true });
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', `<span class="tile-name">${f.name}</span><span class="tile-sub">${f.sub}</span>`);
      b.addEventListener('click', () => { pop(); if (S.frame !== f) { S.promiseInk = null; S.inkStrokes = []; } S.frame = f; go(S.shots.length === 4 ? 's5' : 's3'); });
      wrap.appendChild(b);
    });
    if (!list.length) wrap.innerHTML = '<p class="muted">켜져 있는 액자가 없어요. 교사 메뉴에서 액자를 켜 주세요.</p>';
  };

