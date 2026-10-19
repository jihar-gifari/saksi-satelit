"""Saksi Satelit pipeline, case karhutla. Run: python3 pipeline/run.py
Optional env: FIRMS_MAP_KEY (backfills 2026 Suomi-NPP history from 1 Jan).
Writes the files described in docs/DATA_CONTRACT.md to web/public/data/karhutla/."""
import collections, json, math, os, statistics, sys, time
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import (CACHE, STATE, LON0, LAT1, RES, NX, NY, get, get_chunked, read_csv_bytes, write_json, load_json,
                 save_json, rings_of, simplify, ring_area_deg, rasterize, lookup, cell_area_km2, now_iso)

HIST_YEARS = list(range(2012, 2026))
RECUR_YEARS = (2015, 2019, 2023)
PAPS_BOX = (137.5, -9.2, 140.95, -5.5)
SNPP_END = '2026-11-02'
FIRMS_LIVE = {0: 'suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv',
              1: 'noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv',
              2: 'noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_7d.csv'}
SAT_NAME = {0: 'Suomi-NPP', 1: 'NOAA-20', 2: 'NOAA-21'}
CONF = {'nominal': 1, 'high': 2, 'n': 1, 'h': 2}
SIPONGI = 'https://opsroom.sipongidata.my.id/api'

