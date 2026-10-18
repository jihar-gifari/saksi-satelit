"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "motion/react";
import { useSeen, useWidth, linear } from "@/components/charts/util";
import { Know, KnowLink } from "@/components/site/know";
import { useData, useReady, type Satellites } from "@/lib/data";
import { fmtAxis, fmtDay, fmtInt, fmtPct } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { EASE, motionOff, usePaused } from "@/lib/motion";
import { ChapterHead, Loading } from "./chapter";
import { PolicyCheck } from "./policy-check";

const SATS = [
  { k: "0", name: "Suomi-NPP", since: { en: "launched 2011 · stops 2 Nov", id: "diluncurkan 2011 · berhenti 2 Nov" } },
  { k: "1", name: "NOAA-20", since: { en: "launched 2017", id: "diluncurkan 2017" } },
  { k: "2", name: "NOAA-21", since: { en: "launched 2022", id: "diluncurkan 2022" } },
] as const;
const CONFS = [
  { k: "1", en: "Nominal", id: "Nominal" },
  { k: "2", en: "High", id: "Tinggi" },
] as const;
type Key = `${"0" | "1" | "2"}:${"1" | "2"}`;
const ALL: Key[] = ["0:1", "0:2", "1:1", "1:2", "2:1", "2:2"];

function value(sat: Satellites, keys: Set<Key>, dayIdx: number) {
  let n = 0;
  for (const k of keys) {
    const [s, c] = k.split(":") as ["0" | "1" | "2", "1" | "2"];
    n += sat.counts[s]?.[c]?.[dayIdx] ?? 0;
  }
  return n;
}

function Ticker({ n }: { n: number }) {
  const lang = useLang();
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(n);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (motionOff()) {
      el.textContent = fmtInt(n, lang);
      prev.current = n;
      return;
    }
    const c = animate(prev.current, n, { duration: 0.7, ease: EASE, onUpdate: (v) => (el.textContent = fmtInt(v, lang)) });
    prev.current = n;
    return () => c.stop();
  }, [n, lang]);
  return <span ref={ref}>{fmtInt(n, lang)}</span>;
}

