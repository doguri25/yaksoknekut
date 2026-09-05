package main

import (
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
