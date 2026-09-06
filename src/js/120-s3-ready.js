  /* ===================== S3 준비 ===================== */
  ENTER.s3 = async () => {
    $('#cambox').classList.toggle('demo', S.demo);
    const ok = await ensureCamera(); if (current !== 's3') return;
    if (!ok && !S.demo) return;
    const nEl = $('#ready-n'); const start = Date.now(); nEl.textContent = T.ready;
    speak(VOICE.ready);
    every(() => { nEl.textContent = Math.max(0, Math.ceil((T.ready * 1000 - (Date.now() - start)) / 1000)); }, 200);   // 남은 초를 숫자로
    later(() => go('s4'), T.ready * 1000);
  };
  $('#btn-ready').addEventListener('click', () => { pop(); go('s4'); });
  // 촬영 화면 뒤로가기: 준비 화면에서는 액자 고르기로, 찍는 중에는 촬영을 멈추고 준비 화면으로 (한 컷만 다시 찍는 중이면 고르기 화면으로, 사진은 그대로)
  $('#btn-cam-back').addEventListener('click', () => {
    pop();
    if (current === 's4' && S.retakeIdx != null) { S.retakeIdx = null; S.retakeOneN = Math.max(0, (S.retakeOneN || 0) - 1); go('s5'); }   // 안 찍고 돌아가면 횟수도 돌려줌
    else if (current === 's4') { S.shots = []; go('s3'); }
    else go('s2');
  });