# ---------- provinces (38) ----------
ADM1 = {  # geoBoundaries shapeName -> (iso, name_id, sipongi name, region)
    'Aceh': ('ID-AC', 'Aceh', 'Aceh', 'SUM'), 'Bali': ('ID-BA', 'Bali', 'Bali', 'OTH'),
    'Bangka-Belitung Islands': ('ID-BB', 'Kepulauan Bangka Belitung', 'Bangka Belitung', 'SUM'),
    'Banten': ('ID-BT', 'Banten', 'Banten', 'OTH'), 'Bengkulu': ('ID-BE', 'Bengkulu', 'Bengkulu', 'SUM'),
    'Central Java': ('ID-JT', 'Jawa Tengah', 'Jawa Tengah', 'OTH'),
    'Central Kalimantan': ('ID-KT', 'Kalimantan Tengah', 'Kalimantan Tengah', 'KAL'),
    'Central Sulawesi': ('ID-ST', 'Sulawesi Tengah', 'Sulawesi Tengah', 'OTH'),
    'East Java': ('ID-JI', 'Jawa Timur', 'Jawa Timur', 'OTH'),
    'East Kalimantan': ('ID-KI', 'Kalimantan Timur', 'Kalimantan Timur', 'KAL'),
    'East Nusa Tenggara': ('ID-NT', 'Nusa Tenggara Timur', 'Nusa Tenggara Timur', 'OTH'),
    'Gorontalo': ('ID-GO', 'Gorontalo', 'Gorontalo', 'OTH'),
    'Jakarta Special Capital Region': ('ID-JK', 'DKI Jakarta', 'DKI Jakarta', 'OTH'),
    'Jambi': ('ID-JA', 'Jambi', 'Jambi', 'SUM'), 'Lampung': ('ID-LA', 'Lampung', 'Lampung', 'SUM'),
    'Maluku': ('ID-MA', 'Maluku', 'Maluku', 'OTH'),
    'North Kalimantan': ('ID-KU', 'Kalimantan Utara', 'Kalimantan Utara', 'KAL'),
    'North Maluku': ('ID-MU', 'Maluku Utara', 'Maluku Utara', 'OTH'),
    'North Sulawesi': ('ID-SA', 'Sulawesi Utara', 'Sulawesi Utara', 'OTH'),
    'North Sumatra': ('ID-SU', 'Sumatera Utara', 'Sumatera Utara', 'SUM'),
    'Riau': ('ID-RI', 'Riau', 'Riau', 'SUM'), 'Riau Islands': ('ID-KR', 'Kepulauan Riau', 'Kepulauan Riau', 'SUM'),
    'South Kalimantan': ('ID-KS', 'Kalimantan Selatan', 'Kalimantan Selatan', 'KAL'),
    'South Sulawesi': ('ID-SN', 'Sulawesi Selatan', 'Sulawesi Selatan', 'OTH'),
    'South Sumatra': ('ID-SS', 'Sumatera Selatan', 'Sumatera Selatan', 'SUM'),
    'Southeast Sulawesi': ('ID-SG', 'Sulawesi Tenggara', 'Sulawesi Tenggara', 'OTH'),
    'Special Region of Yogyakarta': ('ID-YO', 'DI Yogyakarta', 'Yogyakarta', 'OTH'),
    'West Java': ('ID-JB', 'Jawa Barat', 'Jawa Barat', 'OTH'),
    'West Kalimantan': ('ID-KB', 'Kalimantan Barat', 'Kalimantan Barat', 'KAL'),
    'West Nusa Tenggara': ('ID-NB', 'Nusa Tenggara Barat', 'Nusa Tenggara Barat', 'OTH'),
    'West Sulawesi': ('ID-SR', 'Sulawesi Barat', 'Sulawesi Barat', 'OTH'),
    'West Sumatra': ('ID-SB', 'Sumatera Barat', 'Sumatera Barat', 'SUM'),
}
PAPUA_2022 = {  # provinces created in 2022, built from their regencies (geoBoundaries ADM2)
    ('ID-PS', 'South Papua', 'Papua Selatan'): ['Merauke', 'Boven Digoel', 'Mappi', 'Asmat'],
    ('ID-PT', 'Central Papua', 'Papua Tengah'): ['Nabire', 'Paniai', 'Mimika', 'Puncak Jaya', 'Puncak', 'Dogiyai', 'Intan Jaya', 'Deiyai'],
    ('ID-PE', 'Highland Papua', 'Papua Pegunungan'): ['Jayawijaya', 'Pegunungan Bintang', 'Yahukimo', 'Tolikara', 'Mamberamo Tengah', 'Yalimo', 'Lanny Jaya', 'Nduga'],
    ('ID-PA', 'Papua', 'Papua'): ['Jayapura', 'Kota Jayapura', 'Keerom', 'Sarmi', 'Mamberamo Raya', 'Biak Numfor', 'Kepulauan Yapen', 'Supiori', 'Waropen'],
    ('ID-PD', 'Southwest Papua', 'Papua Barat Daya'): ['Sorong', 'Kota Sorong', 'Raja Ampat', 'Sorong Selatan', 'Maybrat', 'Tambrauw'],
    ('ID-PB', 'West Papua', 'Papua Barat'): ['Manokwari', 'Manokwari Selatan', 'Pegunungan Arfak', 'Teluk Bintuni', 'Teluk Wondama', 'Fakfak', 'Kaimana'],
}


GEOB = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IDN/{0}/geoBoundaries-IDN-{0}_simplified.geojson'


def boundary(level):
    path = os.path.join(CACHE, f'idn_{level.lower()}.geojson')
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        open(path, 'wb').write(get(GEOB.format(level), timeout=300))
    return json.load(open(path))


def build_provinces():
    adm1 = boundary('ADM1')
    adm2 = boundary('ADM2')
    provs = []
    for f in adm1['features']:
        n = f['properties']['shapeName']
        if n in ('Papua', 'West Papua'):
            continue
        iso, nid, sip, reg = ADM1[n]
        provs.append({'id': iso, 'name_en': n.replace(' Special Capital Region', '').replace('Special Region of ', ''),
                      'name_id': nid, 'sipongi': sip, 'region': reg, 'rings_full': rings_of(f['geometry'])})
    by_name = {f['properties']['shapeName']: f for f in adm2['features']}
    for (iso, en, nid), regs in PAPUA_2022.items():
        rings = []
        for r in regs:
            rings += rings_of(by_name[r]['geometry'])
        provs.append({'id': iso, 'name_en': en, 'name_id': nid, 'sipongi': nid, 'region': 'PAP', 'rings_full': rings})
    return provs


