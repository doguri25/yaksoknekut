# Windows 리소스(.rsrc: 아이콘 + 버전 정보)를 담은 COFF 오브젝트(.syso)를 만든다 — Go 링커가 exe에 합쳐 준다 (akavel/rsrc와 같은 방식)
# 사용: python3 gen_syso.py icon/yaksok.ico launcher/rsrc_windows_amd64.syso 1.9.9
import struct, sys
ico_path, out_path = sys.argv[1], sys.argv[2]
ver = sys.argv[3] if len(sys.argv) > 3 else '0.0.0'
vparts = [int(x) for x in ver.split('.')] + [0, 0, 0, 0]
V1, V2, V3, V4 = vparts[:4]

# ---------- 아이콘 ----------
ico = open(ico_path, 'rb').read()
reserved, typ, count = struct.unpack('<HHH', ico[:6])
assert reserved == 0 and typ == 1
entries = []
for i in range(count):
    w, h, cc, r, planes, bits, size, off = struct.unpack('<BBBBHHII', ico[6 + 16 * i: 6 + 16 * (i + 1)])
    entries.append((w, h, cc, r, planes, bits, size, ico[off: off + size]))
grp = struct.pack('<HHH', 0, 1, count) + b''.join(struct.pack('<BBBBHHIH', e[0], e[1], e[2], e[3], e[4], e[5], e[6], i + 1) for i, e in enumerate(entries))

# ---------- 버전 정보 (VS_VERSIONINFO) — 스마트스크린 창·파일 속성에 "약속네컷 / 도구리(홍북초등학교) / 버전"이 보이게 ----------
def wsz(s): return s.encode('utf-16-le') + b'\0\0'
def pad4(b): return b + b'\0' * ((-len(b)) % 4)
def block(key, value=b'', wtype=1, children=b'', value_len=None):
    head = pad4(struct.pack('<HHH', 0, 0, wtype) + wsz(key))
    body = pad4(head + value) + children
    vl = len(value) // 2 if (wtype == 1 and value_len is None) else (value_len if value_len is not None else len(value))
    return struct.pack('<HHH', len(body), vl, wtype) + body[6:]
fixed = struct.pack('<IIIIIIIIIIIII', 0xFEEF04BD, 0x00010000, (V1 << 16) | V2, (V3 << 16) | V4, (V1 << 16) | V2, (V3 << 16) | V4, 0x3F, 0, 0x40004, 1, 0, 0, 0)
LANG_KO, CP_UNICODE = 0x0412, 0x04B0
strings = [
    ('CompanyName', '도구리 · 홍북초등학교'),
    ('FileDescription', '약속네컷 — 학교 네컷 사진 부스'),
    ('FileVersion', f'{V1}.{V2}.{V3}.{V4}'),
    ('InternalName', 'yaksok-necut'),
    ('LegalCopyright', 'ⓒ 2026 도구리(홍북초등학교) · CC BY-NC-ND 4.0'),
    ('OriginalFilename', '약속네컷.exe'),
    ('ProductName', '약속네컷'),
    ('ProductVersion', ver),
]
str_table = block(f'{LANG_KO:04X}{CP_UNICODE:04X}', children=b''.join(pad4(block(k, wsz(v))) for k, v in strings))
sfi = block('StringFileInfo', children=pad4(str_table))
var = block('Translation', struct.pack('<HH', LANG_KO, CP_UNICODE), wtype=0, value_len=4)
vfi = block('VarFileInfo', children=pad4(var))
version_blob = block('VS_VERSION_INFO', fixed, wtype=0, children=pad4(sfi) + pad4(vfi), value_len=len(fixed))

# ---------- 리소스 트리: type → id → lang → blob ----------
RT_ICON, RT_GROUP_ICON, RT_VERSION, LANG_EN = 3, 14, 16, 0x0409
tree = {RT_ICON: {i + 1: {LANG_EN: e[7]} for i, e in enumerate(entries)}, RT_GROUP_ICON: {1: {LANG_EN: grp}}, RT_VERSION: {1: {LANG_KO: version_blob}}}
DIR, ENT, DATA = 16, 8, 16
def d(named, ids): return struct.pack('<IIHHHH', 0, 0, 0, 0, named, ids)
def e(id_, off, subdir): return struct.pack('<II', id_, off | (0x80000000 if subdir else 0))
# 오프셋 미리 계산: root | type dirs | id dirs(lang) | data entries | blobs
types = sorted(tree)
off_type_dirs = DIR + len(types) * ENT
type_dir_off = {}; cur = off_type_dirs
for t in types:
    type_dir_off[t] = cur; cur += DIR + len(tree[t]) * ENT
lang_dir_off = {}
for t in types:
    for i in sorted(tree[t]):
        lang_dir_off[(t, i)] = cur; cur += DIR + len(tree[t][i]) * ENT
off_data = cur
blob_list = [(t, i, l) for t in types for i in sorted(tree[t]) for l in sorted(tree[t][i])]
data_off = {k: off_data + n * DATA for n, k in enumerate(blob_list)}
off_blobs = (off_data + len(blob_list) * DATA + 7) & ~7
out = bytearray()
out += d(0, len(types)) + b''.join(e(t, type_dir_off[t], True) for t in types)
for t in types:
    out += d(0, len(tree[t])) + b''.join(e(i, lang_dir_off[(t, i)], True) for i in sorted(tree[t]))
for t in types:
    for i in sorted(tree[t]):
        out += d(0, len(tree[t][i])) + b''.join(e(l, data_off[(t, i, l)], False) for l in sorted(tree[t][i]))
assert len(out) == off_data
relocs = []; blob_off = off_blobs; data_entries = bytearray(); blob_bytes = bytearray()
for k in blob_list:
    b = tree[k[0]][k[1]][k[2]]
    relocs.append(len(out) + len(data_entries))   # OffsetToData 필드 위치 — 링커가 RVA로 고쳐 씀
    data_entries += struct.pack('<IIII', blob_off, len(b), 0, 0)
    blob_bytes += b; pad = (-len(b)) % 8; blob_bytes += b'\0' * pad; blob_off += len(b) + pad
out += data_entries
out += b'\0' * (off_blobs - len(out)); out += blob_bytes
sect = bytes(out)
# ---------- COFF 파일 ----------
hdr_size = 20 + 40
ptr_reloc = hdr_size + len(sect)
ptr_sym = ptr_reloc + 10 * len(relocs)
file_header = struct.pack('<HHIIIHH', 0x8664, 1, 0, ptr_sym, 1, 0, 0x0004)
sect_header = b'.rsrc\0\0\0' + struct.pack('<IIIIIIHHI', 0, 0, len(sect), hdr_size, ptr_reloc, 0, len(relocs), 0, 0x40000040)
reloc_bytes = b''.join(struct.pack('<IIH', r, 0, 0x0003) for r in relocs)   # IMAGE_REL_AMD64_ADDR32NB → 심볼 0(.rsrc)
symbols = b'.rsrc\0\0\0' + struct.pack('<IhHBB', 0, 1, 0, 3, 0)
strtab = struct.pack('<I', 4)
open(out_path, 'wb').write(file_header + sect_header + sect + reloc_bytes + symbols + strtab)
print('syso', len(sect), 'bytes rsrc,', len(relocs), 'relocs, icons', count, 'version', ver)
