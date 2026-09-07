package main

// 음성 안내를 실행기가 만들어 줌 — 앱의 소리 크기 '매우 크게' 용.
// 브라우저 음성(speechSynthesis)은 소리가 스피커로 바로 나가 앱이 키울 수 없고 상한이 기기 최대(1.0)다.
// 그래서 실행기가 윈도우 음성 엔진(System.Speech — 크롬이 쓰는 것과 같은 SAPI 목소리)으로 WAV 를 만들어 주면
// 앱이 효과음처럼 Web Audio 로 2배 + 리미터를 거쳐 튼다.
//   GET /tts?text=…&voice=Heami  → audio/wav (실패하면 503 + {ok:false, error})
//   GET /tts/info                → {ok, voices, cached, running, error}
// PowerShell 워커 하나를 띄워 두고 줄 단위로 주고받는다(문장마다 새로 띄우면 1~3초). 만든 문장은 메모리에 두고(앱 안내 문장은 7개로 고정),
// 3분 동안 안 쓰면 워커를 끝낸다(다음 요청 때 다시 띄움 — 캐시는 그대로).

import (
	"bufio"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"sync"
	"time"
	"unicode/utf16"
)

const ttsIdle = 3 * time.Minute

// 워커 스크립트 — 줄 단위 프로토콜: 처음에 "READY\t목소리|목소리", 요청 "힌트\t문장", 응답 "OK\tbase64(wav)" 또는 "ERR\t이유"
const ttsScript = `$ErrorActionPreference = 'Continue'
$T = [string][char]9
$enc = New-Object System.Text.UTF8Encoding $false
$out = New-Object System.IO.StreamWriter([Console]::OpenStandardOutput(), $enc)
$out.AutoFlush = $true
try { Add-Type -AssemblyName System.Speech } catch { $out.WriteLine('FAIL' + $T + $_.Exception.Message); exit 1 }
try { $s = New-Object System.Speech.Synthesis.SpeechSynthesizer } catch { $out.WriteLine('FAIL' + $T + $_.Exception.Message); exit 1 }
$ko = @($s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'ko*' } | ForEach-Object { $_.VoiceInfo })
$in = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), $enc)
$out.WriteLine('READY' + $T + (($ko | ForEach-Object { $_.Name }) -join '|'))
while ($null -ne ($line = $in.ReadLine())) {
  $i = $line.IndexOf($T); if ($i -lt 0) { continue }
  $want = $line.Substring(0, $i); $text = $line.Substring($i + 1)
  try {
    if ($ko.Count -eq 0) { throw 'no korean voice' }
    $v = $null
    if ($want) { $v = $ko | Where-Object { $_.Name -like ('*' + $want + '*') } | Select-Object -First 1 }
    if (-not $v) { $v = $ko[0] }
    $s.SelectVoice($v.Name)
    $s.Rate = 0; $s.Volume = 100
    $ms = New-Object System.IO.MemoryStream
    $s.SetOutputToWaveStream($ms)
    $s.Speak($text)
    $s.SetOutputToNull()
    $out.WriteLine('OK' + $T + [Convert]::ToBase64String($ms.ToArray()))
    $ms.Dispose()
  } catch { $out.WriteLine('ERR' + $T + $_.Exception.Message.Replace([string][char]10, ' ').Replace([string][char]13, ' ')) }
}
`

// PowerShell -EncodedCommand 용 (UTF-16LE → base64) — 따옴표·줄바꿈 걱정 없이 스크립트를 통째로 넘김
func ttsScriptEncoded() string {
	u := utf16.Encode([]rune(ttsScript))
	b := make([]byte, len(u)*2)
	for i, c := range u {
		binary.LittleEndian.PutUint16(b[i*2:], c)
	}
	return base64.StdEncoding.EncodeToString(b)
}

type ttsWorker struct {
	cmd  *exec.Cmd
	in   io.WriteCloser
	out  *bufio.Reader
	last time.Time
}

var (
	ttsMu     sync.Mutex
	ttsCache  = map[string][]byte{}
	ttsVoices []string
	ttsProc   *ttsWorker
	ttsFail   string // 마지막으로 워커를 못 띄운 이유 — 1분 동안은 다시 시도하지 않음
	ttsFailAt time.Time
	ttsCmd    = powershellTTS // 테스트에서 가짜 워커로 바꿔 끼움
	ttsMade   int
)

