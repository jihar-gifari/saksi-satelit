# Saksi Satelit data contract (case: karhutla)

The pipeline (`pipeline/`, pure Python standard library) writes these files to `web/public/data/karhutla/`. The web app only reads them. Every file has `generated_at` (UTC ISO) and a `sources` list or a source id. Numbers are never invented in the web app: if a file or field is missing, the UI hides that block (no demo fallback).

Satellite codes: `0` = Suomi-NPP (S-NPP, stops 2 Nov 2026), `1` = NOAA-20, `2` = NOAA-21. Confidence codes: `1` = nominal, `2` = high (low is dropped). Regions: `ID` Indonesia, `KAL` Kalimantan, `SUM` Sumatra, `PAP` Papua (all), `PAPS` southern Papua box (137.5–140.95°E, 5.5–9.2°S).

## summary.json
```json
{
  "generated_at": "2026-10-18T21:40:00Z",
  "as_of": "2026-10-17",
  "snpp_end": "2026-11-02",
  "week": {"start": "2026-10-11", "end": "2026-10-17", "sensor": "S-NPP",
    "regions": {"ID": {"count": 48039, "rank": 2, "of": 15, "since": 2012, "higher": [2015], "median": 3781, "by_year": {"2012": 7063}}}},
  "recurrence": {"years": [2015, 2019, 2023], "cell_deg": 0.01, "share_detections": 0.66, "share_land": 0.195, "n_detections": 48039},
  "last24h": {"start": "...", "end": "...", "total": 0, "by_sat": {"0": 0, "1": 0, "2": 0}, "by_region": {"KAL": 0}},
  "sources": [{"id": "firms", "name": "NASA FIRMS VIIRS 375 m", "licence": "NASA open data, credit LANCE FIRMS", "url": "https://firms.modaps.eosdis.nasa.gov/", "retrieved_at": "..."}]
}
```

## hotspots.json (map layer, last 48 hours, Indonesia only)
`{"generated_at", "start", "end", "fields": ["lon","lat","frp","sat","conf","h"], "points": [[113.12, -2.21, 14.3, 1, 1, 5.5]]}`
`h` = hours before `end` (float, 0.5 precision). `frp` in MW.

## cells7d.json (7-day density, 0.05° cells)
`{"generated_at", "start", "end", "cell_deg": 0.05, "cells": [[lon, lat, count, frp_sum]]}`

## season.json (S-NPP daily counts, consistent sensor, nominal+high, vegetation fires)
`{"generated_at", "sensor": "S-NPP", "regions": ["ID","KAL","SUM","PAP","PAPS"], "years": {"2012": {"ID": [366 ints, index 0 = 1 Jan]}}}`
2026 has values only for days the pipeline has (null elsewhere).

## recurrence.json (display cells 0.1°)
`{"generated_at", "cell_deg": 0.1, "bits": {"2015": 1, "2019": 2, "2023": 4, "2026w": 8}, "cells": [[lon, lat, mask]]}`

## satellites.json (why counts disagree)
`{"generated_at", "days": ["2026-10-11", ...], "counts": {"0": {"1": [per day], "2": [per day]}, "1": {...}, "2": {...}}, "example_day": "2026-10-17", "example": {"n20_high": 238, "all": 25869}, "snpp_share_all3": 0.311, "snpp_share_sipongi_viirs": 0.474}`

## provinces.json (outlines + per-province stats)
`{"generated_at", "boundary_source": "geoBoundaries IDN ADM1 (ODbL)", "provinces": [{"id": "ID-KT", "name_en": "Central Kalimantan", "name_id": "Kalimantan Tengah", "region": "KAL", "rings": [[[lon,lat],...]], "week_7d": {"0": n, "1": n, "2": n}, "official_ha": {"2025": 0, "2026_jan_jul": 0}}]}`

## numbers.json (the numbers war, refereed)
`{"generated_at", "estimates": [{"source": "SiPongi (Kemenhut)", "kind": "official|independent", "window": ["2026-01-01","2026-07-31"], "hectares": 202011, "method": "...", "url": "...", "note_en": "...", "note_id": "..."}], "pairs": [{"place": "Jambi", ...}], "claims": [{"date": "2026-10-12", "who": "BNPB", "claim_en": "...", "claim_id": "...", "check_en": "...", "check_id": "...", "url": "..."}], "monthly_sipongi_n20_high": {"2026-07": 621, "2026-08": 4913, "2026-09": 5867, "2026-10_to_18": 4783}}`

## papua.json
`{"generated_at", "box": [137.5, -9.2, 140.95, -5.5], "week": {"start": "2026-10-11", "end": "2026-10-17"}, "by_year": {"2012": 104}, "median_2012_2025": 475, "official": {...}, "independent": {...}, "walhi_psn_hotspots_jan_aug": 807}`

## climate.json
`{"generated_at", "oni": [{"season": "JAS", "year": 2026, "value": 2.16}], "iod": {"value": 0.88, "week_to": "2026-10-11", "source": "BoM"}, "notes": [...]}`
