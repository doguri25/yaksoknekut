//go:build windows

package main

// 기본 프린터의 '기본 용지' 읽기 — 처음 설치할 때 사진이 아주 작게 나오거나 잘리는 원인 1순위(용지가 A4로 남아 있음)를
// 글 안내가 아니라 실제 값으로 잡기 위해. 드라이버 기본 DEVMODE 의 dmPaperSize 를 DeviceCapabilities 의 용지 목록과 맞춰 크기(mm)·이름을 얻는다.

import (
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"unsafe"
)

var (
	procDocumentProperties = winspool.NewProc("DocumentPropertiesW")
	procDeviceCapabilities = winspool.NewProc("DeviceCapabilitiesW")
)

type paperInfo struct {
	Name        string `json:"name"`        // 프린터 이름
	Form        string `json:"form"`        // 용지 이름 (드라이버 표기 · 예: Postcard(4x6in), A4)
	PaperID     int    `json:"paperId"`     // dmPaperSize (A4=9, Letter=1, 엽서=43, 사용자 정의≥256)
	WidthMm     int    `json:"widthMm"`     // 세로 방향 기준 폭 (mm, 반올림)
	HeightMm    int    `json:"heightMm"`    // 세로 방향 기준 높이
	Orientation string `json:"orientation"` // portrait | landscape | ''
	Verdict     string `json:"verdict"`     // ok(4×6·엽서) | a4 | letter | other | unknown
	Detail      string `json:"detail"`      // 사람이 읽는 한 줄
	Error       string `json:"error,omitempty"`
}

// DEVMODEW 앞부분 (dmFormName 까지)
type devmodeHead struct {
	DeviceName    [32]uint16
	SpecVersion   uint16
	DriverVersion uint16
	Size          uint16
	DriverExtra   uint16
	Fields        uint32
	Orientation   int16
	PaperSize     int16
	PaperLength   int16
	PaperWidth    int16
	Scale         int16
	Copies        int16
	DefaultSource int16
	PrintQuality  int16
	Color         int16
	Duplex        int16
	YResolution   int16
	TTOption      int16
	Collate       int16
	FormName      [32]uint16
}

const (
	dmOrientation = 0x1
	dmPaperSize   = 0x2
	dmPaperLength = 0x4
	dmPaperWidth  = 0x8
	dmFormName    = 0x10000
	dcPapers      = 2
	dcPaperSize   = 3
	dcPaperNames  = 16
)

// PRINTER_INFO_2W 통째로 읽어 pDevMode·pPortName 을 얻음
func printerInfo2Of(h syscall.Handle) (*printerInfo2, []byte) {
	var needed uint32
	procGetPrinter.Call(uintptr(h), 2, 0, 0, uintptr(unsafe.Pointer(&needed)))
	if needed == 0 {
		return nil, nil
	}
	buf := make([]byte, needed)
	if r, _, _ := procGetPrinter.Call(uintptr(h), 2, uintptr(unsafe.Pointer(&buf[0])), uintptr(needed), uintptr(unsafe.Pointer(&needed))); r == 0 {
		return nil, nil
	}
	return (*printerInfo2)(unsafe.Pointer(&buf[0])), buf
}

func utf16At(p *uint16) string {
	if p == nil {
		return ""
	}
	var out []uint16
	for i := uintptr(0); i < 1024; i++ {
		c := *(*uint16)(unsafe.Pointer(uintptr(unsafe.Pointer(p)) + i*2))
		if c == 0 {
			break
		}
		out = append(out, c)
	}
	return syscall.UTF16ToString(out)
}

// 드라이버 기본 DEVMODE 의 머리 부분 (값 복사) — PRINTER_INFO_2.pDevMode 가 없으면 DocumentProperties 로 받음
func defaultDevmode(h syscall.Handle, name string, pi *printerInfo2) *devmodeHead {
	if pi != nil && pi.DevMode != 0 {
		d := *(*devmodeHead)(unsafe.Pointer(pi.DevMode))
		return &d
	}
	np, _ := syscall.UTF16PtrFromString(name)
	n, _, _ := procDocumentProperties.Call(0, uintptr(h), uintptr(unsafe.Pointer(np)), 0, 0, 0)
	if int32(n) <= 0 {
		return nil
	}
	buf := make([]byte, int32(n)+64)
	if r, _, _ := procDocumentProperties.Call(0, uintptr(h), uintptr(unsafe.Pointer(np)), uintptr(unsafe.Pointer(&buf[0])), 0, 2 /*DM_OUT_BUFFER*/); int32(r) < 0 {
		return nil
	}
	d := *(*devmodeHead)(unsafe.Pointer(&buf[0]))
	runtime.KeepAlive(buf)
	return &d
}

