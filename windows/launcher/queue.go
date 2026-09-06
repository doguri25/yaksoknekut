//go:build windows

package main

// 인쇄 대기열 (winspool) — 뽑은 뒤 사진이 실제로 프린터로 나가는지 앱이 지켜볼 수 있게.
// 프린터가 '준비됨'이어도 윈도우 스풀러에 작업이 멈춰 있는 경우가 행사장에서 가장 흔한 사고라, 작업 수·가장 오래된 작업의 나이·상태를 돌려주고
// 앱의 [대기열 비우기]로 작업을 지우거나(자기 작업은 관리자 권한 없이 됨) 일시 중지된 프린터를 다시 돌린다.

import (
	"syscall"
	"time"
	"unsafe"
)

var (
	winspool         = syscall.NewLazyDLL("winspool.drv")
	procOpenPrinter  = winspool.NewProc("OpenPrinterW")
	procClosePrinter = winspool.NewProc("ClosePrinter")
	procEnumJobs     = winspool.NewProc("EnumJobsW")
	procGetPrinter   = winspool.NewProc("GetPrinterW")
	procSetJob       = winspool.NewProc("SetJobW")
	procSetPrinter   = winspool.NewProc("SetPrinterW")
)

// JOB_INFO_1W (x64 배치 — 포인터는 8바이트)
type systemTime struct{ Year, Month, DayOfWeek, Day, Hour, Minute, Second, Millis uint16 }
type jobInfo1 struct {
	JobId                                                        uint32
	_                                                            uint32
	PrinterName, MachineName, UserName, Document, Datatype, Stat *uint16
	Status, Priority, Position, TotalPages, PagesPrinted         uint32
	Submitted                                                    systemTime
}

// PRINTER_INFO_2W 의 앞부분 (Status·cJobs 까지)
type printerInfo2 struct {
	ServerName, PrinterName, ShareName, PortName, DriverName, Comment, Location *uint16
	DevMode                                                                     uintptr
	SepFile, PrintProcessor, Datatype, Parameters                               *uint16
	SecurityDescriptor                                                          uintptr
	Attributes, Priority, DefaultPriority, StartTime, UntilTime, Status, CJobs  uint32
	AveragePPM                                                                  uint32
}

type printerDefaults struct {
	Datatype      *uint16
	DevMode       uintptr
	DesiredAccess uint32
}

const (
	printerAccessUse        = 0x8
	printerAccessAdminister = 0x4
	jobControlDelete        = 5
	printerControlResume    = 2
	// JOB_STATUS_*
	jsPaused, jsError, jsDeleting, jsSpooling, jsPrinting, jsOffline, jsPaperOut = 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40
	jsPrinted, jsDeleted, jsBlocked, jsUserIntervention, jsRestart, jsComplete   = 0x80, 0x100, 0x200, 0x400, 0x800, 0x1000
	// PRINTER_STATUS_*
	psPaused, psError, psPaperJam, psPaperOut, psPaperProblem, psOffline = 0x1, 0x2, 0x8, 0x10, 0x40, 0x80
	psUserIntervention, psDoorOpen, psNotAvailable                       = 0x100000, 0x400000, 0x1000
)

type queueInfo struct {
	Name      string `json:"name"`
	Jobs      int    `json:"jobs"`              // 대기열에 남은 작업 수
	OldestSec int    `json:"oldestSec"`         // 가장 오래된 작업이 들어온 뒤 지난 초
	Pages     int    `json:"pages"`             // 가장 오래된 작업의 쪽수 (모르면 0)
	Printed   int    `json:"printed"`           // 가장 오래된 작업의 인쇄된 쪽수
	Paused    bool   `json:"paused"`            // 프린터(대기열) 일시 중지
	Problem   string `json:"problem"`           // '' | paused | error | paperout | jam | offline | intervention | blocked | door
	Detail    string `json:"detail"`            // 사람이 읽는 한 줄
	Error     string `json:"error,omitempty"`   // 대기열을 읽지 못했을 때
	Removed   int    `json:"removed,omitempty"` // /printer/queue/clear 가 지운 작업 수
	Resumed   bool   `json:"resumed,omitempty"` // 일시 중지를 풂
}

func openPrinter(name string, access uint32) (syscall.Handle, error) {
	p, err := syscall.UTF16PtrFromString(name)
	if err != nil {
		return 0, err
	}
	var h syscall.Handle
	var pd *printerDefaults
	if access != 0 {
		pd = &printerDefaults{DesiredAccess: access}
	}
	r, _, e := procOpenPrinter.Call(uintptr(unsafe.Pointer(p)), uintptr(unsafe.Pointer(&h)), uintptr(unsafe.Pointer(pd)))
	if r == 0 {
		return 0, e
	}
	return h, nil
}

func enumJobs(h syscall.Handle) []jobInfo1 {
	var needed, returned uint32
	procEnumJobs.Call(uintptr(h), 0, 200, 1, 0, 0, uintptr(unsafe.Pointer(&needed)), uintptr(unsafe.Pointer(&returned)))
	if needed == 0 {
		return nil
	}
	buf := make([]byte, needed)
	r, _, _ := procEnumJobs.Call(uintptr(h), 0, 200, 1, uintptr(unsafe.Pointer(&buf[0])), uintptr(needed), uintptr(unsafe.Pointer(&needed)), uintptr(unsafe.Pointer(&returned)))
	if r == 0 || returned == 0 {
		return nil
	}
	out := make([]jobInfo1, returned)
	sz := unsafe.Sizeof(jobInfo1{})
	for i := uintptr(0); i < uintptr(returned); i++ {
		out[i] = *(*jobInfo1)(unsafe.Pointer(&buf[i*sz]))
	}
	return out
}

