  /* ===================== 화면 배율 (1280×800 기준 → 창 크기에 맞춰 전체 확대·축소) ===================== */
  const BASE_W = 1280, BASE_H = 800;
  let curScale = 1;
  let fitW = 0, fitH = 0;
  function fitApp() {
    const W = window.innerWidth || document.documentElement.clientWidth, H = window.innerHeight || document.documentElement.clientHeight;
    if (!W || !H) return;
    fitW = W; fitH = H;
    curScale = Math.min(W / BASE_W, H / BASE_H) || 1;
    document.documentElement.style.setProperty('--s', curScale.toFixed(4));
    // 기준 화면(1280×800)이 들어가는 배율을 고른 뒤, 앱 상자를 창 비율만큼 넓혀 여백 없이 꽉 채움
    const app = document.getElementById('app');
    app.style.width = Math.ceil(W / curScale) + 'px'; app.style.height = Math.ceil(H / curScale) + 'px';
  }
  const appScale = () => curScale;
  // 창 크기가 바뀌었는데 resize 이벤트를 놓친 경우(인쇄창 때문에 전체 화면이 풀릴 때 등)를 위해 여러 경로로 다시 맞춤
  const refit = () => { if (window.innerWidth !== fitW || window.innerHeight !== fitH) fitApp(); };
  const refitSoon = () => [0, 120, 350, 700, 1200, 2000].forEach(ms => setTimeout(refit, ms));
  window.addEventListener('resize', fitApp); fitApp();
  ['fullscreenchange', 'webkitfullscreenchange', 'orientationchange', 'afterprint', 'pageshow', 'focus'].forEach(ev => window.addEventListener(ev, refitSoon));
  document.addEventListener('visibilitychange', refitSoon);
  if (window.ResizeObserver) new ResizeObserver(refit).observe(document.documentElement);
  setInterval(refit, 1000);
  applyTheme();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

