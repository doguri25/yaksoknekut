  /* ===================== 시작 ===================== */
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('40px "Jua"'), document.fonts.load('40px "Gowun Dodum"')]).then(() => { if (current === 's2') ENTER.s2(); }).catch(() => {});
  }
  window.addEventListener('resize', () => { if (current === 's0' && typeof seasonStart === 'function') { seasonStart(); drawMoodArt(moodOf()); } if (current === 's7') { fitCanvas(dcv); cW = dcv.width; cH = dcv.height; rebuildBase(); renderDecor(); } if (current === 's6') { fitCanvas($('#filter-preview')); compose($('#filter-preview')); } if (current === 's8') ENTER.s8(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (current === 's4')) go('s0'); });
  // 팝업이 열리면 앱 상자 밖 여백까지 같은 톤으로 덮기 (앱은 배율 조정된 상자라 밖은 따로 덮어야 함)
  const backdrop = document.createElement('div'); backdrop.id = 'backdrop'; document.body.appendChild(backdrop);
  new MutationObserver(() => { backdrop.classList.toggle('on', !!document.querySelector('#app .overlay.on:not(#orient)')); })
    .observe($('#app'), { attributes: true, subtree: true, attributeFilter: ['class'] });
  // 키오스크용: 마우스 오른쪽 클릭 메뉴와 길게 눌러 나오는 시스템 메뉴, 드래그로 이미지 끌기 막기
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart', e => e.preventDefault());
  // 예상 못 한 오류 → 오류 화면 + 20초 뒤 자동 다시 시작 (행사 중 부스가 굳은 채 방치되지 않게). 2분 안에 3번 반복되면 자동 재시작은 멈추고 단추만 남김
  (() => {
    let shown = false, crashT = null;
    const BENIGN = /AbortError|NotAllowedError|play\(\) request was interrupted|ResizeObserver loop|Script error\.?$/;
    const crashLog = () => { try { const a = JSON.parse(sessionStorage.getItem('yaksok-crashes') || '[]').filter(t => Date.now() - t < 120000); return a; } catch (e) { return []; } };
    const restartApp = () => { flushSettings(true); setTimeout(() => location.reload(), 200); };
    function showCrash(msg) {
      if (shown) return; shown = true;
      const log = crashLog(); log.push(Date.now()); try { sessionStorage.setItem('yaksok-crashes', JSON.stringify(log)); } catch (e) {}
      $('#crash-detail').textContent = String(msg || '').slice(0, 160) + ` · v${APP_VERSION}`;
      $('#crash').classList.add('on');
      if (log.length >= 3) { $('#crash-sub').textContent = '같은 문제가 반복되고 있어요 — [지금 다시 시작]을 누르거나, 계속되면 앱을 끄고 다시 켜 주세요'; return; }
      let n = 20; $('#crash-n').textContent = n;
      crashT = setInterval(() => { n--; $('#crash-n').textContent = Math.max(0, n); if (n <= 0) { clearInterval(crashT); restartApp(); } }, 1000);
    }
    $('#btn-crash-restart').addEventListener('click', () => { clearInterval(crashT); restartApp(); });
    window.addEventListener('error', e => { if (!e.error) return; const m = (e.error && e.error.message) || e.message || ''; if (BENIGN.test(m)) return; showCrash(m); });
    window.addEventListener('unhandledrejection', e => { const r = e.reason; if (!(r instanceof Error)) return; if (BENIGN.test(r.name + ' ' + r.message)) return; showCrash(r.message); });
    window.__yaksokCrash = showCrash;   // 점검용
  })();
  window.__yaksok = { get state() { return S; }, get settings() { return settings; }, go, applyPixelFilter, FILTER_OK, version: APP_VERSION, frames: FRAMES, compose, draw: DRAW, capture, autoLevel, sharpness, setExeReady, idleFor: ms => { lastActive = Date.now() - ms; }, get exeReady() { return exeReady; }, ensureFont, ensureAllFonts, localJson, tts: { pickVoice, setVoices: a => { voices = a; }, get status() { return ttsStatus; }, dev: DEV } };   // 점검용
  go('s0');
  $('#app').classList.toggle('haslock', !!settings.lockPin);
  if (settings.lockPin) showLock('unlock');   // 잠금 비밀번호가 있으면 켤 때 번호판부터
