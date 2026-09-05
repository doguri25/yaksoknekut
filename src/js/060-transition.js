  /* ===================== 화면 전환 ===================== */
  const SECTION = { s0: '#s0', s1: '#s1', s2: '#s2', s3: '#cam', s4: '#cam', s5: '#s5', s6: '#s6', s7: '#s7', s8: '#s8', s9: '#s9', s10: '#s10' };
  const STEP = { s1: ['1', '몇 칸으로 할까요?'], s2: ['2', '액자 고르기'], s5: ['5', '사진 고르기'], s6: ['6', '필터 고르기'], s7: ['7', '꾸미기'], s8: ['8', '뽑기'] };   // 촬영 화면은 카메라를 크게 쓰므로 단계 표시 없음
  const IDLE = { s1: T.idle, s2: T.idle, s5: T.idle, s6: T.idle, s8: T.idle };
  let current = 's0';
  const timers = new Set();
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function every(fn, ms) { const id = setInterval(fn, ms); timers.add(id); return id; }
  function clearTimers() { timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers.clear(); }

  const ENTER = {};
  const ORDER = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
  function go(id) {
    clearTimers(); hideWarn(); shootRun++;
    $('#app').dataset.dir = ORDER.indexOf(id) < ORDER.indexOf(current) ? 'back' : 'fwd';   // 뒤로 갈 땐 왼쪽에서 들어옴
    current = id; $('#app').dataset.screen = id;
    $$('.screen').forEach(el => el.classList.remove('on'));
    const sec = $(SECTION[id]); sec.classList.add('on');
    if (id === 's3' || id === 's4') { sec.dataset.mode = id === 's3' ? 'ready' : 'shoot'; sec.classList.toggle('nopose', settings.showPoses === false); }
    const st = STEP[id]; $('#step').classList.toggle('on', !!st);
    if (st) $('#step').innerHTML = `<b>${st[0]}</b>${st[1]}`;
    if (ENTER[id]) ENTER[id]();
    armIdle(IDLE[id]);
  }
  $$('[data-go]').forEach(b => b.addEventListener('click', () => { pop(); go(b.dataset.go); }));

  /* ---------- 자동 초기화 ---------- */
  let idleT = null, warnT = null, warnOn = false;
  function armIdle(limit) {
    clearTimeout(idleT); clearTimeout(warnT); idleT = warnT = null;
    if (!limit) return;
    warnT = setTimeout(showWarn, (limit - T.warn) * 1000);
    idleT = setTimeout(() => { hideWarn(); go('s0'); }, limit * 1000);
  }
  function showWarn() { warnOn = true; $('#warn').classList.add('on'); beep(); }
  function hideWarn() { warnOn = false; $('#warn').classList.remove('on'); }
  $('#btn-continue').addEventListener('click', () => { pop(); hideWarn(); armIdle(IDLE[current]); });
  document.addEventListener('pointerdown', () => { if (IDLE[current] && !warnOn) armIdle(IDLE[current]); }, true);

