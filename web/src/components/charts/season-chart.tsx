"use client";
import { useMemo, useState } from "react";
import type { RegionCode, Season } from "@/lib/data";
import { fmtAxis, fmtInt, monthShort } from "@/lib/format";
import { tr, useLang } from "@/lib/i18n";
import { linear, ticks, useSeen, useWidth } from "./util";

/**
 * Every fire season since 2012 as a running 7-day total of Suomi-NPP detections, July to December. The value on
 * 17 October equals that year's bar in the same-week chart, so the two charts read the same way. 2026 is drawn
 * only where seven consecutive days exist in the archive.
 */
type Series = { year: number; pts: [number, number][] };

const DAY = 86400000;
function seriesFor(season: Season, region: RegionCode, cumulative: boolean): Series[] {
  const out: Series[] = [];
  for (const [ys, regions] of Object.entries(season.years)) {
    const year = Number(ys);
    const arr = regions[region];
    if (!arr || !Number.isFinite(year)) continue;
    const jul1 = Date.UTC(year, 6, 1);
    const jan1 = Date.UTC(year, 0, 1);
    const pts: [number, number][] = [];
    let cum = 0;
    let cumOk = true;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (cumulative) {
        if (v == null) cumOk = false;
        else cum += v;
      }
      const t = jan1 + i * DAY;
      if (new Date(t).getUTCFullYear() !== year || t < jul1) continue;
      const x = (t - jul1) / DAY;
      if (cumulative) {
        if (cumOk && v != null) pts.push([x, cum]);
        continue;
      }
      if (i < 6) continue;
      let sum = 0;
      let ok = true;
      for (let k = i - 6; k <= i; k++) {
        const vk = arr[k];
        if (vk == null) {
          ok = false;
          break;
        }
        sum += vk;
      }
      if (ok) pts.push([x, sum]);
    }
    if (pts.length) out.push({ year, pts });
  }
  return out.sort((a, b) => a.year - b.year);
}

const MONTH_STARTS = [0, 31, 62, 92, 123, 153]; // days from 1 Jul: Jul Aug Sep Oct Nov Dec

export function SeasonChart({ season, region, highlight }: { season: Season; region: RegionCode; highlight: number[] }) {
  const lang = useLang();
  const [box, w] = useWidth<HTMLDivElement>();
  const [seenRef, seen] = useSeen<HTMLDivElement>(0.35);
  const [hover, setHover] = useState<number | null>(null);
  const cumulativeOk = Boolean(season.coverage_2026 && season.coverage_2026[0] <= `${new Date().getUTCFullYear()}-01-01`);
  const [cumulative, setCumulative] = useState(false);
  const series = useMemo(() => seriesFor(season, region, cumulative && cumulativeOk), [season, region, cumulative, cumulativeOk]);
  if (!series.length) return null;
  const latest = series[series.length - 1]!.year;
  const narrow = w < 560;
  const h = narrow ? 280 : 360;
  const m = { l: narrow ? 34 : 44, r: narrow ? 46 : 56, t: 16, b: 26 };
  const max = Math.max(...series.flatMap((s) => s.pts.map((p) => p[1])));
  const yt = ticks(max, 4);
  const top = yt[yt.length - 1]!;
  const sx = linear(0, 183, m.l, w - m.r);
  const sy = linear(0, top, h - m.b, m.t);
  const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join("");
  const hl = new Set(highlight);
  const colour = (y: number) => (y === latest ? "var(--ember)" : y === 2015 ? "var(--ink)" : hl.has(y) ? "var(--smoke)" : "var(--ash)");

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w;
    const d = Math.round(((x - m.l) / (w - m.l - m.r)) * 183);
    setHover(d >= 0 && d <= 183 ? d : null);
  };
  const at = (s: Series, d: number) => s.pts.find((p) => p[0] === d)?.[1];
  const hoverDate = hover != null ? new Date(Date.UTC(2026, 6, 1) + hover * DAY) : null;
  const shown = series.filter((s) => s.year === latest || hl.has(s.year) || s.year === 2015);

  return (
    <div ref={seenRef}>
      {cumulativeOk ? (
        <div className="chips" style={{ marginBottom: 12 }}>
          <button type="button" className="chip" aria-pressed={!cumulative} onClick={() => setCumulative(false)}>
            {tr(lang, { en: "7-day total", id: "Total 7 hari" })}
          </button>
          <button type="button" className="chip" aria-pressed={cumulative} onClick={() => setCumulative(true)}>
            {tr(lang, { en: "Since 1 January", id: "Sejak 1 Januari" })}
          </button>
        </div>
      ) : null}
      <div ref={box} className={`chart ${seen ? "is-seen" : ""}`}>
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={tr(lang, { en: "Seven-day totals of fire detections, July to December, for every year since 2012", id: "Total deteksi api tujuh hari, Juli sampai Desember, untuk setiap tahun sejak 2012" })}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ touchAction: "pan-y" }}
        >
          {yt.map((v) => (
            <g key={v}>
              <line className="grid" x1={m.l} x2={w - m.r} y1={sy(v)} y2={sy(v)} />
              <text x={m.l - 6} y={sy(v) + 4} textAnchor="end">
                {fmtAxis(v, lang)}
              </text>
            </g>
          ))}
          {MONTH_STARTS.map((d, i) => (
            <text key={d} x={sx(d) + 2} y={h - m.b + 16}>
              {monthShort(6 + i, lang)}
            </text>
          ))}
          {series
            .filter((s) => !shown.includes(s))
            .map((s) => (
              <path key={s.year} d={path(s.pts)} fill="none" stroke="var(--ash)" strokeOpacity={0.28} strokeWidth={1} />
            ))}
          {shown.map((s) => {
            const lastPt = s.pts[s.pts.length - 1]!;
            const peak = s.pts.reduce((a, b) => (b[1] > a[1] ? b : a));
            const isLatest = s.year === latest;
            const labelPt = isLatest ? lastPt : peak;
            return (
              <g key={s.year}>
                {s.pts.length > 1 ? (
                  <path className="draw" style={{ ["--len" as string]: 3000 } as React.CSSProperties} d={path(s.pts)} fill="none" stroke={colour(s.year)} strokeWidth={isLatest ? 3 : 1.6} strokeLinejoin="round" />
                ) : null}
                {isLatest ? <circle cx={sx(lastPt[0])} cy={sy(lastPt[1])} r={6} fill="var(--ember)" className="val" /> : null}
                <text
                  className={`val halo ${isLatest ? "t-ember t-big" : "t-strong"}`}
                  x={sx(labelPt[0]) + (isLatest ? 10 : 6)}
                  y={sy(labelPt[1]) + (isLatest ? 5 : -6)}
                  style={{ fill: isLatest ? undefined : colour(s.year) }}
                >
                  {s.year}
                </text>
              </g>
            );
          })}
          {hover != null ? (
            <line x1={sx(hover)} x2={sx(hover)} y1={m.t} y2={h - m.b} stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="2 3" />
          ) : null}
        </svg>
        {hover != null && hoverDate ? (
          <div className="scrub" style={{ left: Math.min(Math.max(0, sx(hover) - 70), w - 150), top: 0 }}>
            <div>
              {hoverDate.getUTCDate()} {monthShort(hoverDate.getUTCMonth(), lang)}
            </div>
            {shown
              .slice()
              .reverse()
              .map((s) => {
                const v = at(s, hover);
                return v != null ? (
                  <div key={s.year} style={{ color: colour(s.year) }}>
                    {s.year}: {fmtInt(v, lang)}
                  </div>
                ) : null;
              })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
