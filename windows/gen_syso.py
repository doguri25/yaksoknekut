# Windows 아이콘 리소스(.rsrc)를 담은 COFF 오브젝트(.syso)를 만든다 — Go 링커가 exe에 합쳐 준다 (akavel/rsrc와 같은 방식)
import struct, sys
ico_path, out_path = sys.argv[1], sys.argv[2]
ico = open(ico_path, 'rb').read()
reserved, typ, count = struct.unpack('<HHH', ico[:6])
assert reserved == 0 and typ == 1
entries = []
for i in range(count):
    w, h, cc, r, planes, bits, size, off = struct.unpack('<BBBBHHII', ico[6 + 16 * i: 6 + 16 * (i + 1)])
    entries.append((w, h, cc, r, planes, bits, size, ico[off: off + size]))
# 리소스 블롭: RT_ICON 1..N, RT_GROUP_ICON 1
grp = struct.pack('<HHH', 0, 1, count) + b''.join(struct.pack('<BBBBHHIH', e[0], e[1], e[2], e[3], e[4], e[5], e[6], i + 1) for i, e in enumerate(entries))
blobs = [e[7] for e in entries] + [grp]
RT_ICON, RT_GROUP_ICON, LANG = 3, 14, 0x0409
# 디렉터리 트리 크기 계산 (root → type → id → lang → data entry)
DIR, ENT, DATA = 16, 8, 16
n = count
# root(2) | icon-type dir(n) | group-type dir(1) | id dirs: n+1 each (1 lang entry) | data entries: n+1
off_root = 0
off_icon_dir = off_root + DIR + 2 * ENT
off_grp_dir = off_icon_dir + DIR + n * ENT
off_lang_dirs = off_grp_dir + DIR + 1 * ENT
off_data = off_lang_dirs + (n + 1) * (DIR + ENT)
off_blobs = off_data + (n + 1) * DATA
off_blobs = (off_blobs + 7) & ~7
def d(named, ids): return struct.pack('<IIHHHH', 0, 0, 0, 0, named, ids)
def e(id_, off, subdir): return struct.pack('<II', id_, off | (0x80000000 if subdir else 0))
out = bytearray()
out += d(0, 2) + e(RT_ICON, off_icon_dir, True) + e(RT_GROUP_ICON, off_grp_dir, True)
out += d(0, n) + b''.join(e(i + 1, off_lang_dirs + i * (DIR + ENT), True) for i in range(n))
out += d(0, 1) + e(1, off_lang_dirs + n * (DIR + ENT), True)
for i in range(n + 1):
    out += d(0, 1) + e(LANG, off_data + i * DATA, False)
assert len(out) == off_data
relocs = []
blob_off = off_blobs; data_entries = bytearray(); blob_bytes = bytearray()
for i, b in enumerate(blobs):
    relocs.append(off_data + i * DATA)   # OffsetToData 필드 위치 — 링커가 RVA로 고쳐 씀
    data_entries += struct.pack('<IIII', blob_off, len(b), 0, 0)
    blob_bytes += b; pad = (-len(b)) % 8; blob_bytes += b'\0' * pad; blob_off += len(b) + pad
out += data_entries
assert len(out) == off_data + (n + 1) * DATA
out += b'\0' * (off_blobs - len(out)); out += blob_bytes
sect = bytes(out)
# COFF 파일
hdr_size = 20 + 40
ptr_reloc = hdr_size + len(sect)
ptr_sym = ptr_reloc + 10 * len(relocs)
file_header = struct.pack('<HHIIIHH', 0x8664, 1, 0, ptr_sym, 1, 0, 0x0004)
sect_header = b'.rsrc\0\0\0' + struct.pack('<IIIIIIHHI', 0, 0, len(sect), hdr_size, ptr_reloc, 0, len(relocs), 0, 0x40000040)
reloc_bytes = b''.join(struct.pack('<IIH', r, 0, 0x0003) for r in relocs)   # IMAGE_REL_AMD64_ADDR32NB → 심볼 0(.rsrc)
symbols = b'.rsrc\0\0\0' + struct.pack('<IhHBB', 0, 1, 0, 3, 0)
strtab = struct.pack('<I', 4)
open(out_path, 'wb').write(file_header + sect_header + sect + reloc_bytes + symbols + strtab)
print('syso', len(sect), 'bytes rsrc,', len(relocs), 'relocs, icons', count)
