  /* ===================== 시작 도우미 · 문제 정보 복사 ===================== */
  // 시작 도우미: 교사 메뉴에서 열어 ① 기본 프린터 → ② 용지·인쇄 크기 → ③ 테스트 인쇄·카메라 를 순서대로 확인 (처음 설치할 때 한 번)
  let wizStep = 1, wizQT = null;
  const wizEsc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function openWizard(step) { wizStep = step || 1; $('#wizard').classList.add('on'); renderWizard(); }
  function closeWizard() { $('#wizard').classList.remove('on'); clearInterval(wizQT); wizQT = null; }
  // 테스트 인쇄: 지금 세트의 첫 액자 예시 한 장을 기본 프린터로 (교사 메뉴 [테스트 인쇄]와 시작 도우미가 같이 씀)
  function testPrint() {
    const set = settings.frameSet || 'promise', f = FRAMES.find(x => x.set === set) || FRAMES[0];
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    compose(c, { frame: f, placeholder: true, print: true });
    const area = $('#print-area'); area.innerHTML = '<div class="pg"><img alt="테스트 인쇄"></div>';
    const img = area.querySelector('img'); img.src = c.toDataURL('image/jpeg', .92);
    img.decode().catch(() => {}).then(() => { doPrint(); fitApp(); refitSoon(); }); usePaper(1); saveSettings();
    const pp = document.getElementById('paper-n'); if (pp) pp.textContent = settings.paper == null ? '' : settings.paper;
  }
  function renderWizard() {
    const body = $('#wiz-body'), win = !!(QUIT_PORT && LV);
    $$('#wiz-steps b').forEach(b => { const n = +b.dataset.step; b.classList.toggle('on', n === wizStep); b.classList.toggle('done', n < wizStep); });
    $('#wiz-prev').style.display = wizStep > 1 ? '' : 'none';
    $('#wiz-next').textContent = wizStep < 3 ? '다음' : '완료';
    const ps = `<span class="wiz-ps"><button class="tround" data-w="ps-" aria-label="작게">−</button><span class="stat" id="wiz-psv">${clamp(+settings.printScale || 100, 90, 110)}%</span><button class="tround" data-w="ps+" aria-label="크게">+</button></span>`;
    if (wizStep === 1) {
      body.innerHTML = `
        <h3>① 프린터 연결<small>${win ? (PDLG ? '지금 인쇄 방식: 프린터 선택창 — [뽑기]마다 프린터를 고르는 창이 떠요' : '지금 인쇄 방식: 기본 프린터로 바로 출력 — 윈도우 기본 프린터가 포토프린터여야 해요') : BRIDGE ? '안드로이드 앱 — [뽑기]를 누르면 인쇄창에서 프린터를 고릅니다' : '브라우저 — [뽑기]를 누르면 인쇄창에서 프린터를 고릅니다'}</small></h3>
        ${win ? `<div class="wiz-stat" id="wiz-pr"><i></i><div><b>기본 프린터</b><span>확인 중…</span></div><button class="btn sec tiny" data-w="recheck">다시 확인</button></div>` : `<div class="wiz-stat info"><i></i><div><b>확인창 없이 바로 뽑으려면 윈도우 앱</b><span>약속네컷.exe로 실행하면 [뽑기]에서 윈도우 기본 프린터로 바로 출력돼요. 브라우저에서는 처음 한 번 인쇄창에서 프린터·용지를 고르면 다음부터 같은 설정이 유지돼요.</span></div></div>`}
        <ol class="wiz-list">
          <li>포토프린터(예: <b>Canon SELPHY CP1500</b>)를 컴퓨터에 <b>USB로 연결</b>하고 전원을 켜요. (Wi-Fi 연결은 끊기기 쉬워요)</li>
          <li>윈도우 <span class="wiz-kbd">설정</span> › <span class="wiz-kbd">Bluetooth 및 장치</span> › <span class="wiz-kbd">프린터 및 스캐너</span>에서 그 프린터를 눌러 <b>[기본값으로 설정]</b>. 단추가 없으면 목록 아래 '<b>Windows에서 기본 프린터를 관리</b>'를 먼저 꺼요.</li>
          <li>${win ? '[다시 확인]을 눌러 위 줄에 그 프린터가 <b>준비됨</b>으로 나오면 [다음].' : '프린터가 켜져 있고 컴퓨터에 보이면 [다음].'}</li>
        </ol>
        ${win && !PDLG ? `<p class="wiz-note">프린터가 여러 대라 [뽑기]마다 고르고 싶으면 교사 메뉴 › 완성·인쇄 › 인쇄 방식을 '프린터 선택창 뜨기'로 바꿔요. 실행기가 켤 때마다 크롬이 기억한 다른 프린터(알PDF 등)를 지우고 기본 프린터로 맞추니, 기본 프린터만 맞으면 돼요.</p>` : ''}`;
      if (win) wizPrinter();
    } else if (wizStep === 2) {
      body.innerHTML = `
        <h3>② 용지와 인쇄 크기<small>인화지는 4×6인치(엽서 크기) · 사진은 테두리 없이 가로로 꽉 차게</small></h3>
        <ol class="wiz-list">
          <li>윈도우 <span class="wiz-kbd">설정</span> › <span class="wiz-kbd">프린터 및 스캐너</span> › (프린터) › <b>인쇄 기본 설정</b>에서 용지 크기 <b>4×6 in (엽서·KG)</b>, <b>테두리 없음</b>, 방향 <b>가로</b>로 맞춰요. 셀피(SELPHY)는 용지 '<b>엽서 크기</b>' + '<b>테두리 없음 인쇄</b>' 켬.</li>
          <li>앱의 <b>인쇄 크기</b> ${ps} — 테스트 인쇄에서 사진 <b>가장자리가 잘리면 −</b>, <b>흰 테두리가 남으면 +</b> (2%씩). 보통은 100% 그대로.</li>
          <li>인화지 팩(36장 등)을 넣었다면 교사 메뉴 › 완성·인쇄 › <b>인화지 잔량</b>에 [+36장]을 눌러 두면 인쇄마다 줄고 5장 이하일 때 첫 화면에 표시돼요. (선택)</li>
        </ol>
        <p class="wiz-note">용지 설정이 A4로 남아 있으면 사진이 아주 작게 나오거나 잘려요. 프린터 드라이버의 기본 설정과 앱 인쇄 크기는 이 컴퓨터에 저장되니 한 번만 맞추면 돼요.</p>`;
    } else {
      body.innerHTML = `
        <h3>③ 테스트 인쇄와 카메라<small>실제로 한 장 뽑아 보고, 카메라가 켜지는지 확인해요</small></h3>
        <div class="wiz-row"><button class="btn small" data-w="testprint">테스트 인쇄</button><span class="wiz-msg" id="wiz-tp">액자 예시 한 장을 ${win && !PDLG ? '기본 프린터로 바로 보내요' : '인쇄창으로 보내요 — 프린터와 용지(4×6)를 고르고 [인쇄]'} (인화지 1장)</span></div>
        <div class="wiz-row"><button class="btn sec small" data-w="camcheck">카메라 확인</button><span class="wiz-msg" id="wiz-cam">${camInfo.label ? `${wizEsc(camInfo.label)} ${camInfo.w}×${camInfo.h}${camInfo.note ? ' · ' + wizEsc(camInfo.note) : ''}` : '카메라를 켜서 이름과 해상도를 확인해요 (다른 앱이 카메라를 쓰고 있으면 안 켜져요)'}</span></div>
        <div class="wiz-row"><button class="btn sec small" data-w="diag">문제 정보 복사</button><span class="wiz-msg">안 될 때 이걸 눌러 복사한 내용을 만든 사람(${AUTHOR.email})에게 보내 주세요 — 버전·프린터·카메라·설정이 한 번에 들어가요</span></div>
        <p class="wiz-note">사진이 잘 나왔으면 끝! [완료]를 누르면 첫 화면에서 학생이 바로 쓸 수 있어요. 가장자리가 잘리거나 흰 테두리가 남으면 [이전]에서 인쇄 크기를 조정해요. 잠금 비밀번호(교사 메뉴 › 잠금)를 정해 두면 학생이 설정을 못 건드려요.</p>`;
    }
    body.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => wizAction(b)));
  }
  function wizPrinter() {
    const st = $('#wiz-pr'); if (!st) return;
    st.className = 'wiz-stat'; st.querySelector('span').textContent = '확인 중…';
    localJson('/printer/status', 9000).then(j => {
      if (!st.isConnected) return;
      const ok = !j.error && (j.status === 'ready' || j.status === 'printing');
      st.className = 'wiz-stat ' + (ok ? 'ok' : 'warn');
      st.querySelector('b').textContent = j.name ? j.name : '기본 프린터';
      st.querySelector('span').textContent = j.error ? j.error : `${j.detail || j.status}${ok ? ' — 이 프린터로 나가요' : ''}${j.fixed ? ' · 크롬이 기억한 다른 프린터 대신 이 프린터로 맞췄어요' : ''}`;
    }).catch(() => { if (st.isConnected) { st.className = 'wiz-stat warn'; st.querySelector('span').textContent = '실행기와 연결되지 않아요 — 약속네컷.exe로 다시 실행해 보세요'; } });
  }
  function wizAction(b) {
    const a = b.dataset.w;
    if (a === 'recheck') { pop(); wizPrinter(); }
    else if (a === 'ps+' || a === 'ps-') { settings.printScale = clamp((+settings.printScale || 100) + (a === 'ps+' ? 2 : -2), 90, 110); saveSettings(); $('#wiz-psv').textContent = settings.printScale + '%'; const ps = document.getElementById('ps'); if (ps) ps.textContent = settings.printScale + '%'; }
    else if (a === 'testprint') {
      pop(); testPrint(); const m = $('#wiz-tp'); m.className = 'wiz-msg'; m.textContent = '프린터로 보냈어요 — 30~60초 뒤 나와요. 안 나오면 프린터 전원·용지를 확인하세요';
      if (typeof QUEUE_OK !== 'undefined' && QUEUE_OK) {   // 대기열을 60초 동안 지켜보며 상태를 보여 줌
        clearInterval(wizQT); const t0 = Date.now(); let seen = false;
        wizQT = setInterval(() => localJson('/printer/queue', 3000).then(q => {
          if (!m.isConnected) { clearInterval(wizQT); return; }
          if (q.error) return;
          if (q.jobs > 0) { seen = true; m.textContent = `대기열 ${q.jobs}장 · ${q.detail}${q.problem ? ' — 프린터를 확인하세요' : ''}`; m.className = 'wiz-msg' + (q.problem ? ' warn' : ''); }
          else if (seen) { m.textContent = '프린터로 다 보냈어요 — 사진이 나왔나요? 잘리거나 흰 테두리가 남으면 [이전]에서 인쇄 크기를 조정해요'; m.className = 'wiz-msg ok'; clearInterval(wizQT); }
          if (Date.now() - t0 > 90000) clearInterval(wizQT);
        }).catch(() => {}), 3000);
      }
    }
    else if (a === 'camcheck') { pop(); const m = $('#wiz-cam'); m.textContent = '카메라를 켜는 중…'; m.className = 'wiz-msg'; ensureCamera().then(ok => { stopCamera(); if (!m.isConnected) return; m.className = 'wiz-msg ' + (ok ? 'ok' : 'warn'); m.textContent = ok ? `카메라 OK — ${camInfo.label || '자동'} ${camInfo.w}×${camInfo.h}${camInfo.note ? ' · ' + camInfo.note : ''}` : '카메라를 켤 수 없어요 — USB 연결, 다른 앱(줌·카메라)이 쓰고 있는지 확인'; }); }
    else if (a === 'diag') { copyDiag(b); }
  }
  $('#wiz-close').addEventListener('click', () => { pop(); closeWizard(); });
  $('#wiz-prev').addEventListener('click', () => { pop(); if (wizStep > 1) { wizStep--; renderWizard(); } });
  $('#wiz-next').addEventListener('click', () => { pop(); if (wizStep < 3) { wizStep++; renderWizard(); } else { closeWizard(); toast('준비 끝! 첫 화면에서 학생이 바로 쓸 수 있어요'); } });
  $('#wizard').addEventListener('click', e => { if (e.target === e.currentTarget) closeWizard(); });

  // 문제 정보: 앱·실행기 버전, 기기, 프린터·대기열·카메라 상태, 설정 요약, 최근 오류 — 사진·이름 같은 개인 정보는 없음
  async function diagText() {
    const L = [], s = settings, now = new Date(), pad = n => String(n).padStart(2, '0');
    L.push(`약속네컷 문제 정보 · ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`);
    L.push(`앱 ${APP_VERSION} (${BUILD_DATE}) · 실행기 ${LV || (QUIT_PORT ? '옛 버전(버전 모름)' : '없음')} · ${BRIDGE ? '안드로이드 앱' : KIOSK ? (PDLG ? '윈도우 앱 · 프린터 선택창' : '윈도우 앱 · 기본 프린터 자동 출력') : '브라우저'} · ${DEV.label}`);
    L.push(`화면 ${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight} · 배율 ${devicePixelRatio} · 모니터 ${MONITOR}/${MONITORS} · 앱 켠 지 ${Math.round(performance.now() / 60000)}분 · 화면 ${typeof current === 'string' ? current : '?'}`);
    L.push(`브라우저: ${UA.replace(/^Mozilla\/5\.0\s*/, '').slice(0, 140)}`);
    L.push(`카메라: ${camInfo.label ? `${camInfo.label} ${camInfo.w}×${camInfo.h}` : '아직 안 켬'}${camInfo.note ? ' · ' + camInfo.note : ''}${s.cameraId ? ' · 교사가 고른 카메라' : ' · 자동'} · 거울 ${s.mirror === false ? '끔' : '켬'} · 밝기 ${s.brightness || 0}`);
    const q = [s.hiRes !== false && '고화질', s.burst && '연속3장', s.autoLevel !== false && '자동보정', s.printSharpen !== false && '인쇄선명'].filter(Boolean).join('/');
    L.push(`설정: 세트 ${s.frameSet} · 완성 ${s.output || 'print'} · 최대 ${s.maxCopies}장 · 인쇄 크기 ${s.printScale || 100}% · 컷 수 화면 ${s.showCutSelect ? '켬' : `끔(${s.defaultCuts}컷)`} · 카운트 ${s.countdown}초 · 소리 ${s.volume} · 음성 ${s.voice ? '켬' : '끔'}${s.voiceName ? `(${s.voiceName})` : ''} · 잠금 ${s.lockPin ? '있음' : '없음'} · 자동잠금 ${s.lockAfter || 0}분 · 테마 ${s.theme} · 글꼴 ${s.bodyFont} · 품질 ${q} · 한컷다시 ${s.retakeOne ? '켬' : '끔'} · 도장 ${s.stamp ? '켬' : '끔'} · 인화지 ${s.paper == null ? '안 씀' : s.paper + '장'} · 대기화면 ${s.attract || 0} · 자동재시작 ${s.autoRestart === false ? '끔' : '켬'} · 움직임 ${s.anim === false ? '끔' : '켬'}`);
    L.push(`설정 보관: ${storeText()} · 누적 인쇄 ${s.printCount || 0}장`);
    try { const st = loadStats(), td = st.days[todayKey()] || { done: 0, prints: 0, board: 0 }; L.push(`오늘 기록: 완성 ${td.done} · 인쇄 ${td.prints} · 칠판 ${td.board || 0}`); } catch (e) {}
    const errs = recentErrors();
    L.push(errs.length ? `최근 오류 ${errs.length}건: ` + errs.map(e => `[${new Date(e.t).toLocaleString('ko-KR', { hour12: false })} v${e.v} ${e.s}] ${e.m}`).join(' | ') : '최근 오류: 없음');
    if (QUIT_PORT) {
      try {
        const d = await localJson('/diag', 5000);
        L.push(`실행기: ${d.launcher} · ${d.browser} · 뜻하지 않게 닫혀 다시 연 횟수 ${d.relaunches} · 켠 지 ${Math.round(d.uptimeSec / 60)}분 · 앱 파일 ${d.current}(내장 ${d.embedded}) · 폴더 ${d.dir} · 설정 ${JSON.stringify(d.config || {})}`);
        if (d.printer) L.push(`프린터: ${d.printer.name || '-'} · ${d.printer.error || d.printer.detail || d.printer.status}${d.printer.fixed ? ' · 크롬 기억 프린터를 기본 프린터로 맞춤' : ''}`);
        if (d.queue) L.push(`대기열: ${d.queue.error || `${d.queue.jobs}장 · ${d.queue.detail}${d.queue.oldestSec ? ` · 가장 오래된 작업 ${d.queue.oldestSec}초` : ''}${d.queue.paused ? ' · 일시 중지' : ''}`}`);
      } catch (e) {   // 옛 실행기: /diag 가 없음
        try { const p = await localJson('/printer/status', 5000); L.push(`프린터: ${p.name || '-'} · ${p.error || p.detail || p.status}`); } catch (e2) { L.push('실행기: 연결 안 됨 (/printer/status 실패)'); }
        try { const u = await localJson('/update/status', 4000); L.push(`업데이트: 자동 ${u.auto ? '켬' : '끔'} · 기본 주소 ${u.isDefault ? '예' : '아니오'} · 실행기 ${u.launcher}`); } catch (e3) {}
      }
    }
    return L.join('\n');
  }
  function copyDiag(b) {
    const old = b.textContent; b.textContent = '모으는 중…'; b.disabled = true;
    diagText().then(t => {
      const done = ok => { b.textContent = old; b.disabled = false; toast(ok ? '문제 정보를 복사했어요 — 메일·카톡에 붙여 넣어 보내 주세요' : '복사가 안 돼요 — 교사 메뉴 › 기록 복사처럼 직접 복사해 주세요', 4000); };
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => done(true), () => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); done(ok); });
    }).catch(() => { b.textContent = old; b.disabled = false; toast('문제 정보를 모으지 못했어요'); });
  }

