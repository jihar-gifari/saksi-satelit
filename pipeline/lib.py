"""Shared helpers for the Saksi Satelit pipeline. Python standard library only, so it runs anywhere."""
import csv, gzip, io, json, math, os, time, urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, 'cache')
STATE = os.path.join(HERE, 'state')
OUT = os.path.join(ROOT, 'web', 'public', 'data', 'karhutla')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 SaksiSatelit/1.0'

# Raster grid over Indonesia used for fast province lookup.
LON0, LON1, LAT0, LAT1, RES = 94.0, 141.5, -11.5, 6.5, 0.025
NX, NY = round((LON1 - LON0) / RES), round((LAT1 - LAT0) / RES)


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def get(url, timeout=120, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                return gzip.decompress(data) if r.headers.get('Content-Encoding') == 'gzip' else data
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 + 3 * i)


def get_chunked(url, chunk=8 * 1024 * 1024):
    """FIRMS cuts long transfers at 10 MiB, so big files come down in byte ranges."""
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        size = int(r.headers['Content-Length'])
    buf = io.BytesIO()
    for start in range(0, size, chunk):
        end = min(start + chunk, size) - 1
        for i in range(4):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': UA, 'Range': f'bytes={start}-{end}'})
                with urllib.request.urlopen(req, timeout=300) as r:
                    part = r.read()
                if len(part) != end - start + 1:
                    raise IOError('short read')
                buf.write(part)
                break
            except Exception:
                if i == 3:
                    raise
                time.sleep(3 + 3 * i)
    data = buf.getvalue()
    if len(data) != size:
        raise IOError(f'{url}: expected {size} bytes, got {len(data)}')
    return data


def read_csv_bytes(data):
    return csv.DictReader(io.StringIO(data.decode('utf-8')))


def write_json(name, obj):
    os.makedirs(OUT, exist_ok=True)
    obj = {'generated_at': now_iso(), **obj}
    path = os.path.join(OUT, name)
    with open(path + '.tmp', 'w') as f:
        json.dump(obj, f, separators=(',', ':'), ensure_ascii=False)
    os.replace(path + '.tmp', path)
    return path


def load_json(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + '.tmp', 'w') as f:
        json.dump(obj, f, separators=(',', ':'))
    os.replace(path + '.tmp', path)


# ---------- geometry ----------

def rings_of(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    return [ring for poly in polys for ring in poly]  # outer rings and holes; even-odd fill handles holes


def simplify(ring, eps):
    """Douglas-Peucker for a closed ring (split at the farthest point so start == end works)."""
    if len(ring) < 5:
        return ring
    k = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)

    def dp(pts):
        if len(pts) < 3:
            return pts
        keep = [False] * len(pts)
        keep[0] = keep[-1] = True
        stack = [(0, len(pts) - 1)]
        while stack:
            a, b = stack.pop()
            ax, ay = pts[a]; bx, by = pts[b]
            dx, dy = bx - ax, by - ay
            L = math.hypot(dx, dy)
            dmax, idx = -1.0, -1
            for i in range(a + 1, b):
                px, py = pts[i]
                d = abs(dy * px - dx * py + bx * ay - by * ax) / L if L > 0 else math.hypot(px - ax, py - ay)
                if d > dmax:
                    dmax, idx = d, i
            if dmax > eps:
                keep[idx] = True
                stack += [(a, idx), (idx, b)]
        return [p for p, kk in zip(pts, keep) if kk]

    return dp(ring[:k + 1])[:-1] + dp(ring[k:])


def ring_area_deg(ring):
    return abs(sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1))) / 2


def rasterize(provinces):
    """Even-odd scanline fill of every province into a NX*NY grid of province index + 1 (0 = not Indonesia)."""
    grid = bytearray(NX * NY)
    for idx, prov in enumerate(provinces, start=1):
        rows = {}
        for ring in prov['rings_full']:
            n = len(ring)
            for i in range(n - 1):
                x1, y1 = ring[i]; x2, y2 = ring[i + 1]
                if y1 == y2:
                    continue
                lo, hi = (y1, y2) if y1 < y2 else (y2, y1)
                r0 = max(0, math.ceil((LAT1 - hi) / RES - 0.5))
                r1 = min(NY - 1, math.floor((LAT1 - lo) / RES - 0.5))
                for r in range(r0, r1 + 1):
                    yc = LAT1 - (r + 0.5) * RES
                    if (y1 > yc) != (y2 > yc):
                        rows.setdefault(r, []).append(x1 + (yc - y1) * (x2 - x1) / (y2 - y1))
        for r, xs in rows.items():
            xs.sort()
            base = r * NX
            for j in range(0, len(xs) - 1, 2):
                c0 = max(0, math.ceil((xs[j] - LON0) / RES - 0.5))
                c1 = min(NX - 1, math.floor((xs[j + 1] - LON0) / RES - 0.5))
                for c in range(c0, c1 + 1):
                    grid[base + c] = idx
    return grid


def lookup(grid, lon, lat):
    """Province index (1-based) for a point, looking at the 8 neighbours for coastal points; 0 if outside."""
    c = int((lon - LON0) / RES); r = int((LAT1 - lat) / RES)
    if not (0 <= c < NX and 0 <= r < NY):
        return 0
    v = grid[r * NX + c]
    if v:
        return v
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            rr, cc = r + dr, c + dc
            if 0 <= rr < NY and 0 <= cc < NX and grid[rr * NX + cc]:
                return grid[rr * NX + cc]
    return 0


def cell_area_km2(lat, deg):
    return (111.32 * deg) * (111.32 * deg * math.cos(math.radians(lat)))
