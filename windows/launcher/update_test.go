package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func fakeApp(ver string) []byte {
	return []byte("<!doctype html>\n<html><head><link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Jua\"><title>약속네컷</title></head><body><script>const APP_VERSION = '" + ver + "';</script>" + strings.Repeat("x", 120000) + "</body></html>")
}

func TestCmpVer(t *testing.T) {
	cases := [][3]string{{"1.8.1", "1.8.0", "1"}, {"1.8.0", "1.8.0", "0"}, {"1.7.9", "1.8.0", "-1"}, {"2.0", "1.9.9", "1"}, {"1.8", "1.8.0", "0"}, {"1.10.0", "1.9.0", "1"}}
	for _, c := range cases {
		got := cmpVer(c[0], c[1])
		want := map[string]int{"1": 1, "0": 0, "-1": -1}[c[2]]
		if got != want {
			t.Errorf("cmpVer(%s,%s)=%d want %d", c[0], c[1], got, want)
		}
	}
}

func TestFetchInstallRollback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/good":
			w.Write(fakeApp("1.9.0"))
		case "/login":
			w.Write([]byte("<!doctype html><html><body>로그인하세요</body></html>"))
		case "/404":
			w.WriteHeader(404)
		}
	}))
	defer srv.Close()
	b, v, err := fetchLatest(srv.URL+"/good", 3*time.Second)
	if err != nil || v != "1.9.0" {
		t.Fatalf("good: %v %s", err, v)
	}
	if _, _, err := fetchLatest(srv.URL+"/login", 3*time.Second); err == nil {
		t.Fatal("login page should be rejected")
	}
	if _, _, err := fetchLatest(srv.URL+"/404", 3*time.Second); err == nil {
		t.Fatal("404 should fail")
	}
	if _, _, err := fetchLatest("", time.Second); err == nil {
		t.Fatal("empty url should fail")
	}
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "yaksok-necut.html"), fakeApp("1.8.0"), 0o644)
	if err := installUpdate(dir, b); err != nil {
		t.Fatal(err)
	}
	cur, _ := os.ReadFile(filepath.Join(dir, "yaksok-necut.html"))
	if htmlVersion(cur) != "1.9.0" || !strings.Contains(string(cur), localFontLink) || strings.Contains(string(cur), "fonts.googleapis") {
		t.Fatalf("install: version=%s fontsLocalized=%v", htmlVersion(cur), strings.Contains(string(cur), localFontLink))
	}
	if err := rollbackUpdate(dir); err != nil {
		t.Fatal(err)
	}
	cur, _ = os.ReadFile(filepath.Join(dir, "yaksok-necut.html"))
	if htmlVersion(cur) != "1.8.0" {
		t.Fatalf("rollback: %s", htmlVersion(cur))
	}
}

func TestLauncherHelpers(t *testing.T) {
	if v := htmlLauncherVer([]byte("x\n  const LAUNCHER_LATEST = '1.9.6';   // note\n")); v != "1.9.6" {
		t.Fatalf("htmlLauncherVer = %q", v)
	}
	if v := htmlLauncherVer([]byte("no marker")); v != "" {
		t.Fatalf("expected empty, got %q", v)
	}
	if u := exeURLFrom("https://raw.githubusercontent.com/doguri25/yaksoknekut/master/index.html"); u != "https://raw.githubusercontent.com/doguri25/yaksoknekut/master/windows/yaksok-necut.exe" {
		t.Fatalf("exeURLFrom = %q", u)
	}
	if u := exeURLFrom("https://example.com/app.html"); u != "" {
		t.Fatalf("expected empty exe url, got %q", u)
	}
	big := make([]byte, 4<<20)
	big[0], big[1] = 'M', 'Z'
	copy(big[100:], []byte("YAKSOK-LAUNCHER-VER:2.0.0"))
	if err := validateExe(big, "2.0.0"); err != nil {
		t.Fatalf("validateExe ok case: %v", err)
	}
	if err := validateExe(big, "2.0.1"); err == nil {
		t.Fatal("validateExe should fail on version mismatch")
	}
	if err := validateExe([]byte("MZ short"), ""); err == nil {
		t.Fatal("validateExe should fail on small file")
	}
}

