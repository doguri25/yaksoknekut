  /* ===================== S5 고르기 ===================== */
  ENTER.s5 = () => {
    S.picked = []; pickDone = false;   // 2컷이든 4컷이든 0장에서 시작해 누르는 순서대로 ①②③④
    speak(VOICE.pick);
    const sl = S.frame.slots[0]; $('#cards').style.setProperty('--ar', (sl.w / sl.h).toFixed(3));
    const wrap = $('#cards'); wrap.innerHTML = '';
    S.shots.forEach((shot, i) => {
      const card = document.createElement('button'); card.className = 'card';
      const c = document.createElement('canvas'); c.width = 600; c.height = Math.round(600 * sl.h / sl.w);
      drawCover(c.getContext('2d'), shot, { x: 0, y: 0, w: c.width, h: c.height });
      card.appendChild(c); card.insertAdjacentHTML('beforeend', '<span class="num"></span>');
      card.addEventListener('click', () => onCard(i));
      wrap.appendChild(card);
    });
    $('#btn-pick-ok').style.display = 'none';   // 필요한 장수를 다 고르면 저절로 넘어감
    $('#btn-retake').style.display = S.retakeUsed ? 'none' : '';
    fitCanvas($('#pick-preview'));
    updateCards();
  };
  function updateCards() {
    const need = S.cuts;
    $$('#cards .card').forEach((card, i) => {
      const k = S.picked.indexOf(i); card.classList.toggle('sel', k >= 0);
      card.querySelector('.num').textContent = k >= 0 ? '①②③④'[k] : '';
    });
    const left = need - S.picked.length;
    $('#pick-hint').textContent = left === need ? `${need}장을 순서대로 골라요` : left > 0 ? `${left}장 더 골라요` : '좋아요!';
    $('#slotboxes').innerHTML = Array.from({ length: need }, (_, i) => `<span class="${i < S.picked.length ? 'full' : ''}"></span>`).join('');
    compose($('#pick-preview'), { emptySlots: true });   // 고른 사진이 액자에 들어간 모습을 바로 보여 줌
  }
  /* ---------- 약속이 반응 ---------- */
  const BUDDY_SAY = {
    pick: ['좋아!', '잘 골랐어!', '멋지다!', '이 사진 예쁘다!', '오, 좋은데?'],
    sticker: ['귀엽다!', '와, 예쁘다!', '멋진데?', '최고야!', '잘 어울려!'],
    paper: ['색깔 예쁘다!', '분위기 좋다!', '오, 근사해!'],
    promise: ['약속 좋아!', '꼭 지키자!', '멋진 약속이야!'],
    clear: ['다시 해 보자!', '깨끗해졌다!']
  };
  let buddyT = null, buddyLast = '';
  function buddySay(kind) {
    const el = $('#buddy'); if (!el || getComputedStyle(el).display === 'none') return;
    const list = BUDDY_SAY[kind] || BUDDY_SAY.pick; let t = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && t === buddyLast) t = list[(list.indexOf(t) + 1) % list.length];
    buddyLast = t; const bub = $('#buddy-bub'); bub.textContent = t;
    // 말풍선이 오른쪽 상자(꾸미기 서랍 등)와 겹칠 것 같으면 왼쪽으로 밀고, 꼬리는 약속이 머리 위에 그대로 둠
    bub.style.left = ''; bub.style.removeProperty('--tail');
    const app = $('#app').getBoundingClientRect(), me = el.getBoundingClientRect(), sc = appScale();
    const myLeft = (me.left - app.left) / sc, appW = app.width / sc;
    let limit = appW - 16;
    const drawer = $('#drawer'); if (current === 's7' && drawer) limit = Math.min(limit, (drawer.getBoundingClientRect().left - app.left) / sc - 14);
    const over = (myLeft + 30 + bub.offsetWidth) - limit;
    if (over > 0) { const shift = Math.min(over, myLeft + 30 - 8); bub.style.left = (30 - shift) + 'px'; bub.style.setProperty('--tail', (14 + shift) + 'px'); }
    el.classList.remove('react'); void el.offsetWidth; el.classList.add('react');
    clearTimeout(buddyT); buddyT = setTimeout(() => el.classList.remove('react'), 1100);
  }
  let pickDone = false;
  function onCard(i) {
    if (pickDone) return;
    pop(); const k = S.picked.indexOf(i);
    if (k >= 0) S.picked.splice(k, 1);
    else if (S.picked.length < S.cuts) { S.picked.push(i); buddySay('pick'); }
    updateCards();
    if (S.picked.length === S.cuts) { pickDone = true; chime(); later(() => { pickDone = false; go('s6'); }, 550); }
  }
  $('#btn-pick-ok').addEventListener('click', () => { pop(); go('s6'); });
  $('#btn-retake').addEventListener('click', () => { pop(); S.retakeUsed = true; S.shots = []; go('s3'); });