// DeviceCapabilities 로 용지 id → (mm 크기, 이름)
func paperTable(name, port string) (map[int][2]int, map[int]string) {
	np, _ := syscall.UTF16PtrFromString(name)
	pp, _ := syscall.UTF16PtrFromString(port)
	cnt, _, _ := procDeviceCapabilities.Call(uintptr(unsafe.Pointer(np)), uintptr(unsafe.Pointer(pp)), dcPapers, 0, 0)
	n := int(int32(cnt))
	if n <= 0 || n > 512 {
		return nil, nil
	}
	ids := make([]uint16, n)
	sizes := make([][2]int32, n)
	names := make([]uint16, n*64)
	procDeviceCapabilities.Call(uintptr(unsafe.Pointer(np)), uintptr(unsafe.Pointer(pp)), dcPapers, uintptr(unsafe.Pointer(&ids[0])), 0)
	procDeviceCapabilities.Call(uintptr(unsafe.Pointer(np)), uintptr(unsafe.Pointer(pp)), dcPaperSize, uintptr(unsafe.Pointer(&sizes[0])), 0)
	procDeviceCapabilities.Call(uintptr(unsafe.Pointer(np)), uintptr(unsafe.Pointer(pp)), dcPaperNames, uintptr(unsafe.Pointer(&names[0])), 0)
	sz := map[int][2]int{}
	nm := map[int]string{}
	for i := 0; i < n; i++ {
		id := int(ids[i])
		sz[id] = [2]int{int(sizes[i][0]), int(sizes[i][1])} // 0.1mm 단위 (세로 방향 기준 폭, 높이)
		nm[id] = syscall.UTF16ToString(names[i*64 : i*64+64])
	}
	return sz, nm
}

// 표준 용지 크기 (드라이버가 목록을 안 주거나 목록에 없을 때)
var stdPaper = map[int][2]int{1: {2159, 2794}, 5: {2159, 3556}, 8: {2970, 4200}, 9: {2100, 2970}, 11: {1480, 2100}, 13: {1820, 2570}, 43: {1000, 1480}, 69: {2000, 1480}, 70: {1050, 1480}}

func judgePaper(p *paperInfo) {
	w, h := p.WidthMm, p.HeightMm
	if w > h {
		w, h = h, w
	}
	switch {
	case w == 0 || h == 0:
		p.Verdict, p.Detail = "unknown", "용지 크기를 읽지 못했어요"
		if p.Form != "" {
			p.Detail = "용지: " + p.Form + " (크기 모름)"
		}
	case w >= 98 && w <= 106 && h >= 145 && h <= 156:
		p.Verdict, p.Detail = "ok", "4×6(엽서) "+itoa(p.WidthMm)+"×"+itoa(p.HeightMm)+"mm"
	case p.PaperID == 9 || (w >= 205 && w <= 215 && h >= 292 && h <= 302):
		p.Verdict, p.Detail = "a4", "A4 — 4×6(엽서)로 바꿔야 해요"
	case p.PaperID == 1 || (w >= 210 && w <= 221 && h >= 274 && h <= 285):
		p.Verdict, p.Detail = "letter", "Letter — 4×6(엽서)로 바꿔야 해요"
	default:
		p.Verdict, p.Detail = "other", strings.TrimSpace(p.Form)+" "+itoa(p.WidthMm)+"×"+itoa(p.HeightMm)+"mm — 4×6(엽서)이 아니에요"
	}
	if p.Orientation != "" && p.Verdict == "ok" {
		p.Detail += map[string]string{"portrait": " · 세로", "landscape": " · 가로"}[p.Orientation]
	}
}

func itoa(n int) string { return strconv.Itoa(n) }

func printerPaper() paperInfo {
	name := defaultPrinterName()
	p := paperInfo{Name: name, Verdict: "unknown"}
	if name == "" {
		p.Error = "기본 프린터가 정해져 있지 않아요"
		p.Detail = p.Error
		return p
	}
	h, err := openPrinter(name, 0)
	if err != nil {
		p.Error = "프린터를 열지 못했어요"
		p.Detail = p.Error
		return p
	}
	defer procClosePrinter.Call(uintptr(h))
	pi, keep := printerInfo2Of(h)
	defer runtime.KeepAlive(keep)
	dm := defaultDevmode(h, name, pi)
	if dm == nil {
		p.Error = "용지 설정을 읽지 못했어요"
		p.Detail = p.Error
		return p
	}
	if dm.Fields&dmFormName != 0 {
		p.Form = syscall.UTF16ToString(dm.FormName[:])
	}
	if dm.Fields&dmOrientation != 0 {
		p.Orientation = map[int16]string{1: "portrait", 2: "landscape"}[dm.Orientation]
	}
	if dm.Fields&dmPaperSize != 0 {
		p.PaperID = int(dm.PaperSize)
	}
	port := ""
	if pi != nil {
		port = utf16At(pi.PortName)
	}
	sz, nm := paperTable(name, port)
	if s, ok := sz[p.PaperID]; ok && s[0] > 0 && s[1] > 0 {
		p.WidthMm, p.HeightMm = (s[0]+5)/10, (s[1]+5)/10
		if p.Form == "" {
			p.Form = nm[p.PaperID]
		}
	} else if dm.Fields&(dmPaperWidth|dmPaperLength) == (dmPaperWidth|dmPaperLength) && dm.PaperWidth > 0 && dm.PaperLength > 0 {
		p.WidthMm, p.HeightMm = (int(dm.PaperWidth)+5)/10, (int(dm.PaperLength)+5)/10
	} else if s, ok := stdPaper[p.PaperID]; ok {
		p.WidthMm, p.HeightMm = (s[0]+5)/10, (s[1]+5)/10
	}
	judgePaper(&p)
	return p
}
