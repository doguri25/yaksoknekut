  /* ===================== S1 컷 수 ===================== */
  $$('#s1 .tile').forEach(t => t.addEventListener('click', () => { pop(); S.cuts = +t.dataset.cuts; go('s2'); }));

