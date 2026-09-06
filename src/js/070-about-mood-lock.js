  /* ===================== 로고 · 앱 정보 ===================== */
  $('#about-ver').textContent = `버전 ${APP_VERSION} · ${BUILD_DATE}`;
  const latestItems = CHANGELOG[0].items.slice(0, 3), more = CHANGELOG[0].items.length - latestItems.length;
  $('#changelog').innerHTML = `<div class="cl-latest"><b>최근 수정 (${CHANGELOG[0].v})</b><ul>${latestItems.map(t => `<li>${t}</li>`).join('')}${more > 0 ? `<li class="more">외 ${more}가지 — 이전 기록에서 전체 보기</li>` : ''}</ul></div>` +
    (CHANGELOG.length > 1 ? `<details><summary>이전 기록 ${CHANGELOG.length - 1}건</summary>${CHANGELOG.slice(1).map(c => `<div class="cl-old"><b>${c.v}</b> <em>${c.d}</em><ul>${c.items.map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('')}</details>` : '');
  $('#about-list').innerHTML = `<dt>제작</dt><dd>${AUTHOR.name}</dd><dt>소속</dt><dd>${AUTHOR.org}</dd><dt>연락처</dt><dd>${AUTHOR.email}</dd>${KIOSK ? `<dt>실행기</dt><dd>${LV || '옛 버전'}</dd>` : ''}`;
  const openAbout = e => { e.stopPropagation(); pop(); $('#about').classList.add('on'); };
  $('#brand').addEventListener('click', openAbout);
  $('#brand-logo0').addEventListener('click', openAbout);
  // 첫 화면 문구 — 행사 세트별 기본값. 교사 메뉴에서 세트마다 바꿀 수 있음 ( { } 안은 강조, / 는 줄바꿈 )
  const SUB_BASE = '서로 존중하고 따뜻한 말을 나누는 오늘을 / 사진으로 남겨 보세요.';
  const HERO_DEFAULT = {   // sub(부제)도 / 로 줄을 나눔
    daily: { tag: '우리 반 · 일상', title: '친구와 함께 / {오늘의 사진}을 / 찍어요!', sub: SUB_BASE },
    promise: { tag: '학교폭력예방 · 생활교육', title: '친구와 함께 / {약속을 남기는 사진}을 / 찍어요!', sub: SUB_BASE },
    welcome: { tag: '입학 · 환영', title: '새 친구와 함께 / {첫 사진}을 / 찍어요!', sub: '새 친구, 새 교실 — / 첫날의 설렘을 사진으로 남겨요.' },
    grad: { tag: '졸업 · 축하', title: '친구들과 함께 / {추억을 남기는 사진}을 / 찍어요!', sub: '함께한 시간을 오래 기억할 / 한 장을 남겨요.' },
    sports: { tag: '운동회', title: '우리 팀과 함께 / {힘찬 사진}을 / 찍어요!', sub: '땀 흘린 만큼 빛나는 오늘, / 우리 팀을 사진으로 남겨요.' },
    birthday: { tag: '생일 · 축하', title: '친구와 함께 / {축하하는 사진}을 / 찍어요!', sub: '오늘의 주인공을 축하해요! / 소원을 빌고, 찰칵.' },
    chuseok: { tag: '추석 · 명절', title: '가족·친구와 함께 / {풍성한 한가위 사진}을 / 찍어요!', sub: '고마운 마음을 사진에 담아 / 가족·친구에게 전해요.' },
    reading: { tag: '독서의 달', title: '책과 함께 / {책 읽는 사진}을 / 찍어요!', sub: '책과 함께한 오늘을 / 한 장의 사진으로 남겨요.' },
    xmas: { tag: '크리스마스 · 새해', title: '친구와 함께 / {따뜻한 연말 사진}을 / 찍어요!', sub: '한 해 동안 고마웠던 마음을 / 사진에 담아 전해요.' },
    children: { tag: '어린이날', title: '친구와 함께 / {신나는 어린이날 사진}을 / 찍어요!', sub: '오늘의 주인공은 바로 너! / 신나는 하루를 사진으로 남겨요.' }
  };
  /* ---------- 행사 세트 무드 — 첫 화면의 색·그림·장식·약속이 소품. 학교폭력예방·일상은 없음(지금 모습 그대로) ----------
     colors: [번짐A, 번짐B, 바탕1, 바탕2, 바탕끝, 태그바탕, 태그글자, 뒤카드A, 뒤카드B]
     motifs: [그림 이름(스티커 DRAW 또는 moon·cap·bunting), x, y, 크기, 기울기] — 1280×800 기준, 글·카드를 피한 자리
     particles: 흩날림 종류 (계절 자동일 때 계절 대신 씀) */
  const MOOD = {
    welcome: { colors: ['rgba(255,214,232,.95)', 'rgba(211,234,255,.95)', '#FFFBFD', '#F4F6FF', '#EEF6FF', '#D3EAFF', '#1F6FD1', '#FFE0EC', '#D3EAFF'], hat: 'flower', particles: 'spring',
      motifs: [['flower', 520, 655, 120, -.2], ['flower', 1150, 705, 90, .3], ['rainbow', 1225, 105, 110, 0], ['clover', 450, 70, 54, .3], ['flower', 1000, 745, 60, .5]] },
    grad: { colors: ['rgba(230,222,255,.95)', 'rgba(255,242,191,.9)', '#FFFBFD', '#F7F3FF', '#F4F1FF', '#E6DEFF', '#6247B8', '#E6DEFF', '#FFF2BF'], hat: 'cap', particles: 'confetti',
      motifs: [['cap', 520, 650, 130, -.1], ['popper', 1225, 105, 100, 0], ['medal', 1150, 705, 96, .1], ['star', 450, 68, 50, .2], ['star', 1000, 745, 44, .4]] },
    sports: { colors: ['rgba(255,220,200,.95)', 'rgba(255,242,191,.95)', '#FFFDF8', '#FFF6EC', '#FFF4EA', '#FFE0C2', '#D9770F', '#FFE0C2', '#FFF2BF'], hat: 'band', particles: 'confetti',
      motifs: [['bunting', 0, 0, 0, 0], ['medal', 520, 655, 120, .1], ['popper', 1150, 705, 96, 0], ['sun', 1225, 118, 90, 0], ['star', 450, 76, 46, .3], ['star', 1000, 745, 40, .2]] },
    birthday: { colors: ['rgba(255,216,230,.95)', 'rgba(255,242,191,.95)', '#FFFBFC', '#FFF3F7', '#FFF1F5', '#FFD8E6', '#D6336C', '#FFD8E6', '#FFF2BF'], hat: 'party', particles: 'confetti',
      motifs: [['cake', 520, 655, 130, 0], ['popper', 1225, 105, 100, 0], ['balloon', 1150, 700, 100, .1], ['balloon', 450, 70, 64, -.1], ['icecream', 1000, 745, 64, .2]] },
    chuseok: { colors: ['rgba(255,226,150,.9)', 'rgba(222,214,255,.9)', '#FFFDF7', '#FFF7E6', '#FFF6E4', '#FFEBB8', '#B8541F', '#FFEBB8', '#DED6FF'], hat: 'bunny', particles: 'stars',
      motifs: [['moon', 1180, 100, 150, 0], ['songpyeon', 520, 655, 120, 0], ['persimmon', 1150, 705, 90, .1], ['rabbit', 1000, 740, 96, 0], ['fullmoon', 450, 70, 56, 0]] },
    reading: { colors: ['rgba(226,240,205,.95)', 'rgba(255,242,191,.9)', '#FDFEFA', '#F4F9EE', '#F2F8EC', '#E3F1D6', '#3F6B4F', '#E3F1D6', '#FFF2BF'], hat: 'glasses', particles: null,
      motifs: [['book', 520, 655, 130, 0], ['pencil', 1150, 705, 100, 0], ['bulb', 1225, 105, 96, 0], ['star', 450, 70, 44, .2], ['book', 1000, 748, 64, .1]] },
    xmas: { colors: ['rgba(255,205,205,.9)', 'rgba(199,236,214,.95)', '#FBFCFF', '#F2F6FC', '#EEF3FA', '#FFD9D9', '#C0392B', '#D6E8FF', '#BFEBDC'], hat: 'santa', particles: 'winter',
      motifs: [['xtree', 1150, 700, 130, 0], ['gift', 1000, 745, 76, .1], ['snowman', 520, 655, 120, 0], ['xtree', 450, 70, 70, 0], ['star', 1225, 105, 60, .2]] },
    children: { colors: ['rgba(255,242,191,.95)', 'rgba(211,234,255,.95)', '#FBFDFF', '#EEF6FF', '#EAF4FF', '#FFF2BF', '#D9770F', '#FFF2BF', '#D3EAFF'], hat: 'party2', particles: 'balloons',
      motifs: [['pinwheel', 520, 655, 120, 0], ['teddy', 1150, 705, 100, 0], ['kite', 1225, 110, 100, 0], ['lollipop', 1000, 745, 80, .2], ['balloon', 450, 70, 64, -.1]] }
  };
  // 약속이 소품 (마스코트 SVG 220×220 좌표)
  const HATS = {
    santa: '<path d="M52 50 C70 8 122 -2 162 18 C138 22 126 38 122 50 Z" fill="#E5484D"/><ellipse cx="108" cy="50" rx="62" ry="13" fill="#fff"/><circle cx="163" cy="18" r="13" fill="#fff"/>',
    party: '<path d="M78 48 L110 -2 L142 48 Z" fill="#FF6B8A"/><path d="M88 32 L132 32 L142 48 L78 48 Z" fill="#FFE66D"/><circle cx="110" cy="0" r="9" fill="#6FB8FF"/>',
    party2: '<path d="M78 48 L110 -2 L142 48 Z" fill="#6FB8FF"/><path d="M88 32 L132 32 L142 48 L78 48 Z" fill="#FFE66D"/><circle cx="110" cy="0" r="9" fill="#FF6B8A"/>',
    cap: '<path d="M40 44 L110 18 L180 44 L110 70 Z" fill="#2B3A36"/><path d="M76 56 L76 74 C76 84 144 84 144 74 L144 56 Z" fill="#3D4F49"/><path d="M176 46 L180 78" stroke="#FFD93D" stroke-width="4" stroke-linecap="round"/><circle cx="180" cy="82" r="7" fill="#FFD93D"/>',
    flower: '<g transform="translate(152 30)"><circle cx="0" cy="-12" r="9" fill="#FF9ECF"/><circle cx="11" cy="-4" r="9" fill="#FF9ECF"/><circle cx="7" cy="9" r="9" fill="#FF9ECF"/><circle cx="-7" cy="9" r="9" fill="#FF9ECF"/><circle cx="-11" cy="-4" r="9" fill="#FF9ECF"/><circle cx="0" cy="0" r="7" fill="#FFD93D"/></g>',
    band: '<rect x="42" y="50" width="136" height="16" rx="8" fill="#E5484D"/><path d="M110 50 l3.5 7 7.5 1-5.5 5 1.5 7.5-7-4-7 4 1.5-7.5-5.5-5 7.5-1z" fill="#fff"/>',
    bunny: '<ellipse cx="82" cy="18" rx="12" ry="30" fill="#fff" transform="rotate(-8 82 18)"/><ellipse cx="82" cy="20" rx="6" ry="20" fill="#FFC0CB" transform="rotate(-8 82 18)"/><ellipse cx="138" cy="18" rx="12" ry="30" fill="#fff" transform="rotate(8 138 18)"/><ellipse cx="138" cy="20" rx="6" ry="20" fill="#FFC0CB" transform="rotate(8 138 18)"/>',
    glasses: '<g fill="none" stroke="#27403A" stroke-width="5"><circle cx="84" cy="112" r="19"/><circle cx="136" cy="112" r="19"/><path d="M103 112 L117 112"/><path d="M65 108 L52 100 M155 108 L168 100"/></g>'
  };
  const moodOf = () => MOOD[settings.frameSet || 'promise'] || null;
  function applyHats(id) {
    $$('svg.mascot').forEach(svg => { const old = svg.querySelector('g.hat'); if (old) old.remove(); if (id && HATS[id]) { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'hat'); g.innerHTML = HATS[id]; svg.appendChild(g); } });
  }
  function drawMoodArt(m) {   // 세트 그림 (스티커 그림을 큼직하게, 글·카드를 피한 자리에)
    const cv = $('#mood-art'); if (!cv) return; const ctx = cv.getContext('2d');
    if (!m) { cv.width = cv.height = 1; return; }
    const W = cv.clientWidth || 1280, H = cv.clientHeight || 800, k = Math.min(2, (window.devicePixelRatio || 1) * curScale);
    cv.width = Math.round(W * k); cv.height = Math.round(H * k); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H);
    const sx = W / 1280, sy = H / 800;
    const moon = r => { ctx.save(); ctx.fillStyle = '#FFE066'; ctx.shadowColor = 'rgba(255,214,80,.7)'; ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(230,180,40,.25)'; [[-r * .3, -r * .2, r * .18], [r * .25, r * .1, r * .12], [-r * .05, r * .4, r * .1]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(dx, dy, rr, 0, Math.PI * 2); ctx.fill(); }); ctx.restore(); };
    const cap = s => { ctx.save(); ctx.fillStyle = '#2B3A36'; ctx.beginPath(); ctx.moveTo(-s * .5, 0); ctx.lineTo(0, -s * .22); ctx.lineTo(s * .5, 0); ctx.lineTo(0, s * .22); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#3D4F49'; ctx.beginPath(); ctx.moveTo(-s * .26, s * .08); ctx.lineTo(-s * .26, s * .3); ctx.quadraticCurveTo(0, s * .42, s * .26, s * .3); ctx.lineTo(s * .26, s * .08); ctx.quadraticCurveTo(0, s * .22, -s * .26, s * .08); ctx.fill(); ctx.strokeStyle = '#FFD93D'; ctx.lineWidth = s * .04; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * .46, 0); ctx.lineTo(s * .5, s * .32); ctx.stroke(); ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(s * .5, s * .36, s * .06, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
    const bunting = () => { const cols = ['#FF6B6B', '#FFE66D', '#6FB8FF', '#7ED6BE', '#FF9ECF', '#B39DFF']; ctx.save(); ctx.strokeStyle = 'rgba(39,64,58,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(360, 14); ctx.quadraticCurveTo(820, 90, 1280, 14); ctx.stroke(); for (let i = 0; i < 16; i++) { const t = (i + .5) / 16, x = 360 + t * 920, y = (1 - t) * (1 - t) * 14 + 2 * (1 - t) * t * 90 + t * t * 14; ctx.fillStyle = cols[i % 6]; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y); ctx.lineTo(x, y + 40); ctx.closePath(); ctx.fill(); } ctx.restore(); };
    m.motifs.forEach(([name, x, y, s, r]) => {
      ctx.save(); ctx.scale(sx, sy);
      if (name === 'bunting') bunting();
      else { ctx.translate(x, y); ctx.rotate(r || 0); ctx.globalAlpha = .95; if (name === 'moon') moon(s / 2); else if (name === 'cap') cap(s); else if (DRAW[name]) DRAW[name](ctx, s); }
      ctx.restore();
    });
  }
  function applyMood() {
    const m = moodOf(), s0 = $('#s0'), st = s0.style, set = settings.frameSet || 'promise';
    const vars = ['--s0-a', '--s0-b', '--s0-c1', '--s0-c2', '--s0-bg', '--pill-bg', '--pill-fg', '--back-a', '--back-b'];
    vars.forEach((v, i) => { if (m) st.setProperty(v, m.colors[i]); else st.removeProperty(v); });
    s0.classList.toggle('mood', !!m);
    applyHats(m ? m.hat : null);
    if (m) { const f = FRAMES.find(x => x.set === set && frameOn(x)) || FRAMES.find(x => x.set === set); const c = $('#pcard-canvas'); if (f && c) try { compose(c, { frame: f, placeholder: true }); } catch (e) {} }
    drawMoodArt(m);
  }
  const heroText = (set, key) => ((settings.hero && settings.hero[set] && settings.hero[set][key]) || (HERO_DEFAULT[set] || HERO_DEFAULT.promise)[key]);
  const escHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function applyTexts() {
    const set = settings.frameSet || 'promise';
    $('#pcap').textContent = settings.campaignLine || CAMPAIGN_LINE; $('#eyebrow-school').textContent = settings.schoolName || '홍북초등학교';
    $('#hero-tag').textContent = heroText(set, 'tag');
    $('#hero-title').innerHTML = heroText(set, 'title').split('/').map(x => escHtml(x.trim()).replace(/\{([^}]*)\}/g, '<strong>$1</strong>')).join('<br>');
    $('#hero-sub').innerHTML = heroText(set, 'sub').split('/').map(x => escHtml(x.trim())).join('<br>');
    applyMood(); paperBadge();
  }
  applyTexts();
  $('#btn-about-close').addEventListener('click', () => { pop(); $('#about').classList.remove('on'); });
  $('#btn-lic').addEventListener('click', e => { e.stopPropagation(); pop(); $('#licbox').classList.add('on'); });
  $('#btn-lic-close').addEventListener('click', () => { pop(); $('#licbox').classList.remove('on'); });
  $('#licbox').addEventListener('click', e => { if (e.target === e.currentTarget) $('#licbox').classList.remove('on'); });
  // 교사 설정: 앱 정보 창의 버튼을 누르면 바로 열림 (대기 화면 오른쪽 위 5초 누르기도 그대로 됨)
  function openTeacher() { if (settings.lockPin) showLock('teacher', () => go('s10')); else go('s10'); }   // 비밀번호가 있으면 번호판 먼저
  $('#btn-teacher-hold').addEventListener('click', () => { $('#about').classList.remove('on'); pop(); openTeacher(); });
  $('#about').addEventListener('click', e => { if (e.target === e.currentTarget) $('#about').classList.remove('on'); });

  /* ---------- 전체 화면 유지 ----------
     크롬·엣지는 인쇄창이 뜨면 전체 화면을 강제로 풀어 버린다(막을 방법이 없음).
     그래서 '전체 화면을 원하는 상태'를 기억해 두고, 인쇄창이 닫힌 직후와 다음 터치 때 다시 켠다. */
  let fullWanted = false;
  function enterFull() {
    const d = document.documentElement, fn = d.requestFullscreen || d.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement || !fn) return Promise.resolve();
    try { return Promise.resolve(fn.call(d)).catch(() => {}); } catch (err) { return Promise.resolve(); }
  }
  function wantFull(on) { if (BRIDGE || KIOSK) return;   // 앱(exe·bat)·안드로이드 앱 안에서는 이미 전체 화면이라 요청하지 않음 (요청하면 '종료하려면 Esc' 말풍선이 뜸)
    fullWanted = !!on; if (on) enterFull(); else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
  // 전체 화면이 풀린 상태에서 화면을 누르면(사용자 동작이 있어야 켤 수 있음) 조용히 다시 켬
  document.addEventListener('click', () => { if (!KIOSK && fullWanted && settings.autoFull && !document.fullscreenElement && !document.webkitFullscreenElement && current !== 's10') enterFull(); }, true);
  window.addEventListener('afterprint', () => { if (fullWanted && settings.autoFull) setTimeout(enterFull, 50); });

  /* ---------- 종료 단추 (윈도우 앱) ---------- */
  if (QUIT_PORT) $('#app').classList.add('hasquit');
  if (UPD_MSG) setTimeout(() => {
    const [kind, ...rest] = decodeURIComponent(UPD_MSG).split(':'), v = rest.join(':');
    toast(kind === 'ok' ? `약속네컷을 ${v} 버전으로 업데이트했어요` : kind === 'auto' ? `새 버전 ${v}으로 자동 업데이트했어요` : kind === 'exe' ? `실행기(약속네컷.exe)를 ${v}로 업데이트했어요` : kind === 'back' ? `이전 버전(${v})으로 되돌렸어요` : `업데이트하지 못했어요: ${v}`);
  }, 900);
  if (PMODE_MSG) setTimeout(() => toast(PMODE_MSG === 'dialog' ? '이제 [뽑기]를 누르면 프린터 선택창이 떠요' : '이제 기본 프린터로 바로 출력돼요'), 900);
  if (QUIT_PORT && MONITORS > 1) {
    $('#app').classList.add('hasmon');
    $('#btn-mon-text').textContent = MONITORS === 2 ? `${nextMonitor()}번 모니터로 옮기기` : `다음 모니터로 (지금 ${MONITOR}번)`;
    $('#btn-mon').addEventListener('click', e => { e.stopPropagation(); pop(); toast(`${nextMonitor()}번 모니터로 옮겨요…`); setTimeout(() => moveToMonitor(nextMonitor()), 350); });
  }
  $('#btn-quit').addEventListener('click', e => { e.stopPropagation(); pop(); $('#quit-ask').classList.add('on'); });
  $('#btn-quit-no').addEventListener('click', () => { pop(); $('#quit-ask').classList.remove('on'); });
  $('#btn-quit-yes').addEventListener('click', () => { pop(); quitApp(); });
  $('#quit-ask').addEventListener('click', e => { if (e.target === e.currentTarget) $('#quit-ask').classList.remove('on'); });
  // 왼쪽 위 [처음으로] — 아직 사진을 안 찍었으면 바로, 찍은 뒤라면 한 번 물어봄 (실수로 눌러 사진이 사라지지 않게)
  $('#btn-home').addEventListener('click', e => { e.stopPropagation(); pop(); if (S.shots && S.shots.length) $('#home-ask').classList.add('on'); else go('s0'); });
  $('#btn-home-yes').addEventListener('click', () => { pop(); $('#home-ask').classList.remove('on'); go('s0'); });
  $('#btn-home-no').addEventListener('click', () => { pop(); $('#home-ask').classList.remove('on'); });
  $('#home-ask').addEventListener('click', e => { if (e.target === e.currentTarget) $('#home-ask').classList.remove('on'); });

  /* ---------- 잠금 화면 · 번호판 (숫자 4자리) ----------
     mode: 'unlock' 앱을 켤 때·[지금 잠그기] (취소 없음) / 'teacher' 교사 메뉴 들어갈 때 / 'set' 새 비밀번호(두 번 입력) */
  const lock = { mode: null, buf: '', first: '', onOk: null };
  const LOCK_TEXT = { unlock: ['지금은 / {쉬는 시간}이에요', '선생님이 비밀번호를 누르면 / 다시 사진을 찍을 수 있어요.', '선생님만'], teacher: ['교사 메뉴에 / {들어가요}', '비밀번호 4자리를 눌러 주세요.', '교사 메뉴'], set: ['새 비밀번호를 / {정해요}', '숫자 4자리를 누르고, 한 번 더 눌러 확인해요.', '비밀번호 설정'] };
  const lockTitle = t => t.split('/').map(x => escHtml(x.trim()).replace(/\{([^}]*)\}/g, '<strong>$1</strong>')).join('<br>');
  const lockSub = t => t.split('/').map(x => escHtml(x.trim())).join('<br>');
  function lockDots() { $$('#pin-dots i').forEach((d, i) => d.classList.toggle('on', i < lock.buf.length)); }
  function showLock(mode, onOk) {
    lock.mode = mode; lock.buf = ''; lock.first = ''; lock.onOk = onOk || null;
    if (!$('#lock-mascot').firstChild) { const m = $('.brand-logo .mascot').cloneNode(true); m.classList.add('bounce'); $('#lock-mascot').appendChild(m); applyHats(moodOf() ? moodOf().hat : null); }
    $('#lock-school').textContent = settings.schoolName || '홍북초등학교';
    $('#lock-title').innerHTML = lockTitle(LOCK_TEXT[mode][0]); $('#lock-sub').innerHTML = lockSub(LOCK_TEXT[mode][1]); $('#lock-pill').textContent = LOCK_TEXT[mode][2]; $('#lock-msg').textContent = '';
    $('#lock-cancel').style.display = mode === 'unlock' ? 'none' : ''; $('#lock-forgot').style.display = mode === 'set' ? 'none' : ''; $('#lock-help').classList.remove('on');
    lockDots(); $('#lock').classList.add('on'); $('#lock').setAttribute('aria-hidden', 'false');
    if (typeof attractHide === 'function') attractHide();
  }
  function hideLock() { $('#lock').classList.remove('on'); $('#lock').setAttribute('aria-hidden', 'true'); lock.mode = null; lock.buf = ''; }
  function lockFail(msg, after) {
    const d = $('#pin-dots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); $('#lock-msg').textContent = msg; buzz();
    lock.buf = ''; setTimeout(() => { lockDots(); if (after) after(); }, 500);
  }
  function lockCheck() {
    const v = lock.buf;
    if (lock.mode === 'set') {
      if (!lock.first) { lock.first = v; lock.buf = ''; lockDots(); $('#lock-title').innerHTML = lockTitle('한 번 더 / {같은 숫자}를'); $('#lock-sub').innerHTML = lockSub('방금 누른 4자리를 다시 눌러 확인해요.'); return; }
      if (v === lock.first) { settings.lockPin = v; saveSettings(); hideLock(); toast('비밀번호를 설정했어요'); if (lock.onOk) lock.onOk(); }
      else lockFail('두 번이 달라요 — 처음부터 다시', () => { lock.first = ''; $('#lock-title').innerHTML = lockTitle(LOCK_TEXT.set[0]); $('#lock-sub').innerHTML = lockSub(LOCK_TEXT.set[1]); });
      return;
    }
    if (v === settings.lockPin) { const f = lock.onOk; hideLock(); pop(); if (f) f(); } else lockFail('비밀번호가 달라요');
  }
  function lockKey(k) {
    if (!lock.mode) return; pop();
    if (k === 'del') lock.buf = lock.buf.slice(0, -1); else if (lock.buf.length < 4) lock.buf += k;
    lockDots(); $('#lock-msg').textContent = '';
    if (lock.buf.length === 4) setTimeout(lockCheck, 120);
  }
  $$('#keypad button[data-k]').forEach(b => b.addEventListener('click', () => lockKey(b.dataset.k)));
  $('#lock-cancel').addEventListener('click', () => { pop(); hideLock(); });
  $('#lock-quit').addEventListener('click', e => { e.stopPropagation(); pop(); $('#quit-ask').classList.add('on'); });
  $('#lock-forgot').addEventListener('click', () => { pop(); const h = $('#lock-help'); h.innerHTML = KIOSK ? '비밀번호는 이 컴퓨터의 앱 설정에 저장돼요. 잊었다면 약속네컷을 끄고 <b>C:\\Users\\(사용자 이름)\\AppData\\Local\\YaksokNecut</b> 폴더를 통째로 지운 뒤 다시 켜세요 — 모든 설정이 처음으로 돌아가요 (읽어주세요.txt 참고).' : '비밀번호는 이 브라우저의 사이트 데이터에 저장돼요. 잊었다면 브라우저 설정에서 이 페이지의 사이트 데이터(쿠키·저장소)를 삭제하세요 — 모든 설정이 처음으로 돌아가요.'; h.classList.toggle('on'); });
  document.addEventListener('keydown', e => { if (!lock.mode) return; if (/^[0-9]$/.test(e.key)) { e.preventDefault(); lockKey(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); lockKey('del'); } else if (e.key === 'Escape' && lock.mode !== 'unlock') hideLock(); });
  // 지금 잠그기: 교사 메뉴에 있었다면 저장하고, 첫 화면으로 돌아가 잠금 화면
  function lockNow() {
    if (!settings.lockPin || lock.mode === 'unlock') return;
    if (current === 's10') { saveSettings(); applyTexts(); applyTheme(); settingsBackup = null; }
    if (lock.mode) hideLock();
    if (current !== 's0') go('s0');
    showLock('unlock');
  }
  $('#btn-lock').addEventListener('click', e => { e.stopPropagation(); pop(); lockNow(); });
  // 새 버전 준비 알림 — 실행기가 배경에서 새 exe(exeReady, 실행기 1.9.10부터)나 새 앱 파일(htmlReady, 1.9.11부터)을 받아 두면 /update/status 로 알려 줌
  let exeReady = '', updKind = '', restartT = null, restartCancelAt = 0;   // exeReady: 준비된 버전(exe 또는 앱), updKind: 'exe' | 'app'
  const RESTART_IDLE_MS = 3 * 60000, RESTART_COUNT = 10;
  const updWhat = () => updKind === 'app' ? '새 버전' : '새 실행기';
  function restartNow() { flushSettings(true); toast(`${updWhat()}으로 다시 시작해요… 잠시 뒤 다시 열려요`, 5000); setTimeout(() => { location.href = LOCAL + '/update/restart'; }, 400); }
  function setExeReady(v, kind) {
    if (!v || exeReady === v) return; exeReady = v; updKind = kind || 'exe';
    $('#app').classList.add('exeready'); $('#restart-v').textContent = v; $('#restart-what').textContent = updWhat(); $('#btn-restart-text').textContent = (updKind === 'app' ? '새 버전' : '실행기 새 버전') + ' · 다시 시작';
    toast(`${updKind === 'app' ? '새 버전' : '실행기'} ${v} 준비됐어요 — 오른쪽 위 [다시 시작]을 누르면 적용돼요 (안 눌러도 다음에 켤 때 적용)`, 7000);
    if (current === 's10') { const el = $('#teacher'); const y = el.querySelector('#tmain') ? el.querySelector('#tmain').scrollTop : 0; ENTER.s10(); if (el.querySelector('#tmain')) el.querySelector('#tmain').scrollTop = y; }
  }
  function restartCountdown() {
    if (restartT) return; let n = RESTART_COUNT; $('#restart-n').textContent = n; $('#restart-ask').classList.add('on');
    restartT = setInterval(() => { n--; $('#restart-n').textContent = Math.max(0, n); if (n <= 0) { clearInterval(restartT); restartT = null; $('#restart-ask').classList.remove('on'); restartNow(); } }, 1000);
  }
  function restartCancel() { if (restartT) { clearInterval(restartT); restartT = null; } $('#restart-ask').classList.remove('on'); restartCancelAt = Date.now(); lastActive = Date.now(); }
  $('#btn-restart').addEventListener('click', e => { e.stopPropagation(); pop(); restartNow(); });
  $('#btn-restart-now').addEventListener('click', e => { e.stopPropagation(); pop(); if (restartT) { clearInterval(restartT); restartT = null; } $('#restart-ask').classList.remove('on'); restartNow(); });
  $('#btn-restart-later').addEventListener('click', e => { e.stopPropagation(); pop(); restartCancel(); toast('다음에 켤 때 새 실행기로 켜져요'); });
  $('#restart-ask').addEventListener('click', e => { if (e.target === e.currentTarget) restartCancel(); });   // 바깥을 만져도 취소
  if (KIOSK && QUIT_PORT && LV) { const poll = () => localJson('/update/status').then(j => { if (j && j.exeReady) setExeReady(j.exeReady, 'exe'); else if (j && j.htmlReady) setExeReady(j.htmlReady, 'app'); }).catch(() => {}); setTimeout(poll, 25000); setInterval(poll, 60000); }
  // 가만히 두면 자동 잠금 (교사 메뉴 › 학교·기록·앱 › '가만히 두면 잠금', 기본 안 함)
  let lastActive = Date.now();
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastActive = Date.now(); }, true));
  setInterval(() => {
    const min = +settings.lockAfter || 0;
    if (settings.lockPin && min && !lock.mode && !document.hidden && Date.now() - lastActive >= min * 60000) lockNow();
    // 새 실행기가 준비됐고 첫 화면에서 3분 동안 아무도 안 만졌으면 10초 카운트다운 뒤 알아서 다시 시작 (만지면 취소, 취소하면 10분 뒤 다시)
    if (exeReady && settings.autoRestart !== false && current === 's0' && !document.hidden && !restartT && Date.now() - lastActive >= RESTART_IDLE_MS && Date.now() - restartCancelAt >= 10 * 60000) restartCountdown();
    const sec = +settings.attract || 0;
    if (attractOn && (current !== 's0' || lock.mode)) attractHide();
    else if (sec && current === 's0' && !lock.mode && !attractOn && !document.hidden && Date.now() - lastActive >= sec * 1000) attractShow();
  }, 2000);
  // 대기 화면 — 그 세트의 액자 예시가 4초마다 넘어가고, 누르면 첫 화면으로
  let attractOn = false, attractT = null, attractIdx = 0, attractFrames = [];
  function attractSlide() {
    if (!attractFrames.length) return; const f = attractFrames[attractIdx % attractFrames.length]; attractIdx++;
    const cards = [$('#at-card-a'), $('#at-card-b')], show = cards[attractIdx % 2], hide = cards[(attractIdx + 1) % 2];
    try { compose(show.querySelector('canvas'), { frame: f, placeholder: true }); } catch (e) {}
    show.style.setProperty('--rot', (attractIdx % 2 ? 3 : -3) + 'deg'); show.classList.add('on'); hide.classList.remove('on');
  }
  function attractShow() {
    const set = settings.frameSet || 'promise'; attractFrames = FRAMES.filter(f => f.set === set && frameOn(f)); if (!attractFrames.length) return;
    attractOn = true; attractIdx = 0;
    $('#at-tag').textContent = heroText(set, 'tag');
    $('#at-title').innerHTML = heroText(set, 'title').split('/').map(x => escHtml(x.trim()).replace(/\{([^}]*)\}/g, '<strong>$1</strong>')).join(' ');
    if (!$('#at-mascot').firstChild) { const m = $('.brand-logo .mascot').cloneNode(true); m.classList.add('bounce'); $('#at-mascot').appendChild(m); applyHats(moodOf() ? moodOf().hat : null); }
    $('#attract').classList.add('on'); attractSlide(); clearInterval(attractT); attractT = setInterval(attractSlide, 4000);
  }
  function attractHide() { attractOn = false; clearInterval(attractT); $('#attract').classList.remove('on'); $$('.at-card').forEach(c => c.classList.remove('on')); }
  $('#attract').addEventListener('click', e => { e.stopPropagation(); pop(); attractHide(); lastActive = Date.now(); });

