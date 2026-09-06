  /* ===================== S8 뽑기 ===================== */
  ENTER.s8 = () => {
    $('#after').classList.remove('on'); $('#print-actions').style.display = ''; $('#copies').style.display = '';
    const pv = $('#final-preview'); fitCanvas(pv); compose(pv, { stickers: S.stickers, bg: S.paperBg, promiseText: S.promiseText, promiseInk: S.promiseInk });
    const max = clamp(settings.maxCopies || 1, 1, 4);
    S.copies = clamp(S.copies || 1, 1, max);
    const box = $('#copies'); box.classList.toggle('on', max > 1);
    const out = settings.output || 'print';
    if (out === 'board') box.classList.remove('on');   // 칠판에만 보여 줄 땐 매수 선택 없음
    $('#btn-print').innerHTML = (out === 'board' ? ic('board') : ic('printer')) + (out === 'board' ? ' 칠판에 보기' : ' 뽑기');
    $('#copies-seg').innerHTML = Array.from({ length: max }, (_, i) => `<button data-v="${i + 1}" class="${S.copies === i + 1 ? 'on' : ''}">${i + 1}장</button>`).join('');
    $$('#copies-seg button').forEach(b => b.addEventListener('click', () => { pop(); S.copies = +b.dataset.v; $$('#copies-seg button').forEach(x => x.classList.toggle('on', x === b)); }));
  };
  $('#btn-more').addEventListener('click', () => { pop(); decorLimit = T.decorateMore; go('s7'); });
  $('#btn-print').addEventListener('click', async () => {
    pop(); const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    compose(c, { stickers: S.stickers, print: true, bg: S.paperBg, promiseText: S.promiseText, promiseInk: S.promiseInk });
    const url = c.toDataURL('image/jpeg', .95);
    const out = settings.output || 'print', doP = out !== 'board', doB = out !== 'print';
    const n = doP ? clamp(S.copies || 1, 1, 4) : 0;
    if (doP) {
      const area = $('#print-area'); area.innerHTML = '';
      const imgs = [];
      for (let i = 0; i < n; i++) { const pg = document.createElement('div'); pg.className = 'pg'; const img = new Image(); img.alt = '인쇄용 사진'; img.src = url; pg.appendChild(img); area.appendChild(pg); imgs.push(img); }
      try { await Promise.all(imgs.map(i => i.decode())); } catch (e) {}
      settings.printCount = (settings.printCount || 0) + n; usePaper(n); saveSettings();
      lastPrint = { url, when: new Date(), frame: S.frame ? S.frame.name : '' };   // 다시 뽑기용 (앱을 끄면 사라짐)
    }
    recordFinish(n, doB);
    $('#after-text').innerHTML = doP ? ((n > 1 ? `사진 ${n}장이 나와요<br>` : '프린터에서 나와요<br>') + '선생님께 받아 가세요') : '와, 멋진 사진!<br>칠판을 봐요';
    $('#print-actions').style.display = 'none'; $('#copies').style.display = 'none'; $('#after').classList.add('on'); chime(); burstConfetti();
    speak(doP ? VOICE.printed : VOICE.board);
    armIdle(null);
    if (doP) {
      await wait(300); doPrint(); watchPrinterAfterPrint(); watchQueueAfterPrint();
      // 인쇄창 때문에 전체 화면이 풀리며 창 크기가 바뀐 경우: 화면 배율을 바로 다시 맞추고 전체 화면 복귀를 시도
      fitApp(); refitSoon();
      if (fullWanted && settings.autoFull) enterFull();
    }
    if (doB) { await wait(doP ? 700 : 350); if (current === 's8') await showBoard(url); }   // 칠판에 크게 보여 주기
    if (current === 's8') later(() => go('s9'), doB ? 150 : 1200);   // 곧바로 완료 화면으로 (누르면 더 빨리)
  });

  // 인쇄 축하 색종이 (1.8초)
  // 박수 소리: 짧은 잡음 여러 번 (1.6초)
  function applause() {
    if (!vol()) return; const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * .05), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    for (let i = 0; i < 46; i++) {
      const src = a.createBufferSource(); src.buffer = buf;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 1800; f.Q.value = .8;
      const g = a.createGain(); g.gain.value = (.18 + Math.random() * .22) * vol();
      src.connect(f); f.connect(g); g.connect(a.destination); src.start(a.currentTime + Math.random() * 1.6);
    }
  }
  // 완성 사진을 칠판(화면 전체)에 크게 보여 주기 — 시간이 지나거나 화면을 누르면 끝
  function showBoard(url) {
    return new Promise(res => {
      const b = $('#board'); $('#board-img').src = url; b.classList.add('on');
      chime(); setTimeout(applause, 250); burstConfetti($('#board-fx'), 2600, 140);
      let done = false; const finish = () => { if (done) return; done = true; b.classList.remove('on'); b.onclick = null; res(); };
      b.onclick = finish; setTimeout(finish, clamp(settings.boardSeconds || 8, 3, 30) * 1000);
    });
  }
  function burstConfetti(target, ms, count) {
    const c = target || $('#confetti'), W = c.clientWidth || 1280, H = c.clientHeight || 800; c.width = W; c.height = H; c.classList.add('on');
    const DUR = ms || 1800, N = count || 90, scr = current;
    const ctx = c.getContext('2d'), cols = ['#FF6B6B', '#6FB8FF', '#FFE66D', '#7ED6BE', '#B39DFF', '#FF9ECF'];
    const ps = Array.from({ length: N }, () => ({ x: W * .5 + (Math.random() - .5) * W * .5, y: H * .45, vx: (Math.random() - .5) * 14, vy: -10 - Math.random() * 12, g: .35 + Math.random() * .2, r: 6 + Math.random() * 6, a: Math.random() * Math.PI, va: (Math.random() - .5) * .3, col: cols[Math.floor(Math.random() * 6)], round: Math.random() < .3 }));
    const t0 = performance.now();
    (function frame(t) {
      const k = (t - t0) / DUR; ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - k); ctx.fillStyle = p.col; if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.r * .6, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.r, -p.r * .5, p.r * 2, p.r); ctx.restore(); });
      if (k < 1 && current === scr) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); if (!target) c.classList.remove('on'); }
    })(t0);
  }


  // 뽑은 뒤 프린터 상태 확인 — 용지 없음·걸림·오프라인이면 화면에 크게 알림 (윈도우 앱 + 기본 프린터 자동 출력일 때만; 실행기는 20초 동안 같은 답을 주므로 6초·26초 두 번 물음)
  let palertT = [], palertPoll = null;
  const PRINTER_BAD = ['offline', 'paper', 'jam', 'error'];
  function watchPrinterAfterPrint() {
    if (!(KIOSK && QUIT_PORT && LV && !PDLG)) return;
    palertT.forEach(clearTimeout); palertT = [];
    [6000, 26000].forEach(ms => palertT.push(setTimeout(() => {
      if ($('#printer-alert').classList.contains('on')) return;
      localJson('/printer/status').then(j => { if (j && (j.error || PRINTER_BAD.includes(j.status))) showPrinterAlert(j); }).catch(() => {});
    }, ms)));
  }
  const PALERT_HINT = $('#palert-hint').textContent;
  function showPrinterAlert(j) {
    $('#palert-title').textContent = '프린터를 확인해 주세요'; $('#palert-hint').textContent = PALERT_HINT; $('#btn-palert-clear').style.display = 'none';
    $('#palert-what').textContent = j.error ? j.error : (j.detail || '프린터 오류') + (j.name ? ` (${j.name.slice(0, 24)})` : '');
    $('#printer-alert').classList.add('on'); buzz();
    clearInterval(palertPoll);
    palertPoll = setInterval(() => localJson('/printer/status').then(k => { if (k && !k.error && !PRINTER_BAD.includes(k.status)) { hidePrinterAlert(); toast('프린터가 준비됐어요'); } }).catch(() => {}), 10000);   // 고쳐지면 저절로 닫힘
  }
  function hidePrinterAlert() { $('#printer-alert').classList.remove('on'); clearInterval(palertPoll); palertPoll = null; pqAlert = false; }
  $('#btn-palert-ok').addEventListener('click', () => { pop(); hidePrinterAlert(); });

  // ---------- 인쇄 대기열 지켜보기 (실행기 1.10.0+) ----------
  // 뽑은 뒤 4초마다 윈도우 인쇄 대기열을 물어 오른쪽 위에 "인쇄 중 ○장"을 보이고 다 나오면 알려 줌.
  // 프린터는 '준비됨'인데 작업이 한참 그대로면(스풀러 멈춤·일시 중지·오프라인 — 행사장에서 가장 흔한 사고) "인쇄가 멈춘 것 같아요" + [대기열 비우기]
  const QUEUE_OK = !!(QUIT_PORT && LV && cmpVer(LV, '1.10.0') >= 0);
  let pqT = null, pqSeen = 0, pqUntil = 0, pqAlert = false, pqLast = null, pqAt = 0;
  const fmtSec = s => s < 60 ? `${s}초` : `${Math.floor(s / 60)}분${s % 60 ? ' ' + (s % 60) + '초' : ''}`;
  const stuckLimit = q => 90 + 50 * Math.max(0, (q.pages || 1) - 1);   // 셀피 CP1500 기준 한 장 40~60초 · 쪽수만큼 여유
  function watchQueueAfterPrint() {
    if (!QUEUE_OK || settings.queueWatch === false) return;   // 완성·인쇄 › 프린터 점검 › 대기열 감시 (기본 켬)
    pqUntil = Date.now() + 4 * 60000; pqSeen = 0;
    if (!pqT) { setTimeout(pollQueue, 1500); pqT = setInterval(pollQueue, 4000); }
  }
  async function pollQueue() {
    if (settings.queueWatch === false) { clearInterval(pqT); pqT = null; $('#pq-chip').classList.remove('on', 'bad'); if (pqAlert) hidePrinterAlert(); return; }   // 감시를 끄면 바로 멈춤
    let q; try { q = await localJson('/printer/queue', 3000); } catch (e) { return; }
    if (!q || q.error) return; pqLast = q; pqAt = Date.now();
    if (current === 's9') donePrintLine();   // 완료 화면의 '약 ○초 뒤 나와요' 줄을 대기열에 맞춰 갱신
    const chip = $('#pq-chip'), stuck = q.jobs > 0 && (!!q.problem || q.oldestSec > stuckLimit(q));
    if (q.jobs > 0) { pqSeen = Math.max(pqSeen, q.jobs); chip.querySelector('span').textContent = `인쇄 중 ${q.jobs}장`; chip.classList.add('on'); chip.classList.toggle('bad', stuck); }
    else if (chip.classList.contains('on')) { chip.classList.remove('on', 'bad'); if (pqSeen) toast('사진이 다 나왔어요'); pqSeen = 0; if (pqAlert) hidePrinterAlert(); }
    if (stuck && !$('#printer-alert').classList.contains('on')) showQueueAlert(q);
    else if (pqAlert && q.jobs > 0) $('#palert-what').textContent = queueWhat(q);   // 열려 있는 알림의 시간 표시 갱신
    if (q.jobs === 0 && Date.now() > pqUntil && pqT) { clearInterval(pqT); pqT = null; }
  }
  const queueWhat = q => (q.problem ? q.detail : `대기열에 ${q.jobs}장이 ${fmtSec(q.oldestSec)}째 그대로예요`) + (q.name ? ` (${q.name.slice(0, 24)})` : '');
  function showQueueAlert(q) {
    pqAlert = true;
    $('#palert-title').textContent = '인쇄가 멈춘 것 같아요'; $('#palert-what').textContent = queueWhat(q);
    $('#palert-hint').textContent = '프린터 전원·USB 선·용지를 확인해 주세요. 프린터는 멀쩡한데 안 나오면 [대기열 비우기]를 누른 뒤 교사 메뉴 › 완성·인쇄 › [한 장 더 뽑기]로 다시 뽑을 수 있어요';
    $('#btn-palert-clear').style.display = ''; $('#btn-palert-clear').textContent = '대기열 비우기';
    $('#printer-alert').classList.add('on'); buzz();
  }
  $('#btn-palert-clear').addEventListener('click', () => {
    pop(); const b = $('#btn-palert-clear'); b.textContent = '비우는 중…';
    localJson('/printer/queue/clear', 8000).then(q => { pqSeen = 0; toast(q.error ? q.error : q.jobs === 0 ? `대기열을 비웠어요${q.removed ? ` (${q.removed}장)` : ''}${q.resumed ? ' · 일시 중지도 풀었어요' : ''}` : q.detail, 4000); hidePrinterAlert(); pollQueue(); }).catch(() => { toast('실행기와 연결되지 않아요'); b.textContent = '대기열 비우기'; });
  });
