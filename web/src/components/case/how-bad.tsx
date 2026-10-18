"use client";
import { useState } from "react";
import { SeasonChart } from "@/components/charts/season-chart";
import { WeekBars } from "@/components/charts/week-bars";
import { linear, useSeen, useWidth } from "@/components/charts/util";
import { Know, KnowLink, type KnowItem } from "@/components/site/know";
import { useReady, type Climate, type RegionCode, type WeekRank } from "@/lib/data";
import { fmtInt, fmtNum, fmtRange, fmtTimes, listYears, ordinal } from "@/lib/format";
import { T, tr, useLang, type Lang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";
import { ChapterHead, Loading } from "./chapter";
import { PolicyCheck } from "./policy-check";

export const REGION_NAMES: Record<string, { en: string; id: string }> = {
  ID: { en: "Indonesia", id: "Indonesia" },
  KAL: { en: "Kalimantan", id: "Kalimantan" },
  SUM: { en: "Sumatra", id: "Sumatera" },
  PAP: { en: "Papua", id: "Papua" },
  PAPS: { en: "Southern Papua", id: "Papua bagian selatan" },
};

export function rankSentence(r: WeekRank, lang: Lang): string {
  const since = r.since ?? 2012;
  const higher = r.higher.slice().sort((a, b) => a - b);
  if (lang === "id") {
    if (r.rank === 1) return `Terparah untuk minggu ini sejak ${since}.`;
    return `Terparah ${ordinal(r.rank, "id")} sejak ${since}. Hanya ${listYears(higher, "id")} yang lebih tinggi.`;
  }
  if (r.rank === 1) return `The worst for this week of the year since ${since}.`;
  return `The ${ordinal(r.rank, "en")} worst since ${since}. Only ${listYears(higher, "en")} ${higher.length === 1 ? "was" : "were"} higher.`;
}

export function weekKnow(start: string, end: string, region: string): KnowItem {
  const name = REGION_NAMES[region] ?? { en: region, id: region };
  return {
    title: { en: `Same week, every year: ${name.en}`, id: `Minggu yang sama, setiap tahun: ${name.id}` },
    source: {
      en: "NASA FIRMS, Suomi-NPP VIIRS 375 m active fires: standard archive for 2012–2025, near-real-time data for 2026.",
      id: "NASA FIRMS, deteksi api aktif Suomi-NPP VIIRS 375 m: arsip standar untuk 2012–2025, data hampir waktu nyata untuk 2026.",
    },
    window: { en: `${fmtRange(start, end, "en", false)} of every year from 2012`, id: `${fmtRange(start, end, "id", false)} setiap tahun sejak 2012` },
    method: {
      en: "Nominal- and high-confidence vegetation fire detections inside the region, counted for the same seven calendar days each year. Only Suomi-NPP is used because it is the one VIIRS satellite that flew in every year since 2012, so every year is measured the same way.",
      id: "Deteksi api vegetasi dengan keyakinan nominal dan tinggi di dalam wilayah, dihitung untuk tujuh hari kalender yang sama setiap tahun. Hanya Suomi-NPP yang dipakai karena hanya satelit VIIRS ini yang terbang setiap tahun sejak 2012, sehingga setiap tahun diukur dengan cara yang sama.",
    },
    note: {
      en: "Detections are a lower bound: cloud and thick smoke hide fires, and smouldering peat is often missed. Near-real-time and archive processing can differ slightly.",
      id: "Deteksi adalah batas bawah: awan dan asap tebal menutupi api, dan gambut yang membara sering tidak terdeteksi. Data hampir waktu nyata dan arsip bisa sedikit berbeda.",
    },
    links: [{ label: "firms.modaps.eosdis.nasa.gov", href: "https://firms.modaps.eosdis.nasa.gov/" }],
    anchor: "same-week",
  };
}

function OniStrip({ climate }: { climate: Climate }) {
  const lang = useLang();
  const [box, w] = useWidth<HTMLDivElement>();
  const [seenRef, seen] = useSeen<HTMLDivElement>(0.4);
  const oni = climate.oni ?? [];
  if (oni.length < 3) return null;
  const h = 120;
  const max = Math.max(2.5, ...oni.map((o) => Math.abs(o.value)));
  const sy = linear(-max, max, h - 18, 8);
  const bw = w / oni.length;
  const lastO = oni[oni.length - 1]!;
  return (
    <div ref={seenRef}>
      <div ref={box} className={`chart ${seen ? "is-seen" : ""}`}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={tr(lang, { en: "El Niño index by season", id: "Indeks El Niño per musim" })}>
          <line className="axis" x1={0} x2={w} y1={sy(0)} y2={sy(0)} />
          <line x1={0} x2={w} y1={sy(0.5)} y2={sy(0.5)} stroke="var(--ember)" strokeOpacity={0.4} strokeDasharray="2 3" />
          {oni.map((o, i) => {
            const y0 = sy(0);
            const y1 = sy(o.value);
            const last = i === oni.length - 1;
            return (
              <g key={`${o.season}${o.year}`}>
                <rect className={o.value >= 0 ? "grow" : ""} style={{ transitionDelay: `${i * 50}ms`, transformOrigin: "50% 100%" }} x={i * bw + bw * 0.18} width={bw * 0.64} y={Math.min(y0, y1)} height={Math.max(1, Math.abs(y1 - y0))} fill={o.value >= 0.5 ? "var(--ember)" : o.value >= 0 ? "var(--smoke)" : "var(--official)"} opacity={last ? 1 : 0.75} rx={1} />
                {last ? (
                  <text x={i * bw + bw / 2} y={y1 - 6} textAnchor="end" dx={bw / 2} className="t-ember t-big val">
                    +{fmtNum(o.value, lang, 2)}
                  </text>
                ) : null}
                {i % 3 === 0 || last ? (
                  <text x={i * bw + bw / 2} y={h - 4} textAnchor="middle" style={{ fontSize: 9.5 }}>
                    {o.season}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="src" style={{ marginTop: 8 }}>
        {tr(lang, { en: "Oceanic Niño Index, 3-month seasons", id: "Indeks Niño Oseanik, musim 3 bulanan" })} ({climate.oni_source ?? "NOAA CPC"}). {tr(lang, { en: "Above +0.5 is El Niño.", id: "Di atas +0,5 berarti El Niño." })} {lastO.season} {lastO.year}.
      </p>
    </div>
  );
}

export function HowBad() {
  const lang = useLang();
  const summary = useReady("summary");
  const season = useReady("season");
  const climate = useReady("climate");
  const [region, setRegion] = useState<RegionCode>("ID");
  const s = useReady("summary") ? summary : null;
  const week = s?.week;
  const regions = week ? (Object.keys(week.regions) as RegionCode[]).filter((r) => REGION_NAMES[r] && week.regions[r]) : [];
  const r = week?.regions[region] ?? week?.regions.ID;
  const loading = !summary;

  if (summary && !week?.regions.ID) return null;

  return (
    <section id="how-bad" className="chapter chapter--2 grain" aria-labelledby="how-bad-h">
      <div className="wrap">
        <ChapterHead
          n="01"
          id="how-bad-h"
          en={["How bad", "is 2026?"]}
          idn={["Seberapa", "parah 2026?"]}
          lede={<T en="Same satellite, same seven days, every year since 2012. It is the only fair way to compare years." id="Satelit yang sama, tujuh hari yang sama, setiap tahun sejak 2012. Hanya dengan cara ini tahun-tahun bisa dibandingkan dengan adil." />}
        />
        {loading ? (
          <Loading />
        ) : r && week ? (
          <div className="grid-2">
            <div className="stack">
              {regions.length > 1 ? (
                <div className="tabs" role="group" aria-label={tr(lang, { en: "Region", id: "Wilayah" })}>
                  {regions.map((k) => (
                    <button key={k} type="button" className="chip" aria-pressed={region === k} onClick={() => setRegion(k)}>
                      {tr(lang, REGION_NAMES[k]!)}
                    </button>
                  ))}
                </div>
              ) : null}
              <Reveal>
                <p className="kicker">
                  {tr(lang, REGION_NAMES[region] ?? REGION_NAMES.ID!)} · {fmtRange(week.start, week.end, lang)} · Suomi-NPP
                </p>
              </Reveal>
              <p className="bignum num">
                {fmtInt(r.count, lang)}
                <Know item={{ ...weekKnow(week.start, week.end, region), value: fmtInt(r.count, lang) }} />
              </p>
              <p className="statement">
                <b>{rankSentence(r, lang)}</b>{" "}
                {r.median > 0
                  ? tr(lang, {
                      en: `That is ${fmtTimes(r.count / r.median, "en")} the median week since 2012 (${fmtInt(r.median, "en")} detections).`,
                      id: `Itu ${fmtTimes(r.count / r.median, "id")} median minggu yang sama sejak 2012 (${fmtInt(r.median, "id")} deteksi).`,
                    })
                  : null}
              </p>
            </div>
            <div className="stack">
              <WeekBars
                key={region}
                rank={r}
                label={tr(lang, {
                  en: `Fire detections in ${REGION_NAMES[region]?.en ?? region}, ${fmtRange(week.start, week.end, "en", false)}, each year since 2012`,
                  id: `Deteksi api di ${REGION_NAMES[region]?.id ?? region}, ${fmtRange(week.start, week.end, "id", false)}, setiap tahun sejak 2012`,
                })}
              />
              <div className="figcap">
                <span className="legend">
                  <span>
                    <i className="sq" style={{ background: "var(--ember)" }} />
                    {Object.keys(r.by_year).sort().slice(-1)[0]}
                  </span>
                  {r.higher.length ? (
                    <span>
                      <i className="sq" style={{ background: "var(--ink)" }} />
                      {tr(lang, { en: "higher years", id: "tahun yang lebih tinggi" })}
                    </span>
                  ) : null}
                  <span>
                    <i className="sq" style={{ background: "var(--ash)", opacity: 0.6 }} />
                    {tr(lang, { en: "other years", id: "tahun lain" })}
                  </span>
                </span>
                <KnowLink item={weekKnow(week.start, week.end, region)} />
              </div>
            </div>
          </div>
        ) : null}

        {season ? (
          <div className="grid-2" style={{ marginTop: "clamp(64px, 9vw, 120px)" }}>
            <div className="stack">
              <h3 className="h3">
                <T en="The season, week by week" id="Musim kebakaran, minggu demi minggu" />
              </h3>
              <p className="prose small">
                <T
                  en="Each line is one year: the running total of the last seven days of detections, from July to December. 2015, the last great fire year, is the white line."
                  id="Setiap garis adalah satu tahun: total deteksi tujuh hari terakhir, dari Juli sampai Desember. 2015, tahun kebakaran besar terakhir, adalah garis putih."
                />
              </p>
              {season.coverage_2026 ? (
                <p className="src">
                  {tr(lang, {
                    en: `2026 is drawn only where our archive has seven straight days (${fmtRange(season.coverage_2026[0], season.coverage_2026[1], "en")}).`,
                    id: `2026 hanya digambar pada tanggal yang punya tujuh hari berturut-turut di arsip kami (${fmtRange(season.coverage_2026[0], season.coverage_2026[1], "id")}).`,
                  })}
                </p>
              ) : null}
              {climate?.oni?.length ? (
                <div className="stack" style={{ marginTop: 18 }}>
                  <h3 className="h3">
                    <T en="Why this year" id="Kenapa tahun ini" />
                  </h3>
                  <p className="prose small">
                    {tr(lang, {
                      en: `El Niño dries Indonesia out. The Pacific index reached +${fmtNum(climate.oni[climate.oni.length - 1]!.value, "en", 2)} for ${climate.oni[climate.oni.length - 1]!.season} ${climate.oni[climate.oni.length - 1]!.year}${climate.iod ? `, and the Indian Ocean Dipole was +${fmtNum(climate.iod.value, "en", 2)} (${climate.iod.source})` : ""}. Both mean less rain over Sumatra and Kalimantan.`,
                      id: `El Niño membuat Indonesia kering. Indeks Pasifik mencapai +${fmtNum(climate.oni[climate.oni.length - 1]!.value, "id", 2)} untuk ${climate.oni[climate.oni.length - 1]!.season} ${climate.oni[climate.oni.length - 1]!.year}${climate.iod ? `, dan Indian Ocean Dipole +${fmtNum(climate.iod.value, "id", 2)} (${climate.iod.source})` : ""}. Keduanya berarti lebih sedikit hujan di Sumatera dan Kalimantan.`,
                    })}
                  </p>
                  <OniStrip climate={climate} />
                  {climate.notes?.map((n) => (
                    <p key={n.en} className="src">
                      {tr(lang, n)}{" "}
                      {n.url ? (
                        <a href={n.url} target="_blank" rel="noopener noreferrer">
                          {tr(lang, { en: "Source", id: "Sumber" })}
                        </a>
                      ) : null}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="stack">
              <SeasonChart season={season} region={region} highlight={[2015, 2019, 2023]} />
              <div className="figcap">
                <span className="legend">
                  <span>
                    <i style={{ background: "var(--ember)" }} />2026
                  </span>
                  <span>
                    <i style={{ background: "var(--ink)" }} />2015
                  </span>
                  <span>
                    <i style={{ background: "var(--smoke)" }} />2019, 2023
                  </span>
                  <span>
                    <i style={{ background: "var(--ash)", opacity: 0.5 }} />
                    {tr(lang, { en: "other years", id: "tahun lain" })}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <PolicyCheck chapter="how-bad" />
      </div>
    </section>
  );
}