def province_grid(provs):
    path = os.path.join(CACHE, 'province_grid.bin')
    key = os.path.join(CACHE, 'province_grid.key')
    sig = '|'.join(p['id'] for p in provs) + f'|{RES}'
    if os.path.exists(path) and open(key).read() == sig:
        return bytearray(open(path, 'rb').read())
    grid = rasterize(provs)
    open(path, 'wb').write(grid)
    open(key, 'w').write(sig)
    return grid


def regions_for(prov, lon, lat):
    regs = ['ID', prov['region']]
    if PAPS_BOX[0] <= lon <= PAPS_BOX[2] and PAPS_BOX[1] <= lat <= PAPS_BOX[3]:
        regs.append('PAPS')
    return regs


# ---------- history: Suomi-NPP country files 2012-2025 ----------

def history(provs, grid):
    """Per-year daily counts (regions and provinces), 0.01-degree recurrence cells and 0.1-degree display cells."""
    out_path = os.path.join(CACHE, 'history_agg.json')
    agg = load_json(out_path)
    if agg and agg.get('years') == HIST_YEARS and agg.get('provs') == [p['id'] for p in provs]:
        return agg
    daily = {}  # year -> key -> [366]
    recur_cells = set()
    display = collections.defaultdict(int)
    for y in HIST_YEARS:
        raw = os.path.join(CACHE, 'raw', f'snpp_{y}_Indonesia.csv')
        if not os.path.exists(raw):
            os.makedirs(os.path.dirname(raw), exist_ok=True)
            print('downloading', y, flush=True)
            data = get_chunked(f'https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/{y}/viirs-snpp_{y}_Indonesia.csv')
            open(raw, 'wb').write(data)
        d = collections.defaultdict(lambda: [0] * 366)
        bit = {2015: 1, 2019: 2, 2023: 4}.get(y)
        for r in read_csv_bytes(open(raw, 'rb').read()):
            if r.get('type', '0') != '0' or r['confidence'] not in CONF:
                continue
            lon, lat = float(r['longitude']), float(r['latitude'])
            pi = lookup(grid, lon, lat)
            if not pi:
                continue
            prov = provs[pi - 1]
            doy = date.fromisoformat(r['acq_date']).timetuple().tm_yday - 1
            for k in regions_for(prov, lon, lat) + [prov['id']]:
                d[k][doy] += 1
            if bit:
                recur_cells.add((round(lon * 100), round(lat * 100)))
                display[(math.floor(lon * 10), math.floor(lat * 10))] |= bit
        daily[str(y)] = dict(d)
        print('history', y, sum(d['ID']), flush=True)
    agg = {'years': HIST_YEARS, 'provs': [p['id'] for p in provs], 'daily': daily,
           'recur_cells': sorted(recur_cells), 'display': [[x, y, m] for (x, y), m in display.items()]}
    save_json(out_path, agg)
    return agg


# ---------- live: FIRMS 7-day files ----------

def live(provs, grid):
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M')
    pts = []
    for sat, path in FIRMS_LIVE.items():
        data = get(f'https://firms.modaps.eosdis.nasa.gov/data/active_fire/{path}', timeout=180)
        os.makedirs(os.path.join(CACHE, 'raw', 'live'), exist_ok=True)
        open(os.path.join(CACHE, 'raw', 'live', f'{stamp}_{sat}.csv'), 'wb').write(data)
        for r in read_csv_bytes(data):
            c = CONF.get(r['confidence'])
            if not c:
                continue
            lon, lat = float(r['longitude']), float(r['latitude'])
            pi = lookup(grid, lon, lat)
            if not pi:
                continue
            t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=timezone.utc)
            pts.append((lon, lat, float(r['frp'] or 0), sat, c, t, pi - 1))
    return pts


