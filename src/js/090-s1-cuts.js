  /* ===================== S1 컷 수 ===================== */
  // [두 칸]·[네 칸]은 약속 칸이 있는 액자, [사진만]은 글 쓰는 칸 없는 2·3·4칸 액자 (컷 수는 액자 화면에서 정해짐)
  const photoFramesOn = () => FRAMES.some(f => f.photoOnly && f.set === (settings.frameSet || 'promise') && frameOn(f));
  ENTER.s1 = () => {
    const on = photoFramesOn();   // 이 세트의 사진만 액자를 교사가 모두 껐으면 [사진만] 칸을 숨김
    $('#tile-photo').style.display = on ? '' : 'none';
    $('#s1 .big-tiles').classList.toggle('three', on);
  };
  $$('#s1 .tile').forEach(t => t.addEventListener('click', () => {
    pop(); S.photoOnly = t.dataset.mode === 'photo';
    if (!S.photoOnly) S.cuts = +t.dataset.cuts;
    go('s2');
  }));
