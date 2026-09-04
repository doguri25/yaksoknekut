// 업데이트: 설정된 인터넷 주소에서 최신 yaksok-necut.html 을 받아 지금 것과 버전을 비교해 바꾼다.
// (exe 자체는 그대로 두고 앱 파일만 바꾸므로 관리자 권한이 필요 없고 몇백 KB만 받는다.)
package main

import (
	"errors"
	"fmt"
	"io"
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
