#!/usr/bin/env python3
"""약속네컷 빌드 — src/ 조각들을 합쳐 배포 파일들을 만든다.

  src/head.html            라이선스 주석 · 글꼴 링크 · <title>
  src/css/*.css            <style> 안 (파일 이름 순서대로)
  src/markup/*.html        <div id="app"> 안 (파일 이름 순서대로)
  src/after-app.html       #app 밖 요소 (인쇄 영역)
  src/fonts/fonts.first.html  기본 본문 글꼴 블록 (스크립트 앞)         ← fontpick/embed.py 가 만듦
  src/fonts/fonts.rest.html   나머지 본문 글꼴 8종 블록 (스크립트 뒤)
  src/js/*.js              <script> 안 IIFE 본문 (파일 이름 순서대로)
  src/changelog.json       수정 기록 전체 (맨 위가 최신) — 최근 10개만 앱에 들어가고 전체는 CHANGELOG.md 로
  src/tail.html            맨 끝

만드는 것:
  yaksok-necut.html                       아티팩트 원본 (doctype·html·body 없음)
  CHANGELOG.md                            전체 수정 기록 (저장소에 올림)
  약속네컷.html                            단독 HTML (doctype 포함, 구글 글꼴 링크)
  win/약속네컷-윈도우/yaksok-necut.html     윈도우 실행기용 (글꼴 링크 → fonts/fonts.css)
  winapp/launcher/yaksok-necut.html       실행기에 내장되는 사본

사용:  python3 build.py            (전부)
       python3 build.py --check    (src → 합친 결과가 지금 yaksok-necut.html 과 같은지만 확인)"""
import os, re, sys, glob, shutil, base64
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
def rd(p): return open(p, encoding='utf-8').read()
def cat(pattern): return ''.join(rd(p) for p in sorted(glob.glob(os.path.join(SRC, pattern))))

CHANGELOG_KEEP = 10   # 앱 안에 넣는 최근 기록 수 — 나머지는 CHANGELOG.md (앱 정보 창에서 주소 안내)
def load_changelog():
    import json
    with open(f'{SRC}/changelog.json', encoding='utf-8') as f: return json.load(f)

def changelog_md(entries):
    out = ['# 약속네컷 수정 기록', '', f'맨 위가 최신입니다. 앱 정보 창(첫 화면 로고)에는 최근 {CHANGELOG_KEEP}개만 보이고, 전체 기록은 이 파일에 있습니다. 새 항목은 `src/changelog.json` 에 넣으면 `build.py` 가 앱과 이 파일에 함께 반영합니다.', '']
    for e in entries:
        out.append(f"## {e['v']} ({e['d']})"); out.append('')
        out += [f'- {t}' for t in e['items']]; out.append('')
    return '\n'.join(out)

def assemble():
    import json
    js = cat('js/*.js')
    log = load_changelog()
    assert '/*@@CHANGELOG@@*/[]' in js, '000-config.js 에 CHANGELOG 자리표시가 없음'
    js = js.replace('/*@@CHANGELOG@@*/[]', json.dumps(log[:CHANGELOG_KEEP], ensure_ascii=False, separators=(', ', ': ')), 1)
    app_v = re.search(r"const APP_VERSION = '([^']+)'", js).group(1); lv = re.search(r"const LAUNCHER_LATEST = '([^']+)'", js).group(1)
    # 맨 앞 버전 스탬프 — 실행기가 켤 때 첫 4KB만 읽어 새 버전 여부를 판단 (3MB 전체를 받지 않음)
    out = f'<!-- yaksok-necut app={app_v} launcher={lv} -->\n' + rd(f'{SRC}/head.html')
    out += '<style>\n' + cat('css/*.css') + '</style>\n\n'
    out += '<div id="app">\n' + cat('markup/*.html') + '</div>\n'
    out += rd(f'{SRC}/after-app.html')   # #app 밖 요소 (인쇄 영역)
    out += rd(f'{SRC}/fonts/fonts.first.html')
    out += '<script>\n(function () {\n  \'use strict\';\n' + js + '})();\n</script>\n'
    out += rd(f'{SRC}/fonts/fonts.rest.html')
    out += rd(f'{SRC}/tail.html')
    return out

def version_of(html):
    return re.search(r"const APP_VERSION = '([^']+)'", html).group(1)

def main():
    html = assemble()
    src_path = os.path.join(ROOT, 'yaksok-necut.html')
    # 작업 폴더(winapp/…)와 저장소 폴더(windows/…) 어느 쪽 배치에서도 돌아가게
    first = lambda *cands: next((c for c in cands if os.path.exists(os.path.join(ROOT, c))), cands[0])
    icon = first('winapp/icon/favicon-64.png', 'windows/icon/favicon-64.png'); fonts_dir = first('winapp/launcher/fonts', 'windows/launcher/fonts')
    fav = base64.b64encode(open(os.path.join(ROOT, icon), 'rb').read()).decode()
    src = html.replace('<title>약속네컷</title>\n', '<link rel="icon" type="image/png" href="data:image/png;base64,' + fav + '">\n<title>약속네컷</title>\n', 1)
    wrapped = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">\n'
               + src.replace('<title>약속네컷</title>\n', '<title>약속네컷</title>\n</head>\n<body>\n', 1) + '\n</body>\n</html>\n')
    if '--check' in sys.argv:   # 작업 폴더에선 yaksok-necut.html 과, 저장소에선 index.html 과 비교
        if os.path.exists(src_path): cur, built, what = rd(src_path), html, 'yaksok-necut.html'
        else: cur, built, what = rd(os.path.join(ROOT, 'index.html')), wrapped, 'index.html'
        print(f'same as {what}' if cur == built else f'DIFFERENT from {what} (built {len(built)} vs current {len(cur)})')
        return
    open(src_path, 'w', encoding='utf-8').write(html)
    open(os.path.join(ROOT, 'CHANGELOG.md'), 'w', encoding='utf-8').write(changelog_md(load_changelog()))   # 전체 수정 기록 (저장소용)
    open(os.path.join(ROOT, '약속네컷.html'), 'w', encoding='utf-8').write(wrapped)
    if os.path.exists(os.path.join(ROOT, 'index.html')): open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(wrapped)   # 저장소 배치: index.html 도 갱신
    local = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">', '<link rel="stylesheet" href="fonts/fonts.css">', wrapped, count=1)
    assert 'fonts/fonts.css' in local
    win_dir = os.path.join(ROOT, 'win/약속네컷-윈도우'); os.makedirs(os.path.join(win_dir, 'fonts'), exist_ok=True)
    open(os.path.join(win_dir, 'yaksok-necut.html'), 'w', encoding='utf-8').write(local)
    for f in os.listdir(os.path.join(ROOT, fonts_dir)):
        shutil.copy(os.path.join(ROOT, fonts_dir, f), os.path.join(win_dir, 'fonts', f))
    shutil.copy(os.path.join(win_dir, 'yaksok-necut.html'), os.path.join(ROOT, os.path.dirname(fonts_dir), 'yaksok-necut.html'))   # 실행기에 내장되는 사본
    print(f'built {version_of(html)} — {len(html) // 1024}KB (standalone {len(wrapped) // 1024}KB)')

if __name__ == '__main__':
    main()