func TestSwapExe(t *testing.T) {
	dir := t.TempDir()
	exe := filepath.Join(dir, "약속네컷.exe")
	os.WriteFile(exe, []byte("old"), 0o755)
	if err := swapExe(exe, []byte("new")); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(exe)
	if string(b) != "new" {
		t.Fatalf("exe not replaced: %q", b)
	}
	if ob, _ := os.ReadFile(filepath.Join(dir, "약속네컷.old.exe")); string(ob) != "old" {
		t.Fatalf("old copy missing: %q", ob)
	}
	cleanOldExe(exe)
	if _, err := os.Stat(filepath.Join(dir, "약속네컷.old.exe")); err == nil {
		t.Fatal("old exe should be cleaned")
	}
}

func TestSyncPrinterPref(t *testing.T) {
	dir := t.TempDir()
	p := dir + "/Preferences"
	app := `{"version":2,"recentDestinations":[{"id":"ALPDF","origin":"local","account":""},{"id":"Canon SELPHY CP1500","origin":"local","account":""}]}`
	raw := `{"browser":{"last_engagement_time":"13345678901234567"},"big":13345678901234567,"printing":{"print_preview_sticky_settings":{"appState":` + strconvQuote(app) + `},"other":1}}`
	os.WriteFile(p, []byte(raw), 0o644)
	// 다른 프린터가 기억돼 있으면 지움
	ch, err := syncPrinterPref(p, "Canon SELPHY CP1500")
	if err != nil || !ch {
		t.Fatalf("expected change, got %v %v", ch, err)
	}
	b, _ := os.ReadFile(p)
	if strings.Contains(string(b), "sticky") || !strings.Contains(string(b), `"other":1`) || !strings.Contains(string(b), "13345678901234567") {
		t.Fatalf("bad result: %s", b)
	}
	// 없으면 그대로
	if ch, _ := syncPrinterPref(p, "Canon SELPHY CP1500"); ch {
		t.Fatal("second run should not change")
	}
	// 기본 프린터와 같으면 그대로
	app2 := `{"version":2,"recentDestinations":[{"id":"Canon SELPHY CP1500","origin":"local"}]}`
	os.WriteFile(p, []byte(`{"printing":{"print_preview_sticky_settings":{"appState":`+strconvQuote(app2)+`}}}`), 0o644)
	if ch, _ := syncPrinterPref(p, "canon selphy cp1500"); ch {
		t.Fatal("same printer should be kept")
	}
	// 기본 프린터를 모르면(빈 문자열) 기억을 지워 시스템 기본으로
	if ch, _ := syncPrinterPref(p, ""); !ch {
		t.Fatal("unknown default should clear")
	}
	// 파일 없음 → 오류 없이 false
	if ch, err := syncPrinterPref(dir+"/none", "x"); ch || err != nil {
		t.Fatal("missing file")
	}
}

func strconvQuote(s string) string { b, _ := json.Marshal(s); return string(b) }

func TestEmbeddedAppVersions(t *testing.T) {
	b, err := os.ReadFile("yaksok-necut.html")
	if err != nil {
		t.Skip("no embedded html")
	}
	if v := htmlVersion(b); v != "1.10.3" {
		t.Fatalf("app version %q", v)
	}
	if v := htmlLauncherVer(b); v != "1.9.10" {
		t.Fatalf("launcher latest %q", v)
	}
	if cmpVer(htmlLauncherVer(b), launcherVer) != 0 {
		t.Fatalf("LAUNCHER_LATEST %s != launcherVer %s", htmlLauncherVer(b), launcherVer)
	}
}