// 한 줄을 시간 안에 읽음 — 못 읽으면 워커를 죽여 읽기가 풀리게
func (w *ttsWorker) readLine(timeout time.Duration) (string, error) {
	type res struct {
		s string
		e error
	}
	ch := make(chan res, 1)
	go func() { s, e := w.out.ReadString('\n'); ch <- res{s, e} }()
	select {
	case r := <-ch:
		if r.e != nil && r.s == "" {
			return "", r.e
		}
		return strings.TrimRight(r.s, "\r\n"), nil
	case <-time.After(timeout):
		w.stop()
		return "", errors.New("음성 엔진이 응답하지 않아요")
	}
}

func (w *ttsWorker) stop() {
	if w.in != nil {
		w.in.Close()
	}
	if w.cmd != nil && w.cmd.Process != nil {
		w.cmd.Process.Kill()
		go w.cmd.Wait()
	}
}

// 워커를 띄우고 READY 까지 기다림 (Add-Type 에 1~3초)
func startTTS() (*ttsWorker, []string, error) {
	c := ttsCmd()
	in, err := c.StdinPipe()
	if err != nil {
		return nil, nil, err
	}
	outp, err := c.StdoutPipe()
	if err != nil {
		return nil, nil, err
	}
	if err := c.Start(); err != nil {
		return nil, nil, fmt.Errorf("PowerShell 을 못 띄웠어요: %v", err)
	}
	w := &ttsWorker{cmd: c, in: in, out: bufio.NewReaderSize(outp, 1<<16), last: time.Now()}
	deadline := time.Now().Add(25 * time.Second)
	for {
		left := time.Until(deadline)
		if left <= 0 {
			w.stop()
			return nil, nil, errors.New("음성 엔진이 준비되지 않아요")
		}
		line, err := w.readLine(left)
		if err != nil {
			w.stop()
			return nil, nil, fmt.Errorf("음성 엔진이 켜지지 않아요: %v", err)
		}
		if strings.HasPrefix(line, "READY\t") || line == "READY" {
			var vs []string
			for _, v := range strings.Split(strings.TrimPrefix(line, "READY"), "|") {
				if v = strings.TrimSpace(strings.TrimPrefix(v, "\t")); v != "" {
					vs = append(vs, v)
				}
			}
			return w, vs, nil
		}
		if strings.HasPrefix(line, "FAIL\t") {
			w.stop()
			return nil, nil, errors.New("윈도우 음성 엔진 없음: " + strings.TrimPrefix(line, "FAIL\t"))
		}
		// 그 밖의 줄(경고 등)은 건너뜀
	}
}

func ttsClean(s string) string {
	s = strings.NewReplacer("\t", " ", "\r", " ", "\n", " ").Replace(strings.TrimSpace(s))
	if r := []rune(s); len(r) > 200 {
		s = string(r[:200])
	}
	return s
}

