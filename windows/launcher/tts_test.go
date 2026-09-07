package main

import (
	"encoding/base64"
	"encoding/binary"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"unicode/utf16"
)

// 머리 크기 칸이 비어 있는 WAV (System.Speech 가 스트림에 쓴 뒤 머리를 못 고친 모양)
func rawWav(samples int) []byte {
	b := make([]byte, 44+samples)
	copy(b[0:], "RIFF")
	copy(b[8:], "WAVEfmt ")
	binary.LittleEndian.PutUint32(b[16:], 16)
	binary.LittleEndian.PutUint16(b[20:], 1)
	binary.LittleEndian.PutUint16(b[22:], 1)
	binary.LittleEndian.PutUint32(b[24:], 22050)
	binary.LittleEndian.PutUint32(b[28:], 44100)
	binary.LittleEndian.PutUint16(b[32:], 2)
	binary.LittleEndian.PutUint16(b[34:], 16)
	copy(b[36:], "data")
	for i := 44; i < len(b); i++ {
		b[i] = byte(i)
	}
	return b
}

func fakeTTS(t *testing.T, wav []byte) (cnt string) {
	t.Helper()
	if _, err := exec.LookPath("sh"); err != nil {
		t.Skip("no sh")
	}
	cnt = filepath.Join(t.TempDir(), "calls")
	script := `printf 'READY\tMicrosoft Heami Desktop|Microsoft Server Speech Text to Speech Voice (ko-KR, Heami)\n'
while IFS= read -r line; do
  echo "$line" >> "$CNT"
  case "$line" in *실패*) printf 'ERR\tno korean voice\n';; *) printf 'OK\t%s\n' "$WAV";; esac
done`
	ttsCmd = func() *exec.Cmd {
		c := exec.Command("sh", "-c", script)
		c.Env = append(os.Environ(), "WAV="+base64.StdEncoding.EncodeToString(wav), "CNT="+cnt)
		return c
	}
	ttsMu.Lock()
	ttsCache, ttsVoices, ttsFail, ttsMade = map[string][]byte{}, nil, "", 0
	ttsMu.Unlock()
	ttsStop()
	t.Cleanup(func() { ttsStop(); ttsCmd = powershellTTS })
	return cnt
}

func calls(cnt string) []string {
	b, _ := os.ReadFile(cnt)
	s := strings.TrimSpace(string(b))
	if s == "" {
		return nil
	}
	return strings.Split(s, "\n")
}

func TestTTSSpeakCacheAndFallback(t *testing.T) {
	cnt := fakeTTS(t, rawWav(100))
	b, err := ttsSpeak("Heami", "카메라를 보고 웃어요!")
	if err != nil || len(b) != 144 {
		t.Fatalf("speak: %v len %d", err, len(b))
	}
	if binary.LittleEndian.Uint32(b[4:8]) != 136 || binary.LittleEndian.Uint32(b[40:44]) != 100 {
		t.Fatalf("wav header not fixed: riff %d data %d", binary.LittleEndian.Uint32(b[4:8]), binary.LittleEndian.Uint32(b[40:44]))
	}
	if b2, _ := ttsSpeak("Heami", " 카메라를 보고 웃어요! "); len(b2) != 144 || len(calls(cnt)) != 1 {
		t.Fatalf("second call should hit cache: calls %v", calls(cnt))
	}
	if _, err := ttsSpeak("", "카메라를 보고\t웃어요!"); err != nil || len(calls(cnt)) != 2 || calls(cnt)[1] != "\t카메라를 보고 웃어요!" {
		t.Fatalf("other voice → new call with tab cleaned: %v %q", err, calls(cnt))
	}
	if _, err := ttsSpeak("Heami", "실패 문장"); err == nil || err.Error() != "no korean voice" {
		t.Fatalf("ERR line should become error: %v", err)
	}
	if _, err := ttsSpeak("Heami", ""); err == nil {
		t.Fatal("empty text should fail")
	}
	info := ttsInfo()
	if info["cached"] != 2 || info["made"] != 2 || info["running"] != true || info["ok"] != true || len(info["voices"].([]string)) != 2 {
		t.Fatalf("info %v", info)
	}
	ttsStop()
	if ttsInfo()["running"] != false {
		t.Fatal("stopped")
	}
	// 워커가 끝난 뒤에도 캐시는 남고, 새 문장은 워커를 다시 띄움
	if b3, err := ttsSpeak("Heami", "카메라를 보고 웃어요!"); err != nil || len(b3) != 144 || len(calls(cnt)) != 3 {
		t.Fatalf("cache after stop: %v %v", err, calls(cnt))
	}
	if _, err := ttsSpeak("Heami", "새 문장"); err != nil || len(calls(cnt)) != 4 || ttsInfo()["running"] != true {
		t.Fatalf("restart worker: %v %v", err, calls(cnt))
	}
}

