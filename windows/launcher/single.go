//go:build windows

package main

// 중복 실행 막기 — 이미 켜져 있는데 exe를 또 누르면 새로 열지 않고 켜져 있는 약속네컷 창을 앞으로 가져온다.
// 이름 있는 뮤텍스로 '켜져 있음'을 알고, 먼저 켜진 실행기의 포트(port.txt)로 /focus 를 불러 크롬 창을 앞으로.
// 실행기 자동 교체 뒤 새 exe 가 이어서 켜질 때는(--after-update) 옛 실행기가 끝나 뮤텍스를 놓을 때까지 잠시 기다린다.

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	kernel32                     = syscall.NewLazyDLL("kernel32.dll")
	procCreateMutex              = kernel32.NewProc("CreateMutexW")
	procSetForegroundWindow      = user32.NewProc("SetForegroundWindow")
	procShowWindow               = user32.NewProc("ShowWindow")
	procIsWindowVisible          = user32.NewProc("IsWindowVisible")
	procAllowSetForegroundWindow = user32.NewProc("AllowSetForegroundWindow")
)

const mutexName = "Local\\YaksokNecut.Launcher"

// 뮤텍스를 잡는다. 이미 다른 실행기가 잡고 있으면 false. wait 동안은 놓아 주길 기다림 (실행기 교체 직후)
func claimSingle(wait time.Duration) bool {
	name, _ := syscall.UTF16PtrFromString(mutexName)
	deadline := time.Now().Add(wait)
	for {
		h, _, err := procCreateMutex.Call(0, 0, uintptr(unsafe.Pointer(name)))
		if h == 0 {
			return true // 뮤텍스를 못 만들면(드묾) 막지 않고 그냥 켬
		}
		if errno, ok := err.(syscall.Errno); !ok || errno != 183 { // ERROR_ALREADY_EXISTS 가 아니면 우리가 첫 실행
			return true // 핸들은 프로세스가 끝날 때까지 쥐고 있음
		}
		syscall.CloseHandle(syscall.Handle(h))
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(300 * time.Millisecond)
	}
}

func portFile(dir string) string { return filepath.Join(dir, "port.txt") }

// 먼저 켜진 실행기에 '창을 앞으로' 부탁하고, 그 크롬 창을 이쪽(사용자가 방금 누른 프로세스)에서도 앞으로 가져옴
func focusRunning(dir string) bool {
	for i := 0; i < 10; i++ { // 먼저 켜진 쪽이 아직 켜지는 중일 수 있어 3초 정도 기다려 봄
		if b, err := os.ReadFile(portFile(dir)); err == nil {
			if port, err := strconv.Atoi(strings.TrimSpace(string(b))); err == nil && port > 0 {
				c := &http.Client{Timeout: 1500 * time.Millisecond}
				if res, err := c.Get("http://127.0.0.1:" + strconv.Itoa(port) + "/focus"); err == nil {
					body, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
					res.Body.Close()
					if pid, err := strconv.Atoi(strings.TrimSpace(string(body))); err == nil && pid > 0 {
						procAllowSetForegroundWindow.Call(uintptr(pid))
						bringToFront(uint32(pid))
					}
					return true
				}
			}
		}
		time.Sleep(300 * time.Millisecond)
	}
	return false
}

// pid 의 보이는 창들을 복원하고 앞으로
func bringToFront(pid uint32) {
	getPid := user32.NewProc("GetWindowThreadProcessId")
	cb := syscall.NewCallback(func(h uintptr, lp uintptr) uintptr {
		var wp uint32
		getPid.Call(h, uintptr(unsafe.Pointer(&wp)))
		if wp == pid {
			if v, _, _ := procIsWindowVisible.Call(h); v != 0 {
				procShowWindow.Call(h, 9) // SW_RESTORE
				procSetForegroundWindow.Call(h)
			}
		}
		return 1
	})
	user32.NewProc("EnumWindows").Call(cb, 0)
}
