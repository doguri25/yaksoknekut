  /* ===================== S4 촬영 ===================== */
  let shootRun = 0;
  const CUT_WORDS = ['첫 번째', '두 번째', '세 번째', '네 번째'];
  ENTER.s4 = async () => {
    const run = ++shootRun; const alive = () => run === shootRun && current === 's4';
    S.shots = []; const poses = pickPoses(S.frame && S.frame.faceless);
    const dots = $$('#dots span'), count = $('#count'), review = $('#review'), flash = $('#flash');
    $('#pose-note').textContent = S.frame && S.frame.faceless ? '얼굴은 안 나와도 돼요' : '';
    const voiceOn = settings.voice && vol() && HAS_TTS;
    for (let i = 0; i < 4; i++) {
      dots.forEach((d, k) => d.classList.toggle('done', k <= i));
      $('#cut-label').textContent = CUT_WORDS[i] + ' 사진';
      $('#pose-emoji').innerHTML = POSE_ART[poses[i][0]] || ''; $('#pose-text').textContent = poses[i][1];
      count.textContent = '';
      if (i === 0) { speak(VOICE.shoot); await wait(voiceOn ? 1200 : 400); if (!alive()) return; }   // 동작 설명은 말하지 않음(화면 카드로만)
      for (const n of (settings.countdown === 5 ? [5, 4, 3, 2, 1] : [3, 2, 1])) {
        count.textContent = n; count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop'); beep();
        await wait(1000); if (!alive()) return;
      }
      count.textContent = ''; beepGo();
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); shutter();
      const shot = await capture(i); if (!alive()) return; S.shots.push(shot);
      review.width = shot.width; review.height = shot.height; review.getContext('2d').drawImage(shot, 0, 0); review.classList.add('on');
      dots.forEach((d, k) => d.classList.toggle('done', k <= i));
      await wait(T.review); if (!alive()) return;
      review.classList.remove('on');
      await wait(T.gap); if (!alive()) return;
    }
    chime(); go('s5');
  };