func TestTTSWorkerMissing(t *testing.T) {
	fakeTTS(t, rawWav(10))
	ttsCmd = func() *exec.Cmd { return exec.Command("sh", "-c", "printf 'FAIL\\tno System.Speech\\n'; exit 1") }
	_, err := ttsSpeak("", "안녕")
	if err == nil || !strings.Contains(err.Error(), "no System.Speech") {
		t.Fatalf("FAIL line → error: %v", err)
	}
	info := ttsInfo()
	if info["ok"] != false || info["running"] != false {
		t.Fatalf("info after fail %v", info)
	}
	// 1분 안에는 다시 띄우지 않고 같은 이유로 바로 실패
	ttsCmd = func() *exec.Cmd { return exec.Command("sh", "-c", "echo should-not-run; exit 1") }
	if _, err := ttsSpeak("", "안녕"); err == nil || !strings.Contains(err.Error(), "no System.Speech") {
		t.Fatalf("backoff: %v", err)
	}
}

func TestServeTTS(t *testing.T) {
	fakeTTS(t, rawWav(50))
	rec := httptest.NewRecorder()
	serveTTS(rec, httptest.NewRequest("GET", "/tts?text="+strings.ReplaceAll("사진을 선생님께 받아 가세요.", " ", "%20")+"&voice=Heami", nil))
	if rec.Code != 200 || rec.Header().Get("Content-Type") != "audio/wav" || rec.Body.Len() != 94 {
		t.Fatalf("tts: %d %s %d", rec.Code, rec.Header().Get("Content-Type"), rec.Body.Len())
	}
	rec = httptest.NewRecorder()
	serveTTS(rec, httptest.NewRequest("GET", "/tts?text=", nil))
	if rec.Code != 503 || !strings.Contains(rec.Body.String(), `"ok":false`) {
		t.Fatalf("empty: %d %s", rec.Code, rec.Body.String())
	}
	rec = httptest.NewRecorder()
	serveTTS(rec, httptest.NewRequest("GET", "/tts/info", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"cached":1`) || !strings.Contains(rec.Body.String(), "Heami Desktop") {
		t.Fatalf("info: %d %s", rec.Code, rec.Body.String())
	}
}

func TestFixWav(t *testing.T) {
	b := fixWav(rawWav(20))
	if binary.LittleEndian.Uint32(b[4:8]) != 56 || binary.LittleEndian.Uint32(b[40:44]) != 20 {
		t.Fatalf("fixed sizes %d %d", binary.LittleEndian.Uint32(b[4:8]), binary.LittleEndian.Uint32(b[40:44]))
	}
	good := rawWav(20)
	binary.LittleEndian.PutUint32(good[4:], 56)
	binary.LittleEndian.PutUint32(good[40:], 12) // 실제보다 작은 값은 그대로 둠 (뒤에 다른 조각이 올 수 있음)
	if g := fixWav(append([]byte{}, good...)); binary.LittleEndian.Uint32(g[40:44]) != 12 {
		t.Fatal("valid smaller data size must be kept")
	}
	if x := fixWav([]byte("not a wav at all, definitely not, no way, nope, nothing here")); string(x[:4]) != "not " {
		t.Fatal("non-wav untouched")
	}
}

func TestTTSScriptEncoded(t *testing.T) {
	b, err := base64.StdEncoding.DecodeString(ttsScriptEncoded())
	if err != nil || len(b)%2 != 0 {
		t.Fatal("base64")
	}
	u := make([]uint16, len(b)/2)
	for i := range u {
		u[i] = binary.LittleEndian.Uint16(b[i*2:])
	}
	if s := string(utf16.Decode(u)); s != ttsScript || !strings.Contains(s, "System.Speech") || strings.Contains(s, "`") {
		t.Fatal("round trip / no backticks")
	}
}