func printerStatusFlags(h syscall.Handle) (uint32, bool) {
	var needed uint32
	procGetPrinter.Call(uintptr(h), 2, 0, 0, uintptr(unsafe.Pointer(&needed)))
	if needed == 0 {
		return 0, false
	}
	buf := make([]byte, needed)
	r, _, _ := procGetPrinter.Call(uintptr(h), 2, uintptr(unsafe.Pointer(&buf[0])), uintptr(needed), uintptr(unsafe.Pointer(&needed)))
	if r == 0 {
		return 0, false
	}
	pi := (*printerInfo2)(unsafe.Pointer(&buf[0]))
	return pi.Status, true
}

func (t systemTime) time() time.Time {
	if t.Year == 0 {
		return time.Time{}
	}
	return time.Date(int(t.Year), time.Month(t.Month), int(t.Day), int(t.Hour), int(t.Minute), int(t.Second), int(t.Millis)*1e6, time.UTC)
}

// 기본 프린터의 대기열 상태
func printerQueue() queueInfo {
	name := defaultPrinterName()
	q := queueInfo{Name: name}
	if name == "" {
		q.Error = "기본 프린터가 정해져 있지 않아요"
		return q
	}
	h, err := openPrinter(name, 0)
	if err != nil {
		q.Error = "대기열을 읽지 못했어요"
		return q
	}
	defer procClosePrinter.Call(uintptr(h))
	jobs := enumJobs(h)
	q.Jobs = len(jobs)
	var flags uint32
	now := time.Now()
	for i, j := range jobs {
		flags |= j.Status
		if st := j.Submitted.time(); !st.IsZero() {
			if age := int(now.Sub(st) / time.Second); age > q.OldestSec {
				q.OldestSec = age
			}
		}
		if i == 0 {
			q.Pages, q.Printed = int(j.TotalPages), int(j.PagesPrinted)
		}
	}
	ps, ok := printerStatusFlags(h)
	if ok && ps&psPaused != 0 {
		q.Paused = true
	}
	switch {
	case q.Paused:
		q.Problem, q.Detail = "paused", "프린터가 일시 중지 상태예요"
	case flags&jsPaused != 0:
		q.Problem, q.Detail = "paused", "인쇄 작업이 일시 중지되어 있어요"
	case ps&psOffline != 0 || flags&jsOffline != 0:
		q.Problem, q.Detail = "offline", "프린터가 오프라인이에요 — 전원·연결 확인"
	case ps&psPaperOut != 0 || flags&jsPaperOut != 0:
		q.Problem, q.Detail = "paperout", "용지가 없어요"
	case ps&psPaperJam != 0:
		q.Problem, q.Detail = "jam", "용지가 걸렸어요"
	case ps&psDoorOpen != 0:
		q.Problem, q.Detail = "door", "프린터 덮개가 열려 있어요"
	case ps&psUserIntervention != 0 || flags&jsUserIntervention != 0:
		q.Problem, q.Detail = "intervention", "프린터가 사람 손을 기다리고 있어요"
	case flags&jsBlocked != 0:
		q.Problem, q.Detail = "blocked", "인쇄 작업이 막혀 있어요"
	case ps&psError != 0 || flags&jsError != 0 || ps&psPaperProblem != 0 || ps&psNotAvailable != 0:
		q.Problem, q.Detail = "error", "인쇄 작업에 오류가 있어요"
	case q.Jobs == 0:
		q.Detail = "대기열 비어 있음"
	case flags&jsPrinting != 0:
		q.Detail = "인쇄 중"
	case flags&jsSpooling != 0:
		q.Detail = "인쇄 준비 중"
	default:
		q.Detail = "대기 중"
	}
	return q
}

// 대기열 비우기 — 남은 작업을 모두 지우고, 일시 중지된 프린터는 다시 돌림 (앱의 [대기열 비우기])
func clearPrinterQueue() queueInfo {
	name := defaultPrinterName()
	q := queueInfo{Name: name}
	if name == "" {
		q.Error = "기본 프린터가 정해져 있지 않아요"
		return q
	}
	h, err := openPrinter(name, printerAccessAdminister)
	if err != nil { // 관리자 권한이 없으면 보통 권한으로 (자기 작업은 지울 수 있음)
		if h, err = openPrinter(name, 0); err != nil {
			q.Error = "프린터를 열지 못했어요"
			return q
		}
	}
	defer procClosePrinter.Call(uintptr(h))
	for _, j := range enumJobs(h) {
		if r, _, _ := procSetJob.Call(uintptr(h), uintptr(j.JobId), 0, 0, jobControlDelete); r != 0 {
			q.Removed++
		}
	}
	if ps, ok := printerStatusFlags(h); ok && ps&psPaused != 0 {
		if r, _, _ := procSetPrinter.Call(uintptr(h), 0, 0, printerControlResume); r != 0 {
			q.Resumed = true
		}
	}
	time.Sleep(400 * time.Millisecond)
	q.Jobs = len(enumJobs(h))
	if q.Jobs == 0 {
		q.Detail = "대기열을 비웠어요"
	} else {
		q.Detail = "작업이 아직 남아 있어요 — 프린터를 껐다 켜 보세요"
	}
	return q
}
