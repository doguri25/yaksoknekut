  /* ===================== 카메라 ===================== */
  const video = $('#video'); let stream = null, camRetryT = null, camInfo = { label: '', w: 0, h: 0, note: '' }, camDevices = [];
  const BAD_CAM = /\b(IR|infrared|depth|virtual|OBS|Snap|ManyCam|DroidCam|Iriun|NDI|XSplit|Streamlabs)\b/i;   // 적외선·가상 카메라는 뒤로
  function applyMirror() { $('#cambox').classList.toggle('nomirror', settings.mirror === false); }
  function stopCamera() { if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} } stream = null; video.srcObject = null; }
  async function listCameras() {
    try { camDevices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch (e) { camDevices = []; }
    return camDevices;
  }
  async function openCamera(constraint) {
    const hi = settings.hiRes !== false;   // 사진 품질 › 고화질: 카메라가 되는 최대(1920)로, 끄면 1280×720 (느린 기기)
    const st = await navigator.mediaDevices.getUserMedia({ video: Object.assign({ width: { ideal: hi ? 1920 : 1280 }, height: { ideal: hi ? 1440 : 720 } }, constraint), audio: false });
    video.srcObject = st; await video.play().catch(() => {});
    await new Promise(r => { if (video.videoWidth) r(); else { video.onloadeddata = () => r(); setTimeout(r, 2500); } });
    const tr = st.getVideoTracks()[0], se = tr ? tr.getSettings() : {};
    camInfo = { label: tr ? tr.label : '', w: se.width || video.videoWidth, h: se.height || video.videoHeight, note: '', id: se.deviceId || '' };
    return st;
  }
  // 화면이 한 가지 색으로만 나오는지(녹색 화면 등 카메라 드라이버 문제) 검사
  async function frameLooksFlat() {
    await wait(900); if (!video.videoWidth) return true;
    const c = document.createElement('canvas'); c.width = 48; c.height = 32; const x = c.getContext('2d', { willReadFrequently: true });
    try { x.drawImage(video, 0, 0, 48, 32); } catch (e) { return false; }
    const d = x.getImageData(0, 0, 48, 32).data; let mn = 255, mx = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10; if (l < mn) mn = l; if (l > mx) mx = l; }
    return mx - mn < 6;
  }
  async function ensureCamera() {
    if (stream || S.demo) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showCamErr(); return false; }
    try {
      applyMirror();
      if (settings.cameraId) {   // 교사가 고른 카메라
        try { stream = await openCamera({ deviceId: { exact: settings.cameraId } }); }
        catch (e) { stream = await openCamera({ facingMode: 'user' }); camInfo.note = '고른 카메라를 찾지 못해 자동으로 골랐어요'; }
      } else {
        stream = await openCamera({ facingMode: 'user' });
        // 화면이 한 색으로만 나오거나 적외선·가상 카메라가 잡혔으면 다른 카메라로 바꿔 봄
        await listCameras();
        const others = camDevices.filter(d => d.deviceId && d.deviceId !== camInfo.id).sort((a, b) => (BAD_CAM.test(a.label) ? 1 : 0) - (BAD_CAM.test(b.label) ? 1 : 0));
        const flat = BAD_CAM.test(camInfo.label) || await frameLooksFlat();
        if (flat && !others.length) camInfo.note = '화면이 한 색으로만 나와요 — 다른 앱이 카메라를 쓰고 있거나 카메라 드라이버 문제일 수 있어요';
        if (others.length && flat) {
          const first = { id: camInfo.id, label: camInfo.label };
          let fixed = false;
          for (const d of others) {
            try { stopCamera(); stream = await openCamera({ deviceId: { exact: d.deviceId } }); if (!(await frameLooksFlat())) { fixed = true; camInfo.note = `'${first.label || '기본 카메라'}' 화면이 이상해서 이 카메라로 바꿨어요`; break; } } catch (e) {}
          }
          if (!fixed) { try { stopCamera(); stream = await openCamera(first.id ? { deviceId: { exact: first.id } } : { facingMode: 'user' }); } catch (e) {} camInfo.note = '다른 카메라도 화면이 같아요 — 교사 메뉴에서 카메라를 골라 보세요'; }
        }
      }
      hideCamErr(); return true;
    } catch (e) { stopCamera(); showCamErr(); return false; }
  }
  function showCamErr() { $('#camerr').classList.add('on'); clearTimeout(camRetryT); camRetryT = setTimeout(() => { if ($('#camerr').classList.contains('on')) ensureCamera(); }, 30000); }
  function hideCamErr() { $('#camerr').classList.remove('on'); clearTimeout(camRetryT); }
  $('#btn-cam-retry').addEventListener('click', () => { pop(); ensureCamera(); });
  $('#btn-demo').addEventListener('click', () => { pop(); S.demo = true; $('#cambox').classList.add('demo'); hideCamErr(); if (current === 's3') ENTER.s3(); });
  function grabFrame() {
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const ctx = c.getContext('2d');
    if (settings.mirror !== false) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }   // 화면에서 본 그대로(거울 방향) 저장
    ctx.drawImage(video, 0, 0); return c;
  }
  // 선명도 점수 — 작게 줄인 흑백 그림의 라플라시안 분산 (흔들린 사진은 낮음)
  function sharpness(c) {
    const w = 160, h = Math.max(1, Math.round(160 * c.height / c.width)), t = document.createElement('canvas'); t.width = w; t.height = h;
    const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h); for (let i = 0; i < w * h; i++) g[i] = (d[i * 4] * 3 + d[i * 4 + 1] * 6 + d[i * 4 + 2]) / 10;
    let sum = 0, sq = 0, n = 0;
    for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) { const k = y * w + xx, v = 4 * g[k] - g[k - 1] - g[k + 1] - g[k - w] - g[k + w]; sum += v; sq += v * v; n++; }
    const m = sum / n; return sq / n - m * m;
  }
  // 자동 밝기·색 보정 — 어두운 사진은 밝히고(감마), 눌린 대비는 조심스럽게 펴고(채널별 1% 검은점·0.5% 흰점, 어느 색도 뭉개지지 않게), 형광등 누런 기운은 밝은 회색 부분 기준으로 아주 약하게
  function autoLevel(c) {
    const w = 120, h = Math.max(1, Math.round(120 * c.height / c.width)), t = document.createElement('canvas'); t.width = w; t.height = h;
    const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, n = w * h;
    const H = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]; let mr = 0, mg = 0, mb = 0, ml = 0, mn = 0;
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], l = (r * 3 + g * 6 + b) / 10; H[0][r]++; H[1][g]++; H[2][b]++; ml += l;
      const mx = Math.max(r, g, b), mi = Math.min(r, g, b);
      if (l > 100 && l < 250 && mx && (mx - mi) / mx < .22) { mr += r; mg += g; mb += b; mn++; }   // 색 기준은 밝고 회색에 가까운 점만(벽·종이·흰옷) — 분홍 배경이나 살색에 끌려가지 않게
    }
    ml /= n;
    const pLo = (hs, q) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hs[v]; if (acc >= n * q) return v; } return 0; };
    const pHi = (hs, q) => { let acc = 0; for (let v = 255; v >= 0; v--) { acc += hs[v]; if (acc >= n * q) return v; } return 255; };
    const lo = Math.min(pLo(H[0], .01), pLo(H[1], .01), pLo(H[2], .01), 40);      // 가장 어두운 채널 기준 — 색이 기울지 않게
    const hi = Math.max(pHi(H[0], .005), pHi(H[1], .005), pHi(H[2], .005), 210);  // 가장 밝은 채널 기준 — 날아가지 않게
    const ml2 = Math.max(1, (ml - lo) * 255 / (hi - lo));                          // 늘린 뒤의 밝기
    const gamma = ml2 < 118 ? Math.max(.7, Math.min(1, Math.log(120 / 255) / Math.log(ml2 / 255))) : 1;   // 어두우면 밝히기만
    let sr = 1, sg = 1, sb = 1;
    if (mn > n * .03) { mr /= mn; mg /= mn; mb /= mn; const avg = (mr + mg + mb) / 3, wb = m => Math.max(.9, Math.min(1.1, avg / Math.max(1, m))); sr = 1 + (wb(mr) - 1) * .6; sg = 1 + (wb(mg) - 1) * .6; sb = 1 + (wb(mb) - 1) * .6; }
    if (lo === 0 && hi === 255 && gamma === 1 && sr === 1 && sg === 1 && sb === 1) return c;
    const lut = s => { const a = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) { let y = Math.max(0, Math.min(255, (v - lo) * 255 / (hi - lo))); a[v] = 255 * Math.pow(y / 255, gamma) * s; } return a; };
    const LR = lut(sr), LG = lut(sg), LB = lut(sb);
    const ctx = c.getContext('2d', { willReadFrequently: true }); const img = ctx.getImageData(0, 0, c.width, c.height), p = img.data;
    for (let i = 0; i < p.length; i += 4) { p[i] = LR[p[i]]; p[i + 1] = LG[p[i + 1]]; p[i + 2] = LB[p[i + 2]]; }
    ctx.putImageData(img, 0, 0); return c;
  }
  async function capture(i) {
    if (S.demo || !video.videoWidth) return placeholderShot(i);
    let c = grabFrame();
    if (settings.burst) {   // 사진 품질 › 연속 3장: 0.15초 안에 3장 받아 가장 선명한 것
      const frames = [c]; for (let k = 0; k < 2; k++) { await wait(60); frames.push(grabFrame()); }
      let best = frames[0], bs = -1; frames.forEach(f => { const s = sharpness(f); if (s > bs) { bs = s; best = f; } }); c = best;
    }
    if (settings.autoLevel !== false) { try { c = autoLevel(c); } catch (e) {} }
    return c;
  }

