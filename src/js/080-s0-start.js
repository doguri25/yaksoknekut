  /* ===================== S0 대기 ===================== */
  /* ---------- 첫 화면 계절 장식 (벚꽃·비눗방울·낙엽·눈) ---------- */
  const SEASON_NAMES = { spring: '봄 벚꽃', summer: '여름 비눗방울', autumn: '가을 낙엽', winter: '겨울 눈' };
  function seasonKind() {
    const v = settings.season || 'auto'; if (v === 'none') return null; if (SEASON_NAMES[v]) return v;
    const m = new Date().getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m <= 8 ? 'summer' : m <= 11 ? 'autumn' : 'winter';
  }
  function particleKind() {   // 계절 자동일 때 행사 세트에 어울리는 흩날림이 있으면 그것을 먼저
    const v = settings.season || 'auto', m = moodOf(); if (v === 'auto' && m && m.particles) return m.particles; return seasonKind();
  }
  let seasonRun = 0;
  function seasonStart() {
    const cv = $('#season'), kind = particleKind(), run = ++seasonRun; if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!kind) { cv.width = cv.height = 1; return; }
    const W = cv.clientWidth || 1280, H = cv.clientHeight || 800, k = Math.min(2, (window.devicePixelRatio || 1) * curScale);
    cv.width = Math.round(W * k); cv.height = Math.round(H * k); ctx.setTransform(k, 0, 0, k, 0, 0);
    const R = (a, b) => a + Math.random() * (b - a);
    const up = kind === 'summer' || kind === 'balloons', N = kind === 'winter' ? 34 : kind === 'confetti' ? 44 : kind === 'stars' ? 30 : kind === 'balloons' ? 9 : 26;
    const cols = { spring: ['#FFB7C5', '#FFC9D6', '#FFA3B8'], autumn: ['#E8A33C', '#D97A3C', '#C9B24A', '#C95E3C'], winter: ['#fff'], summer: ['#fff'],
      confetti: ['#FF6B6B', '#6FB8FF', '#FFE66D', '#7ED6BE', '#B39DFF', '#FF9ECF'], stars: ['#F2C84C', '#FFD93D', '#FFE9A0'], balloons: ['#FF6B8A', '#6FB8FF', '#FFD93D', '#7ED6BE', '#B39DFF'] }[kind];
    const size = () => kind === 'summer' ? R(10, 24) : kind === 'winter' ? R(5, 13) : kind === 'spring' ? R(10, 18) : kind === 'confetti' ? R(5, 9) : kind === 'stars' ? R(5, 11) : kind === 'balloons' ? R(14, 24) : R(9, 16);
    const speed = () => kind === 'winter' ? R(22, 40) : kind === 'summer' ? R(-30, -14) : kind === 'balloons' ? R(-26, -12) : kind === 'stars' ? 0 : kind === 'confetti' ? R(18, 34) : R(28, 48);
    const mk = (fresh) => ({ x: R(0, W), y: fresh ? (up ? H + 30 : -30) : R(-30, H), s: size(), vy: speed(), amp: kind === 'stars' ? 0 : R(10, 34), ph: R(0, 6.28), fq: R(.4, .9), rot: kind === 'balloons' ? 0 : R(0, 6.28), vr: kind === 'balloons' ? 0 : R(-1.2, 1.2), a: kind === 'autumn' ? R(.35, .7) : kind === 'confetti' ? R(.45, .7) : R(.45, .8), c: cols[Math.floor(R(0, cols.length))], flake: Math.random() < .3 });
    const ps = Array.from({ length: N }, () => mk(false));
    const drawOne = p => {
      ctx.save(); ctx.translate(p.x + Math.sin(p.t * p.fq + p.ph) * p.amp, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
      const r = p.s;
      if (kind === 'spring') { ctx.beginPath(); ctx.moveTo(0, -r * .8); ctx.bezierCurveTo(r * .6, -r * 1.2, r * 1.2, -r * .4, r * .6, r * .4); ctx.bezierCurveTo(r * .3, r * .8, 0, r, 0, r); ctx.bezierCurveTo(0, r, -r * .3, r * .8, -r * .6, r * .4); ctx.bezierCurveTo(-r * 1.2, -r * .4, -r * .6, -r * 1.2, 0, -r * .8); ctx.closePath(); ctx.fill(); }
      else if (kind === 'autumn') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * .9, -r * .6, r * .9, r * .6, 0, r); ctx.bezierCurveTo(-r * .9, r * .6, -r * .9, -r * .6, 0, -r); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(120,70,20,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -r * .8); ctx.lineTo(0, r * .8); ctx.stroke(); }
      else if (kind === 'confetti') { if (p.flake) { ctx.beginPath(); ctx.arc(0, 0, r * .7, 0, 6.283); ctx.fill(); } else ctx.fillRect(-r, -r * .5, r * 2, r); }
      else if (kind === 'stars') { ctx.globalAlpha = p.a * (.5 + .5 * Math.sin(p.t * 2.2 + p.ph)); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rad = i % 2 ? r * .4 : r; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }
      else if (kind === 'balloons') { ctx.rotate(0); ctx.strokeStyle = 'rgba(39,64,58,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, r * 1.2); ctx.quadraticCurveTo(-r * .4, r * 2, 0, r * 2.8); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, r * .8, r, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(-r * .2, r * 1.05); ctx.lineTo(r * .2, r * 1.05); ctx.lineTo(0, r * 1.3); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * .28, -r * .4, r * .18, r * .28, -.5, 0, 6.283); ctx.fill(); }
      else if (kind === 'summer') { ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.fillStyle = 'rgba(190,232,255,.28)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * .68, -2.4, -1.3); ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(140,190,235,.75)'; ctx.lineWidth = 1.8;
        if (p.flake) { ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(150,200,240,.95)'; for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 1.6); ctx.moveTo(0, -r * .9); ctx.lineTo(r * .5, -r * 1.25); ctx.moveTo(0, -r * .9); ctx.lineTo(-r * .5, -r * 1.25); ctx.stroke(); } }
        else { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.stroke(); } }
      ctx.restore();
    };
    let last = performance.now(); const t0 = last;
    const frame = now => {
      if (run !== seasonRun || current !== 's0') return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.t = (now - t0) / 1000; p.y += p.vy * dt; p.rot += p.vr * dt; if (up ? p.y < -40 : p.y > H + 40) Object.assign(p, mk(true)); drawOne(p); });
      if (settings.anim === false) return;   // 움직임 끔: 한 장만 그려 두기
      if (!document.hidden) requestAnimationFrame(frame); else setTimeout(() => requestAnimationFrame(frame), 500);
    };
    ps.forEach(p => p.t = 0); requestAnimationFrame(frame);
  }
  ENTER.s0 = () => { resetSession(); $('#cambox').classList.toggle('demo', S.demo); seasonStart(); };
  $('#s0').addEventListener('click', e => {
    if (e.target.closest('#hot')) return;
    audio(); pop(); primeSpeech();
    if (settings.autoFull) wantFull(true);   // 브라우저 주소창 숨김
    if (settings.showCutSelect) go('s1'); else { S.cuts = settings.defaultCuts; go('s2'); }
    ensureCamera();
  });
  // 교사 메뉴: 오른쪽 위 5초 길게 누르기
  (() => {
    const hot = $('#hot'), ring = hot.querySelector('.f'); let t1 = null, t2 = null;
    const cancel = () => { clearTimeout(t1); clearTimeout(t2); hot.classList.remove('arming'); ring.style.strokeDashoffset = '163.4'; };
    hot.addEventListener('pointerdown', e => {
      e.stopPropagation(); cancel();
      t1 = setTimeout(() => { hot.classList.add('arming'); requestAnimationFrame(() => { ring.style.strokeDashoffset = '0'; }); }, 1500);
      t2 = setTimeout(() => { cancel(); openTeacher(); }, 5000);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => hot.addEventListener(ev, cancel));
    hot.addEventListener('click', e => e.stopPropagation());
  })();