def complete_days(pts):
    """Dates fully inside the file's window: the newest date is partial, and the oldest counts only if its
    morning passes are present. Days with a missing pass (satellite outages) stay in, flagged by pass_coverage()."""
    first = collections.defaultdict(lambda: 99)
    for lon, lat, frp, sat, c, t, pi in pts:
        first[t.date()] = min(first[t.date()], t.hour)
    ds = sorted(first)
    return [d for d in ds[:-1] if d != ds[0] or first[d] <= 4]


def pass_coverage(pts, days):
    """For each day and satellite: was a daytime (about 03-08 UTC) and a night-time (about 15-21 UTC) pass received?"""
    seen = collections.defaultdict(set)
    for lon, lat, frp, sat, c, t, pi in pts:
        seen[(t.date(), sat)].add('day' if t.hour < 12 else 'night')
    return {d.isoformat(): {str(s): sorted(seen[(d, s)]) for s in (0, 1, 2)} for d in days}


# ---------- 2026 Suomi-NPP daily state ----------

def update_2026_state(provs, grid, pts, days):
    path = os.path.join(STATE, 'snpp_daily_2026.json')
    st = load_json(path, {'days': {}})
    for d in days:
        counts = collections.Counter()
        for lon, lat, frp, sat, c, t, pi in pts:
            if sat == 0 and t.date() == d:
                for k in regions_for(provs[pi], lon, lat) + [provs[pi]['id']]:
                    counts[k] += 1
        old = st['days'].get(d.isoformat())
        if not old or old['counts'].get('ID', 0) <= counts.get('ID', 0):  # late granules only ever add detections
            st['days'][d.isoformat()] = {'source': 'FIRMS 7-day NRT', 'counts': dict(counts)}
    key = os.environ.get('FIRMS_MAP_KEY', '').strip()
    if key:
        backfill(st, provs, grid, key, min(days))
    st['updated_at'] = now_iso()
    save_json(path, st)
    return st


def backfill(st, provs, grid, key, until):
    """Fill 1 Jan 2026 .. until-1 from the FIRMS area API (5-day chunks), Suomi-NPP only."""
    d = date(2026, 1, 1)
    while d < until:
        n = min(5, (until - d).days)
        if all((d + timedelta(i)).isoformat() in st['days'] for i in range(n)):
            d += timedelta(n); continue
        # standard processing (SP) runs to 30 Jun 2026; near-real-time (NRT) from 1 Jul 2026 (FIRMS data_availability)
        product = 'VIIRS_SNPP_SP' if d + timedelta(n - 1) <= date(2026, 6, 30) else 'VIIRS_SNPP_NRT'
        if product == 'VIIRS_SNPP_SP' or d >= date(2026, 7, 1):
            n = n
        else:  # a chunk crossing 30 June: stop it there so each chunk uses one product
            n = (date(2026, 7, 1) - d).days
            product = 'VIIRS_SNPP_SP'
        url = f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{product}/94,-11.5,141.5,6.5/{n}/{d.isoformat()}'
        raw = get(url, timeout=180)
        if not raw.startswith(b'latitude'):
            raise RuntimeError(f'FIRMS area API: unexpected response for {product} {d}: {raw[:120]!r}')
        rows = list(read_csv_bytes(raw))
        counts = {(d + timedelta(i)).isoformat(): collections.Counter() for i in range(n)}
        for r in rows:
            if r['confidence'] not in CONF or r['acq_date'] not in counts:
                continue
            lon, lat = float(r['longitude']), float(r['latitude'])
            pi = lookup(grid, lon, lat)
            if pi:
                for k in regions_for(provs[pi - 1], lon, lat) + [provs[pi - 1]['id']]:
                    counts[r['acq_date']][k] += 1
        for ds, c in counts.items():
            st['days'][ds] = {'source': f'FIRMS area API {product}', 'counts': dict(c)}
        time.sleep(1)
        print('backfilled', d, n, len(rows), flush=True)
        d += timedelta(n)


# ---------- analyses ----------

