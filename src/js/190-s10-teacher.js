  /* ===================== S10 교사 메뉴 ===================== */
  let settingsBackup = null;   // 메뉴에 들어올 때의 설정 (취소하면 이대로 되돌림)
  let teacherTab = 'quick';
  const ICON_PATHS = {
    camera: '<path d="M17 12l3-5h8l3 5"/><rect x="4" y="12" width="40" height="29" rx="8"/><circle cx="24" cy="27" r="8"/><circle cx="37" cy="19" r="1.4" fill="currentColor"/>',
    printer: '<path d="M13 18V6h22v12"/><path d="M13 32H8a3 3 0 0 1-3-3V21a3 3 0 0 1 3-3h32a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5"/><rect x="13" y="27" width="22" height="15" rx="2"/><circle cx="37" cy="23" r="1.6" fill="currentColor"/>',
    home: '<path d="M6 22L24 7l18 15"/><path d="M11 19v22h26V19"/><path d="M20 41V29h8v12"/>',
    sparkle: '<path d="M18 5l3.6 10.4L32 19l-10.4 3.6L18 33l-3.6-10.4L4 19l10.4-3.6z"/><path d="M36 25l2.2 6 6 2.2-6 2.2-2.2 6-2.2-6-6-2.2 6-2.2z"/>',
    trash: '<path d="M8 13h32"/><path d="M18 13V8h12v5"/><path d="M12 13l2 28h20l2-28"/><path d="M20 21v13M28 21v13"/>',
    gear: '<circle cx="24" cy="24" r="8"/><path d="M37.0 24.0L42.0 24.0"/><path d="M33.2 33.2L36.7 36.7"/><path d="M24.0 37.0L24.0 42.0"/><path d="M14.8 33.2L11.3 36.7"/><path d="M11.0 24.0L6.0 24.0"/><path d="M14.8 14.8L11.3 11.3"/><path d="M24.0 11.0L24.0 6.0"/><path d="M33.2 14.8L36.7 11.3"/>',
    lock: '<rect x="9" y="21" width="30" height="21" rx="5"/><path d="M15 21v-6a9 9 0 0 1 18 0v6"/><circle cx="24" cy="31" r="2.6" fill="currentColor"/>',
    rotate: '<path d="M8 21a16 16 0 0 1 28-9"/><path d="M36 4v8h-8"/><path d="M40 27a16 16 0 0 1-28 9"/><path d="M12 44v-8h8"/>',
    arrow: '<path d="M6 24h32"/><path d="M26 11l13 13-13 13"/>',
    frame: '<rect x="5" y="8" width="38" height="32" rx="5"/><circle cx="17" cy="19" r="3.5"/><path d="M8 36l10-10 7 7 6-6 9 9"/>',
    speaker: '<path d="M6 19v10h8l11 9V10L14 19z"/><path d="M31 18a8 8 0 0 1 0 12"/><path d="M36 13a15 15 0 0 1 0 22"/>',
    palette: '<path d="M24 5C13 5 5 13 5 23c0 9 6 14 12 14 3 0 4-2 4-4 0-3 1-4 5-4h5c6 0 12-4 12-11C43 10 34 5 24 5z"/><circle cx="14" cy="21" r="2.6" fill="currentColor"/><circle cx="22" cy="12" r="2.6" fill="currentColor"/><circle cx="32" cy="15" r="2.6" fill="currentColor"/>',
    check: '<circle cx="24" cy="24" r="18"/><path d="M15 24l6 6 12-12"/>',
    undo: '<path d="M14 18H32a8 8 0 0 1 0 16H20"/><path d="M20 11l-7 7 7 7"/>',
    board: '<rect x="4" y="8" width="40" height="26" rx="4"/><path d="M18 42h12M24 34v8"/><path d="M15 26l6-7 5 5 4-4 5 6"/>',
    star: '<path d="M24 5l5.8 12 13.2 1.8-9.6 9.2 2.4 13L24 34.8 12.2 41l2.4-13L5 18.8 18.2 17z"/>',
    lines: '<path d="M8 12h32M8 24h20M8 36h26"/>'
  };
  const ic = name => `<svg class="ic" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  // 교사 메뉴 페이지 (왼쪽 세로 메뉴). id는 옛 버전과 이어지도록 print·sound·screen 유지
  const TTABS = [
    ['quick', 'star', '자주 쓰는 설정'], null,
    ['set', 'frame', '행사 세트'], ['promise', 'lines', '약속 문장'], ['shoot', 'camera', '촬영'], ['print', 'printer', '완성·인쇄'],
    ['sound', 'speaker', '소리'], ['screen', 'palette', '화면'], ['lock', 'lock', '잠금'], ['app', 'gear', '학교·기록·앱']
  ];
  function teacherChanged() {   // 메뉴에 들어온 뒤 바꾼 설정 항목 수 (인쇄 매수 제외)
    if (!settingsBackup) return 0;
    const keys = new Set([...Object.keys(settings), ...Object.keys(settingsBackup)]); let n = 0;
    keys.forEach(k => { if (k !== 'printCount' && k !== '_ts' && JSON.stringify(settings[k]) !== JSON.stringify(settingsBackup[k])) n++; });
    return n;
  }
  function refreshTBar() {
    const e = document.getElementById('tbar-count'); if (!e) return;
    const n = teacherChanged(); e.innerHTML = n ? `바꾼 항목 <b>${n}</b>개 · 저장하지 않으면 되돌아가요` : '바꾼 항목 없음';
  }
  // 액자 미리보기 그림 캐시 — 세트를 바꾸거나 메뉴를 다시 열 때마다 다시 그리지 않음 (액자 정의는 바뀌지 않음)
  const thumbCache = new Map();
  function frameThumb(f, w, h) {
    const key = `${f.id}@${w}x${h}`; let c = thumbCache.get(key);
    if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; compose(c, { frame: f, placeholder: true }); thumbCache.set(key, c); }
    return c;
  }
  ENTER.s10 = () => {
    const el = $('#teacher');
    if (!settingsBackup) settingsBackup = JSON.parse(JSON.stringify(settings));
    const set = settings.frameSet || 'promise', setName = (FRAME_SETS.find(x => x.id === set) || FRAME_SETS[0]).name;
    const setFrames = FRAMES.filter(f => f.set === set);
    const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const seg = (key, opts, cls) => `<span class="seg${cls ? ' ' + cls : ''}" data-seg="${key}">${opts.map(([v, n]) => `<button data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${n}</button>`).join('')}</span>`;
    const sw = (key, on) => `<label class="tsw"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><i></i></label>`;
    const info = id => `<button class="tinfo" data-help="${id}" aria-label="도움말">i</button>`;
    const help = (id, html) => `<div class="thelp" id="${id}">${html}</div>`;
    const row = (label, ctl, extra) => `<div class="trow"><div class="tlbl">${label}</div><div class="tctl">${ctl}</div>${extra || ''}</div>`;
    const sub = (a, b) => `${a}<small>${b}</small>`;
    const setsGrid = seg('frameSet', FRAME_SETS.map(x => [x.id, x.name]), 'tsets');
    const OUT = [['print', '인쇄'], ['board', '칠판에 크게 보기'], ['both', '인쇄하고 칠판에도']];
    const outHelp = "'칠판에 크게 보기'는 프린터 없이 화면 전체에 완성 사진을 띄우고 박수·색종이가 나와요. '인쇄하고 칠판에도'는 인쇄한 뒤 칠판에도 보여 줘요.";
    const printNote = BRIDGE ? '앱 모드로 실행 중입니다 — [뽑기]를 누르면 안드로이드 인쇄창이 뜹니다. 처음 한 번 프린터와 용지(4×6, 여백 없음)를 고르면 다음부터는 [인쇄]만 누르면 됩니다.'
      : KIOSK && PDLG ? '프린터 선택창 모드입니다 — [뽑기]를 누르면 크롬 인쇄창이 떠서 프린터를 고를 수 있어요. 용지는 4×6(엽서)·테두리 없음으로 맞추세요. 확인창 없이 바로 뽑으려면 위에서 \'기본 프린터로 바로 출력\'을 고르세요.'
      : KIOSK ? '자동 인쇄 모드로 실행 중입니다 — [뽑기]를 누르면 윈도우 기본 프린터로 확인창 없이 바로 출력됩니다. 기본 프린터의 용지가 4×6(엽서)·테두리 없음인지 한 번만 확인하세요.'
      : '인쇄창에서 프린터를 고르고 용지를 4×6(엽서)으로 맞추세요. 처음 한 번 고르면 다음부터는 같은 설정이 유지됩니다. 안드로이드 태블릿에서는 매번 인쇄창의 [인쇄]를 한 번 눌러 주어야 합니다. 확인 없이 바로 뽑으려면 윈도우 앱(약속네컷.exe)을 쓰세요.';
    const st = loadStats(), td = st.days[todayKey()] || { done: 0, prints: 0, board: 0, sets: {} };
    const topSet = Object.entries(td.sets || {}).sort((a, b) => b[1] - a[1])[0];
    const nextMon = MONITORS > 1 ? (MONITOR % MONITORS) + 1 : 0;
    const promiseList = promisesFor(set);
    const voiceNote = koVoices().length ? `이 기기의 한국어 목소리 ${koVoices().length}개` : BRIDGE ? '앱 음성을 사용합니다' : DEV.android ? '한국어 목소리를 찾지 못했어요 — 태블릿 설정 › 일반(또는 접근성) › 텍스트 음성 변환에서 한국어 음성 데이터를 설치하세요' : DEV.ios ? '한국어 목소리를 찾지 못했어요 — 설정 › 손쉬운 사용 › 음성 콘텐츠 › 음성에서 한국어를 추가하세요' : '한국어 목소리를 찾지 못했어요 — 윈도우 설정 › 시간 및 언어 › 음성에서 한국어 음성을 추가하세요';

    el.innerHTML = `
      <aside class="tside">
        <h2>교사 메뉴</h2>
        <div class="tver">v${APP_VERSION}${KIOSK ? ' · 실행기 ' + (LV || '옛 버전') : BRIDGE ? ' · 안드로이드' : ' · 브라우저'}</div>
        <nav class="tnav">${TTABS.map(t => t ? `<button class="ttab${t[0] === 'quick' ? ' star' : ''}${teacherTab === t[0] ? ' on' : ''}" data-tab="${t[0]}">${ic(t[1])}${t[2]}</button>` : '<div class="tgap"></div>').join('')}</nav>
        <div class="tfoot">
          ${QUIT_PORT && MONITORS > 1 ? `<button class="tfbtn" data-act="monnext">${MONITOR}번 모니터 → ${nextMon}번으로</button>` : ''}
          ${KIOSK ? '' : '<button class="tfbtn" data-act="full">전체 화면 켜기/끄기</button>'}
          ${settings.lockPin ? `<button class="tfbtn" data-act="locknow">${ic('lock')} 저장하고 잠그기</button>` : ''}
          <button class="tfbtn" data-act="close">앱 종료</button>
        </div>
      </aside>
      <div class="tmain" id="tmain">

        <div class="tpage" data-pane="quick">
          <div class="thead"><h3>자주 쓰는 설정</h3><span class="tdesc">행사 당일에 만지는 것만 모았어요 · 나머지는 왼쪽 메뉴에서 <button class="tlink2" data-act="wizard">처음 설치라면 → 시작 도우미</button></span></div>
          <div class="tcheck" id="tcheck">
            <span class="tchk ${camInfo.label ? 'ok' : 'ask'}"><i></i><b>카메라</b><span>${camInfo.label ? esc(camInfo.label.replace(/\s*\(.*\)$/, '').slice(0, 22)) : '아직 확인 안 됨'}</span>${camInfo.label ? '' : '<button class="tlink2" data-act="camcheck">지금 확인</button>'}</span>
            <span class="tchk ${QUIT_PORT && LV ? (PDLG ? 'ok' : 'wait') : 'info'}" id="chk-printer"><i></i><b>프린터</b><span>${BRIDGE ? '앱 인쇄창' : QUIT_PORT && LV ? (PDLG ? '뽑을 때 선택창에서 고름' : '확인 중…') : QUIT_PORT ? '옛 실행기 — 확인 불가' : '인쇄창에서 고름'}</span></span>
            <span class="tchk ${settings.paper == null ? 'info' : settings.paper <= 5 ? 'warn' : 'ok'}"><i></i><b>인화지</b><span>${settings.paper == null ? '안 씀' : settings.paper + '장'}</span></span>
            <span class="tchk ok"><i></i><b>세트</b><span>${setName}</span></span>
            <span class="tchk ${settings.volume ? 'ok' : 'warn'}"><i></i><b>소리</b><span>${['꺼짐', '작게', '보통', '크게'][settings.volume] || '보통'}${settings.volume && settings.voice ? ' · 음성' : ''}</span></span>
            <span class="tchk ok"><i></i><b>완성</b><span>${settings.output === 'board' ? '칠판에 크게' : settings.output === 'both' ? '인쇄 + 칠판' : '인쇄'}</span></span>
            <span class="tchk ${settings.lockPin ? 'ok' : 'info'}"><i></i><b>잠금</b><span>${settings.lockPin ? '설정됨' : '없음'}</span></span>
            ${exeReady ? `<span class="tchk warn"><i></i><b>${updKind === 'app' ? '앱' : '실행기'}</b><span>새 버전 ${exeReady} 준비됨</span><button class="tlink2" data-act="exerestart">지금 다시 시작</button></span>` : updBusy ? `<span class="tchk wait" id="chk-updbusy"><i></i><b>업데이트</b><span>${updBusy.kind === 'app' ? '앱' : '실행기'} ${updBusy.ver} 받는 중 ${updBusy.pct}%</span></span>` : ''}
          </div>
          <div class="tquick">
            <div class="tq wide"><h4>행사 세트 <span class="thint">세트를 고르면 그 행사의 액자·문장만 학생에게 보여요</span></h4>${setsGrid}</div>
            <div class="tq"><h4>완성 사진은 ${info('h-out1')}</h4><div class="tctl">${seg('output', OUT)}</div>${help('h-out1', outHelp)}</div>
            <div class="tq"><h4>최대 인쇄 매수</h4><div class="tctl">${seg('maxCopies', [[1, '1장'], [2, '2장'], [3, '3장'], [4, '4장']])}<span class="thint">1장이면 매수 화면 생략</span></div></div>
            <div class="tq"><h4>소리</h4><div class="tctl">${seg('volume', [[0, '꺼짐'], [1, '작게'], [2, '보통'], [3, '크게']])}<span class="tctl" style="gap:8px;flex:none;margin-left:6px"><span class="thint">음성 안내</span>${sw('voice', settings.voice)}</span></div></div>
            <div class="tq"><h4>카운트다운</h4><div class="tctl">${seg('countdown', [[3, '3초'], [5, '5초']])}<span class="thint">저학년은 5초가 여유 있어요</span></div></div>
          </div>
          <div class="ttoday"><span><b>${td.done}</b>완성</span><span><b>${td.prints}</b>장 인쇄</span><span><b>${td.board || 0}</b>칠판</span><span class="thint">오늘${topSet ? ' · ' + ((FRAME_SETS.find(x => x.id === topSet[0]) || { name: topSet[0] }).name) + ' 세트' : ''}</span><button class="tlink" data-tab="app">기록 보기 →</button></div>
        </div>

        <div class="tpage" data-pane="set">
          <div class="thead"><h3>행사 세트</h3><span class="tdesc">지금: <b>${setName}</b> · 액자 ${setFrames.length}개 중 ${setFrames.filter(frameOn).length}개 사용</span></div>
          ${row('세트', setsGrid)}
          <div class="trow"><div class="tlbl">${sub('이 세트의 액자', '끄면 학생에게 안 보여요')}</div>
            <div class="tframes">${setFrames.map(f => `<label class="tfr${frameOn(f) ? ' on' : ''}"><canvas width="180" height="120" data-thumb="${f.id}"></canvas><span class="cut">${f.cuts}컷</span><span class="nm"><input type="checkbox" data-frame="${f.id}" ${frameOn(f) ? 'checked' : ''}>${f.name}</span></label>`).join('')}</div></div>
          ${row('첫 화면 태그', `<input type="text" data-hero="tag" value="${esc((settings.hero && settings.hero[set] && settings.hero[set].tag) || '')}" placeholder="${esc(HERO_DEFAULT[set].tag)}" maxlength="24" class="tinput" style="width:340px"><span class="thint">비우면 회색 기본 문구</span>`)}
          ${row('첫 화면 부제', `<input type="text" data-hero="sub" value="${esc((settings.hero && settings.hero[set] && settings.hero[set].sub) || '')}" placeholder="${esc(HERO_DEFAULT[set].sub)}" maxlength="60" class="tinput" style="width:520px"><span class="thint">/ 로 줄을 나눠요</span>`)}
          ${row('첫 화면 큰 제목', `<input type="text" data-hero="title" value="${esc((settings.hero && settings.hero[set] && settings.hero[set].title) || '')}" placeholder="${esc(HERO_DEFAULT[set].title)}" maxlength="60" class="tinput" style="width:520px">${info('h-hero')}<span class="thint">/ 줄바꿈 · { } 색 강조</span>`,
            help('h-hero', '세트마다 따로 저장됩니다. 비워 두면 회색 기본 문구가 쓰여요. 큰 제목은 <b>/</b> 로 줄을 나누고 <b>{ }</b> 안이 색깔 강조로 표시됩니다. 예) 친구와 함께 / {약속을 남기는 사진}을 / 찍어요!'))}
        </div>

        <div class="tpage" data-pane="promise">
          <div class="thead"><h3>약속 문장</h3><span class="tdesc"><b>${setName}</b> 세트 · 꾸미기 '약속' 탭에서 학생이 고르는 문장</span></div>
          <div class="trow"><div class="tlbl">${sub('약속 칸 제목', '액자마다 · 비우면 기본 제목')}</div>
            <div class="tgrid">${setFrames.map(f => `<label class="tlab"><span>${f.name}</span><input type="text" class="tinput" data-label="${f.id}" maxlength="30" placeholder="${esc(f.promise.label)}" value="${esc((settings.promiseLabels || {})[f.id] || '')}"></label>`).join('')}</div></div>
          <div class="trow"><div class="tlbl">${sub('약속 문장', '한 줄에 하나 · 최대 12개')}</div>
            <div class="tctl" style="flex-direction:column;align-items:stretch;gap:8px"><textarea class="tinput tarea" data-promises="${set}" rows="7">${esc(promiseList.join('\n'))}</textarea>
            <div class="tctl"><button class="btn sec tiny" data-act="promises-reset">기본 문장으로 되돌리기</button><span class="thint">지금 ${promiseList.length}개</span></div></div></div>
        </div>

        <div class="tpage" data-pane="shoot">
          <div class="thead"><h3>촬영</h3><span class="tdesc">카메라와 찍는 흐름</span></div>
          ${row('컷 수 고르기 화면', `${sw('showCutSelect', settings.showCutSelect)}<span class="thint">끄면 바로</span>${seg('defaultCuts', [[2, '2컷'], [4, '4컷']])}<span class="thint">으로 시작</span>`)}
          ${row('카운트다운', `${seg('countdown', [[3, '3초'], [5, '5초']])}<span class="thint">저학년은 5초가 여유 있어요</span>`)}
          ${row('추천 동작 카드', `${sw('showPoses', settings.showPoses !== false)}<span class="thint">끄면 카메라 화면이 그 자리까지 커져요</span><span class="tsep"></span><span class="tsub">한 컷만 다시 찍기</span>${sw('retakeOne', !!settings.retakeOne)}${info('h-retake')}`,
            help('h-retake', `<b>한 컷만 다시 찍기</b>: 켜면 고르기 화면의 사진 카드마다 [다시 찍기]가 붙어요. 눈 감은 그 컷 하나만 다시 찍고 고르던 순서 그대로 돌아오니, 4장을 다 다시 찍지 않아 줄이 밀리지 않아요 (한 팀 ${RETAKE_MAX}번까지 · 기본 꺼짐). 4장 전부 다시 찍는 [다시 찍을래요]는 그대로 있어요.`))}
          ${row(sub('사용할 카메라', camInfo.label ? `지금: ${esc(camInfo.label)} ${camInfo.w}×${camInfo.h}${camInfo.note ? ' · ' + esc(camInfo.note) : ''}` : '촬영 화면에 한 번 들어가면 목록이 채워져요'),
            `<select id="cam-sel" class="tinput" style="width:400px"><option value="">자동 (앞면 카메라, 이상하면 다른 카메라로)</option>${camDevices.map((d, i) => `<option value="${esc(d.deviceId)}" ${settings.cameraId === d.deviceId ? 'selected' : ''}>${esc(d.label || ('카메라 ' + (i + 1)))}</option>`).join('')}</select><span class="tsep"></span><span class="tsub">끊기면 알림</span>${sw('camWatch', settings.camWatch !== false)}${info('h-camwatch')}`,
            help('h-camwatch', '<b>끊기면 알림</b>(기본 켬): 촬영 중 USB 카메라 선이 빠지면 준비 화면으로 돌아가 "카메라를 확인해 주세요"를 띄우고, 다른 화면에서는 알림만 보여요. 선을 다시 꽂으면 저절로 이어져요.'))}
          ${row('미리보기 좌우', `${seg('mirror', [[true, '거울처럼'], [false, '남이 보는 대로']])}<span class="thint">사진은 화면에 보이는 그대로 인쇄돼요</span>`)}
          ${row(sub('사진 품질', '자동 보정'), `<label class="tchip"><input type="checkbox" data-set="hiRes" ${settings.hiRes !== false ? 'checked' : ''}> 고화질(1920)</label><label class="tchip"><input type="checkbox" data-set="burst" ${settings.burst ? 'checked' : ''}> 연속 3장 중 선명한 것</label><label class="tchip"><input type="checkbox" data-set="autoLevel" ${settings.autoLevel !== false ? 'checked' : ''}> 자동 밝기·색 보정</label><label class="tchip"><input type="checkbox" data-set="printSharpen" ${settings.printSharpen !== false ? 'checked' : ''}> 인쇄용 선명하게</label>${info('h-quality')}`,
            help('h-quality', "<b>고화질</b>: 카메라가 되는 최대 해상도(1920)로 찍어요 — 느린 태블릿에서 버벅이면 끄세요(1280×720). <b>연속 3장</b>: 셔터 순간 0.15초 동안 3장을 받아 흔들림이 가장 적은 것을 써요 — 아이들이 움직여 흐려지는 사진이 줄어요(기본 꺼짐). <b>자동 밝기·색 보정</b>: 어두운 사진은 밝히고 형광등의 누런 기운을 잡아요 — 사진 밝기 ±는 그 위에 더해져요. <b>인쇄용 선명하게</b>: 인화할 때 살짝 뭉개지는 것을 미리 보정해요(화면에는 안 보이고 종이에서만)."))}
          ${row('사진 밝기', `<button class="tround" data-act="bri-" aria-label="어둡게">−</button><span class="stat" id="bri">${settings.brightness > 0 ? '+' : ''}${settings.brightness}</span><button class="tround" data-act="bri+" aria-label="밝게">+</button><span class="thint">부스가 어두우면 +, 인쇄가 하얗게 뜨면 −</span>`)}
          ${row('스티커 묶음', STICKER_CATS.map(c => `<label class="tchip"><input type="checkbox" data-cat="${c.id}" ${catOn(c) ? 'checked' : ''}> ${c.name}</label>`).join(''))}
        </div>

        <div class="tpage" data-pane="print">
          <div class="thead"><h3>완성·인쇄</h3><span class="tdesc">${BRIDGE ? '앱 모드 · 안드로이드 인쇄창으로 출력' : KIOSK ? (PDLG ? '프린터 선택창 모드 · [뽑기]마다 프린터를 고르는 창이 떠요' : '자동 인쇄 모드 · 윈도우 기본 프린터로 확인창 없이 출력') : '브라우저 인쇄창에서 프린터·용지(4×6)를 고른 뒤 출력'}</span></div>
          ${QUIT_PORT ? row(sub('인쇄 방식', '윈도우 앱'), `<span class="seg" id="pmode"><button data-pmode="auto" class="${PDLG ? '' : 'on'}">기본 프린터로 바로 출력</button><button data-pmode="dialog" class="${PDLG ? 'on' : ''}">프린터 선택창 뜨기</button></span>${info('h-pmode')}<span class="thint">바꾸면 앱이 잠깐 닫혔다 다시 열려요</span>`,
            help('h-pmode', "'기본 프린터로 바로 출력'은 [뽑기]를 누르면 윈도우 기본 프린터로 확인창 없이 나와요. '프린터 선택창 뜨기'는 [뽑기]마다 크롬 인쇄창이 떠서 프린터와 용지를 고를 수 있어요 — 프린터가 여러 대이거나 기본 프린터가 아닌 프린터를 쓸 때. 이 설정은 이 컴퓨터의 실행기에 저장돼 다음 실행부터도 유지돼요.")) : ''}
          ${row('완성 사진은', `${seg('output', OUT)}${info('h-out2')}<span class="tsep"></span><span class="tsub">날짜·학교 도장</span>${sw('stamp', !!settings.stamp)}${info('h-stamp')}`,
            help('h-out2', outHelp) + help('h-stamp', `<b>날짜·학교 도장</b>: 켜면 완성 사진 오른쪽 아래 여백에 「${esc(stampText())}」 한 줄이 작게 들어가요 — 고르기·꾸미기 미리보기와 인쇄물 모두 (기본 꺼짐). 학교 이름은 학교·기록·앱에서 바꿔요.`))}
          ${row('칠판에 보여 주는 시간', seg('boardSeconds', [[5, '5초'], [8, '8초'], [12, '12초']]))}
          ${row('최대 인쇄 매수', `${seg('maxCopies', [[1, '1장'], [2, '2장'], [3, '3장'], [4, '4장']])}<span class="thint">1장이면 매수 선택 화면이 안 떠요</span>`)}
          ${row('인쇄 크기', `<button class="tround" data-act="ps-" aria-label="작게">−</button><span class="stat" id="ps">${clamp(+settings.printScale || 100, 90, 110)}%</span><button class="tround" data-act="ps+" aria-label="크게">+</button><span class="thint">가장자리가 잘리면 −, 흰 테두리가 남으면 + (2%씩)</span>`)}
          ${row(sub('프린터 점검', `오늘 인쇄 <b id="pc">${settings.printCount || 0}</b>장 <button class="tlink2" data-act="resetcount">0으로</button>`), `<button class="btn sec tiny" data-act="testprint">테스트 인쇄</button>${info('h-print')}${QUIT_PORT && LV && cmpVer(LV, '1.10.0') >= 0 ? `<span class="tsep"></span><span class="tsub">대기열 감시</span>${sw('queueWatch', settings.queueWatch !== false)}` : '<span class="thint">용지 4×6(엽서) · 테두리 없음</span>'}${QUIT_PORT && LV && cmpVer(LV, '1.11.0') >= 0 ? `<span class="tsep"></span><span class="tsub">용지 확인</span>${sw('paperCheck', !!settings.paperCheck)}` : ''}`,
            help('h-print', printNote + (QUIT_PORT && LV && cmpVer(LV, '1.10.0') >= 0 ? " <b>대기열 감시</b>(기본 켬): [뽑기] 뒤 윈도우 인쇄 대기열을 지켜봐 오른쪽 위에 '인쇄 중 ○장'을 보이고 다 나오면 알려 줘요. 프린터는 준비됨인데 작업이 한참 그대로면(대기열 멈춤·일시 중지·오프라인) '인쇄가 멈춘 것 같아요' 알림과 [대기열 비우기]가 떠요. 알림이 번거로우면 끄세요." : '') + (QUIT_PORT && LV && cmpVer(LV, '1.11.0') >= 0 ? " <b>용지 확인</b>(기본 꺼짐): 켜면 켤 때와 준비 점검에서 프린터의 기본 용지를 읽어 4×6(엽서)이 아니면(A4 등) 알려 줘요. 시작 도우미 2단계에서는 스위치와 상관없이 항상 보여요." : '')))}
          ${row(sub('인화지 잔량', settings.paper == null ? '안 씀 · 팩을 넣을 때 눌러 두면 인쇄마다 하나씩 줄어요' : '5장 이하면 첫 화면에 표시'), settings.paper == null
            ? `<button class="btn sec tiny" data-act="paper36">+36장 넣었어요</button><button class="btn sec tiny" data-act="paper54">+54장</button><button class="btn sec tiny" data-act="paper18">+18장</button><span class="thint">5장 이하면 첫 화면에 표시돼요</span>`
            : `<button class="tround" data-act="paper-" aria-label="하나 빼기">−</button><span class="stat" id="paper-n">${settings.paper}</span><button class="tround" data-act="paper+" aria-label="하나 더하기">+</button><span class="thint">장</span><button class="btn sec tiny" data-act="paper36">+36</button><button class="btn sec tiny" data-act="paper54">+54</button><button class="btn sec tiny" data-act="paper18">+18</button><button class="btn sec tiny" data-act="paperoff">안 씀</button>`)}
          ${row(sub('마지막 사진', lastPrint ? `${lastPrint.when.toTimeString().slice(0, 5)} · ${esc(lastPrint.frame)}` : '아직 없어요'), lastPrint
            ? `<img src="${lastPrint.url}" alt="" style="height:58px;border-radius:8px;box-shadow:0 2px 6px rgba(39,64,58,.2)"><button class="btn sec tiny" data-act="reprint">${ic('printer')} 한 장 더 뽑기</button><span class="thint">종이 걸림·잉크 번짐 때 · 앱을 끄면 사라져요</span>`
            : `<span class="thint">사진을 인쇄하면 여기서 한 장 더 뽑을 수 있어요 (앱을 끄면 사라져요)</span>`)}
        </div>

        <div class="tpage" data-pane="sound">
          <div class="thead"><h3>소리</h3><span class="tdesc">기기: <b>${DEV.label}</b>${HAS_TTS ? '' : ' · <b>이 브라우저는 음성을 지원하지 않아요</b>'}</span></div>
          ${row('소리 크기', seg('volume', [[0, '꺼짐'], [1, '작게'], [2, '보통'], [3, '크게']]))}
          ${row('셔터', `${seg('shutterSound', [['classic', '기본'], ['click', '찰칵'], ['beep', '삐'], ['none', '없음']])}<button class="btn sec tiny" data-act="shuttertest">들어 보기</button>`)}
          ${row('카운트다운 소리', `${seg('countSound', [['beep', '삐'], ['tick', '틱'], ['none', '없음']])}<button class="btn sec tiny" data-act="counttest">들어 보기</button>`)}
          ${row('음성 안내', `${sw('voice', settings.voice)}<span class="thint">"카메라를 봐요" 같은 짧은 안내</span><button class="btn sec tiny" data-act="voicetest">들어 보기</button>`)}
          ${row(sub('목소리', `지금: ${esc(settings.voiceName || (pickVoice() ? pickVoice().name + ' (자동)' : BRIDGE ? '앱 음성' : '기본 목소리'))}${ttsStatus ? ' · 마지막 안내 ' + esc(ttsStatus) : ''}`),
            `<select id="voice-sel" class="tinput" style="width:420px"><option value="">자동 (자연스러운 목소리 우선)</option>${koVoices().map(v => `<option value="${esc(v.name)}" ${settings.voiceName === v.name ? 'selected' : ''}>${esc(v.name)}${v.localService ? '' : ' (온라인)'}</option>`).join('')}</select><span class="thint">${voiceNote}</span>`)}
        </div>

        <div class="tpage" data-pane="screen">
          <div class="thead"><h3>화면</h3><span class="tdesc">배경·버튼 색과 첫 화면 장식 · 액자와 스티커(인쇄물)는 그대로예요</span></div>
          ${row('테마', `<span class="themes">${Object.entries(THEMES).map(([id, t]) => `<button class="theme-btn${(settings.theme || 'mint') === id ? ' on' : ''}" data-theme="${id}" style="--tb:${t.bg};--ta:${t.accent};--ts:${t.soft}"><span class="sw"><i></i><b></b></span>${t.name}</button>`).join('')}</span>`)}
          ${row(sub('본문 글꼴', '제목·단추는 주아체'), `<span class="tfonts">${FONTS.map(f => `<button class="tfont${(settings.bodyFont || 'maple') === f.id ? ' on' : ''}" data-font="${f.id}" style="font-family:'${f.fam}'">${f.name}</button>`).join('')}</span><span class="thint">안내 글·교사 메뉴·설명 글씨 · 누르면 바로 바뀌어요 · 사진(인쇄물)에는 영향 없음</span>`)}
          ${row('첫 화면 계절 장식', `${seg('season', [['auto', '계절 자동'], ['none', '없음'], ['spring', '봄 벚꽃'], ['summer', '여름 비눗방울'], ['autumn', '가을 낙엽'], ['winter', '겨울 눈']])}${info('h-season')}<span class="thint">지금은 <b>${SEASON_NAMES[seasonKind()] || '없음'}</b></span>`,
            help('h-season', "첫 화면 배경에 아주 옅게 흩날립니다(인쇄물에는 안 들어가요). '계절 자동'은 날짜에 따라 봄(3~5월)·여름(6~8월)·가을(9~11월)·겨울(12~2월)로 바뀌고, 행사 세트에 어울리는 장식(눈·색종이·꽃잎·별·풍선)이 있으면 그것을 먼저 씁니다. 계절을 직접 고르면 그 계절만 나와요."))}
          ${row('화면 전환 움직임', `${sw('anim', settings.anim !== false)}<span class="thint">화면이 넘어갈 때 부드럽게 · 느린 태블릿에서 버벅이면 끄세요</span>`)}
          ${row(sub('대기 화면', '행사 부스용'), `${seg('attract', [[0, '안 함'], [30, '30초'], [60, '1분'], [120, '2분']])}<span class="thint">첫 화면에서 이 시간 동안 아무도 안 만지면 그 세트의 액자 예시가 넘어가는 대기 화면 — 누르면 바로 돌아와요</span>`)}
          ${KIOSK ? '' : row('시작할 때 전체 화면', `${sw('autoFull', settings.autoFull)}<span class="thint">브라우저 주소창을 숨겨요</span>`)}
          ${QUIT_PORT && MONITORS > 1 ? row('앱을 보여줄 모니터', `<span class="seg">${Array.from({ length: MONITORS }, (_, i) => `<button data-mon="${i + 1}" class="${MONITOR === i + 1 ? 'on' : ''}">${i + 1}번${i === 0 ? ' (주 모니터)' : ''}</button>`).join('')}</span><span class="thint">고르면 그 모니터에서 다시 열려요 · 다음 실행부터도 그 모니터로</span>`) : ''}
        </div>

        <div class="tpage" data-pane="lock">
          <div class="thead"><h3>잠금</h3><span class="tdesc">${settings.lockPin ? '비밀번호가 설정되어 있어요 — 켤 때와 교사 메뉴에 들어갈 때 번호판이 떠요' : '비밀번호를 정하면 학생이 설정을 만지거나 마음대로 쓰지 못하게 잠글 수 있어요'}</span></div>
          ${row(sub('잠금 비밀번호', settings.lockPin ? '설정됨 ● ● ● ●' : '설정 안 됨'), `<button class="btn sec tiny" data-act="pinset">${ic('lock')} ${settings.lockPin ? '비밀번호 바꾸기' : '비밀번호 설정'}</button>${settings.lockPin ? '<button class="btn sec tiny" data-act="pinclear">비밀번호 지우기</button>' : ''}<span class="thint">숫자 4자리 · 스마트폰처럼 번호판으로 눌러요</span>`)}
          ${row(sub('가만히 두면 잠금', '자동 잠금'), settings.lockPin ? `${seg('lockAfter', [[0, '안 함'], [3, '3분'], [5, '5분'], [10, '10분'], [30, '30분']])}<span class="thint">이 시간 동안 아무도 만지지 않으면 잠금 화면으로 (교사 메뉴를 열어 둔 채여도 저장하고 잠가요)</span>` : '<span class="thint">비밀번호를 먼저 설정하세요</span>')}
          ${row('바로 잠그기', `<span class="thint">첫 화면 오른쪽 위 <b>[잠금]</b> 단추, 또는 이 메뉴 왼쪽 아래 <b>[저장하고 잠그기]</b>${settings.lockPin ? '' : ' (비밀번호를 설정하면 보여요)'}</span>`)}
          ${row('잊었을 때', `<span class="thint">${KIOSK ? '약속네컷을 끄고 <b>C:\\Users\\(사용자 이름)\\AppData\\Local\\YaksokNecut</b> 폴더를 통째로 지운 뒤 다시 켜세요 — 모든 설정이 처음으로 돌아가요. 설정 코드를 복사해 두면(학교·기록·앱) 바로 되살릴 수 있어요' : '브라우저 설정에서 이 페이지의 사이트 데이터를 삭제하세요 — 모든 설정이 처음으로 돌아가요. 설정 코드를 복사해 두면(학교·기록·앱) 바로 되살릴 수 있어요'}</span>`)}
        </div>

        <div class="tpage" data-pane="app">
          <div class="thead"><h3>학교·기록·앱</h3><span class="tdesc">사진은 어디에도 저장되지 않아요 · 설정과 기록만 이 기기에 남아요</span></div>
          ${row('학교 이름', `<input type="text" data-text="schoolName" value="${esc(settings.schoolName)}" maxlength="20" class="tinput"><span class="thint">첫 화면과 사진 카드에 들어가요</span>`)}
          ${row('캠페인 문구', `<input type="text" data-text="campaignLine" value="${esc(settings.campaignLine)}" maxlength="24" class="tinput" style="width:420px"><span class="thint">'네컷 액자'의 제목에 바로 반영</span>`)}
          <div class="trow"><div class="tlbl">${sub('기록', '완성·인쇄·세트·약속 문장을 날짜별로 (사진은 저장 안 함)')}</div>
            <div class="tctl" style="align-items:stretch;flex-wrap:nowrap"><pre id="stats-box" class="tlog" style="flex:1;min-width:0">${esc(statsText())}</pre>
            <div style="display:flex;gap:8px;flex:none;align-items:flex-start"><button class="btn sec tiny" data-act="statscopy">기록 복사</button><button class="btn sec tiny" data-act="statsclear">기록 지우기</button></div></div></div>
          <div class="trow"><div class="tlbl">${sub('설정 보관·백업', `<span id="store-state">${esc(storeText())}</span>`)}</div>
            <div class="tctl" style="flex-direction:column;align-items:stretch;gap:4px">
              <div class="tctl">${QUIT_PORT && LV ? '<button class="btn sec tiny" data-act="storetest">지금 저장해 보기</button>' : ''}<button class="btn sec tiny" data-act="bkcopy">설정 코드 복사</button><button class="btn sec tiny" data-act="bkpaste">코드로 복구</button></div>
              <span class="thint">설정 코드 한 줄로 다른 컴퓨터나 초기화 뒤에 복구할 수 있어요 (비밀번호·카메라는 빼고)</span>
              <div id="bk-box" style="display:none"><textarea id="bk-text" class="tinput" style="width:100%;max-width:none;height:84px;font:400 14px/1.4 var(--body-font),sans-serif;resize:none" spellcheck="false" placeholder="여기에 설정 코드를 붙여 넣으세요 (YK2.… 로 시작)"></textarea><div class="tctl" style="margin-top:6px"><button class="btn tiny" data-act="bkapply" id="bk-apply" style="display:none">이 코드로 복구</button><button class="btn sec tiny" data-act="bkclose">닫기</button><span class="thint" id="bk-msg"></span></div></div>
            </div></div>
          ${QUIT_PORT ? row(sub('업데이트', `앱 v${APP_VERSION} · 실행기 ${LV || '옛 버전'}`), `<div class="tctl" style="flex-direction:column;align-items:stretch;gap:4px"><div class="tctl"><button class="btn sec tiny" data-act="updcheck">업데이트 확인</button><span class="thint" id="upd-result"></span><span class="thint" id="upd-busy">${updBusy && !exeReady ? `${updBusy.kind === 'app' ? '앱' : '실행기'} ${updBusy.ver} 받는 중 ${updBusy.pct}%` : ''}</span>${exeReady ? `<button class="btn tiny" data-act="exerestart">${updKind === 'app' ? '앱' : '실행기'} ${exeReady} 준비됨 · 지금 다시 시작</button>` : ''}<button class="btn sec tiny" data-act="updback" id="upd-back" style="display:none">이전 버전으로 되돌리기</button></div><div class="tctl"><label class="tsw"><input type="checkbox" id="upd-auto"><i></i></label><span class="thint">켤 때 자동 업데이트</span>${sw('autoRestart', settings.autoRestart !== false)}<span class="thint">새 실행기 오면 3분 쉴 때 다시 시작</span>${LV && cmpVer(LV, '1.10.0') >= 0 ? `<label class="tsw"><input type="checkbox" id="relaunch-auto" checked><i></i></label><span class="thint">닫히면 다시 열기</span>${info('h-relaunch')}` : ''}</div>${LV && cmpVer(LV, '1.11.0') >= 0 ? `<div class="tctl"><label class="tsw"><input type="checkbox" id="autostart"><i></i></label><span class="thint">윈도우 켤 때 약속네컷 자동 실행 <span id="autostart-msg"></span></span></div>` : ''}</div>`,
            help('h-relaunch', "<b>닫히면 다시 열기</b>: 크롬(엣지)이 뜻하지 않게 닫히면(아이가 Alt+F4를 누름 · 브라우저가 튕김) 실행기가 2~3초 뒤 앱을 다시 열어 부스가 멈춘 채 방치되지 않게 해요. 오른쪽 위 [종료]나 이 메뉴의 [앱 종료]로 끝낸 경우는 다시 열지 않아요. <b>자동 재시작</b>: 새 실행기를 받아 두면 첫 화면에서 3분 동안 아무도 안 만질 때 10초 카운트다운 뒤 새 실행기로 켜요(만지면 취소). <b>윈도우 켤 때 자동 실행</b>(기본 꺼짐): 시작 프로그램 폴더에 약속네컷 바로가기를 넣어 컴퓨터를 켜면 앱이 저절로 열려요 — 행사 부스 PC용. 이 사용자 계정에서만이고, exe 파일을 옮겨도 다음 실행 때 바로가기를 다시 맞춰요.")) : ''}
          ${row(sub('초기화 · 도움', '초기화는 두 번 눌러요 · 인쇄 매수는 유지'), `<button class="btn sec tiny" data-act="reset" id="btn-reset">${ic('undo')} 기본 설정으로 되돌리기</button><span class="tsep"></span><button class="btn sec tiny" data-act="wizard">시작 도우미</button><button class="btn sec tiny" data-act="diag">문제 정보 복사</button>${info('h-help')}`,
            help('h-help', `<b>시작 도우미</b>: 처음 설치할 때 ① 기본 프린터 → ② 용지 4×6·테두리 없음·인쇄 크기 → ③ 테스트 인쇄·카메라를 순서대로 확인해요. <b>문제 정보 복사</b>: 앱·실행기 버전, 프린터·대기열·카메라 상태, 설정 요약, 최근 오류를 한 번에 복사해요 — 안 될 때 이 내용을 ${AUTHOR.email} 로 보내 주시면 원인을 바로 찾을 수 있어요 (사진·이름 같은 개인 정보는 들어가지 않아요).`))}
        </div>
      </div>
      <div class="tbar"><span class="tbar-left" id="tbar-count"></span><button class="btn sec tiny" data-act="cancel">취소</button><button class="btn tiny" data-act="save">${ic('check')} 저장하고 첫 화면으로</button></div>`;

    const main = el.querySelector('#tmain');
    const nav = el.querySelector('.tnav'), ind = document.createElement('div'); ind.className = 'tind jump'; nav.appendChild(ind);
    const moveInd = () => { const t = el.querySelector('.ttab.on'); if (!t) { ind.classList.remove('on'); return; } ind.style.top = t.offsetTop + 'px'; ind.style.height = t.offsetHeight + 'px'; ind.classList.add('on'); };
    // 화면 탭에 들어갈 때 나머지 본문 글꼴을 읽음 (글꼴 칩이 각자 글꼴로 보이게 · 메뉴 첫 열기를 늦추지 않으려고 여기서)
    const showTab = () => { if (teacherTab === 'screen') ensureAllFonts(); el.querySelectorAll('[data-pane]').forEach(x => x.style.display = x.dataset.pane === teacherTab ? '' : 'none'); el.querySelectorAll('.ttab').forEach(x => x.classList.toggle('on', x.dataset.tab === teacherTab)); main.scrollTop = 0; moveInd(); };
    showTab(); refreshTBar();
    requestAnimationFrame(() => { moveInd(); el.querySelector('.tside').classList.add('ready'); requestAnimationFrame(() => ind.classList.remove('jump')); });   // 처음엔 바로 자리 잡고, 그다음부터 미끄러지게
    // 액자 미리보기 (작게 그려 넣기)
    el.querySelectorAll('canvas[data-thumb]').forEach(c => { const f = FRAMES.find(x => x.id === c.dataset.thumb); if (f) try { c.getContext('2d').drawImage(frameThumb(f, c.width, c.height), 0, 0); } catch (e) {} });
    el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', e => {
      pop(); const r = b.getBoundingClientRect(), sc = r.width / (b.offsetWidth || r.width) || 1, rip = document.createElement('span'); rip.className = 'rip';
      rip.style.setProperty('--x', ((e.clientX || r.left + r.width / 2) - r.left) / sc + 'px'); rip.style.setProperty('--y', ((e.clientY || r.top + r.height / 2) - r.top) / sc + 'px'); b.appendChild(rip); setTimeout(() => rip.remove(), 520);
      if (teacherTab === b.dataset.tab) return; teacherTab = b.dataset.tab; showTab();
    }));
    el.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', () => { const h = el.querySelector('#' + b.dataset.help); if (!h) return; const on = !h.classList.contains('on'); h.classList.toggle('on', on); b.classList.toggle('on', on); }));
    el.querySelectorAll('[data-set]').forEach(i => i.addEventListener('change', () => {
      settings[i.dataset.set] = i.checked; saveSettings(); if (i.dataset.set === 'anim') applyTheme(); if (i.dataset.set === 'hiRes') { stopCamera(); camInfo = { label: '', w: 0, h: 0, note: '' }; }
      el.querySelectorAll(`[data-set="${i.dataset.set}"]`).forEach(x => { x.checked = i.checked; });   // 같은 설정이 두 페이지에 있으면 함께 바꿈
    }));
    const vs = el.querySelector('#voice-sel'); if (vs) vs.addEventListener('change', () => { settings.voiceName = vs.value; saveSettings(); speak('안녕? 나는 약속네컷이야!'); });
    el.querySelectorAll('[data-mon]').forEach(b => b.addEventListener('click', () => { pop(); if (+b.dataset.mon !== MONITOR) moveToMonitor(+b.dataset.mon); }));
    el.querySelectorAll('[data-pmode]').forEach(b => b.addEventListener('click', () => {
      pop(); const dialog = b.dataset.pmode === 'dialog'; if (dialog === PDLG) return;
      if (!LV) { toast('인쇄 방식 바꾸기는 새 실행 파일(약속네컷.exe)이 필요해요 — 윈도우 앱 zip을 다시 받아 바꿔 주세요'); return; }
      saveSettings(); settingsBackup = null; flushSettings(true); toast('인쇄 방식을 바꾸는 중… 잠시 뒤 다시 열려요');
      setTimeout(() => { location.href = LOCAL + '/print/mode?dialog=' + (dialog ? 1 : 0); }, 400);
    }));
    if (QUIT_PORT) localJson('/update/status').then(j => {
      const au = el.querySelector('#upd-auto'), bk = el.querySelector('#upd-back');
      if (!j.url) localJson('/update/seturl?u=' + encodeURIComponent(DEFAULT_UPDATE_URL)).catch(() => {});   // 실행기에 주소가 없으면 기본 주소(GitHub 저장소)를 저장
      if (au) { au.checked = !!j.auto; au.addEventListener('change', () => localJson('/update/auto?on=' + (au.checked ? 1 : 0)).catch(() => {})); }
      const ra = el.querySelector('#relaunch-auto'); if (ra) { ra.checked = j.relaunch !== false; ra.addEventListener('change', () => localJson('/relaunch/auto?on=' + (ra.checked ? 1 : 0)).then(() => toast(ra.checked ? '크롬이 닫히면 다시 열어요' : '이제 크롬이 닫혀도 다시 열지 않아요')).catch(() => {})); }
      const as = el.querySelector('#autostart'); if (as) { as.checked = !!j.autostart; as.addEventListener('change', () => { const m = el.querySelector('#autostart-msg'); m.textContent = '…'; localJson('/autostart?on=' + (as.checked ? 1 : 0), 12000).then(r => { as.checked = !!r.on; m.textContent = r.error ? '— ' + r.error : ''; toast(r.error ? r.error : r.on ? '윈도우를 켤 때 약속네컷이 저절로 열려요' : '자동 실행을 껐어요'); }).catch(() => { m.textContent = ''; toast('실행기와 연결되지 않아요'); }); }); }
      if (bk && j.canRollback) bk.style.display = '';
    }).catch(() => {});
    if (QUIT_PORT && LV && !PDLG) localJson('/printer/status').then(j => {   // 행사 준비 점검: 기본 프린터 상태
      const c = el.querySelector('#chk-printer'); if (!c) return;
      const ok = j.status === 'ready' || j.status === 'printing';
      c.className = 'tchk ' + (j.error ? 'warn' : ok ? 'ok' : 'warn');
      c.querySelector('span').textContent = j.error ? j.error : `${(j.name || '').slice(0, 26)} · ${j.detail || ''}${j.fixed ? ' · 기억된 다른 프린터 대신 기본 프린터로 맞췄어요' : ''}`;
      if (!j.error && cmpVer(LV, '1.9.8') < 0) { c.className = 'tchk warn'; c.querySelector('span').textContent += ' · 실행기 업데이트 필요(다른 프린터로 나갈 수 있음)'; }
      if (!j.error && settings.paperCheck && cmpVer(LV, '1.11.0') >= 0) localJson('/printer/paper').then(pp => {   // 용지 확인(켠 경우): 4×6이 아니면 경고
        if (!c.isConnected || pp.error) return;
        if (pp.verdict === 'ok') c.querySelector('span').textContent += ' · 용지 4×6 ✓';
        else { c.className = 'tchk warn'; c.querySelector('span').textContent += ' · 용지 ' + pp.detail; }
      }).catch(() => {});
    }).catch(() => { const c = el.querySelector('#chk-printer'); if (c) { c.className = 'tchk info'; c.querySelector('span').textContent = '실행기와 연결되지 않아요'; } });
    const cs = el.querySelector('#cam-sel'); if (cs) listCameras().then(() => { if (cs.options.length <= 1) camDevices.forEach((d, i) => cs.add(new Option(d.label || ('카메라 ' + (i + 1)), d.deviceId, false, settings.cameraId === d.deviceId))); });
    if (cs) cs.addEventListener('change', async () => { settings.cameraId = cs.value; saveSettings(); stopCamera(); const ok = await ensureCamera(); toast(ok ? `카메라: ${camInfo.label || '자동'}` : '그 카메라를 켤 수 없어요'); ENTER.s10(); });
    el.querySelectorAll('[data-frame]').forEach(i => i.addEventListener('change', () => { settings.frames[i.dataset.frame] = i.checked; saveSettings(); const card = i.closest('.tfr'); if (card) card.classList.toggle('on', i.checked); const d = el.querySelector('[data-pane="set"] .tdesc'); if (d) d.innerHTML = `지금: <b>${setName}</b> · 액자 ${setFrames.length}개 중 ${setFrames.filter(frameOn).length}개 사용`; }));
    el.querySelectorAll('[data-cat]').forEach(i => i.addEventListener('change', () => { settings.cats[i.dataset.cat] = i.checked; saveSettings(); }));
    el.querySelectorAll('[data-seg]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const key = sg.dataset.seg, v = b.dataset.v; settings[key] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; saveSettings();
      if (key === 'mirror') applyMirror();
      el.querySelectorAll(`[data-seg="${key}"] button`).forEach(x => x.classList.toggle('on', x.dataset.v === v));   // 같은 설정이 두 페이지에 있으면 함께 바꿈
      if (key === 'volume') beep();
      if (key === 'frameSet') { applyTexts(); const y = main.scrollTop; ENTER.s10(); el.querySelector('#tmain').scrollTop = y; }
    })));
    el.querySelectorAll('[data-text]').forEach(i => i.addEventListener('input', () => { settings[i.dataset.text] = i.value.trim(); saveSettings(); applyTexts(); }));
    el.querySelectorAll('[data-hero]').forEach(i => i.addEventListener('input', () => { settings.hero = settings.hero || {}; settings.hero[set] = settings.hero[set] || {}; const v = i.value.trim(); if (v) settings.hero[set][i.dataset.hero] = v; else delete settings.hero[set][i.dataset.hero]; saveSettings(); applyTexts(); }));
    el.querySelectorAll('[data-label]').forEach(i => i.addEventListener('input', () => { settings.promiseLabels = settings.promiseLabels || {}; const v = i.value.trim(); if (v) settings.promiseLabels[i.dataset.label] = v; else delete settings.promiseLabels[i.dataset.label]; saveSettings(); }));
    const ta = el.querySelector('[data-promises]'); if (ta) ta.addEventListener('input', () => { settings.promises = settings.promises || {}; settings.promises[ta.dataset.promises] = ta.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12); saveSettings(); });
    el.querySelectorAll('[data-font]').forEach(b => b.addEventListener('click', () => { pop(); settings.bodyFont = b.dataset.font; saveSettings(); applyFont(); el.querySelectorAll('[data-font]').forEach(x => x.classList.toggle('on', x.dataset.font === settings.bodyFont)); refreshTBar(); }));
    el.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => { pop(); settings.theme = b.dataset.theme; saveSettings(); applyTheme(); el.querySelectorAll('[data-theme]').forEach(x => x.classList.toggle('on', x === b)); }));
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'bri+' || a === 'bri-') { settings.brightness = clamp(settings.brightness + (a === 'bri+' ? 1 : -1), -2, 2); saveSettings(); $('#bri').textContent = (settings.brightness > 0 ? '+' : '') + settings.brightness; }
      else if (a === 'ps+' || a === 'ps-') { settings.printScale = clamp((+settings.printScale || 100) + (a === 'ps+' ? 2 : -2), 90, 110); saveSettings(); $('#ps').textContent = settings.printScale + '%'; }
      else if (a === 'resetcount') { settings.printCount = 0; saveSettings(); $('#pc').textContent = '0'; }
      else if (a === 'monnext') { pop(); if (nextMon && nextMon !== MONITOR) moveToMonitor(nextMon); }
      else if (a === 'pinset') { pop(); showLock('set', () => { teacherTab = 'lock'; ENTER.s10(); }); }
      else if (a === 'camcheck') { pop(); b.textContent = '확인 중…'; ensureCamera().then(ok => { stopCamera(); toast(ok ? `카메라 확인: ${camInfo.label || '자동'}` : '카메라를 켤 수 없어요'); ENTER.s10(); }); }
      else if (a === 'storetest') { pop(); saveSettings(); flushSettings(); toast('실행기에 설정 사본을 보냈어요 — 잠시 뒤 상태를 확인하세요'); }
      else if (a === 'bkcopy') { pop(); makeBackupCode().then(code => { const box = el.querySelector('#bk-box'), ta = el.querySelector('#bk-text'); box.style.display = ''; el.querySelector('#bk-apply').style.display = 'none'; ta.value = code; ta.select(); el.querySelector('#bk-msg').textContent = `코드 ${code.length}자 · ${todayKey()}`;
        (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('설정 코드를 복사했어요 — 메모장·메일 등에 붙여 두세요'), () => { try { document.execCommand('copy'); toast('설정 코드를 복사했어요'); } catch (e) { toast('아래 코드를 직접 골라 복사하세요'); } }); }); }
      else if (a === 'bkpaste') { pop(); const box = el.querySelector('#bk-box'), ta = el.querySelector('#bk-text'); box.style.display = ''; ta.value = ''; el.querySelector('#bk-apply').style.display = ''; el.querySelector('#bk-msg').textContent = '입력칸에 Ctrl+V(길게 눌러 붙여넣기)로 코드를 넣고 [이 코드로 복구]'; ta.focus(); }   // 클립보드를 앱이 직접 읽으면 크롬이 '붙여넣기 허용' 말풍선을 띄우므로 읽지 않음
      else if (a === 'bkapply') { pop(); readBackupCode(el.querySelector('#bk-text').value).then(o => { applyBackup(o); teacherTab = 'app'; ENTER.s10(); toast('설정을 코드에서 복구했어요'); }).catch(e => { el.querySelector('#bk-msg').textContent = '복구 실패: ' + e.message; buzz(); }); }
      else if (a === 'bkclose') { pop(); el.querySelector('#bk-box').style.display = 'none'; }
      else if (a === 'pinclear') { if (b.dataset.armed) { settings.lockPin = ''; saveSettings(); ENTER.s10(); toast('비밀번호를 지웠어요 — 잠금 없이 켜져요'); } else { b.dataset.armed = '1'; b.textContent = '정말 지울까요? 한 번 더'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = '비밀번호 지우기'; } }, 4000); } }
      else if (a === 'locknow') { lockNow(); toast('설정을 저장하고 잠갔어요'); }
      else if (a === 'updcheck') { const out = el.querySelector('#upd-result'); out.textContent = '확인 중…'; localJson('/update/check').then(j => { if (j.error) { out.textContent = '확인 실패: ' + j.error; return; } const exeNew = j.exe && j.exe.newer; if (j.newer || exeNew) { out.innerHTML = `새 버전이 있어요 — ${j.newer ? `앱 <b>${j.latest}</b>` : ''}${j.newer && exeNew ? ' · ' : ''}${exeNew ? `실행기 <b>${j.exe.latest}</b>` : ''} `; const go = document.createElement('button'); go.className = 'btn tiny'; go.textContent = '지금 업데이트'; go.addEventListener('click', () => { pop(); flushSettings(true); toast('업데이트 중… 잠시 뒤 다시 열려요'); setTimeout(() => { location.href = LOCAL + '/update/apply'; }, 400); }); out.appendChild(go); } else out.textContent = `최신 버전이에요 (${j.latest})`; }).catch(() => { out.textContent = '실행기와 연결되지 않아요'; }); }
      else if (a === 'updback') { if (b.dataset.armed) { toast('이전 버전으로 되돌리는 중…'); setTimeout(() => { location.href = LOCAL + '/update/rollback'; }, 400); } else { b.dataset.armed = '1'; b.textContent = '정말 되돌릴까요? 한 번 더'; setTimeout(() => { delete b.dataset.armed; b.textContent = '이전 버전으로 되돌리기'; }, 4000); } }
      else if (a === 'statscopy') { const t = statsText(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('기록을 복사했어요 — 보고서에 붙여 넣으세요'), () => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('기록을 복사했어요'); } catch (e) { toast('복사가 안 돼요 — 화면의 기록을 보고 적어 주세요'); } ta.remove(); }); }
      else if (a === 'statsclear') { if (b.dataset.armed) { localStorage.removeItem(STATS_KEY); delete b.dataset.armed; b.textContent = '기록 지우기'; $('#stats-box').textContent = statsText(); toast('기록을 지웠어요'); } else { b.dataset.armed = '1'; b.textContent = '정말 지울까요? 한 번 더'; setTimeout(() => { delete b.dataset.armed; b.textContent = '기록 지우기'; }, 4000); } }
      else if (a === 'voicetest') { if (!settings.voice) toast('음성 안내가 꺼져 있어요'); else if (!vol()) toast('소리가 꺼져 있어요'); else speak(VOICE.shoot); }
      else if (a === 'shuttertest') { if (!vol()) toast('소리가 꺼져 있어요'); else if ((settings.shutterSound || 'classic') === 'none') toast('셔터 소리가 없음으로 되어 있어요'); else shutter(); }
      else if (a === 'counttest') { if (!vol()) toast('소리가 꺼져 있어요'); else if ((settings.countSound || 'beep') === 'none') toast('카운트다운 소리가 없음으로 되어 있어요'); else { beep(); setTimeout(beep, 350); setTimeout(beepGo, 700); } }
      else if (a === 'promises-reset') { settings.promises = settings.promises || {}; delete settings.promises[set]; saveSettings(); const y = main.scrollTop; ENTER.s10(); el.querySelector('#tmain').scrollTop = y; toast('기본 문장으로 되돌렸어요'); }
      else if (a === 'testprint') { testPrint(); }
      else if (a === 'wizard') { pop(); openWizard(1); }
      else if (a === 'diag') { pop(); copyDiag(b); }
      else if (a === 'reprint') { pop(); if (reprintLast()) { toast('마지막 사진을 한 장 더 뽑아요'); const pp = el.querySelector('#paper-n'); if (pp) pp.textContent = settings.paper == null ? '' : settings.paper; $('#pc').textContent = settings.printCount; } else toast('다시 뽑을 사진이 없어요'); }
      else if (a.startsWith('paper')) {
        pop(); const v = a.slice(5);
        if (v === 'off') settings.paper = null; else if (v === '-' ) settings.paper = Math.max(0, (+settings.paper || 0) - 1); else if (v === '+') settings.paper = (+settings.paper || 0) + 1; else settings.paper = (+settings.paper || 0) + (+v);
        saveSettings(); paperBadge(); const y = main.scrollTop; ENTER.s10(); el.querySelector('#tmain').scrollTop = y;
      }
      else if (a === 'full') { if (!document.fullscreenElement) { wantFull(true); if (!document.documentElement.requestFullscreen) toast('전체 화면을 켤 수 없어요'); } else wantFull(false); }
      else if (a === 'save') { saveSettings(); applyTexts(); applyTheme(); settingsBackup = null; toast('설정을 저장했어요'); go('s0'); }
      else if (a === 'cancel') { if (settingsBackup) { settings = settingsBackup; settingsBackup = null; saveSettings(); applyTexts(); applyTheme(); } toast('바꾼 설정을 되돌렸어요'); go('s0'); }
      else if (a === 'exerestart') { restartNow(); }
      else if (a === 'close') { quitApp(); if (!QUIT_PORT) setTimeout(() => toast('창이 닫히지 않으면 태블릿 홈 버튼으로 나가세요'), 300); }
      else if (a === 'reset') {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '정말 초기화? 한 번 더 누르면 초기화'; b.classList.remove('sec'); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.innerHTML = ic('undo') + ' 기본 설정으로 되돌리기'; b.classList.add('sec'); } }, 4000); return; }
        const keep = settings.printCount || 0; settings = JSON.parse(JSON.stringify(DEFAULTS)); settings.printCount = keep; saveSettings(); applyTexts(); applyTheme();
        settingsBackup = null; ENTER.s10(); toast('기본 설정으로 되돌렸어요');
      }
    }));
  };
  let toastT = null;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 2600); }

