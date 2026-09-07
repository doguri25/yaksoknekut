//go:build !windows

package main

import "os/exec"

// 윈도우가 아니면(테스트) 워커가 없음 — 테스트는 ttsCmd 를 가짜로 바꿔 끼움
func powershellTTS() *exec.Cmd { return exec.Command("false") }
