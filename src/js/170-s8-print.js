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
      await wait(300); doPrint(); watchPrinterAfterPrint();
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
  function showPrinterAlert(j) {
    $('#palert-what').textContent = j.error ? j.error : (j.detail || '프린터 오류') + (j.name ? ` (${j.name.slice(0, 24)})` : '');
    $('#printer-alert').classList.add('on'); buzz();
    clearInterval(palertPoll);
    palertPoll = setInterval(() => localJson('/printer/status').then(k => { if (k && !k.error && !PRINTER_BAD.includes(k.status)) { hidePrinterAlert(); toast('프린터가 준비됐어요'); } }).catch(() => {}), 10000);   // 고쳐지면 저절로 닫힘
  }
  function hidePrinterAlert() { $('#printer-alert').classList.remove('on'); clearInterval(palertPoll); palertPoll = null; }
  $('#btn-palert-ok').addEventListener('click', () => { pop(); hidePrinterAlert(); });
