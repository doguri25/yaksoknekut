# 약속네컷.exe 만들기 (윈도우 실행기)

Go 1.22 이상이 있으면 어느 운영체제에서든 윈도우용 exe를 만들 수 있습니다.

```
cd windows/launcher
# 앱 파일(index.html)에서 구글 글꼴 링크를 내장 글꼴로 바꾼 yaksok-necut.html 을 이 폴더에 둔 뒤
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui" -o 약속네컷.exe .
```

- `rsrc_windows_amd64.syso` — 앱 아이콘 리소스. `python3 ../gen_syso.py ../icon/yaksok.ico rsrc_windows_amd64.syso` 로 다시 만들 수 있습니다.
- `fonts/` — 내장 글꼴(Jua, Sunflower · SIL Open Font License).
- 실행기는 크롬(없으면 엣지)을 키오스크·자동 인쇄 모드로 띄우고, `%LOCALAPPDATA%\YaksokNecut` 에 앱 파일·설정·프로필을 둡니다.
- 업데이트: 기본으로 이 저장소 `master` 의 `index.html` 을 확인해 새 버전이면 바꿉니다.
