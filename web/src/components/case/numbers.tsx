"use client";
import { useMemo } from "react";
import { useSeen } from "@/components/charts/util";
import { Know, type KnowItem } from "@/components/site/know";
import { useData, useReady, type Claim, type Numbers, type Pair, type Provinces, type Summary } from "@/lib/data";
import { dayOfYear, fmtDay, fmtInt, fmtRange, fmtTimes, monthShort, parseDay } from "@/lib/format";
import { T, tr, useLang, type Lang } from "@/lib/i18n";
import { ChapterHead, Loading } from "./chapter";
import { PolicyCheck } from "./policy-check";

/* --------------------------------------------------------- placeholders --------------------------------------------------------- */

/** Fills {det_YYYY-MM-DD}, {rank_ID-XX}, {of}, {week3_ID-XX} and {week} from the other files. Null if any is unknown. */
export function fillTemplate(text: string, lang: Lang, ctx: { numbers: Numbers | null; provinces: Provinces | null; summary: Summary | null }): string | null {
  let ok = true;
  const out = text.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const k = key.trim();
    let v: string | null = null;
    if (k.startsWith("det_")) {
      const n = ctx.numbers?.detections_by_day_all3?.[k.slice(4)];
      if (typeof n === "number") v = fmtInt(n, lang);
    } else if (k.startsWith("rank_")) {
      const p = ctx.provinces?.provinces.find((x) => x.id === k.slice(5));
      if (p?.snpp_week) v = lang === "id" ? String(p.snpp_week.rank) : String(p.snpp_week.rank);
    } else if (k === "of") {
      const p = ctx.provinces?.provinces.find((x) => x.snpp_week);
      v = p?.snpp_week ? String(p.snpp_week.of) : ctx.summary?.week?.regions.ID ? String(ctx.summary.week.regions.ID.of) : null;
    } else if (k.startsWith("week3_")) {
      const p = ctx.provinces?.provinces.find((x) => x.id === k.slice(6));
      if (p?.week_7d) v = fmtInt(Object.values(p.week_7d).reduce<number>((a, b) => a + (b ?? 0), 0), lang);
    } else if (k === "week") {
      const w = ctx.summary?.week;
      if (w) v = fmtRange(w.start, w.end, lang);
    }
    if (v == null) ok = false;
    return v ?? "";
  });
  return ok ? out : null;
}

/* ------------------------------------------------------------ timeline ------------------------------------------------------------ */

const YEAR_START = "2026-01-01";
function pos(d: string, endDoy: number) {
  return (Math.max(0, Math.min(endDoy, dayOfYear(d) + 1)) / endDoy) * 100;
}

function estimateKnow(e: Numbers["estimates"][number], lang: Lang): KnowItem {
  return {
    title: { en: e.source, id: e.source },
    value: `${fmtInt(e.hectares, lang)} ha`,
    source: { en: e.source, id: e.source },
    window: { en: fmtRange(e.window[0], e.window[1], "en"), id: fmtRange(e.window[0], e.window[1], "id") },
    method: { en: e.method ?? "As published.", id: e.method ?? "Sesuai publikasi." },
    note: e.note_en || e.note_id ? { en: e.note_en ?? e.note_id ?? "", id: e.note_id ?? e.note_en ?? "" } : undefined,
    links: e.url ? [{ label: (() => { try { return new URL(e.url).hostname.replace(/^www\./, ""); } catch { return e.url; } })(), href: e.url }] : undefined,
    anchor: "burned-area",
  };
}

