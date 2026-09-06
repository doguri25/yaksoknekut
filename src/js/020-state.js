  /* ===================== 상태 ===================== */
  function fresh(demo) { return { cuts: 4, frame: null, shots: [], picked: [], filter: 'none', stickers: [], paperBg: null, copies: 1, promiseText: '', promiseInk: null, inkStrokes: [], retakeUsed: false, retakeIdx: null, retakeKeep: null, retakeOneN: 0, demo: !!demo }; }   // retakeIdx: 한 컷만 다시 찍을 때 그 컷 번호 · retakeKeep: 그동안 고른 순서 · retakeOneN: 이 팀이 한 컷 다시 찍은 횟수(최대 3)
  let S = fresh(false);
  function resetSession() {
    if (S.shots) S.shots.forEach(c => { c.width = 0; c.height = 0; });
    S = fresh(S.demo);
    decorHistory = []; selected = null; base = null;
    $('#print-area').innerHTML = '';
  }

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

