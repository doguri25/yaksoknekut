  /* ===================== 상태 ===================== */
  function fresh(demo) { return { cuts: 4, frame: null, shots: [], picked: [], filter: 'none', stickers: [], paperBg: null, copies: 1, promiseText: '', promiseInk: null, inkStrokes: [], retakeUsed: false, demo: !!demo }; }
  let S = fresh(false);
  function resetSession() {
    if (S.shots) S.shots.forEach(c => { c.width = 0; c.height = 0; });
    S = fresh(S.demo);
    decorHistory = []; selected = null; base = null;
    $('#print-area').innerHTML = '';
  }

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