// 문장 하나를 WAV 로 — 캐시에 있으면 바로, 없으면 워커에게 (같은 문장이 동시에 와도 워커는 한 번에 하나씩)
func ttsSpeak(voice, text string) ([]byte, error) {
	text, voice = ttsClean(text), ttsClean(voice)
	if text == "" {
		return nil, errors.New("문장이 없어요")
	}
	key := voice + "\t" + text
	ttsMu.Lock()
	defer ttsMu.Unlock()
	if b, ok := ttsCache[key]; ok {
		return b, nil
	}
	if ttsProc == nil {
		if ttsFail != "" && time.Since(ttsFailAt) < time.Minute {
			return nil, errors.New(ttsFail)
		}
		w, vs, err := startTTS()
		if err != nil {
			ttsFail, ttsFailAt = err.Error(), time.Now()
			logf("실행기 음성 — 엔진을 못 띄움: %v", err)
			return nil, err
		}
		ttsProc, ttsVoices, ttsFail = w, vs, ""
		logf("실행기 음성 — 엔진 켬 · 한국어 목소리 %d개 %v", len(vs), vs)
		time.AfterFunc(ttsIdle, ttsReap)
	}
	w := ttsProc
	t0 := time.Now()
	if _, err := io.WriteString(w.in, voice+"\t"+text+"\n"); err != nil {
		w.stop()
		ttsProc = nil
		return nil, fmt.Errorf("음성 엔진에 보내지 못했어요: %v", err)
	}
	var line string
	var err error
	for deadline := time.Now().Add(20 * time.Second); ; { // OK/ERR 줄이 올 때까지 (경고 같은 다른 출력은 건너뜀)
		line, err = w.readLine(time.Until(deadline))
		if err != nil {
			w.stop()
			ttsProc = nil
			logf("실행기 음성 — 응답 없음: %v", err)
			return nil, err
		}
		if strings.HasPrefix(line, "OK\t") || strings.HasPrefix(line, "ERR\t") {
			break
		}
	}
	w.last = time.Now()
	if strings.HasPrefix(line, "ERR\t") {
		msg := strings.TrimPrefix(line, "ERR\t")
		logf("실행기 음성 — 실패 (%s): %s", text, msg)
		return nil, errors.New(msg)
	}
	b, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(line, "OK\t"))
	if err != nil || len(b) < 44 {
		return nil, errors.New("음성 파일이 비었어요")
	}
	b = fixWav(b)
	if len(ttsCache) >= 60 { // 안내 문장은 7개 — 목소리를 바꿔 가며 써도 이만큼이면 넉넉
		for k := range ttsCache {
			delete(ttsCache, k)
			break
		}
	}
	ttsCache[key] = b
	ttsMade++
	logf("실행기 음성 — 만듦 \"%s\" (%dKB · %dms)", text, len(b)/1024, time.Since(t0)/time.Millisecond)
	return b, nil
}

// 3분 동안 안 썼으면 워커를 끝냄 (메모리 40~60MB) — 캐시는 남겨 두어 다음 요청은 바로
func ttsReap() {
	ttsMu.Lock()
	defer ttsMu.Unlock()
	if ttsProc == nil {
		return
	}
	if since := time.Since(ttsProc.last); since < ttsIdle {
		time.AfterFunc(ttsIdle-since, ttsReap)
		return
	}
	ttsProc.stop()
	ttsProc = nil
	logf("실행기 음성 — 3분 안 써서 엔진 끔 (만든 문장 %d개 보관)", len(ttsCache))
}

func ttsStop() {
	ttsMu.Lock()
	defer ttsMu.Unlock()
	if ttsProc != nil {
		ttsProc.stop()
		ttsProc = nil
	}
}

// RIFF/data 크기 칸이 비어 있으면(스트림에 쓴 뒤 머리를 못 고친 경우) 실제 길이로 채움 — 브라우저 decodeAudioData 가 빈 소리로 읽지 않게
func fixWav(b []byte) []byte {
	if len(b) < 44 || string(b[0:4]) != "RIFF" || string(b[8:12]) != "WAVE" {
		return b
	}
	if riff := binary.LittleEndian.Uint32(b[4:8]); riff == 0 || int(riff) > len(b)-8 {
		binary.LittleEndian.PutUint32(b[4:8], uint32(len(b)-8))
	}
	for p := 12; p+8 <= len(b); {
		id, size := string(b[p:p+4]), int(binary.LittleEndian.Uint32(b[p+4:p+8]))
		if id == "data" {
			if rest := len(b) - (p + 8); size == 0 || size > rest {
				binary.LittleEndian.PutUint32(b[p+4:p+8], uint32(rest))
			}
			break
		}
		p += 8 + size + size%2
	}
	return b
}

func ttsInfo() map[string]interface{} {
	ttsMu.Lock()
	defer ttsMu.Unlock()
	return map[string]interface{}{"ok": ttsFail == "", "voices": ttsVoices, "cached": len(ttsCache), "made": ttsMade, "running": ttsProc != nil, "error": ttsFail}
}

// /tts 와 /tts/info — main 의 서버에서 부름 (테스트는 httptest 로 직접)
func serveTTS(w http.ResponseWriter, r *http.Request) {
	if strings.HasSuffix(r.URL.Path, "/info") {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		json.NewEncoder(w).Encode(ttsInfo())
		return
	}
	q := r.URL.Query()
	b, err := ttsSpeak(q.Get("voice"), q.Get("text"))
	if err != nil {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(503)
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Content-Length", fmt.Sprint(len(b)))
	w.Write(b)
}
