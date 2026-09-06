// 업데이트: 설정된 인터넷 주소에서 최신 yaksok-necut.html 을 받아 지금 것과 버전을 비교해 바꾼다.
// (exe 자체는 그대로 두고 앱 파일만 바꾸므로 관리자 권한이 필요 없고 몇백 KB만 받는다.)
package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var verRe = regexp.MustCompile(`APP_VERSION = '([0-9]+(?:\.[0-9]+)*)'`)
var fontLinkRe = regexp.MustCompile(`<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">`)

const localFontLink = `<link rel="stylesheet" href="fonts/fonts.css">`

func htmlVersion(b []byte) string {
	m := verRe.FindSubmatch(b)
	if m == nil {
		return ""
	}
	return string(m[1])
}

// cmpVer: "1.8.1" vs "1.8.0" → 1, 같으면 0, 작으면 -1 (칸 수가 달라도 됨)
func cmpVer(a, b string) int {
	as, bs := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < len(as) || i < len(bs); i++ {
		var x, y int
		if i < len(as) {
			x, _ = strconv.Atoi(as[i])
		}
		if i < len(bs) {
			y, _ = strconv.Atoi(bs[i])
		}
		if x != y {
			if x > y {
				return 1
			}
			return -1
		}
	}
	return 0
}

// 받은 파일이 정말 약속네컷 앱인지 확인 (로그인 페이지나 오류 페이지를 앱으로 착각하지 않게)
func validateApp(b []byte) (string, error) {
	if len(b) < 100000 {
		return "", errors.New("파일이 너무 작아요 (앱 파일이 아닌 것 같아요)")
	}
	head := strings.ToLower(string(b[:200]))
	if !strings.Contains(head, "<!doctype html") && !strings.Contains(head, "<html") {
		return "", errors.New("HTML 파일이 아니에요")
	}
	if !strings.Contains(string(b), "약속네컷") {
		return "", errors.New("약속네컷 앱 파일이 아니에요")
	}
	v := htmlVersion(b)
	if v == "" {
		return "", errors.New("버전 표시를 찾지 못했어요")
	}
	return v, nil
}

// 내장 글꼴을 쓰도록 구글 글꼴 링크를 바꿔 줌 (인터넷 없는 교실에서도 둥근 글꼴)
func localizeFonts(b []byte) []byte {
	return fontLinkRe.ReplaceAll(b, []byte(localFontLink))
}

// 파일 맨 앞의 버전 스탬프 <!-- yaksok-necut app=1.11.0 launcher=1.9.11 --> 만 읽는다 (첫 4KB, Range 요청).
// 3MB 전체를 매번 받지 않아도 새 버전이 있는지 알 수 있어 켤 때 빠르고, 느린 학교 망에서도 시간 초과로 업데이트가 조용히 실패하는 일이 없다.
var stampRe = regexp.MustCompile(`yaksok-necut app=([0-9.]+) launcher=([0-9.]+)`)

func parseStamp(b []byte) (app, launcher string, ok bool) {
	m := stampRe.FindSubmatch(b)
	if m == nil {
		return "", "", false
	}
	return string(m[1]), string(m[2]), true
}

// 결과 구분: stampOK(버전 표시 읽음) · stampNone(서버에는 닿았지만 표시가 없는 옛 파일 → 전체를 받아 확인) · stampOffline(서버에 닿지 못함 → 이번엔 업데이트 확인을 건너뛰고 바로 켬)
const (
	stampOK = iota
	stampNone
	stampOffline
)

func fetchStamp(url string, timeout time.Duration) (app, launcher string, status int) {
	if strings.TrimSpace(url) == "" {
		return "", "", stampOffline
	}
	c := &http.Client{Timeout: timeout}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", "", stampOffline
	}
	req.Header.Set("User-Agent", "YaksokNecut-Updater")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Range", "bytes=0-4095")
	res, err := c.Do(req)
	if err != nil {
		return "", "", stampOffline // 인터넷 없음·시간 초과 — 더 시도하지 않는다
	}
	defer res.Body.Close()
	if res.StatusCode != 200 && res.StatusCode != 206 {
		return "", "", stampOffline
	}
	b, _ := io.ReadAll(io.LimitReader(res.Body, 4096)) // 서버가 Range를 무시해도 앞 4KB만 읽고 끊는다
	if a, l, ok := parseStamp(b); ok {
		return a, l, stampOK
	}
	return "", "", stampNone
}

func isTimeout(err error) bool {
	if err == nil {
		return false
	}
	var ne net.Error
	if errors.As(err, &ne) && ne.Timeout() {
		return true
	}
	return strings.Contains(err.Error(), "Timeout") || strings.Contains(err.Error(), "deadline")
}

func fetchLatest(url string, timeout time.Duration) ([]byte, string, error) {
	if strings.TrimSpace(url) == "" {
		return nil, "", errors.New("업데이트 주소가 비어 있어요")
	}
	c := &http.Client{Timeout: timeout}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "YaksokNecut-Updater")
	req.Header.Set("Cache-Control", "no-cache")
	res, err := c.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("내려받기 실패: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, "", fmt.Errorf("서버 응답 %d", res.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(res.Body, 20<<20))
	if err != nil {
		return nil, "", err
	}
	v, err := validateApp(b)
	if err != nil {
		return nil, "", err
	}
	return b, v, nil
}

