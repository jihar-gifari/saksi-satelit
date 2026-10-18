"use client";
import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { sceneStore, useSceneState } from "@/components/map/scene";
import { Know } from "@/components/site/know";
import { useReady } from "@/lib/data";
import { fmtAgo, fmtDay, fmtInt, fmtWib } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { EASE, motionOff, useStill } from "@/lib/motion";
import { MapWindow } from "./window";

/** Server-rendered kinetic letters (CSS animation), so the title never waits for JavaScript. */
export function KineticTitle({ rows }: { rows: string[] }) {
  let i = 0;
  return (
    <h1 className="hero__title">
      <span className="sr-only">{rows.join(" ")}</span>
      {rows.map((row, r) => (
        <span key={row} aria-hidden="true" className={`row row--${r === 0 ? "a" : "b"}`}>
          {Array.from(row).map((ch, k) => (
            <span key={k} className="letter-in" style={{ ["--i" as string]: i++ } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}

function CountUp({ value, start }: { value: number; start: boolean }) {
  const lang = useLang();
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!start || done.current || motionOff()) {
      el.textContent = fmtInt(value, lang);
      if (start) done.current = true;
      return;
    }
    done.current = true;
    const c = animate(0, value, { duration: 2.4, ease: EASE, onUpdate: (v) => (el.textContent = fmtInt(v, lang)) });
    return () => c.stop();
  }, [value, start, lang]);
  return <span ref={ref} className="num" />;
}

function HotspotNote() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <div className="note" ref={box}>
      <button type="button" className="chip" aria-expanded={open} aria-controls="hotspot-note" onClick={() => setOpen((v) => !v)}>
        {tr(lang, { en: "What is a hotspot?", id: "Apa itu titik panas?" })}
      </button>
      {open ? (
        <div id="hotspot-note" className="note__panel" role="region" aria-label={tr(lang, { en: "What is a hotspot?", id: "Apa itu titik panas?" })}>
          <h3>{tr(lang, { en: "A hotspot is a measurement of heat", id: "Titik panas adalah pengukuran panas" })}</h3>
          <p>
            {tr(lang, {
              en: "A satellite passes overhead and flags a 375-metre square that is much hotter than its surroundings. One large fire makes many hotspots. A small or smouldering peat fire under smoke or cloud can make none.",
              id: "Satelit melintas dan menandai kotak berukuran 375 meter yang jauh lebih panas dari sekitarnya. Satu kebakaran besar bisa menghasilkan banyak titik panas. Api gambut yang kecil atau membara di bawah asap atau awan bisa tidak terdeteksi sama sekali.",
            })}
          </p>
          <p>
            {tr(lang, {
              en: "Hotspots show where and when there was fire. They do not measure burned area, and they do not show who started a fire.",
              id: "Titik panas menunjukkan di mana dan kapan ada api. Titik panas tidak mengukur luas lahan terbakar, dan tidak menunjukkan siapa yang menyalakan api.",
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function Hero() {
  const lang = useLang();
  const summary = useReady("summary");
  const hotspots = useReady("hotspots");
  const replay = useSceneState((s) => s.replay);
  const ready = useSceneState((s) => s.ready);
  const failed = useSceneState((s) => s.failed);
  const smoke = useSceneState((s) => s.smoke);
  const still = useStill();
  const last = summary?.last24h;

  const clock = (() => {
    if (!hotspots) return null;
    const a = new Date(hotspots.start).getTime();
    const b = new Date(hotspots.end).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const t = new Date(a + (b - a) * Math.max(0, Math.min(1, replay)));
    return t.toISOString();
  })();

  const regions = last?.by_region;
  const regionLine = regions
    ? (
        [
          ["KAL", "Kalimantan", "Kalimantan"],
          ["PAP", "Papua", "Papua"],
          ["SUM", "Sumatra", "Sumatera"],
        ] as const
      )
        .filter(([k]) => typeof regions[k] === "number")
        .map(([k, en, id]) => `${lang === "id" ? id : en} ${fmtInt(regions[k]!, lang)}`)
        .join(" · ")
    : "";

  return (
    <MapWindow id="top" scene="hero" className="hero-window" labelledBy="hero-title">
      <div className="hero wrap" id="hero-title">
        <div className="hero__top">
          <p className="kicker rise-in" style={{ ["--d" as string]: "0.1s" } as React.CSSProperties}>
            <T en="Case 01 · Karhutla 2026 · Indonesia's forest and land fires" id="Kasus 01 · Karhutla 2026 · Kebakaran hutan dan lahan Indonesia" />
          </p>
          <KineticTitle rows={["Saksi", "Satelit"]} />
          <div className="hero__tag rise-in" style={{ ["--d" as string]: "1.05s" } as React.CSSProperties}>
            <p className="hero__tag-main">
              <T en="What the satellites saw." id="Apa yang dilihat satelit." />
            </p>
            <p className="hero__tag-alt">
              <T en="Apa yang dilihat satelit" id="What the satellites saw" />
            </p>
          </div>
          {clock && !failed ? (
            <p className="hero__replay" aria-live="off">
              <span className="dot" aria-hidden="true" />
              {replay < 1 && !still && ready
                ? `${tr(lang, { en: "Replaying the last 48 hours", id: "Memutar ulang 48 jam terakhir" })} · ${fmtWib(clock, lang)}`
                : `${tr(lang, { en: "Every glow is a detection from the last 48 hours, to", id: "Setiap cahaya adalah deteksi dalam 48 jam terakhir, sampai" })} ${fmtWib(hotspots!.end, lang)}`}
            </p>
          ) : null}
        </div>
        <div />
        <div className="hero__bottom">
          {last && typeof last.total === "number" ? (
            <div className="counter rise-in" style={{ ["--d" as string]: "1.3s" } as React.CSSProperties}>
              <p className="counter__n">
                <CountUp value={last.total} start={ready || failed || still} />
                <Know
                  item={{
                    title: { en: "Hotspots in the last 24 hours", id: "Titik panas dalam 24 jam terakhir" },
                    value: fmtInt(last.total, lang),
                    source: { en: "NASA FIRMS, VIIRS 375 m active fire detections from Suomi-NPP, NOAA-20 and NOAA-21", id: "NASA FIRMS, deteksi api aktif VIIRS 375 m dari Suomi-NPP, NOAA-20 dan NOAA-21" },
                    window: { en: `${fmtWib(last.start, "en")} to ${fmtWib(last.end, "en")}`, id: `${fmtWib(last.start, "id")} sampai ${fmtWib(last.end, "id")}` },
                    method: {
                      en: "Every detection over Indonesian land from the three satellites, nominal and high confidence (low confidence is dropped). The same fire seen by two satellites counts twice: this counts detections, not fires.",
                      id: "Semua deteksi di daratan Indonesia dari tiga satelit, tingkat keyakinan nominal dan tinggi (keyakinan rendah dibuang). Api yang sama yang terlihat oleh dua satelit dihitung dua kali: ini menghitung deteksi, bukan jumlah kebakaran.",
                    },
                    links: [{ label: "firms.modaps.eosdis.nasa.gov", href: "https://firms.modaps.eosdis.nasa.gov/" }],
                    anchor: "hotspots",
                  }}
                />
              </p>
              <p className="counter__label">
                <T en="hotspots detected by satellite over Indonesia in the last 24 hours" id="titik panas terdeteksi satelit di Indonesia dalam 24 jam terakhir" />
              </p>
              <div className="counter__meta src">
                {regionLine ? <span>{regionLine}</span> : null}
                <span>
                  {tr(lang, { en: "to", id: "sampai" })} {fmtWib(last.end, lang)}
                </span>
                {summary?.generated_at ? (
                  <span>
                    {tr(lang, { en: "Updated", id: "Diperbarui" })} {fmtAgo(summary.generated_at, lang)}
                  </span>
                ) : null}
              </div>
              <div className="hero__actions">
                <HotspotNote />
                {summary?.as_of && !failed ? (
                  <button type="button" className="chip" aria-pressed={smoke} onClick={() => sceneStore.set({ smoke: !smoke })}>
                    {tr(lang, { en: "Show the smoke (NASA true colour)", id: "Tampilkan asap (citra NASA)" })}
                  </button>
                ) : null}
              {smoke && summary?.as_of ? (
                <span className="src smoke-credit">
                  {tr(lang, { en: "Imagery", id: "Citra" })}: NASA GIBS, VIIRS NOAA-20, {fmtDay(summary.as_of, lang)}
                </span>
              ) : null}
              </div>
            </div>
          ) : (
            <div />
          )}
          <p className="hero__scroll" aria-hidden="true">
            <i />
            <T en="Scroll" id="Gulir" />
          </p>
        </div>
      </div>
    </MapWindow>
  );
}
