  /* ===================== 오디오 ===================== */
  let actx = null;
  function audio() {
    if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  const vol = () => [0, .35, .7, 1][settings.volume] || 0;
  function tone(f, dur, type, g, when) {
    if (!vol()) return; const a = audio(); if (!a) return;
    const o = a.createOscillator(), gn = a.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    o.connect(gn); gn.connect(a.destination);
    const t = a.currentTime + (when || 0);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime((g || .25) * vol(), t + .01);
    gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.start(t); o.stop(t + dur + .05);
  }
  const beep = () => { const k = settings.countSound || 'beep'; if (k === 'none') return; if (k === 'tick') tick(); else tone(880, .15); };
  function tick() {   // 짧은 '틱'
    if (!vol()) return; const a = audio(); if (!a) return;
    const n = Math.floor(a.sampleRate * .03), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = a.createBufferSource(); src.buffer = buf; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 1;
    const g = a.createGain(); g.gain.value = .8 * vol(); src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  }
  const beepGo = () => tone(1320, .3);
  const pop = () => tone(620, .08, 'square', .07);
  const buzz = () => { tone(220, .18, 'square', .08, 0); tone(200, .18, 'square', .08, .12); };   // 비밀번호 틀림
  const chime = () => { tone(784, .25, 'triangle', .2, 0); tone(988, .25, 'triangle', .2, .15); tone(1319, .5, 'triangle', .2, .3); };
  // 음성 안내 (브라우저 내장 한국어 음성 사용, 교사 메뉴에서 끄거나 목소리를 고를 수 있음)
  let voices = [], ttsStatus = '', lastUtter = null;   // lastUtter: 크롬이 말하는 도중 문장을 지워 버리는 버그 방지(참조 유지)
  const HAS_TTS = ('speechSynthesis' in window) || !!(BRIDGE && BRIDGE.speak);
  function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } return voices.length; }
  if ('speechSynthesis' in window) {
    loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {}
    // 안드로이드·아이패드는 목소리 목록이 늦게 채워지고 voiceschanged가 안 오기도 해서 몇 초 동안 다시 물어봄
    let tries = 0; const poll = setInterval(() => { if (loadVoices() || ++tries > 24) clearInterval(poll); }, 250);
  }
  const koVoices = () => voices.filter(v => /^ko/i.test(v.lang) || /korean|한국/i.test(v.name));
  // 기기별로 자연스러운 한국어 목소리 우선순위가 다름
  const VOICE_PREF = DEV.android ? [/Google.*(ko|한국|Korean)/i, /Samsung.*(ko|한국|Korean)/i, /ko[-_]kr.*local/i, /Korean|한국/i]
    : DEV.ios || DEV.mac ? [/Yuna.*(Enhanced|Premium|향상)/i, /Yuna/i, /Sora|Suhyun/i]
    : DEV.win ? [/SunHi.*Natural/i, /SunHi/i, /InJoon.*Natural/i, /Google\s*한국/i, /Heami/i]
    : [/Google\s*한국/i, /SunHi/i, /Yuna/i, /Heami/i];
  function pickVoice() {
    const ko = koVoices(); if (!ko.length) return null;
    if (settings.voiceName) { const m = ko.find(v => v.name === settings.voiceName); if (m) return m; }
    // 안드로이드·아이패드는 기기 안에 든 목소리(오프라인)를 먼저 고려 — 인터넷 목소리는 끊기기 쉬움
    const groups = (DEV.android || DEV.ios) ? [ko.filter(v => v.localService), ko.filter(v => !v.localService)] : [ko];
    for (const g of groups) for (const re of VOICE_PREF) { const m = g.find(v => re.test(v.name)); if (m) return m; }
    return groups[0][0] || ko[0];
  }
  // 첫 터치 때 한 번 빈 문장을 말하게 해서 아이패드·안드로이드의 음성 엔진을 깨움 (터치 없이 부르면 막히는 기기가 있음)
  let ttsPrimed = false;
  function primeSpeech() {
    if (ttsPrimed || !('speechSynthesis' in window) || BRIDGE) return; ttsPrimed = true;
    try { speechSynthesis.resume(); const u = new SpeechSynthesisUtterance(' '); u.lang = 'ko-KR'; u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
  }
  function speak(text) {
    if (!settings.voice || !vol() || !HAS_TTS) return;
    if (BRIDGE && BRIDGE.speak) { try { BRIDGE.speak(text); ttsStatus = '앱 음성'; } catch (e) { ttsStatus = '앱 음성 오류'; } return; }
    try {
      if (!voices.length) loadVoices();
      speechSynthesis.cancel();
      const go = () => {
        try {
          speechSynthesis.resume();
          const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.0; u.volume = vol();   // 음높이를 바꾸면 기계음이 심해져서 기본값 사용
          const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang || 'ko-KR'; }
          u.onstart = () => { ttsStatus = '정상'; }; u.onerror = e => { ttsStatus = '오류: ' + (e.error || '알 수 없음'); };
          lastUtter = u;   // 크롬이 말하는 도중 문장을 지워 버리는 버그 방지(참조 유지)
          speechSynthesis.speak(u);
        } catch (e) { ttsStatus = '오류'; }
      };
      // 안드로이드 크롬은 cancel() 직후에 바로 speak()하면 삼켜 버리는 일이 잦아 잠깐 뒤에 말함
      if (DEV.android || DEV.ios) setTimeout(go, 90); else go();
    } catch (e) { ttsStatus = '오류'; }
  }
  /* ---------- 행사 기록 (날짜별 완성·인쇄·칠판 횟수, 세트·컷·약속 문장) ---------- */
  const STATS_KEY = 'yaksok-stats';
  function loadStats() { try { const v = JSON.parse(localStorage.getItem(STATS_KEY)); return v && v.days ? v : { days: {} }; } catch (e) { return { days: {} }; } }
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  // 인화지 잔량 (교사 메뉴 › 완성·인쇄, 기본은 '안 씀'=null) — 인쇄마다 줄고 5장 이하면 첫 화면에 표시
  function usePaper(n) { if (settings.paper == null) return; settings.paper = Math.max(0, (+settings.paper || 0) - n); paperBadge(); }
  function paperBadge() { const b = document.getElementById('paper-badge'); if (!b) return; const p = settings.paper; const on = p != null && p <= 5; b.classList.toggle('on', on); if (on) b.innerHTML = p <= 0 ? '인화지가 없어요 — 선생님께 말해요' : `인화지 <b>${p}</b>장 남았어요`; }
  let lastPrint = null;   // 마지막으로 인쇄한 사진 (다시 뽑기)
  function reprintLast() {
    if (!lastPrint) return false;
    const area = $('#print-area'); area.innerHTML = '<div class="pg"><img alt="다시 뽑기"></div>'; const img = area.querySelector('img'); img.src = lastPrint.url;
    img.decode().catch(() => {}).then(() => { doPrint(); fitApp(); refitSoon(); });
    settings.printCount = (settings.printCount || 0) + 1; usePaper(1); saveSettings();
    const st = loadStats(), k = todayKey(), d = st.days[k] || (st.days[k] = { done: 0, prints: 0, board: 0, sets: {}, cuts: {}, promises: {} }); d.prints++; try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (e) {}
    return true;
  }
  function recordFinish(prints, board) {
    const st = loadStats(), k = todayKey(), d = st.days[k] || (st.days[k] = { done: 0, prints: 0, board: 0, sets: {}, cuts: {}, promises: {} });
    d.done++; d.prints += prints; if (board) d.board++;
    const set = S.frame ? S.frame.set : (settings.frameSet || 'promise'); d.sets[set] = (d.sets[set] || 0) + 1; d.cuts[S.cuts] = (d.cuts[S.cuts] || 0) + 1;
    if (S.promiseText) d.promises[S.promiseText] = (d.promises[S.promiseText] || 0) + 1;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (e) {}
  }
  function statsText() {
    const st = loadStats(), keys = Object.keys(st.days).sort(), k = todayKey(), t = st.days[k] || { done: 0, prints: 0, board: 0, sets: {}, cuts: {}, promises: {} };
    const setName = id => (FRAME_SETS.find(x => x.id === id) || { name: id }).name;
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    const all = keys.reduce((acc, d) => { const x = st.days[d]; acc.done += x.done; acc.prints += x.prints; acc.board += x.board || 0; return acc; }, { done: 0, prints: 0, board: 0 });
    const lines = [`[약속네컷 기록] ${k}`, `오늘: 완성 ${t.done}장 · 인쇄 ${t.prints}장 · 칠판 보기 ${t.board}번`];
    if (t.done) { lines.push('세트: ' + top(t.sets).map(([id, n]) => `${setName(id)} ${n}`).join(', ')); lines.push('컷 수: ' + top(t.cuts).map(([c, n]) => `${c}컷 ${n}`).join(', ')); }
    const tp = top(t.promises).slice(0, 5); if (tp.length) lines.push('많이 고른 약속: ' + tp.map(([p, n]) => `"${p}" ${n}`).join(', '));
    lines.push(`누적(${keys.length}일): 완성 ${all.done}장 · 인쇄 ${all.prints}장 · 칠판 보기 ${all.board}번`);
    return lines.join('\n');
  }

  const VOICE = {
    ready: '카메라를 봐요. 준비되면 준비됐어요 버튼을 눌러요.',
    shoot: '카메라를 보고 웃어요!',
    pick: '마음에 드는 사진을 골라요.',
    decorate: '스티커로 예쁘게 꾸며요.',
    printed: '사진을 선생님께 받아 가세요.',
    board: '와, 멋진 사진이 나왔어요!'
  };
  function shutter() {   // 셔터음: 찰칵(기본) / 삐 / 없음
    if (!vol()) return; const a = audio(); if (!a) return;
    const kind = settings.shutterSound || 'classic'; if (kind === 'none') return;
    if (kind === 'beep') { tone(1200, .12, 'square', .15); return; }
    if (kind === 'classic') {   // 원래 셔터음: 짧은 치직
      const len = Math.floor(a.sampleRate * .12), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const src = a.createBufferSource(), gn = a.createGain(); src.buffer = buf; gn.gain.value = .5 * vol(); src.connect(gn); gn.connect(a.destination); src.start(); return;
    }
    const click = (t, f, len, g) => {
      const n = Math.floor(a.sampleRate * len), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      const src = a.createBufferSource(); src.buffer = buf; const flt = a.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f; flt.Q.value = 1.2;
      const gn = a.createGain(); gn.gain.value = g * vol(); src.connect(flt); flt.connect(gn); gn.connect(a.destination); src.start(a.currentTime + t);
    };
    click(0, 2600, .035, .9); click(.085, 1400, .07, 1);          // 찰 · 칵
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine';   // 낮은 '툭'
    o.frequency.setValueAtTime(180, a.currentTime + .085); o.frequency.exponentialRampToValueAtTime(60, a.currentTime + .17);
    g.gain.setValueAtTime(.35 * vol(), a.currentTime + .085); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .22);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + .085); o.stop(a.currentTime + .24);
  }