// 지금 파일을 .prev 로 남기고 새 파일을 씀
func installUpdate(appDir string, body []byte) error {
	cur := filepath.Join(appDir, "yaksok-necut.html")
	prev := filepath.Join(appDir, "yaksok-necut.prev.html")
	if old, err := os.ReadFile(cur); err == nil {
		os.WriteFile(prev, old, 0o644)
	}
	return os.WriteFile(cur, localizeFonts(body), 0o644)
}

func rollbackUpdate(appDir string) error {
	cur := filepath.Join(appDir, "yaksok-necut.html")
	prev := filepath.Join(appDir, "yaksok-necut.prev.html")
	b, err := os.ReadFile(prev)
	if err != nil {
		return errors.New("되돌릴 이전 버전이 없어요")
	}
	if _, err := validateApp(b); err != nil {
		return err
	}
	return os.WriteFile(cur, b, 0o644)
}

// ---------- 실행기(exe) 스스로 업데이트 ----------
// 앱 파일(index.html) 안의 LAUNCHER_LATEST 값이 이 실행기보다 높으면, 같은 저장소의 windows/yaksok-necut.exe 를 받아 자기 자신을 바꾼다.
// 윈도우는 실행 중인 exe를 덮어쓰지 못하지만 이름 바꾸기는 허용하므로: 지금 exe → .old.exe 로 이름 바꾸고, 새 파일을 그 자리에 놓는다.

var reLauncherLatest = regexp.MustCompile(`const LAUNCHER_LATEST = '([0-9.]+)'`)

// 앱 파일이 요구하는 실행기 버전 (없으면 "")
func htmlLauncherVer(b []byte) string {
	m := reLauncherLatest.FindSubmatch(b)
	if m == nil {
		return ""
	}
	return string(m[1])
}

// 업데이트 주소(…/index.html)에서 실행기 파일 주소를 만든다 (…/windows/yaksok-necut.exe). 모양이 다르면 "".
func exeURLFrom(updateURL string) string {
	u := strings.TrimSpace(updateURL)
	if !strings.HasSuffix(u, "/index.html") {
		return ""
	}
	return strings.TrimSuffix(u, "index.html") + "windows/yaksok-necut.exe"
}

// 받은 exe가 진짜 약속네컷 실행기 want 버전인지 확인 (크기·MZ 머리·버전 표시 문자열)
func validateExe(b []byte, want string) error {
	if len(b) < 3<<20 {
		return errors.New("실행기 파일이 너무 작아요")
	}
	if b[0] != 'M' || b[1] != 'Z' {
		return errors.New("윈도우 실행 파일이 아니에요")
	}
	if want != "" && !bytes.Contains(b, []byte("YAKSOK-LAUNCHER-VER:"+want)) {
		return errors.New("실행기 버전 표시가 맞지 않아요 (" + want + ")")
	}
	return nil
}

func fetchExe(url string, want string, timeout time.Duration) ([]byte, error) {
	c := &http.Client{Timeout: timeout}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "YaksokNecut-Updater")
	req.Header.Set("Cache-Control", "no-cache")
	res, err := c.Do(req)
	if err != nil {
		return nil, fmt.Errorf("실행기 내려받기 실패: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("서버 응답 %d", res.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(res.Body, 60<<20))
	if err != nil {
		return nil, err
	}
	if err := validateExe(b, want); err != nil {
		return nil, err
	}
	return b, nil
}

// 새 실행기 파일을 지금 exe 자리에 넣는다. 지금 exe는 <이름>.old.exe 로 남고 다음 실행 때 지워진다.
func swapExe(exePath string, newBytes []byte) error {
	dir := filepath.Dir(exePath)
	base := strings.TrimSuffix(filepath.Base(exePath), filepath.Ext(exePath))
	newPath := filepath.Join(dir, base+".new.exe")
	oldPath := filepath.Join(dir, base+".old.exe")
	if err := os.WriteFile(newPath, newBytes, 0o755); err != nil {
		return fmt.Errorf("실행기가 있는 폴더에 쓸 수 없어요 (%v) — 바탕화면 등 쓸 수 있는 곳에 두고 다시 하거나 직접 바꿔 주세요", err)
	}
	os.Remove(oldPath)
	if err := os.Rename(exePath, oldPath); err != nil {
		os.Remove(newPath)
		return fmt.Errorf("지금 실행기를 옮길 수 없어요: %v", err)
	}
	if err := os.Rename(newPath, exePath); err != nil {
		os.Rename(oldPath, exePath) // 되돌리기
		return fmt.Errorf("새 실행기를 놓을 수 없어요: %v", err)
	}
	return nil
}

// 지난 업데이트가 남긴 .old.exe 정리
func cleanOldExe(exePath string) {
	dir := filepath.Dir(exePath)
	base := strings.TrimSuffix(filepath.Base(exePath), filepath.Ext(exePath))
	os.Remove(filepath.Join(dir, base+".old.exe"))
	os.Remove(filepath.Join(dir, base+".new.exe"))
}
