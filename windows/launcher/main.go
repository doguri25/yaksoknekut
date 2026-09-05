//go:build windows

// 약속네컷 윈도우 실행기 — 내장된 앱(HTML)과 글꼴을 풀어 놓고 크롬·엣지를 키오스크(자동 인쇄) 모드로 띄운다.
// 모니터가 여러 개면 고른 모니터(기본: 두 번째)에서 열고, 앱 안의 단추로 종료·모니터 이동·업데이트를 할 수 있다.
package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

//go:embed yaksok-necut.html
var appHTML []byte

//go:embed fonts
var fontFS embed.FS

// 기본 업데이트 주소 — 이 저장소의 index.html 이 항상 최신 앱 파일 (교사 메뉴에서 다른 주소로 바꿀 수 있음)
const launcherVer = "1.9.2" // 실행기 버전 (앱이 lv= 로 받아 실행기에 있는 기능을 판단)

const defaultUpdateURL = "https://raw.githubusercontent.com/doguri25/yaksoknekut/master/index.html"

var user32 = syscall.NewLazyDLL("user32.dll")

func msgbox(text string, flags uintptr) {
	t, _ := syscall.UTF16PtrFromString(text)
	c, _ := syscall.UTF16PtrFromString("약속네컷")
	user32.NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), flags)
}

func firstExisting(paths []string) string {
	for _, p := range paths {
		if p == "" {
			continue
		}
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p
		}
	}
	return ""
}

// ---------- 모니터 ----------
type monitor struct {
	left, top, right, bottom int32
	primary                  bool
}

func listMonitors() []monitor {
	if p := user32.NewProc("SetProcessDpiAwarenessContext"); p.Find() == nil {
		p.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
	} else if p := user32.NewProc("SetProcessDPIAware"); p.Find() == nil {
		p.Call()
	}
	var ms []monitor
	info := user32.NewProc("GetMonitorInfoW")
	cb := syscall.NewCallback(func(h, hdc, rc, lp uintptr) uintptr {
		var mi struct {
			cb        uint32
			rcMonitor [4]int32
			rcWork    [4]int32
			flags     uint32
		}
		mi.cb = uint32(unsafe.Sizeof(mi))
		if r, _, _ := info.Call(h, uintptr(unsafe.Pointer(&mi))); r != 0 {
			ms = append(ms, monitor{mi.rcMonitor[0], mi.rcMonitor[1], mi.rcMonitor[2], mi.rcMonitor[3], mi.flags&1 != 0})
		}
		return 1
	})
	user32.NewProc("EnumDisplayMonitors").Call(0, 0, cb, 0)
	sort.SliceStable(ms, func(i, j int) bool {
		if ms[i].primary != ms[j].primary {
			return ms[i].primary
		}
		if ms[i].left != ms[j].left {
			return ms[i].left < ms[j].left
		}
		return ms[i].top < ms[j].top
	})
	return ms
}

