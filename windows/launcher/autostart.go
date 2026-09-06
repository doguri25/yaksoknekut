//go:build windows

package main

// 윈도우 켤 때 자동 실행 — 시작 프로그램 폴더에 바로가기(.lnk)를 넣고 뺀다 (교사 메뉴 › 학교·기록·앱 스위치, 기본 꺼짐).
// 바로가기는 PowerShell(WScript.Shell)로 만들고, 안 되면 exe를 띄우는 .cmd 를 대신 둔다. 켤 때마다 지금 exe 위치로 다시 맞춘다(파일을 옮겨도 살아 있게).

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func startupDir() string {
	if a := os.Getenv("APPDATA"); a != "" {
		return filepath.Join(a, "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
	}
	return ""
}

func autostartPaths() (lnk, cmd string) {
	d := startupDir()
	if d == "" {
		return "", ""
	}
	return filepath.Join(d, "약속네컷.lnk"), filepath.Join(d, "약속네컷.cmd")
}

func autostartOn() bool {
	lnk, cmd := autostartPaths()
	if lnk == "" {
		return false
	}
	_, e1 := os.Stat(lnk)
	_, e2 := os.Stat(cmd)
	return e1 == nil || e2 == nil
}

func setAutostart(on bool, exePath string) error {
	lnk, cmd := autostartPaths()
	if lnk == "" {
		return os.ErrNotExist
	}
	if !on {
		os.Remove(lnk)
		os.Remove(cmd)
		return nil
	}
	if exePath == "" {
		return os.ErrNotExist
	}
	esc := func(s string) string { return strings.ReplaceAll(s, "'", "''") }
	script := "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('" + esc(lnk) + "'); $s.TargetPath='" + esc(exePath) + "'; $s.WorkingDirectory='" + esc(filepath.Dir(exePath)) + "'; $s.Description='약속네컷'; $s.Save()"
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	c := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := c.Run(); err == nil {
		if _, e := os.Stat(lnk); e == nil {
			os.Remove(cmd)
			return nil
		}
	}
	// PowerShell이 막힌 컴퓨터: exe를 띄우는 .cmd 로 대신
	body := "@echo off\r\nstart \"\" \"" + exePath + "\"\r\n"
	if err := os.WriteFile(cmd, []byte(body), 0o644); err != nil {
		return err
	}
	os.Remove(lnk)
	return nil
}
