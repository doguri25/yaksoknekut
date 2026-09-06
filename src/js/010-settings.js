  /* ===================== 설정 (사진은 저장하지 않음) ===================== */
  const DEFAULTS = { showCutSelect: true, defaultCuts: 4, frames: {}, cats: {}, brightness: 0, volume: 2, printCount: 0, maxCopies: 2, autoFull: true, voice: true, frameSet: 'promise', schoolName: '홍북초등학교', campaignLine: '우리 반은 서로를 지켜요', countdown: 3, shutterSound: 'classic', countSound: 'beep', theme: 'mint', bodyFont: 'maple', autoRestart: true, showPoses: true, anim: true, season: 'auto', cameraId: '', mirror: true, output: 'print', boardSeconds: 8, printScale: 100, lockPin: '', lockAfter: 0, paper: null, attract: 0, hiRes: true, burst: false, autoLevel: true, printSharpen: true, retakeOne: false, stamp: false, queueWatch: true, paperCheck: false, camWatch: true, hero: {}, promises: {}, promiseLabels: {} };
  /* 저장 위치 — 브라우저 저장소(localStorage) + 윈도우 앱이면 실행기 파일(settings.json).
     학교 컴퓨터는 크롬이 닫힐 때 사이트 데이터를 지우는 정책이 걸려 있거나 저장소 쓰기가 막힌 경우가 있어,
     윈도우 앱에서는 실행기에 둔 사본을 먼저 믿고 켤 때 되살린다. */
  const STORE = { where: '브라우저', mirror: '', restored: false };   // 교사 메뉴 '설정 보관' 표시용
  let settings = loadSettings();
  function loadSettings() {
    let local = null;
    try { const j = localStorage.getItem('yaksok-settings'); if (j) local = JSON.parse(j); } catch (e) {}
    let mirror = null;
    if (QUIT_PORT && LV) {   // 실행기 사본을 (켤 때 한 번) 동기적으로 읽음 — 첫 화면부터 되살린 설정으로
      try { const x = new XMLHttpRequest(); x.open('GET', LOCAL + '/settings/load', false); x.send(); if (x.status === 200 && x.responseText && x.responseText !== 'null') mirror = JSON.parse(x.responseText); STORE.where = '실행기 파일 + 브라우저'; } catch (e) { STORE.where = '브라우저 (실행기 연결 안 됨)'; }
      if (mirror && typeof mirror === 'object' && (!local || (mirror._ts || 1) >= (local._ts || 0))) { STORE.restored = !local || (mirror._ts || 1) > (local._ts || 0); local = mirror; }
    }
    return Object.assign({}, DEFAULTS, local || {});
  }
  if (QUIT_PORT && LV && STORE.restored) { try { localStorage.setItem('yaksok-settings', JSON.stringify(settings)); } catch (e) {} }
  let mirrorT = null;
  function saveSettings() {
    settings._ts = Date.now();   // 마지막으로 바꾼 때 — 실행기에 둔 사본과 비교용
    try { localStorage.setItem('yaksok-settings', JSON.stringify(settings)); } catch (e) {}
    if (QUIT_PORT && LV) { clearTimeout(mirrorT); mirrorT = setTimeout(flushSettings, 300); }   // 윈도우 앱: 실행기 파일(settings.json)에도 사본 저장
    $('#app').classList.toggle('haslock', !!settings.lockPin);
    if ($('#app').dataset.screen === 's10') refreshTBar();
  }
  // 설정 사본을 실행기에 보냄 (바꾼 뒤·앱을 닫거나 다시 열기 직전 — 크롬이 저장소를 못 써도 사라지지 않게)
  function flushSettings(beacon) {
    clearTimeout(mirrorT); if (!(QUIT_PORT && LV)) return;
    const body = JSON.stringify(settings), stamp = () => new Date().toTimeString().slice(0, 8);
    try {
      if (beacon) { STORE.mirror = (navigator.sendBeacon(LOCAL + '/settings/save', body) ? '보냄 ' : '실패 ') + stamp(); return; }
      fetch(LOCAL + '/settings/save', { method: 'POST', body, keepalive: true }).then(r => r.json()).then(j => { STORE.mirror = (j && j.ok ? '저장됨 ' : '실패 ') + stamp(); const e = document.getElementById('store-state'); if (e) e.textContent = storeText(); }).catch(() => { STORE.mirror = '실패 ' + stamp(); });
    } catch (e) { STORE.mirror = '실패 ' + stamp(); }
  }
  /* ---------- 설정 백업 코드 — 교사 메뉴 › 학교·기록·앱. 기기에 매인 값(카메라·목소리·인쇄 매수)과 비밀번호는 넣지 않음 ---------- */
  const BACKUP_SKIP = ['printCount', '_ts', 'cameraId', 'voiceName', 'lockPin', 'lockAfter'];
  const b64 = { enc: u8 => btoa(Array.from(u8, c => String.fromCharCode(c)).join('')), dec: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)) };
  async function pipeBytes(u8, kind) { const cs = kind === 'deflate' ? new CompressionStream('deflate-raw') : new DecompressionStream('deflate-raw'); const w = cs.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }
  async function makeBackupCode() {
    const o = {}; Object.keys(settings).forEach(k => { if (!BACKUP_SKIP.includes(k)) o[k] = settings[k]; }); o._v = APP_VERSION; o._d = todayKey();
    const raw = new TextEncoder().encode(JSON.stringify(o));
    try { if (window.CompressionStream) return 'YK2.' + b64.enc(await pipeBytes(raw, 'deflate')); } catch (e) {}
    return 'YK1.' + b64.enc(raw);
  }
  async function readBackupCode(text) {
    const m = String(text || '').replace(/\s+/g, '').match(/YK([12])\.([A-Za-z0-9+/=]+)/); if (!m) throw new Error('코드 모양이 아니에요');
    let raw = b64.dec(m[2]); if (m[1] === '2') raw = await pipeBytes(raw, 'inflate');
    const o = JSON.parse(new TextDecoder().decode(raw)); if (!o || typeof o !== 'object' || !('frameSet' in o || 'schoolName' in o)) throw new Error('약속네컷 설정 코드가 아니에요');
    return o;
  }
  function applyBackup(o) {
    const keep = {}; BACKUP_SKIP.forEach(k => { if (k in settings) keep[k] = settings[k]; });
    delete o._v; delete o._d; settings = Object.assign({}, DEFAULTS, o, keep); saveSettings(); applyTexts(); applyTheme();
  }
  const storeText = () => QUIT_PORT ? (LV ? `실행기 v${LV} · 사본 ${STORE.mirror || (STORE.restored ? '복구됨' : '아직 없음')}` : '옛 실행기 — 브라우저에만 저장돼요. 새 약속네컷.exe로 바꾸면 실행기 파일에도 보관해요') : '이 브라우저의 사이트 데이터에 저장돼요';
  window.addEventListener('pagehide', () => flushSettings(true));
  const frameOn = f => settings.frames[f.id] !== false;
  const catOn = c => settings.cats[c.id] !== false;

