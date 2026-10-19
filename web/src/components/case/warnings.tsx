"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSeen, useWidth } from "@/components/charts/util";
import { useReady, type PolicyEvent } from "@/lib/data";
import { fmtAxis, fmtDay, fmtInt, monthShort, parseDay } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { ChapterHead } from "./chapter";

/**
 * Warnings vs decisions: every dated warning, decision, action, claim, ruling and budget line from policy.json on
 * one timeline, with the fire behind it, so anyone can see what was known when. The axis is broken in two: the
 * years before the case year are compressed and the case year is stretched. Both show weekly Suomi-NPP detections
 * from season.json on one scale; if the archive lacks the case year from 1 January, the second panel falls back to
 * SiPongi's monthly NOAA-20 high-confidence counts on its own scale, and says so.
 */
const KINDS: Record<string, { en: string; id: string; colour: string }> = {
  warning: { en: "Warning", id: "Peringatan", colour: "var(--smoke)" },
  decision: { en: "Decision", id: "Keputusan", colour: "var(--ink)" },
  action: { en: "Action", id: "Tindakan", colour: "var(--official)" },
  claim: { en: "Claim", id: "Klaim", colour: "var(--ember)" },
  ruling: { en: "Ruling", id: "Putusan", colour: "#9fb4e8" },
  budget: { en: "Budget", id: "Anggaran", colour: "#d59ad0" },
};
const kindOf = (k: string) => KINDS[k] ?? { en: k, id: k, colour: "var(--ink-2)" };
const t = (d: string) => {
  const p = parseDay(d);
  return p ? Date.UTC(p.y, p.m, p.d) : NaN;
};

