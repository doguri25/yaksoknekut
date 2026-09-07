//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// 숨긴 창으로 PowerShell(윈도우 기본 5.1 — System.Speech 는 .NET Framework 에 있음) 워커를 띄움
func powershellTTS() *exec.Cmd {
	c := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", ttsScriptEncoded())
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	return c
}
