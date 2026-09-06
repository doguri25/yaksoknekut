  /* ===================== S4 촬영 ===================== */
  let shootRun = 0;
  const CUT_WORDS = ['첫 번째', '두 번째', '세 번째', '네 번째'];
  const RETAKE_MAX = 3;   // 한 컷만 다시 찍기 — 한 팀이 쓸 수 있는 횟수 (줄이 밀리지 않게)
  ENTER.s4 = async () => {
    const run = ++shootRun; const alive = () => run === shootRun && current === 's4';
    const one = S.retakeIdx;   // 한 컷만 다시 찍기: 고르기 화면에서 고른 컷 번호 (null이면 4장 전부 새로)
    if (one == null) S.shots = [];
    const poses = pickPoses(S.frame && S.frame.faceless);
    const dots = $$('#dots span'), count = $('#count'), review = $('#review'), flash = $('#flash');
    $('#pose-note').textContent = S.frame && S.frame.faceless ? '얼굴은 안 나와도 돼요' : '';
    const voiceOn = settings.voice && vol() && HAS_TTS;
    if (one != null) { await ensureCamera(); if (!alive()) return; }   // 고르기 화면에서 바로 왔으니 카메라가 켜져 있는지 확인 (보통은 켜진 채)
    const list = one == null ? [0, 1, 2, 3] : [one];
    for (const i of list) {
      dots.forEach((d, k) => d.classList.toggle('done', one == null ? k <= i : k !== i));
      $('#cut-label').textContent = CUT_WORDS[i] + (one == null ? ' 사진' : ' 사진 다시 찍어요');
      $('#pose-emoji').innerHTML = POSE_ART[poses[i][0]] || ''; $('#pose-text').textContent = poses[i][1];
      count.textContent = '';
      if (i === list[0]) { speak(one == null ? VOICE.shoot : VOICE.retake); await wait(voiceOn ? 1200 : 400); if (!alive()) return; }   // 동작 설명은 말하지 않음(화면 카드로만)
      for (const n of (settings.countdown === 5 ? [5, 4, 3, 2, 1] : [3, 2, 1])) {
        count.textContent = n; count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop'); beep();
        await wait(1000); if (!alive()) return;
      }
      count.textContent = ''; beepGo();
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); shutter();
      const shot = await capture(i); if (!alive()) return;
      if (one == null) S.shots.push(shot);
      else { const old = S.shots[i]; S.shots[i] = shot; if (old && old !== shot) { old.width = 0; old.height = 0; } }   // 그 컷만 바꾸고 옛 사진 메모리는 비움
      review.width = shot.width; review.height = shot.height; review.getContext('2d').drawImage(shot, 0, 0); review.classList.add('on');
      dots.forEach((d, k) => d.classList.toggle('done', one == null ? k <= i : true));
      await wait(T.review); if (!alive()) return;
      review.classList.remove('on');
      await wait(T.gap); if (!alive()) return;
    }
    S.retakeIdx = null;
    chime(); go('s5');
  };

