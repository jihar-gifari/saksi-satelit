"use client";
import { WeekBars } from "@/components/charts/week-bars";
import { sceneStore, useSceneState } from "@/components/map/scene";
import { Know, KnowLink } from "@/components/site/know";
import { useReady, type WeekRank } from "@/lib/data";
import { fmtDay, fmtInt, fmtRange, fmtTimes, ordinal } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { ChapterHead } from "./chapter";
import { weekKnow } from "./how-bad";
import { PolicyCheck } from "./policy-check";
import { MapWindow } from "./window";

/** The chapter's numbers are for Papua Selatan province (provinces.json), the unit the videos use. */
export const PAPUA_SELATAN = "ID-PS";
const REGENCIES = "Merauke, Boven Digoel, Mappi, Asmat";

export function Papua() {
  const lang = useLang();
  const papua = useReady("papua");
  const provinces = useReady("provinces");
  const summary = useReady("summary");
  const smoke = useSceneState((s) => s.smoke);
  const failed = useSceneState((s) => s.failed);
  const ps = provinces?.provinces.find((p) => p.id === PAPUA_SELATAN);
  const rank = ps?.snpp_week;
  if (!ps || !rank) return null;
  const week = provinces?.window ?? (summary?.week ? ([summary.week.start, summary.week.end] as [string, string]) : null);
  const count = rank.count;
  const times = rank.median > 0 ? count / rank.median : null;
  const range = week ? fmtRange(week[0], week[1], lang) : "";
  const since = rank.since ?? Number(Object.keys(rank.by_year).sort()[0] ?? 2012);
  const name = lang === "id" ? ps.name_id : "Papua Selatan";

  return (
    <MapWindow id="papua" scene="papua" labelledBy="papua-h">
      <div className="window__inner wrap">
        <div className="card">
          <ChapterHead n="03" id="papua-h" en={["The forgotten", "epicentre"]} idn={["Pusat api", "yang terlupakan"]} />
          <p className="statement">
            {`${name} (${REGENCIES}): `}
            <b className="num">{fmtInt(count, lang)}</b>
            {tr(lang, {
              en: ` detections${range ? ` in ${range}` : ""}, ${rank.rank === 1 ? `the most for this week since ${since}` : `the ${ordinal(rank.rank, "en")} most since ${since}`}${times ? `, and ${fmtTimes(times, "en")} its median.` : "."}`,
              id: ` deteksi${range ? ` pada ${range}` : ""}, ${rank.rank === 1 ? `terbanyak untuk minggu ini sejak ${since}` : `terbanyak ${ordinal(rank.rank, "id")} sejak ${since}`}${times ? `, dan ${fmtTimes(times, "id")} mediannya.` : "."}`,
            })}
            {week ? (
              <Know
                item={{
                  ...weekKnow(week[0], week[1], "ID"),
                  title: { en: "Same week, every year: Papua Selatan", id: "Minggu yang sama, setiap tahun: Papua Selatan" },
                  value: fmtInt(count, lang),
                  note: {
                    en: `Counted inside the outline of Papua Selatan province (${REGENCIES}), built from geoBoundaries regency outlines (ODbL). Median of the same week in ${since}–${Number(Object.keys(rank.by_year).sort().slice(-1)[0]) - 1}: ${fmtInt(rank.median, "en")}.`,
                    id: `Dihitung di dalam batas Provinsi Papua Selatan (${REGENCIES}), disusun dari batas kabupaten geoBoundaries (ODbL). Median minggu yang sama ${since}–${Number(Object.keys(rank.by_year).sort().slice(-1)[0]) - 1}: ${fmtInt(rank.median, "id")}.`,
                  },
                  anchor: "papua",
                }}
              />
            ) : null}
          </p>
          <p className="small">
            <T
              en="Its savanna and swamp forests burn in most dry seasons, which is why the comparison is with the same week in past years. Even so, this week is off the scale, and it gets almost none of the national attention."
              id="Savana dan hutan rawanya terbakar hampir setiap musim kemarau, karena itu perbandingannya dengan minggu yang sama di tahun-tahun lalu. Meski begitu, minggu ini jauh di atas biasanya, dan hampir tidak mendapat perhatian nasional."
            />
          </p>
          <WeekBars
            rank={rank}
            accent="var(--ember)"
            label={tr(lang, { en: `Papua Selatan, same week each year since ${since}`, id: `Papua Selatan, minggu yang sama setiap tahun sejak ${since}` })}
          />
          {papua && (papua.official || papua.independent) ? (
            <div className="duo">
              <p className="kicker" style={{ gridColumn: "1 / -1" }}>
                {tr(lang, { en: "Burned area, Papua Selatan province", id: "Luas terbakar, Provinsi Papua Selatan" })}
              </p>
              {papua.official?.ha_2026_jan_jul != null ? (
                <div className="stat stat--official">
                  <b className="num">{fmtInt(papua.official.ha_2026_jan_jul, lang)} ha</b>
                  <span>
                    {tr(lang, { en: "Official, Jan–Jul 2026", id: "Resmi, Jan–Jul 2026" })} ({papua.official.source})
                    {papua.official.ha_2025 != null ? tr(lang, { en: `. All of 2025: ${fmtInt(papua.official.ha_2025, "en")} ha.`, id: `. Seluruh 2025: ${fmtInt(papua.official.ha_2025, "id")} ha.` }) : ""}
                  </span>
                </div>
              ) : null}
              {papua.independent ? (
                <div className="stat stat--ind">
                  <b className="num ember">{fmtInt(papua.independent.ha, lang)} ha</b>
                  <span>
                    {tr(lang, { en: "Independent", id: "Independen" })}
                    {papua.independent.window ? `, ${fmtRange(papua.independent.window[0], papua.independent.window[1], lang)}` : ""} ({papua.independent.source})
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {papua && (papua.official || papua.independent) ? (
            <KnowLink
              item={{
                title: { en: "Burned area in Papua Selatan", id: "Luas terbakar di Papua Selatan" },
                source: {
                  en: `Official: ${papua.official?.source ?? "SiPongi"} (Sumber: SIPONGI KEMENHUT). Independent: ${papua.independent?.source ?? ""}.`,
                  id: `Resmi: ${papua.official?.source ?? "SiPongi"} (Sumber: SIPONGI KEMENHUT). Independen: ${papua.independent?.source ?? ""}.`,
                },
                window: {
                  en: `Official: January to July 2026 (and all of 2025). Independent: ${papua.independent?.window ? fmtRange(papua.independent.window[0], papua.independent.window[1], "en") : "as published"}.`,
                  id: `Resmi: Januari sampai Juli 2026 (dan seluruh 2025). Independen: ${papua.independent?.window ? fmtRange(papua.independent.window[0], papua.independent.window[1], "id") : "sesuai publikasi"}.`,
                },
                method: {
                  en: "Both are burned-area estimates for the province, not detections. The windows differ by a month, so the two numbers are not a like-for-like comparison; they are shown side by side, not subtracted.",
                  id: "Keduanya perkiraan luas terbakar untuk provinsi, bukan deteksi. Rentang waktunya berbeda satu bulan, jadi kedua angka tidak setara; ditampilkan berdampingan, tidak dikurangkan.",
                },
                links: papua.independent?.url ? [{ label: "downtoearth.org.in", href: papua.independent.url }] : undefined,
                anchor: "papua",
              }}
            />
          ) : null}
          {papua?.walhi_psn_hotspots_jan_aug ? (
            <p className="small">
              {tr(lang, {
                en: `WALHI counted ${fmtInt(papua.walhi_psn_hotspots_jan_aug.value, "en")} hotspots inside National Strategic Project (PSN) areas in Papua from January to August.`,
                id: `WALHI mencatat ${fmtInt(papua.walhi_psn_hotspots_jan_aug.value, "id")} titik panas di dalam kawasan Proyek Strategis Nasional (PSN) di Papua dari Januari sampai Agustus.`,
              })}{" "}
              {papua.walhi_psn_hotspots_jan_aug.url ? (
                <a className="src" href={papua.walhi_psn_hotspots_jan_aug.url} target="_blank" rel="noopener noreferrer">
                  {papua.walhi_psn_hotspots_jan_aug.source}
                </a>
              ) : null}
            </p>
          ) : null}
          <p className="note-neutral">
            <T
              en="A hotspot shows where and when there was fire. It does not show who started it."
              id="Titik panas menunjukkan di mana dan kapan ada api. Titik panas tidak menunjukkan siapa yang menyalakannya."
            />
          </p>
          {summary?.as_of && !failed ? (
            <div>
              <button type="button" className="chip" aria-pressed={smoke} onClick={() => sceneStore.set({ smoke: !smoke })}>
                {tr(lang, { en: "Show the smoke (NASA true colour)", id: "Tampilkan asap (citra NASA)" })}
              </button>
              {smoke && summary?.as_of ? (
                <span className="src smoke-credit">
                  {tr(lang, { en: "Imagery", id: "Citra" })}: NASA GIBS, VIIRS NOAA-20, {fmtDay(summary.as_of, lang)}
                </span>
              ) : null}
            </div>
          ) : null}
          <PolicyCheck chapter="papua" inCard />
        </div>
      </div>
    </MapWindow>
  );
}
