# 약속네컷 소스 (src/)

배포되는 `index.html` 은 이 폴더의 조각들을 `build.py` 가 합쳐 만든 **한 파일**입니다. 고칠 때는 여기서 고치고 빌드하세요 — `index.html` 을 직접 고치면 다음 빌드에서 사라집니다.

```
python3 build.py            # yaksok-necut.html(아티팩트 원본) · 약속네컷.html(단독) · win/…/yaksok-necut.html(실행기용) 생성
python3 build.py --check    # src 를 합친 결과가 지금 yaksok-necut.html 과 같은지만 확인
```

| 위치 | 내용 |
|---|---|
| `head.html` | 라이선스 주석, 글꼴 링크(주아·고운돋움), `<title>` |
| `css/NNN-이름.css` | 스타일 — 파일 이름 순서대로 `<style>` 안에 이어 붙음 (000 기본·변수 → 화면별 → 교사 메뉴 → 인쇄) |
| `markup/NNN-이름.html` | `<div id="app">` 안 화면·오버레이 — s0(첫 화면)부터 s10(교사 메뉴), 잠금 화면까지 |
| `after-app.html` | `#app` 밖 요소(인쇄 영역) |
| `fonts/fonts.first.html` | 기본 본문 글꼴(메이플스토리체) 블록 — 스크립트 **앞**에 놓여 첫 화면부터 쓰임 |
| `fonts/fonts.rest.html` | 나머지 본문 글꼴 8종 블록 — 스크립트 **뒤**에 놓여 첫 화면을 늦추지 않음 (교사 메뉴를 열 때 읽음) |
| `js/NNN-이름.js` | 스크립트 — 하나의 IIFE 안에 파일 이름 순서대로 이어 붙음 (000 설정표·액자 → 010 설정 저장 → … → 190 교사 메뉴 → 200 시작) |
| `tail.html` | 맨 끝 |

글꼴 블록은 `fontpick/embed.py` 가 만듭니다(글꼴 원본을 KS X 1001 2,350자로 잘라 base64). 글꼴 원본 파일은 재배포 조건 때문에 저장소에 넣지 않습니다.

JS 조각들은 같은 스코프를 나눠 쓰므로(하나의 함수 안) 순서가 의미 있습니다. 새 조각을 넣을 때는 쓰는 쪽보다 앞 번호를 주세요. 실행 시점의 함수 호출(시작 코드)은 `200-boot.js` 에만 둡니다.

윈도우 실행기(exe)를 직접 만들 때는 먼저 `python3 build.py` 를 실행해 `windows/launcher/yaksok-necut.html`(실행기에 내장되는 사본)을 만든 뒤 `windows/launcher` 에서 `GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui" -o 약속네컷.exe .` 을 실행합니다. 아이콘·버전 정보 리소스는 `python3 windows/launcher/gen_syso.py windows/icon/yaksok.ico windows/launcher/rsrc_windows_amd64.syso <실행기 버전>` 으로 만듭니다.
