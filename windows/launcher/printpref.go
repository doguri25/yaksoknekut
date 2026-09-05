package main

// 크롬(엣지)은 --kiosk-printing 으로 자동 출력할 때 '윈도우 기본 프린터'가 아니라
// 프로필에 기억해 둔 '마지막으로 쓴 프린터'(printing.print_preview_sticky_settings)를 씁니다.
// 그래서 알PDF 같은 가상 프린터를 한 번이라도 썼거나, 프로필이 만들어질 때의 기본 프린터가 달랐다면
// 윈도우 기본 프린터를 바꿔도 계속 그쪽으로 나갑니다.
// → 브라우저를 켜기 전에 기억된 프린터가 지금 기본 프린터와 다르면 그 기억을 지워, 기본 프린터로 나가게 합니다.

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// 기억된 프린터 id(로컬 프린터는 이름) — 없으면 ""
func stickyPrinter(prefs map[string]interface{}) string {
	pr, _ := prefs["printing"].(map[string]interface{})
	if pr == nil {
		return ""
	}
	st, _ := pr["print_preview_sticky_settings"].(map[string]interface{})
	if st == nil {
		return ""
	}
	app, _ := st["appState"].(string)
	if app == "" {
		return ""
	}
	var a struct {
		RecentDestinations []struct {
			ID     string `json:"id"`
			Origin string `json:"origin"`
		} `json:"recentDestinations"`
	}
	if json.Unmarshal([]byte(app), &a) != nil || len(a.RecentDestinations) == 0 {
		return ""
	}
	return a.RecentDestinations[0].ID
}

// Preferences 파일에서 기억된 프린터가 defaultPrinter 와 다르면 지움. 바꿨으면 true.
// defaultPrinter 가 "" (알 수 없음)이면 기억이 있을 때 지워서 시스템 기본으로 돌아가게 함.
func syncPrinterPref(prefPath, defaultPrinter string) (bool, error) {
	b, err := os.ReadFile(prefPath)
	if err != nil {
		return false, nil // 프로필이 아직 없음 → 크롬이 기본 프린터를 씀
	}
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber() // 큰 숫자(시각 등)가 바뀌지 않게
	var prefs map[string]interface{}
	if err := dec.Decode(&prefs); err != nil {
		return false, err
	}
	pr, _ := prefs["printing"].(map[string]interface{})
	if pr == nil {
		return false, nil
	}
	if _, ok := pr["print_preview_sticky_settings"]; !ok {
		return false, nil
	}
	remembered := stickyPrinter(prefs)
	if remembered != "" && defaultPrinter != "" && strings.EqualFold(strings.TrimSpace(remembered), strings.TrimSpace(defaultPrinter)) {
		return false, nil // 이미 기본 프린터를 기억하고 있음
	}
	delete(pr, "print_preview_sticky_settings")
	if len(pr) == 0 {
		delete(prefs, "printing")
	}
	out, err := json.Marshal(prefs)
	if err != nil {
		return false, err
	}
	tmp := prefPath + ".tmp"
	if err := os.WriteFile(tmp, out, 0o644); err != nil {
		return false, err
	}
	return true, os.Rename(tmp, prefPath)
}

// 프로필 폴더 기준 (크롬·엣지 모두 <profile>/Default/Preferences)
func prefPathOf(profDir string) string { return filepath.Join(profDir, "Default", "Preferences") }
