#!/usr/bin/env python3
# 본문 글꼴 9종을 KS X 1001 2,350자 기준으로 잘라 woff2 → base64 @font-face CSS 블록 생성
# (앱 파일 안에 넣어 배포 — 글꼴 파일을 따로 재배포하지 않고 '임베딩'만 함)
import base64, subprocess, os
NM = '/home/claude/fontpick/node_modules/'; GH = '/home/claude/fontpick/gh/'; OUT = '/home/claude/fontpick/embed'; os.makedirs(OUT, exist_ok=True)
FONTS = [
  # id, CSS family, [(file, weight)], 표시 이름, 라이선스
  ('maple', 'Maplestory', [(NM+'@kfonts/nexon-maplestory-otf/Maplestory_OTF_Light.woff2', 400), (NM+'@kfonts/nexon-maplestory-otf/Maplestory_OTF_Bold.woff2', 700)], '메이플스토리체', '넥슨'),
  ('lv2', 'NEXON Lv2 Gothic', [(NM+'@kfonts/nexon-lv2-gothic/NEXON_Lv2_Gothic.woff2', 400), (NM+'@kfonts/nexon-lv2-gothic/NEXON_Lv2_Gothic_Bold.woff2', 700)], '넥슨 Lv.2 고딕', '넥슨'),
  ('nsr', 'NanumSquareRound', [(NM+'@kfonts/nanum-square-round/NanumSquareRoundR.woff2', 400), (NM+'@kfonts/nanum-square-round/NanumSquareRoundB.woff2', 700)], '나눔스퀘어라운드', 'OFL'),
  ('line', 'LINE Seed KR', [(NM+'@kfonts/line-seed-sans-kr/LINESeedKR-Rg.woff2', 400), (NM+'@kfonts/line-seed-sans-kr/LINESeedKR-Bd.woff2', 700)], 'LINE Seed KR', 'OFL'),
  ('hakb', 'Hakgyoansim Bareondotum', [(NM+'@kfonts/hakgyoansim-bareondotum/HakgyoansimBareondotumR.woff2', 400), (NM+'@kfonts/hakgyoansim-bareondotum/HakgyoansimBareondotumB.woff2', 700)], '학교안심 바른돋움', 'OFL'),
  ('hakm', 'Hakgyoansim Monggeulmonggeul', [(NM+'@kfonts/hakgyoansim-monggeulmonggeul/HakgyoansimMonggeulmonggeulR.woff2', 400)], '학교안심 몽글몽글', 'OFL'),
  ('cookie', 'CookieRun', [(GH+'CookieRun-Regular.woff2', 400), (GH+'CookieRun-Bold.woff2', 700)], '쿠키런', '데브시스터즈'),
  ('gw', 'GangwonEdu Modu', [(GH+'GangwonEduModu-Light.woff2', 400), (GH+'GangwonEduModu-Bold.woff2', 700)], '강원교육모두체', '강원도교육청'),
  ('tm', 'TmoneyRoundWind', [(GH+'TmoneyRoundWindRegular.woff2', 400), (GH+'TmoneyRoundWindExtraBold.woff2', 700)], '티머니 둥근바람', '티머니'),
]
def ks():
    out = []
    for c in range(0xAC00, 0xD7A4):
        try: b = chr(c).encode('euc_kr')
        except Exception: continue
        if 0xB0 <= b[0] <= 0xC8: out.append(chr(c))
    return ''.join(out)
