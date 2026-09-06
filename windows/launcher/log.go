//go:build windows

package main

// 실행기 기록 — %LOCALAPPDATA%\YaksokNecut\launcher.log 에 켜짐·업데이트·다시 연 이유·대기열 비우기·오류를 한 줄씩.
// [문제 정보 복사]에 마지막 20줄이 들어가 "왜 닫혔는지·업데이트가 왜 실패했는지"를 사후에 알 수 있다. 256KB를 넘으면 앞부분을 버린다.

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	logPath string
	logMu   sync.Mutex
)

func logf(format string, a ...interface{}) {
	if logPath == "" {
		return
	}
	logMu.Lock()
	defer logMu.Unlock()
	line := time.Now().Format("2006-01-02 15:04:05") + " " + fmt.Sprintf(format, a...) + "\r\n"
	if st, err := os.Stat(logPath); err == nil && st.Size() > 256*1024 { // 너무 커지면 뒤쪽 절반만 남김
		if b, err := os.ReadFile(logPath); err == nil {
			b = b[len(b)/2:]
			if i := strings.IndexByte(string(b), '\n'); i >= 0 {
				b = b[i+1:]
			}
			os.WriteFile(logPath, b, 0o644)
		}
	}
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	f.WriteString(line)
	f.Close()
}

// 마지막 n줄
func lastLogLines(n int) []string {
	if logPath == "" {
		return nil
	}
	logMu.Lock()
	b, err := os.ReadFile(logPath)
	logMu.Unlock()
	if err != nil {
		return nil
	}
	lines := strings.Split(strings.TrimRight(strings.ReplaceAll(string(b), "\r\n", "\n"), "\n"), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	if len(lines) == 1 && lines[0] == "" {
		return nil
	}
	return lines
}
