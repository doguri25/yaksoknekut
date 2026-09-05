  /* ===================== S9 완료 ===================== */
  const DONE_TEXT = { welcome: '입학을 축하해요!', grad: '졸업을 축하해요!', sports: '우리 팀 파이팅!', birthday: '생일 축하해!', chuseok: '풍성한 한가위 보내요!', reading: '책과 함께 자라요!', xmas: '메리 크리스마스!', children: '어린이날 축하해!' };   // 세트별 완료 인사 (학교폭력예방·일상은 그대로)
  ENTER.s9 = () => {
    const greet = DONE_TEXT[settings.frameSet || 'promise'];
    const base = (settings.output || 'print') === 'board' ? '다음 친구도<br>찍어 봐요!' : '약속을 적어서<br>게시판에 붙여 주세요!';
    $('#done-title').innerHTML = greet ? `<span style="color:var(--coral)">${greet}</span><br>${(settings.output || 'print') === 'board' ? '다음 친구도 찍어 봐요!' : '약속을 적어서 게시판에 붙여 주세요!'}` : base;
    let n = T.done; const el = $('#done-count'); el.textContent = n;
    every(() => { n--; el.textContent = n; if (n <= 0) go('s0'); }, 1000);
  };
  // 인쇄 후 화면·완료 화면은 아무 데나 눌러도 바로 넘어감
  $('#after').addEventListener('click', () => { if (current === 's8') { pop(); go('s9'); } });
  $('#s9').addEventListener('click', e => { if (!e.target.closest('button')) { pop(); go('s0'); } });