export function Warnings() {
  const lang = useLang();
  const policy = useReady("policy");
  const season = useReady("season");
  const numbers = useReady("numbers");
  const summary = useReady("summary");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const [box, w] = useWidth<HTMLDivElement>();
  const [seenRef, seen] = useSeen<HTMLDivElement>(0.2);

  const events = useMemo(() => (policy?.timeline ?? []).filter((e) => Number.isFinite(t(e.date))).sort((a, b) => t(a.date) - t(b.date)), [policy]);

  useEffect(() => {
    const ol = listRef.current;
    if (!ol) return;
    const items = Array.from(ol.querySelectorAll("[data-i]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-55% 0px -44% 0px" },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [events.length]);

  if (!events.length) return null;

  // Axis: panel A (before the case year) and panel B (the case year).
  const caseYear = Number((summary?.as_of ?? events[events.length - 1]!.date).slice(0, 4));
  const firstYear = Math.min(caseYear - 1, Number(events[0]!.date.slice(0, 4)));
  const a0 = Date.UTC(firstYear, 0, 1);
  const b0 = Date.UTC(caseYear, 0, 1);
  const lastEvent = t(events[events.length - 1]!.date);
  const b1 = Math.max(Date.UTC(caseYear, 10, 15), lastEvent + 10 * 86400000);
  const narrow = w < 640;
  const h = narrow ? 210 : 330;
  const fs = narrow ? 9.5 : 11.5;
  const gap = 14;
  const aW = (w - gap) * (narrow ? 0.3 : 0.32);
  const bX = aW + gap;
  const bW = w - bX;
  const plotTop = 30;
  const plotBot = h - 46;
  const x = (ms: number) => (ms < b0 ? ((ms - a0) / (b0 - a0)) * aW : bX + ((ms - b0) / (b1 - b0)) * bW);

  // Panel A: weekly Suomi-NPP totals for Indonesia. Panel B uses the same series when the archive covers the case
  // year from 1 January (then both panels share one scale); otherwise SiPongi's monthly counts.
  const weekly: [number, number][] = [];
  const weeklyB: [number, number][] = [];
  if (season) {
    for (let y = firstYear; y <= caseYear; y++) {
      const arr = season.years[String(y)]?.ID;
      if (!arr) continue;
      for (let i = 0; i + 7 <= arr.length; i += 7) {
        let s = 0;
        let ok = true;
        for (let k = i; k < i + 7; k++) {
          const v = arr[k];
          if (v == null) ok = false;
          else s += v;
        }
        if (ok) (y === caseYear ? weeklyB : weekly).push([Date.UTC(y, 0, 1) + (i + 3) * 86400000, s]);
      }
    }
  }
  const snppB = Boolean(season?.coverage_2026 && season.coverage_2026[0] <= `${caseYear}-01-01` && weeklyB.length > 8);
  const aMax = Math.max(1, ...weekly.map((p) => p[1]), ...(snppB ? weeklyB.map((p) => p[1]) : []));
  const ay = (v: number) => plotBot - (v / aMax) * (plotBot - plotTop);
  const areaA = weekly.length ? `M${x(weekly[0]![0]).toFixed(1)},${plotBot}` + weekly.map((p) => `L${x(p[0]).toFixed(1)},${ay(p[1]).toFixed(1)}`).join("") + `L${x(weekly[weekly.length - 1]![0]).toFixed(1)},${plotBot}Z` : "";

  const areaB = snppB ? `M${x(weeklyB[0]![0]).toFixed(1)},${plotBot}` + weeklyB.map((p) => `L${x(p[0]).toFixed(1)},${ay(p[1]).toFixed(1)}`).join("") + `L${x(weeklyB[weeklyB.length - 1]![0]).toFixed(1)},${plotBot}Z` : "";

  // Panel B fallback: monthly SiPongi NOAA-20 high confidence.
  const months = snppB ? [] : Object.entries(numbers?.monthly_sipongi_n20_high ?? {})
    .filter(([k, v]) => k.startsWith(String(caseYear)) && /^\d{4}-\d{2}$/.test(k) && typeof v === "number")
    .sort(([p], [q]) => (p < q ? -1 : 1));
  const bMax = Math.max(1, ...months.map(([, v]) => v));
  const by = (v: number) => plotBot - (v / bMax) * (plotBot - plotTop);
  const asOf = summary?.as_of ? t(summary.as_of) : NaN;
  const ev = events[active] ?? events[0]!;
  const evX = x(t(ev.date));

  return (
    <section id="warnings" className="chapter grain" aria-labelledby="warnings-h">
      <div className="wrap">
        <ChapterHead
          n="07"
          id="warnings-h"
          en={["Warnings", "vs decisions"]}
          idn={["Peringatan", "vs keputusan"]}
          lede={<T en="What was known, and when. Warnings, decisions, actions and claims on one timeline, with the fire behind them." id="Apa yang sudah diketahui, dan kapan. Peringatan, keputusan, tindakan, dan klaim dalam satu garis waktu, dengan api di belakangnya." />}
        />
        <div className="tl">
          <div className="tl__chart" ref={seenRef}>
            <div ref={box} className={`chart ${seen ? "is-seen" : ""}`}>
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={tr(lang, { en: "Timeline of warnings and decisions over the fire record", id: "Garis waktu peringatan dan keputusan di atas catatan api" })}>
                <text x={0} y={12} className="t-strong">
                  {firstYear}–{caseYear - 1}
                </text>
                <text x={0} y={25} style={{ fontSize: fs }}>
                  {tr(lang, { en: "Suomi-NPP, weekly", id: "Suomi-NPP, mingguan" })}
                </text>
                <text x={bX} y={12} className="t-strong">
                  {caseYear}
                </text>
                <text x={bX} y={25} style={{ fontSize: fs }}>
                  {snppB ? tr(lang, { en: "Suomi-NPP, weekly, same scale", id: "Suomi-NPP, mingguan, skala sama" }) : tr(lang, { en: "NOAA-20 high conf., monthly (SiPongi)", id: "NOAA-20 keyakinan tinggi, bulanan (SiPongi)" })}
                </text>
                <line className="axis" x1={0} x2={aW} y1={plotBot} y2={plotBot} />
                <line className="axis" x1={bX} x2={w} y1={plotBot} y2={plotBot} />
                {areaA ? <path d={areaA} fill="var(--ash)" opacity={0.42} /> : null}
                {areaB ? <path d={areaB} fill="var(--ember)" opacity={0.85} /> : null}
                {snppB
                  ? Array.from({ length: 11 }, (_, m) => m)
                      .filter((m) => (narrow ? m % 2 === 0 : true))
                      .map((m) => (
                        <text key={m} x={(x(Date.UTC(caseYear, m, 1)) + x(Date.UTC(caseYear, m + 1, 1))) / 2} y={plotBot + 14} textAnchor="middle" style={{ fontSize: fs }}>
                          {monthShort(m, lang)}
                        </text>
                      ))
                  : null}
                {weekly.length ? (
                  <text x={aW - 2} y={plotTop + 10} textAnchor="end" style={{ fontSize: fs }}>
                    {tr(lang, { en: "max", id: "maks" })} {fmtAxis(aMax, lang)}
                  </text>
                ) : null}
                {Array.from({ length: caseYear - firstYear }, (_, i) => firstYear + i)
                  .filter((y) => (narrow ? (y - firstYear) % 3 === 0 : (y - firstYear) % 2 === 0))
                  .map((y) => (
                    <text key={y} x={x(Date.UTC(y, 0, 1))} y={plotBot + 14} style={{ fontSize: fs }}>
                      &apos;{String(y).slice(2)}
                    </text>
                  ))}
                {months.map(([k, v], i) => {
                  const m = Number(k.slice(5, 7)) - 1;
                  const xa = x(Date.UTC(caseYear, m, 1));
                  const xb = x(Date.UTC(caseYear, m + 1, 1));
                  return (
                    <g key={k}>
                      <rect className="grow" style={{ transitionDelay: `${i * 50}ms` }} x={xa + 1.5} width={Math.max(1, xb - xa - 3)} y={by(v)} height={plotBot - by(v)} fill="var(--ember)" opacity={k === summary?.as_of?.slice(0, 7) ? 0.55 : 0.8} rx={1.5} />
                      {(narrow ? m % 2 === 0 : true) ? (
                        <text x={(xa + xb) / 2} y={plotBot + 14} textAnchor="middle" style={{ fontSize: fs }}>
                          {monthShort(m, lang)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                {months.length ? (
                  <text x={w - 2} y={plotTop + 10} textAnchor="end" style={{ fontSize: fs }}>
                    {tr(lang, { en: "max", id: "maks" })} {fmtInt(bMax, lang)}
                  </text>
                ) : null}
                {Number.isFinite(asOf) ? <line x1={x(asOf)} x2={x(asOf)} y1={plotTop} y2={plotBot} stroke="var(--ember-hot)" strokeDasharray="2 3" /> : null}
                {/* event markers */}
                {events.map((e, i) => {
                  const ex = x(t(e.date));
                  const k = kindOf(e.kind);
                  const on = i === active;
                  return (
                    <g key={i} style={{ transition: "opacity .3s" }} opacity={on ? 1 : 0.75}>
                      <rect x={ex - (on ? 5 : 3.5)} y={plotBot + 22 - (on ? 5 : 3.5)} width={on ? 10 : 7} height={on ? 10 : 7} fill={k.colour} transform={`rotate(45 ${ex} ${plotBot + 22})`} />
                    </g>
                  );
                })}
                <line x1={evX} x2={evX} y1={plotTop - 4} y2={plotBot + 16} stroke={kindOf(ev.kind).colour} strokeWidth={1.5} style={{ transition: "all .35s var(--ease)" }} />
                <text x={Math.min(Math.max(evX, 40), w - 40)} y={h - 2} textAnchor="middle" className="t-strong" style={{ fontSize: narrow ? 10.5 : 13 }}>
                  {fmtDay(ev.date, lang)}
                </text>
              </svg>
            </div>
            <div className="legend" style={{ marginTop: 6 }}>
              {Object.entries(KINDS)
                .filter(([k]) => events.some((e) => e.kind === k))
                .map(([k, v]) => (
                  <span key={k}>
                    <i className="sq" style={{ background: v.colour, transform: "rotate(45deg) scale(.8)" }} />
                    {tr(lang, v)}
                  </span>
                ))}
            </div>
          </div>
          <ol className="tl__list" ref={listRef}>
            {events.map((e: PolicyEvent, i) => {
              const k = kindOf(e.kind);
              return (
                <li key={i} data-i={i} className={`tl__item ${i === active ? "is-active" : ""}`}>
                  <span className="tl__date num">{fmtDay(e.date, lang)}</span>
                  <span className="tl__kind" style={{ color: k.colour }}>
                    <i style={{ background: k.colour }} />
                    {tr(lang, k)}
                  </span>
                  <div className="tl__text">
                    <span className="tl__actor">{e.actor}.</span> {tr(lang, { en: e.en || e.id, id: e.id || e.en })}
                    {e.url ? (
                      <>
                        {" "}
                        <a className="src" href={e.url} target="_blank" rel="noopener noreferrer">
                          {tr(lang, { en: "Source", id: "Sumber" })}
                        </a>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        {policy?.method_en ? <p className="src" style={{ marginTop: 28, maxWidth: "70ch" }}>{tr(lang, { en: policy.method_en, id: policy.method_id ?? policy.method_en })}</p> : null}
      </div>
    </section>
  );
}