function Timeline({ numbers, asOf }: { numbers: Numbers; asOf: string }) {
  const lang = useLang();
  const [ref, seen] = useSeen<HTMLDivElement>(0.25);
  const end = (() => {
    const p = parseDay(asOf);
    return p ? dayOfYear(`${p.y}-${String(p.m + 1).padStart(2, "0")}-01`) + 31 : 304;
  })();
  const ests = numbers.estimates
    .filter((e) => Array.isArray(e.window) && e.window.length === 2 && Number.isFinite(e.hectares))
    .slice()
    .sort((a, b) => (a.window[1] < b.window[1] ? -1 : a.window[1] > b.window[1] ? 1 : a.kind === "official" ? -1 : b.kind === "official" ? 1 : a.hectares - b.hectares));
  const official = ests.filter((e) => e.kind === "official");
  const officialEnd = official.reduce((m, e) => (e.window[1] > m ? e.window[1] : m), "");
  const monthly = numbers.monthly_sipongi_n20_high ?? {};
  const months = Object.entries(monthly)
    .filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && typeof v === "number")
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const mMax = Math.max(1, ...months.map(([, v]) => v));
  const monthStarts = Array.from({ length: 12 }, (_, m) => `2026-${String(m + 1).padStart(2, "0")}-01`).filter((d) => dayOfYear(d) < end);
  const asOfMonth = asOf.slice(0, 7);
  const aug = officialEnd ? { a: pos(officialEnd, end), b: pos(`${officialEnd.slice(0, 5)}${String(Number(officialEnd.slice(5, 7)) + 1).padStart(2, "0")}-31`, end) } : null;

  return (
    <div ref={ref} className={`est ${seen ? "is-seen" : ""}`}>
      <div className="est__grid" aria-hidden="true">
        {monthStarts.map((d, i) => (
          <span key={d} className="est__month" style={{ left: `${pos(d, end) - (100 / end)}%` }}>
            <span>{monthShort(i, lang)}</span>
          </span>
        ))}
        {aug ? <span className="est__gap" style={{ left: `${aug.a}%`, width: `${Math.max(0, aug.b - aug.a)}%` }} /> : null}
        {officialEnd ? (
          <span className="est__cut" style={{ left: `${pos(officialEnd, end)}%` }}>
            <span>{tr(lang, { en: "Official figure stops", id: "Angka resmi berhenti" })}</span>
          </span>
        ) : null}
      </div>
      <ol className="est__rows">
        {ests.map((e, i) => {
          const a = pos(e.window[0], end) - 100 / end;
          const b = pos(e.window[1], end);
          return (
            <li key={`${e.source}${e.window[1]}${i}`} className={`est__row est__row--${e.kind === "official" ? "official" : "independent"}`}>
              <div className="est__label">
                <b className="num">
                  {fmtInt(e.hectares, lang)} <small>ha</small>
                </b>
                <span className="est__src">{e.source}</span>
                <span className={`est__kind`}>{e.kind === "official" ? tr(lang, { en: "Official", id: "Resmi" }) : tr(lang, { en: "Independent", id: "Independen" })}</span>
                <Know item={estimateKnow(e, lang)} />
              </div>
              <div className="est__track">
                <span className="est__bar" style={{ left: `${Math.max(0, a)}%`, width: `${Math.max(1, b - a)}%`, transitionDelay: `${i * 70}ms` }} />
                <span className="est__end mono" style={{ left: `${b}%` }}>
                  {fmtDay(e.window[1], lang, false)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {months.length ? (
        <div className="est__months">
          <p className="kicker" style={{ marginBottom: 10 }}>
            {tr(lang, { en: "Hotspots per month, NOAA-20 high confidence (SiPongi's own chart)", id: "Titik panas per bulan, NOAA-20 keyakinan tinggi (grafik SiPongi sendiri)" })}
            <Know
              item={{
                title: { en: "Hotspots per month in SiPongi", id: "Titik panas per bulan di SiPongi" },
                source: { en: "SiPongi (Kementerian Kehutanan) chart data. Sumber: SIPONGI KEMENHUT", id: "Data grafik SiPongi (Kementerian Kehutanan). Sumber: SIPONGI KEMENHUT" },
                window: { en: "January to October 2026; October is the month so far", id: "Januari sampai Oktober 2026; Oktober adalah bulan berjalan" },
                method: { en: "SiPongi's monthly series counts NOAA-20 detections with high confidence only, so it is far smaller than the all-satellite counts elsewhere on this page. It is used here only to show when the fires grew.", id: "Seri bulanan SiPongi hanya menghitung deteksi NOAA-20 dengan keyakinan tinggi, jadi jauh lebih kecil dari hitungan semua satelit di bagian lain halaman ini. Di sini hanya dipakai untuk menunjukkan kapan api membesar." },
                links: [{ label: "sipongi.gakkum.kehutanan.go.id", href: "https://sipongi.gakkum.kehutanan.go.id/" }],
                anchor: "burned-area",
              }}
            />
          </p>
          <div className="est__mbars">
            {months.map(([k, v], i) => {
              const m = Number(k.slice(5, 7)) - 1;
              const a = pos(`${k}-01`, end) - 100 / end;
              const partial = k === asOfMonth;
              return (
                <div key={k} className={`est__mbar ${partial ? "is-partial" : ""}`} style={{ left: `${a}%`, width: `${(100 * 28) / end}%` }}>
                  <span className="est__mfill" style={{ height: `${(v / mMax) * 100}%`, transitionDelay: `${300 + i * 60}ms` }} />
                  {v / mMax > 0.08 || m >= 6 ? (
                    <span className="est__mval num" style={{ bottom: `calc(${(v / mMax) * 100}% + 3px)` }}>
                      {fmtInt(v, lang)}
                    </span>
                  ) : null}
                  <span className="sr-only">
                    {monthShort(m, lang)}: {fmtInt(v, lang)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="src" style={{ marginTop: 8 }}>
            {tr(lang, { en: `${monthShort(Number(asOfMonth.slice(5, 7)) - 1, "en")} is the month so far.`, id: `${monthShort(Number(asOfMonth.slice(5, 7)) - 1, "id")} adalah bulan berjalan.` })} {tr(lang, { en: "Sumber: SIPONGI KEMENHUT", id: "Sumber: SIPONGI KEMENHUT" })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- Jambi -------------------------------------------------------------- */

function PairSquares({ pair }: { pair: Pair }) {
  const lang = useLang();
  const [ref, seen] = useSeen<HTMLDivElement>(0.4);
  const big = Math.max(pair.official.hectares, pair.independent.hectares);
  const side = (ha: number) => Math.sqrt(ha / big) * 100;
  const ratio = pair.independent.hectares / Math.max(1, pair.official.hectares);
  const place = tr(lang, { en: pair.place_en, id: pair.place_id });
  return (
    <div ref={ref} className={`pair ${seen ? "is-seen" : ""}`}>
      <div className="pair__fig" aria-hidden="true">
        <span className="pair__sq pair__sq--ind" style={{ width: `${side(pair.independent.hectares)}%` }} />
        <span className="pair__sq pair__sq--off" style={{ width: `${side(pair.official.hectares)}%` }} />
      </div>
      <div className="pair__text">
        <p className="kicker">{place}</p>
        <div className="pair__nums">
          <div>
            <p className="bignum bignum--official num" style={{ fontSize: "clamp(40px, 7vw, 72px)" }}>
              {fmtInt(pair.official.hectares, lang)}
              <span className="bignum__unit">ha</span>
            </p>
            <p className="small">
              {pair.official.source}
              {pair.official.until ? `, ${tr(lang, { en: "to", id: "sampai" })} ${fmtDay(pair.official.until, lang)}` : ""}
            </p>
          </div>
          <div>
            <p className="bignum num" style={{ fontSize: "clamp(40px, 7vw, 72px)" }}>
              {fmtInt(pair.independent.hectares, lang)}
              <span className="bignum__unit">ha</span>
            </p>
            <p className="small">
              {pair.independent.source}
              {pair.independent.until ? `, ${tr(lang, { en: "to", id: "sampai" })} ${pair.independent.until_note && lang === "en" ? pair.independent.until_note : fmtDay(pair.independent.until, lang)}` : ""}
            </p>
          </div>
        </div>
        <p className="statement">
          <b>{fmtTimes(ratio, lang)}</b> {tr(lang, { en: "the official area, mapped from satellite images.", id: "luas resmi, dipetakan dari citra satelit." })}
        </p>
        {pair.note_en ? <p className="small">{tr(lang, { en: pair.note_en, id: pair.note_id ?? pair.note_en })}</p> : null}
        <p className="src">
          {[pair.official.url, pair.independent.url].filter(Boolean).map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{ marginRight: 12 }}>
              {i === 0 ? tr(lang, { en: "Official source", id: "Sumber resmi" }) : tr(lang, { en: "Independent source", id: "Sumber independen" })}
            </a>
          ))}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- claims ------------------------------------------------------------- */

function ClaimRow({ c, ctx }: { c: Claim; ctx: Parameters<typeof fillTemplate>[2] }) {
  const lang = useLang();
  const check = fillTemplate(lang === "id" ? c.check_id || c.check_en : c.check_en || c.check_id, lang, ctx);
  if (check == null) return null;
  return (
    <li className="claim">
      <p className="claim__meta mono">
        {fmtDay(c.date, lang)} · {c.who}
      </p>
      <blockquote className="claim__quote">
        <p>&ldquo;{lang === "id" ? c.claim_id || c.claim_en : c.claim_en || c.claim_id}&rdquo;</p>
      </blockquote>
      <div className="claim__check">
        <p className="kicker">{tr(lang, { en: "What the data says", id: "Kata data" })}</p>
        <p>{check}</p>
      </div>
      <p className="src">
        {c.url ? (
          <a href={c.url} target="_blank" rel="noopener noreferrer">
            {tr(lang, { en: "The claim", id: "Klaimnya" })}
          </a>
        ) : null}
        {c.check_url && c.check_url !== c.url ? (
          <a href={c.check_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 14 }}>
            {tr(lang, { en: "The check", id: "Pemeriksaannya" })}
          </a>
        ) : null}
      </p>
    </li>
  );
}

export function NumbersWar() {
  const lang = useLang();
  const numbersState = useData("numbers");
  const numbers = numbersState.status === "ready" ? numbersState.data : null;
  const summary = useReady("summary");
  const provinces = useReady("provinces");
  const ctx = useMemo(() => ({ numbers, provinces, summary }), [numbers, provinces, summary]);
  const loading = numbersState.status === "loading";
  if (numbersState.status === "missing") return null;
  const ests = numbers?.estimates?.filter((e) => Number.isFinite(e.hectares)) ?? [];
  if (numbers && !ests.length) return null;
  const off = ests.filter((e) => e.kind === "official").sort((a, b) => (a.window[1] < b.window[1] ? 1 : -1))[0];
  const ind = ests.filter((e) => e.kind !== "official").sort((a, b) => b.hectares - a.hectares)[0];
  const asOf = summary?.as_of ?? numbers?.generated_at?.slice(0, 10) ?? YEAR_START;

  return (
    <section id="numbers" className="chapter haze" aria-labelledby="numbers-h">
      <div className="wrap">
        <ChapterHead n="02" id="numbers-h" en={["The numbers war,", "refereed"]} idn={["Perang angka,", "kami jadi wasitnya"]} />
        {loading ? (
          <Loading />
        ) : (
          <>
            {off && ind ? (
              <div className="grid-2" style={{ marginBottom: "clamp(40px, 6vw, 72px)" }}>
                <p className="statement">
                  {tr(lang, { en: "Official: ", id: "Resmi: " })}
                  <b className="official">{fmtInt(off.hectares, lang)} ha</b>
                  {tr(lang, { en: `, counted to ${fmtDay(off.window[1], "en")}. Independent satellite maps: up to `, id: `, data sampai ${fmtDay(off.window[1], "id")}. Peta satelit independen: hingga ` })}
                  <b>{fmtInt(ind.hectares, lang)} ha</b>
                  {tr(lang, { en: `, counted to ${fmtDay(ind.window[1], "en")}.`, id: `, data sampai ${fmtDay(ind.window[1], "id")}.` })}
                </p>
                <div className="prose">
                  <p>
                    <T
                      en="Line every estimate up by the months it covers and most of the gap closes. Where the months match, the figures are close. The official ledger simply stops before August, the month the fires exploded."
                      id="Susun setiap perkiraan menurut bulan yang dicakupnya, dan sebagian besar selisihnya tertutup. Kalau bulannya sama, angkanya berdekatan. Catatan resmi berhenti sebelum Agustus, bulan ketika api meledak."
                    />
                  </p>
                </div>
              </div>
            ) : null}
            <Timeline numbers={numbers!} asOf={asOf} />
            {numbers!.pairs?.length ? (
              <div style={{ marginTop: "clamp(64px, 9vw, 120px)" }} className="stack">
                <h3 className="h3">
                  <T en="Where the months match and the numbers still do not" id="Bulannya sama, angkanya tetap tidak cocok" />
                </h3>
                {numbers!.pairs.map((p) => (
                  <PairSquares key={p.place_en} pair={p} />
                ))}
              </div>
            ) : null}
            {numbers!.claims?.length ? (
              <div style={{ marginTop: "clamp(64px, 9vw, 120px)" }} className="stack">
                <h3 className="h3">
                  <T en="Claims, checked" id="Klaim, diperiksa" />
                </h3>
                <p className="prose small">
                  <T en="Official statements quoted word for word, with the date, next to what the data says." id="Pernyataan resmi dikutip kata per kata, dengan tanggalnya, di samping apa kata data." />
                </p>
                <ol className="claims">
                  {numbers!.claims.map((c) => (
                    <ClaimRow key={c.date + c.who} c={c} ctx={ctx} />
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        )}
        <PolicyCheck chapter="numbers" />
      </div>
    </section>
  );
}