function DayBars({ sat, keys, exampleIdx }: { sat: Satellites; keys: Set<Key>; exampleIdx: number }) {
  const lang = useLang();
  const [box, w] = useWidth<HTMLDivElement>();
  const [seenRef, seen] = useSeen<HTMLDivElement>(0.4);
  const allMax = Math.max(...sat.days.map((_, i) => value(sat, new Set(ALL), i)));
  const h = 150;
  const sy = linear(0, allMax, h - 22, 14);
  const bw = w / sat.days.length;
  return (
    <div ref={seenRef}>
      <div ref={box} className={`chart ${seen ? "is-seen" : ""}`}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={tr(lang, { en: "Detections per day for the chosen satellites and confidence levels", id: "Deteksi per hari untuk satelit dan tingkat keyakinan yang dipilih" })}>
          {sat.days.map((d, i) => {
            const vAll = value(sat, new Set(ALL), i);
            const v = value(sat, keys, i);
            const x = i * bw + bw * 0.16;
            const bwi = bw * 0.68;
            return (
              <g key={d}>
                <rect x={x} y={sy(vAll)} width={bwi} height={h - 22 - sy(vAll)} fill="none" stroke="var(--night-control)" strokeDasharray="2 3" rx={2} />
                <rect className="grow" style={{ transition: "y 0.5s var(--ease), height 0.5s var(--ease), transform 0.9s var(--ease)", transitionDelay: `${i * 40}ms` }} x={x} y={sy(v)} width={bwi} height={Math.max(0.5, h - 22 - sy(v))} fill="var(--ember)" opacity={i === exampleIdx ? 1 : 0.42} rx={2} />
                <text x={x + bwi / 2} y={h - 6} textAnchor="middle" className={i === exampleIdx ? "t-ember" : undefined}>
                  {fmtDay(d, lang, false).replace(/ \S+$/, "")}
                </text>
                {i === exampleIdx ? (
                  <text x={x + bwi / 2} y={sy(v) - 5} textAnchor="middle" className="t-ember val">
                    {fmtAxis(v, lang)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function useCountdown(target: string | undefined) {
  const paused = usePaused();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (paused) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [paused]);
  if (!target || now == null) return null;
  const end = new Date(`${target}T00:00:00+07:00`).getTime();
  const ms = Math.max(0, end - now);
  return { d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000), m: Math.floor((ms % 3600000) / 60000), s: Math.floor((ms % 60000) / 1000), done: ms === 0 };
}

export function Count() {
  const lang = useLang();
  const satState = useData("satellites");
  const sat = satState.status === "ready" ? satState.data : null;
  const summary = useReady("summary");
  const [keys, setKeys] = useState<Set<Key>>(() => new Set(ALL));
  const snppEnd = sat?.snpp_end ?? summary?.snpp_end;
  const cd = useCountdown(snppEnd);
  const paused = usePaused();
  const exIdx = sat?.example_day ? sat.days.indexOf(sat.example_day) : -1;
  const idx = exIdx >= 0 ? exIdx : (sat?.days.length ?? 1) - 1;
  const n = sat ? value(sat, keys, idx) : 0;
  const shares = useMemo(() => {
    if (!sat) return null;
    const tot = (s: "0" | "1" | "2") => ["1", "2"].reduce((a, c) => a + (sat.counts[s]?.[c as "1" | "2"]?.reduce((x, y) => x + y, 0) ?? 0), 0);
    const t = { "0": tot("0"), "1": tot("1"), "2": tot("2") };
    const all = t["0"] + t["1"] + t["2"];
    return all ? { "0": t["0"] / all, "1": t["1"] / all, "2": t["2"] / all } : null;
  }, [sat]);
  if (satState.status === "loading") {
    return (
      <section id="count" className="chapter grain">
        <div className="wrap">
          <Loading />
        </div>
      </section>
    );
  }
  if (!sat || !sat.example) return null;
  const ex = sat.example;
  const toggle = (k: Key) =>
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const preset = (ks: Key[]) => setKeys(new Set(ks));
  const same = (ks: Key[]) => ks.length === keys.size && ks.every((k) => keys.has(k));
  const day = fmtDay(sat.days[idx]!, lang);

  return (
    <section id="count" className="chapter grain" aria-labelledby="count-h">
      <div className="wrap">
        <ChapterHead
          n="04"
          id="count-h"
          en={[`${fmtInt(ex.n20_high, "en")} or`, `${fmtInt(ex.all, "en")}?`]}
          idn={[`${fmtInt(ex.n20_high, "id")} atau`, `${fmtInt(ex.all, "id")}?`]}
          lede={
            <span>
              {tr(lang, {
                en: `Two honest counts of hotspots in Indonesia on ${day}. The difference is which satellites you add up and which confidence levels you keep. Try it.`,
                id: `Dua hitungan titik panas yang sama-sama jujur untuk Indonesia pada ${day}. Bedanya ada pada satelit mana yang dijumlahkan dan tingkat keyakinan mana yang dipakai. Coba sendiri.`,
              })}
            </span>
          }
        />
        <div className="grid-2">
          <div className="stack">
            <div className="matrix" role="group" aria-label={tr(lang, { en: "Satellites and confidence levels", id: "Satelit dan tingkat keyakinan" })}>
              <span className="matrix__h">{tr(lang, { en: "Satellite", id: "Satelit" })}</span>
              {CONFS.map((c) => (
                <span key={c.k} className="matrix__h">
                  {tr(lang, { en: `${c.en} confidence`, id: `Keyakinan ${c.id.toLowerCase()}` })}
                </span>
              ))}
              {SATS.map((s) => (
                <div key={s.k} style={{ display: "contents" }}>
                  <span className="matrix__sat">
                    {s.name}
                    <small>{tr(lang, s.since)}</small>
                  </span>
                  {CONFS.map((c) => {
                    const k = `${s.k}:${c.k}` as Key;
                    const on = keys.has(k);
                    const v = sat.counts[s.k]?.[c.k]?.[idx] ?? 0;
                    return (
                      <button key={k} type="button" className={`cell ${s.k === "0" ? "is-dying" : ""}`} aria-pressed={on} onClick={() => toggle(k)} aria-label={`${s.name}, ${tr(lang, { en: c.en, id: c.id })}: ${fmtInt(v, lang)}`}>
                        <b className="num">{fmtInt(v, lang)}</b>
                        <span>{on ? tr(lang, { en: "counted", id: "dihitung" }) : tr(lang, { en: "left out", id: "tidak dihitung" })}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="chips">
              <button type="button" className="chip" aria-pressed={same(["1:2"])} onClick={() => preset(["1:2"])}>
                {tr(lang, { en: "NOAA-20, high only", id: "NOAA-20, tinggi saja" })}
              </button>
              <button type="button" className="chip" aria-pressed={same(ALL)} onClick={() => preset(ALL)}>
                {tr(lang, { en: "Everything", id: "Semuanya" })}
              </button>
              <button type="button" className="chip" aria-pressed={same(["1:1", "1:2", "2:1", "2:2"])} onClick={() => preset(["1:1", "1:2", "2:1", "2:2"])}>
                {tr(lang, { en: "After 2 Nov (no Suomi-NPP)", id: "Setelah 2 Nov (tanpa Suomi-NPP)" })}
              </button>
            </div>
            <p className="src">
              <T en="SiPongi's monthly chart counts NOAA-20 high confidence only. Low-confidence detections are left out everywhere on this page." id="Grafik bulanan SiPongi hanya menghitung NOAA-20 keyakinan tinggi. Deteksi berkeyakinan rendah tidak dihitung di seluruh halaman ini." />
            </p>
          </div>
          <div className="stack">
            <p className="kicker">
              {day} · {tr(lang, { en: "your count", id: "hitunganmu" })}
            </p>
            <p className="bignum num" aria-live="polite">
              <Ticker n={n} />
              <Know
                item={{
                  title: { en: "Why fire counts disagree", id: "Kenapa hitungan api berbeda" },
                  source: { en: "NASA FIRMS, VIIRS 375 m: Suomi-NPP, NOAA-20, NOAA-21", id: "NASA FIRMS, VIIRS 375 m: Suomi-NPP, NOAA-20, NOAA-21" },
                  window: { en: `${fmtDay(sat.days[0]!, "en")} to ${fmtDay(sat.days[sat.days.length - 1]!, "en")}, by UTC day`, id: `${fmtDay(sat.days[0]!, "id")} sampai ${fmtDay(sat.days[sat.days.length - 1]!, "id")}, per hari UTC` },
                  method: {
                    en: "Each satellite passes over Indonesia about twice a day and reports its own detections. Adding satellites adds passes, so the same fire is counted more than once. Confidence is the satellite's own rating; low is dropped. All of these counts are correct for what they count.",
                    id: "Setiap satelit melintasi Indonesia sekitar dua kali sehari dan melaporkan deteksinya sendiri. Menambah satelit berarti menambah lintasan, jadi api yang sama dihitung lebih dari sekali. Tingkat keyakinan adalah penilaian satelit itu sendiri; yang rendah dibuang. Semua hitungan ini benar untuk apa yang dihitungnya.",
                  },
                  note: sat.note ? { en: sat.note, id: "Hanya Indonesia. Deteksi berkeyakinan rendah tidak dihitung kecuali disebutkan." } : undefined,
                  anchor: "satellites",
                }}
              />
            </p>
            <DayBars sat={sat} keys={keys} exampleIdx={idx} />
            <p className="src">{tr(lang, { en: "Dashed outline: everything counted. Filled: your choice.", id: "Garis putus-putus: semua dihitung. Terisi: pilihanmu." })}</p>
          </div>
        </div>

        {cd && snppEnd ? (
          <div className="countdown" style={{ marginTop: "clamp(56px, 8vw, 104px)" }}>
            <div className="grid-2">
              <div className="stack">
                <h3 className="h3">{cd.done ? tr(lang, { en: "Suomi-NPP has stopped", id: "Suomi-NPP sudah berhenti" }) : tr(lang, { en: "Suomi-NPP stops sending fire data in", id: "Suomi-NPP berhenti mengirim data api dalam" })}</h3>
                {!cd.done ? (
                  <div className="countdown__clock num" aria-label={tr(lang, { en: `${cd.d} days and ${cd.h} hours`, id: `${cd.d} hari dan ${cd.h} jam` })}>
                    <div>
                      <b>{cd.d}</b>
                      <span>{tr(lang, { en: "days", id: "hari" })}</span>
                    </div>
                    <div>
                      <b>{String(cd.h).padStart(2, "0")}</b>
                      <span>{tr(lang, { en: "hours", id: "jam" })}</span>
                    </div>
                    <div>
                      <b>{String(cd.m).padStart(2, "0")}</b>
                      <span>{tr(lang, { en: "min", id: "menit" })}</span>
                    </div>
                    {!paused ? (
                      <div>
                        <b className="ember">{String(cd.s).padStart(2, "0")}</b>
                        <span>{tr(lang, { en: "sec", id: "detik" })}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <p className="prose">
                  {tr(lang, {
                    en: `NASA ends near-real-time Suomi-NPP fire data on ${fmtDay(snppEnd, "en")}. Hotspot totals that include it will fall that week for a purely technical reason. If you see "hotspots are down" headlines in early November, check which satellites were counted.`,
                    id: `NASA menghentikan data api hampir waktu nyata Suomi-NPP pada ${fmtDay(snppEnd, "id")}. Total titik panas yang memakainya akan turun pada minggu itu karena alasan teknis semata. Kalau awal November muncul berita "titik panas turun", cek dulu satelit mana yang dihitung.`,
                  })}
                </p>
              </div>
              <div className="stack">
                {shares ? (
                  <>
                    <p className="kicker">{tr(lang, { en: "Share of this week's detections, by satellite", id: "Porsi deteksi minggu ini, per satelit" })}</p>
                    <div className="share-bar" role="img" aria-label={SATS.map((s) => `${s.name} ${fmtPct(shares[s.k], lang)}`).join(", ")}>
                      {SATS.map((s) => (
                        <div key={s.k} style={{ flex: shares[s.k], background: s.k === "0" ? "repeating-linear-gradient(-45deg, var(--ember) 0 6px, #c94a1c 6px 12px)" : s.k === "1" ? "var(--ink-2)" : "var(--ash)", color: "var(--night)" }}>
                          {s.name} {fmtPct(shares[s.k], lang)}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {typeof sat.snpp_share_all3 === "number" ? (
                  <p className="statement">
                    <b>{fmtPct(sat.snpp_share_all3, lang)}</b>{" "}
                    {tr(lang, { en: "of all detections from the three satellites will vanish.", id: "dari semua deteksi tiga satelit akan hilang." })}
                  </p>
                ) : null}
                {typeof sat.snpp_share_sipongi_viirs === "number" ? (
                  <p className="statement">
                    <b>{fmtPct(sat.snpp_share_sipongi_viirs, lang)}</b>{" "}
                    {tr(lang, {
                      en: "of the VIIRS hotspots SiPongi shows, because it uses Suomi-NPP and NOAA-20 but not NOAA-21.",
                      id: "dari titik panas VIIRS yang ditampilkan SiPongi, karena SiPongi memakai Suomi-NPP dan NOAA-20 tetapi tidak NOAA-21.",
                    })}
                  </p>
                ) : null}
                <KnowLink
                  item={{
                    title: { en: "What vanishes on 2 November", id: "Apa yang hilang pada 2 November" },
                    source: { en: "NASA Earthdata (end of Suomi-NPP near-real-time deliveries); NASA FIRMS counts for the week shown", id: "NASA Earthdata (akhir pengiriman data hampir waktu nyata Suomi-NPP); hitungan NASA FIRMS untuk minggu yang ditampilkan" },
                    window: { en: `${fmtDay(sat.days[0]!, "en")} to ${fmtDay(sat.days[sat.days.length - 1]!, "en")}`, id: `${fmtDay(sat.days[0]!, "id")} sampai ${fmtDay(sat.days[sat.days.length - 1]!, "id")}` },
                    method: {
                      en: "Suomi-NPP's share of all nominal- and high-confidence detections from the three satellites over the week. For SiPongi, Suomi-NPP's share of the VIIRS detections from the satellites it uses (Suomi-NPP and NOAA-20). One source gives 1 November for the end date.",
                      id: "Porsi Suomi-NPP dari semua deteksi berkeyakinan nominal dan tinggi dari tiga satelit selama minggu itu. Untuk SiPongi, porsi Suomi-NPP dari deteksi VIIRS satelit yang dipakainya (Suomi-NPP dan NOAA-20). Satu sumber menyebut 1 November sebagai tanggal akhirnya.",
                    },
                    links: [{ label: "earthdata.nasa.gov", href: "https://www.earthdata.nasa.gov/data/instruments/viirs/land-near-real-time-data" }],
                    anchor: "satellites",
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
        <PolicyCheck chapter="count" />
      </div>
    </section>
  );
}
