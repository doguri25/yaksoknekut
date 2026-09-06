  /* ===================== S9 완료 ===================== */
  const DONE_TEXT = { welcome: '입학을 축하해요!', grad: '졸업을 축하해요!', sports: '우리 팀 파이팅!', birthday: '생일 축하해!', chuseok: '풍성한 한가위 보내요!', reading: '책과 함께 자라요!', xmas: '메리 크리스마스!', children: '어린이날 축하해!' };   // 세트별 완료 인사 (학교폭력예방·일상은 그대로)
  ENTER.s9 = () => {
    const greet = DONE_TEXT[settings.frameSet || 'promise'];
    const base = (settings.output || 'print') === 'board' ? '다음 친구도<br>찍어 봐요!' : '약속을 적어서<br>게시판에 붙여 주세요!';
    $('#done-title').innerHTML = greet ? `<span style="color:var(--coral)">${greet}</span><br>${(settings.output || 'print') === 'board' ? '다음 친구도 찍어 봐요!' : '약속을 적어서 게시판에 붙여 주세요!'}` : base;
    donePrintLine();
    let n = T.done; const el = $('#done-count'); el.textContent = n;
    every(() => { n--; el.textContent = n; if (n <= 0) go('s0'); }, 1000);
  };
  // 완료 화면의 인쇄 안내 한 줄 — "약 40초 뒤 나와요". 대기열 감시가 켜져 있어 앞선 사진이 보이면 "앞에 ○장이 있어서 조금 더" (대기열 결과가 뒤늦게 오면 pollQueue가 다시 부름)
  const PRINT_SEC = 40;   // 셀피 CP1500 기준 한 장 40초쯤
  function donePrintLine() {
    const el = $('#done-print'); if (!el) return;
    if ((settings.output || 'print') === 'board') { el.hidden = true; return; }
    const mine = clamp(S.copies || 1, 1, 4);
    const q = (typeof pqLast !== 'undefined' && pqLast && Date.now() - pqAt < 20000) ? pqLast : null;
    const ahead = q && q.jobs > 1 ? q.jobs - 1 : 0;   // 내 사진(작업 1개) 말고 앞에 남은 작업
    const sec = (ahead + mine) * PRINT_SEC;
    el.hidden = false; el.classList.toggle('more', ahead > 0);
    el.querySelector('span').textContent = ahead > 0
      ? `앞에 사진 ${ahead}장이 있어서 조금 더 걸려요 · 약 ${sec >= 60 ? Math.round(sec / 60) + '분' : sec + '초'} 뒤에 나와요`
      : `사진은 약 ${sec >= 60 ? Math.round(sec / 60) + '분' : sec + '초'} 뒤 프린터에서 나와요`;
  }
  // 인쇄 후 화면·완료 화면은 아무 데나 눌러도 바로 넘어감
  $('#after').addEventListener('click', () => { if (current === 's8') { pop(); go('s9'); } });
  $('#s9').addEventListener('click', e => { if (!e.target.closest('button')) { pop(); go('s0'); } });

