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