KS = ks(); assert len(KS) == 2350
TEXT = KS + ''.join(chr(c) for c in range(0x20, 0x7f)) + ''.join(chr(c) for c in range(0x3131, 0x3164)) + '·×−›…“”‘’ⓒ→←↑↓★☆♥♡✓○●◎□■▸▾▶◀※~±≤≥—–°℃Ⅱ' + ''.join(chr(c) for c in range(0xA0, 0x100))
METRIC = 'ascent-override: 80%; descent-override: 20%; line-gap-override: 25%;'   # 모든 본문 글꼴의 줄 높이·기준선을 같게 (주아체 점 글꼴과 동일)
DOT = None   # 기존 앱의 가운뎃점 보충 글꼴 data URI (쿠키런·티머니에 · 가 없음) — main에서 채움
def subset(src, out):
    subprocess.run(['pyftsubset', src, '--text=' + TEXT, '--flavor=woff2', '--output-file=' + out, '--no-hinting', '--desubroutinize', '--layout-features=', '--name-IDs=1,2,4,6', '--notdef-outline'], check=True, capture_output=True)
    return os.path.getsize(out)
def build(dot_uri):
    # 글꼴은 CSS가 아니라 <script type="text/plain"> 글자 덩어리로 넣고, 앱이 필요한 글꼴만 골라 <style>로 옮긴다
    # (2.6MB를 CSS로 두면 켤 때 CSS 파서가 전부 읽어 첫 화면이 0.3~0.5초 늦어짐. 기본 글꼴 블록은 스크립트 앞, 나머지는 뒤에 두어 첫 화면이 먼저 뜨게)
    first = []; rest = []; total = 0; meta = []
    for fid, fam, files, name, lic in FONTS:
        css = []
        for f, w in files:
            o = f'{OUT}/{fid}-{w}.woff2'; sz = subset(f, o); total += sz
            b = base64.b64encode(open(o, 'rb').read()).decode()
            css.append(f'@font-face {{ font-family: "{fam}"; font-weight: {w}; font-display: block; {METRIC} src: url(data:font/woff2;base64,{b}) format("woff2"); }}')
        if fid in ('cookie', 'tm'):   # 가운뎃점 없음 → 점 글꼴로 보충 (굵기마다 따로 — 범위(400 700)로 쓰면 크롬이 본 글꼴 대신 이 얼굴만 골라 버림)
            for w in (400, 700): css.append(f'@font-face {{ font-family: "{fam}"; font-weight: {w}; src: url({dot_uri}) format("woff2"); unicode-range: U+00B7; {METRIC} }}')
        blk = f'<script type="text/plain" data-font="{fam}">{" ".join(css)}</script>'
        (first if fid == 'maple' else rest).append(blk)
        meta.append((fid, fam, name, lic, [w for _, w in files]))
    first_html = '<!-- @@FONTS-FIRST@@ 기본 본문 글꼴(메이플스토리체) — 스크립트가 켜질 때 바로 <style>로 옮김. fontpick/embed.py 로 생성 -->\n' + '\n'.join(first) + '\n<!-- @@/FONTS-FIRST@@ -->'
    rest_html = '<!-- @@FONTS-REST@@ 나머지 본문 글꼴 8종 (KS X 1001 2,350자) — 교사 메뉴를 열거나 그 글꼴을 고를 때 <style>로 옮김 -->\n' + '\n'.join(rest) + '\n<!-- @@/FONTS-REST@@ -->'
    return first_html, rest_html, total, meta
if __name__ == '__main__':
    import re
    html = open('/home/claude/src/css/000-base.css', encoding='utf-8').read()   # 가운뎃점 점 글꼴(Jua)의 data URI 를 여기서 가져옴
    m = re.search(r'@font-face \{ font-family: "Jua"; src: url\((data:font/woff2;base64,[A-Za-z0-9+/=]+)\)', html)
    first_html, rest_html, total, meta = build(m.group(1))
    for d in (OUT, '/home/claude/src/fonts'):
        open(f'{d}/fonts.first.html', 'w', encoding='utf-8').write(first_html + '\n')
        open(f'{d}/fonts.rest.html', 'w', encoding='utf-8').write(rest_html + '\n')
    print('woff2 total KB', total // 1024, 'first KB', len(first_html) // 1024, 'rest KB', len(rest_html) // 1024)
    for x in meta: print(x)
