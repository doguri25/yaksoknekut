//go:build windows

package main

import (
	"context"
	"encoding/json"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

// 윈도우 기본 프린터 이름 (winspool GetDefaultPrinterW — PowerShell보다 훨씬 빨라 켤 때마다 불러도 됨). 없으면 ""
var procGetDefaultPrinter = syscall.NewLazyDLL("winspool.drv").NewProc("GetDefaultPrinterW")

func defaultPrinterName() string {
	var n uint32
	procGetDefaultPrinter.Call(0, uintptr(unsafe.Pointer(&n)))
	if n == 0 || n > 1024 {
		return ""
	}
	buf := make([]uint16, n)
	r, _, _ := procGetDefaultPrinter.Call(uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&n)))
	if r == 0 {
		return ""
	}
	return syscall.UTF16ToString(buf)
}

// ---------- 기본 프린터 상태 (교사 메뉴 › 자주 쓰는 설정 › 행사 준비 점검) ----------
// PowerShell로 윈도우에 물어본다. 1~2초 걸리므로 20초 동안은 같은 답을 돌려준다.

type printerInfo struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // ready | printing | offline | paper | jam | error | unknown
	Detail  string `json:"detail"`
	Default bool   `json:"default"`
	Fixed   bool   `json:"fixed,omitempty"` // 이번 실행에서 크롬이 기억한 다른 프린터를 지우고 기본 프린터로 맞췄음
	Error   string `json:"error,omitempty"`
}

var (
	prMu   sync.Mutex
	prLast printerInfo
	prAt   time.Time
)

func printerStatus() printerInfo {
	prMu.Lock()
	defer prMu.Unlock()
	if time.Since(prAt) < 20*time.Second && prLast.Name != "" {
		return prLast
	}
	info := queryPrinter()
	prLast, prAt = info, time.Now()
	return info
}

func queryPrinter() printerInfo {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	script := "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Printer | Select-Object Name,Default,WorkOffline,PrinterStatus,DetectedErrorState | ConvertTo-Json -Compress"
	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // 창 없이
	out, err := cmd.Output()
	if err != nil {
		return printerInfo{Status: "unknown", Error: "프린터 정보를 읽지 못했어요"}
	}
	txt := strings.TrimSpace(string(out))
	if txt == "" {
		return printerInfo{Status: "unknown", Error: "설치된 프린터가 없어요"}
	}
	type raw struct {
		Name               string
		Default            bool
		WorkOffline        bool
		PrinterStatus      int
		DetectedErrorState int
	}
	var list []raw
	if strings.HasPrefix(txt, "[") {
		if json.Unmarshal([]byte(txt), &list) != nil {
			return printerInfo{Status: "unknown", Error: "프린터 정보를 읽지 못했어요"}
		}
	} else {
		var one raw
		if json.Unmarshal([]byte(txt), &one) != nil {
			return printerInfo{Status: "unknown", Error: "프린터 정보를 읽지 못했어요"}
		}
		list = []raw{one}
	}
	var d *raw
	for i := range list {
		if list[i].Default {
			d = &list[i]
			break
		}
	}
	if d == nil {
		return printerInfo{Status: "unknown", Error: "기본 프린터가 정해져 있지 않아요"}
	}
	info := printerInfo{Name: d.Name, Default: true, Status: "ready", Detail: "준비됨"}
	switch {
	case d.WorkOffline || d.PrinterStatus == 7 || d.DetectedErrorState == 9:
		info.Status, info.Detail = "offline", "오프라인 — 전원·연결 확인"
	case d.DetectedErrorState == 3 || d.DetectedErrorState == 4:
		info.Status, info.Detail = "paper", "용지 없음·부족"
	case d.DetectedErrorState == 8:
		info.Status, info.Detail = "jam", "용지 걸림"
	case d.DetectedErrorState == 7:
		info.Status, info.Detail = "error", "덮개 열림"
	case d.DetectedErrorState == 5 || d.DetectedErrorState == 6:
		info.Status, info.Detail = "error", "잉크·토너 부족"
	case d.DetectedErrorState == 10 || d.DetectedErrorState == 11 || d.DetectedErrorState == 1:
		info.Status, info.Detail = "error", "프린터 오류"
	case d.PrinterStatus == 4 || d.PrinterStatus == 5:
		info.Status, info.Detail = "printing", "인쇄 중"
	}
	return info
}
