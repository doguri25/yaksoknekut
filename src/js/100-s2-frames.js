  /* ===================== S2 액자 ===================== */
  ENTER.s2 = () => {
    const set = settings.frameSet || 'promise';
    const list = FRAMES.filter(f => f.set === set && frameOn(f) && (S.photoOnly ? f.photoOnly : !f.photoOnly && f.cuts === S.cuts));   // 사진만: 그 세트의 2·3·4칸 액자
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
      b.addEventListener('click', () => { pop(); if (S.frame !== f) { S.promiseInk = null; S.inkStrokes = []; } S.frame = f; S.cuts = f.cuts; go(S.shots.length === 4 ? 's5' : 's3'); });
      wrap.appendChild(b);
    });
    if (!list.length) wrap.innerHTML = '<p class="muted">켜져 있는 액자가 없어요. 교사 메뉴에서 액자를 켜 주세요.</p>';
  };