def window_counts(daily_year, key, start_doy, end_doy):
    arr = daily_year.get(key)
    return sum(arr[start_doy:end_doy + 1]) if arr else 0


def week_stats(agg, st, key, start, end):
    s, e = start.timetuple().tm_yday - 1, end.timetuple().tm_yday - 1
    by_year = {}
    for y in HIST_YEARS:
        # same calendar dates in each year (day-of-year shifts by one after Feb in leap years)
        ys, ye = date(y, start.month, start.day).timetuple().tm_yday - 1, date(y, end.month, end.day).timetuple().tm_yday - 1
        by_year[str(y)] = window_counts(agg['daily'][str(y)], key, ys, ye)
    cur = 0
    for i in range((end - start).days + 1):
        dd = (start + timedelta(i)).isoformat()
        cur += st['days'].get(dd, {}).get('counts', {}).get(key, 0)
    by_year['2026'] = cur
    ranked = sorted(by_year, key=lambda y: -by_year[y])
    hist = [by_year[str(y)] for y in HIST_YEARS]
    return {'count': cur, 'rank': ranked.index('2026') + 1, 'of': len(ranked), 'since': HIST_YEARS[0],
            'higher': [int(y) for y in ranked[:ranked.index('2026')]], 'median': statistics.median(hist), 'by_year': by_year}


def load_env():
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(path):
        for line in open(path):
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ.setdefault(k, v.strip().strip('"'))