// ---------- 설정 파일 (key=value 한 줄씩) ----------
func readConfig(path string) map[string]string {
	m := map[string]string{}
	b, err := os.ReadFile(path)
	if err != nil {
		return m
	}
	for _, line := range strings.Split(string(b), "\n") {
		if k, v, ok := strings.Cut(strings.TrimSpace(line), "="); ok {
			m[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	return m
}

func writeConfig(path string, m map[string]string) {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var sb strings.Builder
	for _, k := range keys {
		fmt.Fprintf(&sb, "%s=%s\n", k, m[k])
	}
	os.WriteFile(path, []byte(sb.String()), 0o644)
}

// 내장 글꼴을 앱 폴더에 풀어 놓음 (인터넷 없이도 둥근 글꼴)
func writeFonts(appDir string) {
	dir := filepath.Join(appDir, "fonts")
	os.MkdirAll(dir, 0o755)
	entries, _ := fontFS.ReadDir("fonts")
	for _, e := range entries {
		b, err := fontFS.ReadFile("fonts/" + e.Name())
		if err == nil {
			os.WriteFile(filepath.Join(dir, e.Name()), b, 0o644)
		}
	}
}

func main() {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base, _ = os.UserCacheDir()
	}
	dir := filepath.Join(base, "YaksokNecut")
	appDir := filepath.Join(dir, "app")
	profDir := filepath.Join(dir, "profile")
	cfgPath := filepath.Join(dir, "config.txt")
	os.MkdirAll(appDir, 0o755)
	os.MkdirAll(profDir, 0o755)
	htmlPath := filepath.Join(appDir, "yaksok-necut.html")
	writeFonts(appDir)

	// 앱 파일: 업데이트로 받아 둔 파일이 exe에 든 것보다 새 버전이면 그대로 두고, 아니면 exe에 든 것으로 씀
	embeddedVer := htmlVersion(appHTML)
	if cur, err := os.ReadFile(htmlPath); err != nil || cmpVer(htmlVersion(cur), embeddedVer) <= 0 {
		if err := os.WriteFile(htmlPath, appHTML, 0o644); err != nil {
			msgbox("앱 파일을 준비하지 못했어요:\n"+err.Error(), 0x10)
			return
		}
	}

	cfg := readConfig(cfgPath)
	updateURL := func() string {
		if u := strings.TrimSpace(cfg["update_url"]); u != "" {
			return u
		}
		return defaultUpdateURL
	}
	startMsg := ""
	// 켤 때 자동 업데이트 (주소가 설정되어 있고 끄지 않았을 때, 4초 안에 안 되면 그냥 진행)
	if u := updateURL(); u != "" && cfg["auto_update"] != "0" {
		if body, v, err := fetchLatest(u, 3*time.Second); err == nil {
			cur, _ := os.ReadFile(htmlPath)
			if cmpVer(v, htmlVersion(cur)) > 0 {
				if installUpdate(appDir, body) == nil {
					startMsg = "upd=auto:" + v
				}
			}
		}
	}

	pf := os.Getenv("ProgramFiles")
	pf86 := os.Getenv("ProgramFiles(x86)")
	chrome := firstExisting([]string{
		filepath.Join(pf, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(base, "Google", "Chrome", "Application", "chrome.exe"),
	})
	edge := firstExisting([]string{
		filepath.Join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
	})
	if chrome == "" && edge == "" {
		msgbox("크롬이나 엣지 브라우저가 필요해요.\n윈도우 10·11에는 엣지가 기본으로 들어 있는데 찾지 못했어요.\nMicrosoft Edge 또는 Google Chrome을 설치한 뒤 다시 실행해 주세요.", 0x30)
		return
	}

	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	port := 0
	if ln != nil {
		port = ln.Addr().(*net.TCPAddr).Port
	}

	mons := listMonitors()
	monIdx, _ := strconv.Atoi(cfg["monitor"])
	if monIdx < 1 || monIdx > len(mons) {
		monIdx = 1
		if len(mons) > 1 {
			monIdx = 2 // 모니터가 둘 이상이면 기본은 두 번째(전자칠판·프로젝터 쪽)
		}
	}

	var mu sync.Mutex
	var cur *exec.Cmd
	relaunch := false
	nextMsg := startMsg

	launch := func(msg string) *exec.Cmd {
		q := fmt.Sprintf("kiosk=1&quit=%d&monitors=%d&monitor=%d&lv=%s", port, len(mons), monIdx, launcherVer)
		if cfg["print_dialog"] == "1" {
			q += "&pdlg=1" // 인쇄 방식: 프린터 선택창 (기본은 기본 프린터로 바로 출력)
		}
		if msg != "" {
			q += "&" + msg
		}
		u := &url.URL{Scheme: "file", Path: "/" + strings.ReplaceAll(htmlPath, `\`, "/"), RawQuery: q}
		pageURL := u.String()
		common := []string{
			"--use-fake-ui-for-media-stream",
			"--autoplay-policy=no-user-gesture-required",
			"--no-first-run", "--no-default-browser-check",
			"--disable-pinch", "--overscroll-history-navigation=0",
			"--disable-features=TranslateUI,MediaFoundationD3D11VideoCapture",
			"--disable-session-crashed-bubble", "--hide-crash-restore-bubble",
			"--user-data-dir=" + profDir,
		}
		if cfg["print_dialog"] != "1" {
			common = append(common, "--kiosk-printing") // 확인창 없이 기본 프린터로 바로 출력
		}
		if len(mons) > 1 && monIdx >= 1 && monIdx <= len(mons) {
			m := mons[monIdx-1]
			cx, cy := (m.left+m.right)/2, (m.top+m.bottom)/2
			common = append(common, fmt.Sprintf("--window-position=%d,%d", cx-200, cy-150), "--window-size=400,300")
		}
		var exe string
		var args []string
		if chrome != "" {
			exe = chrome
			args = append([]string{"--kiosk", pageURL}, common...)
		} else {
			exe = edge
			args = append([]string{"--app=" + pageURL, "--start-fullscreen"}, common...)
		}
		c := exec.Command(exe, args...)
		c.Dir = appDir
		if err := c.Start(); err != nil {
			msgbox("브라우저를 실행하지 못했어요:\n"+err.Error(), 0x10)
			return nil
		}
		return c
	}

	// 브라우저를 닫고(필요하면) 다시 여는 도우미
	restart := func(msg string) {
		mu.Lock()
		relaunch = true
		nextMsg = msg
		c := cur
		mu.Unlock()
		go func() {
			time.Sleep(300 * time.Millisecond)
			if c != nil {
				c.Process.Kill()
			}
		}()
	}

	if ln != nil {
		go http.Serve(ln, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Private-Network", "true")
			w.Header().Set("Cache-Control", "no-store")
			if r.Method == "OPTIONS" {
				w.WriteHeader(204)
				return
			}
			page := func(msg string) {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				fmt.Fprintf(w, "<meta charset=utf-8><body style='font:26px sans-serif;text-align:center;padding-top:30vh;background:#F1FAF5;color:#27403A'>%s</body>", msg)
			}
			jsonOut := func(v interface{}) {
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				json.NewEncoder(w).Encode(v)
			}
			curHTML, _ := os.ReadFile(htmlPath)
			curVer := htmlVersion(curHTML)
			switch r.URL.Path {
			case "/quit":
				page("약속네컷을 닫는 중…")
				mu.Lock()
				relaunch = false
				c := cur
				mu.Unlock()
				go func() {
					time.Sleep(300 * time.Millisecond)
					if c != nil {
						c.Process.Kill()
					}
				}()
			case "/monitor":
				n, _ := strconv.Atoi(r.URL.Query().Get("n"))
				if n < 1 || n > len(mons) {
					n = 1
				}
				page(fmt.Sprintf("%d번 모니터로 옮기는 중…", n))
				mu.Lock()
				monIdx = n
				cfg["monitor"] = strconv.Itoa(n)
				writeConfig(cfgPath, cfg)
				mu.Unlock()
				restart("")
			case "/print/mode": // 인쇄 방식 바꾸기 — 크롬 실행 옵션이 달라져 다시 연다
				dialog := r.URL.Query().Get("dialog") == "1"
				page("인쇄 방식을 바꾸는 중…")
				mu.Lock()
				if dialog {
					cfg["print_dialog"] = "1"
				} else {
					delete(cfg, "print_dialog")
				}
				writeConfig(cfgPath, cfg)
				mu.Unlock()
				if dialog {
					restart("pmode=dialog")
				} else {
					restart("pmode=auto")
				}
			case "/update/status":
				_, hasPrev := os.Stat(filepath.Join(appDir, "yaksok-necut.prev.html"))
				jsonOut(map[string]interface{}{"url": updateURL(), "isDefault": strings.TrimSpace(cfg["update_url"]) == "", "auto": cfg["auto_update"] != "0", "current": curVer, "embedded": embeddedVer, "canRollback": hasPrev == nil})
			case "/update/seturl":
				u := strings.TrimSpace(r.URL.Query().Get("u"))
				mu.Lock()
				if u == "" {
					delete(cfg, "update_url")
				} else {
					cfg["update_url"] = u
				}
				writeConfig(cfgPath, cfg)
				mu.Unlock()
				jsonOut(map[string]interface{}{"ok": true, "url": u})
			case "/update/auto":
				mu.Lock()
				if r.URL.Query().Get("on") == "1" {
					cfg["auto_update"] = "1"
				} else {
					cfg["auto_update"] = "0"
				}
				writeConfig(cfgPath, cfg)
				mu.Unlock()
				jsonOut(map[string]interface{}{"ok": true})
			case "/update/check":
				_, v, err := fetchLatest(updateURL(), 8*time.Second)
				if err != nil {
					jsonOut(map[string]interface{}{"current": curVer, "error": err.Error()})
					return
				}
				jsonOut(map[string]interface{}{"current": curVer, "latest": v, "newer": cmpVer(v, curVer) > 0})
			case "/update/apply":
				body, v, err := fetchLatest(updateURL(), 20*time.Second)
				if err == nil {
					err = installUpdate(appDir, body)
				}
				if err != nil {
					page("업데이트하지 못했어요: " + err.Error() + "<br>잠시 후 앱으로 돌아갑니다.")
					restart("upd=err:" + url.QueryEscape(err.Error()))
					return
				}
				page(v + " 버전으로 바꾸는 중…")
				restart("upd=ok:" + v)
			case "/update/rollback":
				if err := rollbackUpdate(appDir); err != nil {
					page(err.Error() + "<br>잠시 후 앱으로 돌아갑니다.")
					restart("upd=err:" + url.QueryEscape(err.Error()))
					return
				}
				page("이전 버전으로 되돌리는 중…")
				restart("upd=back:" + htmlVersion(func() []byte { b, _ := os.ReadFile(htmlPath); return b }()))
			default:
				http.NotFound(w, r)
			}
		}))
	}

	for {
		mu.Lock()
		msg := nextMsg
		nextMsg = ""
		mu.Unlock()
		c := launch(msg)
		if c == nil {
			return
		}
		mu.Lock()
		cur = c
		relaunch = false
		mu.Unlock()
		c.Wait()
		mu.Lock()
		again := relaunch
		mu.Unlock()
		if !again {
			return
		}
		time.Sleep(400 * time.Millisecond)
	}
}
