"use client";
import type { WeekRank } from "@/lib/data";
import { fmtAxis, fmtInt } from "@/lib/format";
import { tr, useLang } from "@/lib/i18n";
import { linear, ticks, useSeen, useWidth } from "./util";

/**
 * The same seven days in every year since 2012 (one sensor, one calendar window). The latest year is ember, the
 * years that beat it are bright, the rest ash; a dashed line marks the median of the earlier years.
 */
export function WeekBars({ rank, label, accent = "var(--ember)" }: { rank: WeekRank; label: string; accent?: string }) {
  const lang = useLang();
  const [box, w] = useWidth<HTMLDivElement>();
  const [seenRef, seen] = useSeen<HTMLDivElement>(0.4);
  const years = Object.keys(rank.by_year)
    .map(Number)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
  if (!years.length) return null;
  const last = years[years.length - 1]!;
  const values = years.map((y) => rank.by_year[String(y)] ?? 0);
  const max = Math.max(...values, rank.median);
  const yt = ticks(max, 4);
  const top = yt[yt.length - 1]!;
  const narrow = w < 560;
  const h = narrow ? 300 : 380;
  const m = { l: narrow ? 34 : 44, r: 4, t: 30, b: 26 };
  const x0 = m.l;
  const x1 = w - m.r;
  const bw = (x1 - x0) / years.length;
  const sy = linear(0, top, h - m.b, m.t);
  const higher = new Set(rank.higher.map(Number));
  const medY = sy(rank.median);

  return (
    <div ref={seenRef}>
      <div ref={box} className={`chart bars ${seen ? "is-seen" : ""}`}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
          {yt.map((v) => (
            <g key={v}>
              <line className="grid" x1={x0} x2={x1} y1={sy(v)} y2={sy(v)} />
              <text x={x0 - 6} y={sy(v) + 4} textAnchor="end">
                {fmtAxis(v, lang)}
              </text>
            </g>
          ))}
          {years.map((y, i) => {
            const v = values[i]!;
            const bx = x0 + i * bw + bw * 0.14;
            const bwi = bw * 0.72;
            const isLast = y === last;
            const isHigher = higher.has(y);
            const fill = isLast ? accent : isHigher ? "var(--ink)" : "var(--ash)";
            const opacity = isLast || isHigher ? 1 : 0.45;
            const showVal = isLast || isHigher || v === max;
            return (
              <g key={y}>
                <rect className="grow" style={{ transitionDelay: `${i * 45}ms` }} x={bx} y={sy(v)} width={bwi} height={Math.max(1, h - m.b - sy(v))} fill={fill} opacity={opacity} rx={1.5} />
                {showVal ? (
                  <text style={{ transitionDelay: `${300 + i * 45}ms` }} x={bx + bwi / 2} y={sy(v) - 7} textAnchor={i === years.length - 1 ? "end" : "middle"} dx={i === years.length - 1 ? bwi / 2 : 0} className={`val ${isLast ? "t-ember t-big" : "t-strong"}`}>
                    {fmtInt(v, lang)}
                  </text>
                ) : null}
                <text x={bx + bwi / 2} y={h - m.b + 16} textAnchor="middle" className={isLast ? "t-ember" : undefined}>
                  {narrow ? `'${String(y).slice(2)}` : y}
                </text>
              </g>
            );
          })}
          <line x1={x0} x2={x1} y1={medY} y2={medY} stroke="var(--ink-2)" strokeDasharray="3 4" strokeWidth={1} />
          <text x={x0 + 4} y={medY - 6} className="t-strong halo">
            {tr(lang, { en: "median", id: "median" })} {years[0]}–{years[years.length - 2]}: {fmtInt(rank.median, lang)}
          </text>
        </svg>
      </div>
    </div>
  );
}