def main():
    load_env()
    provs = build_provinces()
    grid = province_grid(provs)
    land_km2 = 0.0
    for r in range(NY):
        lat = LAT1 - (r + 0.5) * RES
        a = cell_area_km2(lat, RES)
        land_km2 += a * sum(1 for c in range(NX) if grid[r * NX + c])
    agg = history(provs, grid)
    pts = live(provs, grid)
    days = complete_days(pts)
    st = update_2026_state(provs, grid, pts, days)
    start, end = days[-7], days[-1]
    sources = [
        {'id': 'firms', 'name': 'NASA FIRMS, VIIRS 375 m active fires (Suomi-NPP, NOAA-20, NOAA-21)', 'licence': 'NASA open data. We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA ESDIS.', 'url': 'https://firms.modaps.eosdis.nasa.gov/', 'retrieved_at': now_iso()},
        {'id': 'sipongi', 'name': 'SiPongi, Kementerian Kehutanan', 'licence': 'Sumber: SIPONGI KEMENHUT', 'url': 'https://sipongi.gakkum.kehutanan.go.id/', 'retrieved_at': now_iso()},
        {'id': 'geoboundaries', 'name': 'geoBoundaries IDN ADM1 and ADM2 (2022 Papua provinces rebuilt from regencies)', 'licence': 'ODbL, from OpenStreetMap', 'url': 'https://www.geoboundaries.org/', 'retrieved_at': now_iso()},
    ]

    # this week, by region and by province (Suomi-NPP: the only sensor with 2012-2026 history)
    regions = {k: week_stats(agg, st, k, start, end) for k in ('ID', 'KAL', 'SUM', 'PAP', 'PAPS')}
    prov_week = {p['id']: week_stats(agg, st, p['id'], start, end) for p in provs}

    # recurrence: share of this week's Suomi-NPP detections in 0.01-degree cells that burned in 2015/2019/2023
    burned = set(map(tuple, agg['recur_cells']))
    wk = [(lon, lat) for lon, lat, frp, sat, c, t, pi in pts if sat == 0 and start <= t.date() <= end]
    inside = sum(1 for lon, lat in wk if (round(lon * 100), round(lat * 100)) in burned)
    burned_km2 = sum(cell_area_km2(y / 100, 0.01) for x, y in burned)
    recurrence = {'years': list(RECUR_YEARS), 'cell_deg': 0.01, 'share_detections': round(inside / len(wk), 4),
                  'share_land': round(burned_km2 / land_km2, 4), 'n_detections': len(wk), 'land_km2': round(land_km2),
                  'burned_before_km2': round(burned_km2), 'window': [start.isoformat(), end.isoformat()], 'sensor': 'Suomi-NPP'}

    # last 24 hours and the 48-hour map layer
    tmax = max(t for *_, t, _ in pts)
    last24 = [p for p in pts if (tmax - p[5]).total_seconds() <= 86400]
    by_region24 = collections.Counter()
    for lon, lat, frp, sat, c, t, pi in last24:
        for k in regions_for(provs[pi], lon, lat):
            by_region24[k] += 1
    hot = [[round(lon, 3), round(lat, 3), round(frp, 1), sat, c, round((tmax - t).total_seconds() / 1800) / 2]
           for lon, lat, frp, sat, c, t, pi in pts if (tmax - t).total_seconds() <= 172800]
    hot.sort(key=lambda p: -p[5])
    write_json('hotspots.json', {'start': (tmax - timedelta(hours=48)).isoformat().replace('+00:00', 'Z'),
                                 'end': tmax.isoformat().replace('+00:00', 'Z'), 'fields': ['lon', 'lat', 'frp', 'sat', 'conf', 'h'],
                                 'sat_names': SAT_NAME, 'points': hot, 'source': 'firms'})

    # 7-day density cells
    cells = collections.defaultdict(lambda: [0, 0.0])
    for lon, lat, frp, sat, c, t, pi in pts:
        if start <= t.date() <= end:
            k = (round(lon / 0.05) * 0.05, round(lat / 0.05) * 0.05)
            cells[k][0] += 1; cells[k][1] += frp
    write_json('cells7d.json', {'start': start.isoformat(), 'end': end.isoformat(), 'cell_deg': 0.05, 'satellites': [0, 1, 2],
                                'cells': [[round(x, 2), round(y, 2), n, round(f)] for (x, y), (n, f) in cells.items()], 'source': 'firms'})

    # season curves
    season = {'sensor': 'Suomi-NPP', 'regions': ['ID', 'KAL', 'SUM', 'PAP', 'PAPS'], 'years': {}}
    for y in HIST_YEARS:
        season['years'][str(y)] = {k: agg['daily'][str(y)].get(k, [0] * 366) for k in season['regions']}
    cur = {k: [None] * 366 for k in season['regions']}
    for ds, v in st['days'].items():
        doy = date.fromisoformat(ds).timetuple().tm_yday - 1
        for k in season['regions']:
            cur[k][doy] = v['counts'].get(k, 0)
    season['years']['2026'] = cur
    season['coverage_2026'] = sorted(st['days'])[:1] + sorted(st['days'])[-1:]
    season['note'] = 'Nominal and high confidence, vegetation fires. 2012-2025: FIRMS standard archive. 2026: near-real-time.'
    write_json('season.json', season)

    # recurrence display cells (0.1 degree), with this week's cells as bit 8
    disp = {(x, y): m for x, y, m in agg['display']}
    for lon, lat in wk:
        k = (math.floor(lon * 10), math.floor(lat * 10))
        disp[k] = disp.get(k, 0) | 8
    write_json('recurrence.json', {'cell_deg': 0.1, 'bits': {'2015': 1, '2019': 2, '2023': 4, '2026w': 8},
                                   'cells': [[round(x / 10 + 0.05, 2), round(y / 10 + 0.05, 2), m] for (x, y), m in disp.items()],
                                   'window_2026w': [start.isoformat(), end.isoformat()], 'source': 'firms'})

    # satellites and confidence (why counts disagree)
    sday = [d.isoformat() for d in days[-7:]]
    sc = {str(s): {'1': [0] * 7, '2': [0] * 7} for s in (0, 1, 2)}
    for lon, lat, frp, sat, c, t, pi in pts:
        ds = t.date().isoformat()
        if ds in sday:
            sc[str(sat)][str(c)][sday.index(ds)] += 1
    ex = sday[-1]
    tot_all3 = sum(sum(v) for s in sc.values() for v in s.values())
    snpp = sum(sum(v) for v in sc['0'].values())
    n20 = sum(sum(v) for v in sc['1'].values())
    write_json('satellites.json', {'days': sday, 'counts': sc, 'example_day': ex,
                                   'example': {'n20_high': sc['1']['2'][-1], 'all': sum(sc[s][c][-1] for s in sc for c in sc[s])},
                                   'snpp_share_all3': round(snpp / tot_all3, 3), 'snpp_share_sipongi_viirs': round(snpp / (snpp + n20), 3),
                                   'passes': pass_coverage(pts, days[-7:]), 'snpp_end': SNPP_END, 'note': 'Indonesia only. Low-confidence detections are excluded from every count here except where stated.',
                                   'source': 'firms'})

    # official figures from SiPongi
    official = {}
    try:
        data = json.loads(get(f'{SIPONGI}/list/luas-kebakaran/provinsi?tahunAwal=2025&tahunAkhir=2026'))
        for row in data['data']:
            official[row['nama_provinsi']] = {str(x['tahun']): float(x['luas'].replace('.', '').replace(',', '.')) for x in row['data_luas']}
        monthly = json.loads(get(f'{SIPONGI}/grafik/hotspot?text=NASA&satelit=NASA-NOAA20&tahun=2026'))['data']
        save_json(os.path.join(STATE, 'sipongi_last.json'), {'retrieved_at': now_iso(), 'official': official, 'monthly': monthly})
    except Exception as e:
        print('SiPongi unavailable, using the last good copy:', e, flush=True)
        last = load_json(os.path.join(STATE, 'sipongi_last.json'), {})
        official, monthly = last.get('official', {}), last.get('monthly')
    off_total_2026 = round(sum(v.get('2026', 0) for v in official.values()), 2) if official else None
    off_total_2025 = round(sum(v.get('2025', 0) for v in official.values()), 2) if official else None

    # provinces
    week3 = collections.defaultdict(lambda: {'0': 0, '1': 0, '2': 0})
    for lon, lat, frp, sat, c, t, pi in pts:
        if start <= t.date() <= end:
            week3[provs[pi]['id']][str(sat)] += 1
    out_provs = []
    for p in provs:
        rings = []
        for ring in p['rings_full']:
            if ring_area_deg(ring) < 0.004:
                continue
            s = simplify(ring, 0.012)
            if len(s) >= 4:
                rings.append([[round(x, 3), round(y, 3)] for x, y in s])
        o = official.get(p['sipongi'], {})
        out_provs.append({'id': p['id'], 'name_en': p['name_en'], 'name_id': p['name_id'], 'region': p['region'], 'rings': rings,
                          'week_7d': week3[p['id']], 'snpp_week': {k: prov_week[p['id']][k] for k in ('count', 'rank', 'of', 'median', 'higher', 'by_year')},
                          'official_ha': {'2025': o.get('2025'), '2026_jan_jul': o.get('2026')}})
    write_json('provinces.json', {'boundary_source': 'geoBoundaries IDN ADM1 and ADM2 (ODbL); the 2022 Papua provinces are built from their regencies',
                                  'window': [start.isoformat(), end.isoformat()], 'provinces': out_provs})

    # the numbers war
    static = load_json(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'numbers.json'))
    if off_total_2026:
        static['estimates'].insert(0, {'source': 'SiPongi (Kementerian Kehutanan)', 'kind': 'official', 'window': ['2026-01-01', '2026-07-31'],
                                       'hectares': off_total_2026, 'method': 'Official indicative burned area, sum of all provinces',
                                       'url': f'{SIPONGI}/list/luas-kebakaran/provinsi?tahunAwal=2025&tahunAkhir=2026',
                                       'note_en': 'Published to July only at the time of retrieval.', 'note_id': 'Saat diambil, baru tersedia sampai Juli.'})
    if monthly:
        static['monthly_sipongi_n20_high'] = {f'2026-{i + 1:02d}': v for i, v in enumerate(monthly) if v}
    static['official_total_2025_ha'] = off_total_2025
    daycount = collections.Counter()
    for lon, lat, frp, sat, c, t, pi in pts:
        daycount[t.date().isoformat()] += 1
    static['detections_by_day_all3'] = {d: daycount[d] for d in sday}
    write_json('numbers.json', static)
    write_json('policy.json', load_json(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'policy.json')))

    # southern Papua
    pap = regions['PAPS']
    o = official.get('Papua Selatan', {})
    write_json('papua.json', {'box': list(PAPS_BOX), 'regencies': ['Merauke', 'Boven Digoel', 'Mappi'], 'week': {'start': start.isoformat(), 'end': end.isoformat()},
                              'sensor': 'Suomi-NPP', 'by_year': pap['by_year'], 'rank': pap['rank'], 'median_2012_2025': pap['median'],
                              'official': {'source': 'SiPongi', 'ha_2025': o.get('2025'), 'ha_2026_jan_jul': o.get('2026')},
                              'independent': {'source': 'Nusantara Atlas, via Down To Earth', 'ha': 114291, 'window': ['2026-01-01', '2026-08-31'],
                                              'url': 'https://www.downtoearth.org.in/climate-change/indonesia-faces-worst-wildfire-season-in-a-decade-as-super-el-ni%C3%B1o-fuels-fires'},
                              'walhi_psn_hotspots_jan_aug': {'value': 807, 'source': 'WALHI via Suara, 25 Aug 2026',
                                                             'url': 'https://www.suara.com/news/2026/08/25/134235/walhi-sebut-karhutla-di-papua-makin-masif-banyak-titik-api-berada-di-konsesi-food-estate'}})

    # climate
    oni = []
    try:
        lines = get('https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt').decode().strip().split('\n')[1:]
        for ln in lines[-12:]:
            s, y, total, anom = ln.split()
            oni.append({'season': s, 'year': int(y), 'value': float(anom)})
    except Exception as e:
        print('ONI unavailable:', e, flush=True)
    write_json('climate.json', {'oni': oni, 'oni_source': 'NOAA CPC, oni.ascii.txt',
                                'iod': {'value': 0.88, 'week_to': '2026-10-11', 'source': 'Australian Bureau of Meteorology'},
                                'notes': [{'en': 'BMKG expects a late rainy season that peaks in December 2026 to February 2027.',
                                           'id': 'BMKG memperkirakan musim hujan datang terlambat dan mencapai puncak pada Desember 2026 sampai Februari 2027.',
                                           'url': 'https://www.medcom.id/pendidikan/riset-penelitian/gNQrgRab-el-nino-masih-sangat-kuat-ini-prediksi-musim-hujan-2026-2027-dan-langkah-antisipasinya'}]})

    write_json('summary.json', {'as_of': end.isoformat(), 'snpp_end': SNPP_END,
                                'week': {'start': start.isoformat(), 'end': end.isoformat(), 'sensor': 'Suomi-NPP', 'regions': regions},
                                'recurrence': recurrence,
                                'last24h': {'start': (tmax - timedelta(hours=24)).isoformat().replace('+00:00', 'Z'), 'end': tmax.isoformat().replace('+00:00', 'Z'),
                                            'total': len(last24), 'by_sat': {str(s): sum(1 for p in last24 if p[3] == s) for s in (0, 1, 2)},
                                            'by_region': dict(by_region24)},
                                'official_total_ha': {'2025': off_total_2025, '2026_jan_jul': off_total_2026},
                                'history_2026_days': len(st['days']), 'sources': sources})
    print('done', start, end, 'week ID', regions['ID']['count'], 'rank', regions['ID']['rank'],
          '| PAPS', regions['PAPS']['count'], 'rank', regions['PAPS']['rank'], '| recurrence', recurrence['share_detections'], recurrence['share_land'])


if __name__ == '__main__':
    main()
