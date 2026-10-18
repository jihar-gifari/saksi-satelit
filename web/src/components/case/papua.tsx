"use client";
import { WeekBars } from "@/components/charts/week-bars";
import { sceneStore, useSceneState } from "@/components/map/scene";
import { Know } from "@/components/site/know";
import { useReady, type WeekRank } from "@/lib/data";
import { fmtInt, fmtRange, fmtTimes, ordinal } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { ChapterHead } from "./chapter";
import { weekKnow } from "./how-bad";
import { PolicyCheck } from "./policy-check";
import { MapWindow } from "./window";

export function Papua() {
  const lang = useLang();
  const papua = useReady("papua");
  const summary = useReady("summary");
  const smoke = useSceneState((s) => s.smoke);
  const failed = useSceneState((s) => s.failed);
  if (!papua) return null;
  const years = Object.keys(papua.by_year).sort();
  const last = years[years.length - 1]!;
  const count = papua.by_year[last] ?? 0;
  const rank: WeekRank = {
    count,
    rank: papua.rank ?? 1 + years.filter((y) => y !== last && (papua.by_year[y] ?? 0) > count).length,
    of: years.length,
    since: Number(years[0]),
    higher: years.filter((y) => y !== last && (papua.by_year[y] ?? 0) > count).map(Number),
    median: papua.median_2012_2025,
    by_year: papua.by_year,
  };
  const times = papua.median_2012_2025 > 0 ? count / papua.median_2012_2025 : null;
  const range = fmtRange(papua.week.start, papua.week.end, lang);
  const regencies = papua.regencies?.join(", ");

  return (
    <MapWindow id="papua" scene="papua" labelledBy="papua-h">
      <div className="window__inner wrap">
        <div className="card">
          <ChapterHead n="03" id="papua-h" en={["The forgotten", "epicentre"]} idn={["Pusat api", "yang terlupakan"]} />
          <p className="statement">
            {tr(lang, {
              en: `Southern Papua${regencies ? ` (${regencies})` : ""}: `,
              id: `Papua bagian selatan${regencies ? ` (${regencies})` : ""}: `,
            })}
            <b className="num">{fmtInt(count, lang)}</b>
            {tr(lang, {
              en: ` detections in ${range}, ${rank.rank === 1 ? `the most for this week since ${rank.since}` : `the ${ordinal(rank.rank, "en")} most since ${rank.since}`}${times ? `, and ${fmtTimes(times, "en")} its median.` : "."}`,
              id: ` deteksi pada ${range}, ${rank.rank === 1 ? `terbanyak untuk minggu ini sejak ${rank.since}` : `terbanyak ${ordinal(rank.rank, "id")} sejak ${rank.since}`}${times ? `, dan ${fmtTimes(times, "id")} mediannya.` : "."}`,
            })}
            <Know item={{ ...weekKnow(papua.week.start, papua.week.end, "PAPS"), value: fmtInt(count, lang), note: { en: `Southern Papua here is a fixed box, ${papua.box[0]}–${papua.box[2]}°E and ${Math.abs(papua.box[1])}–${Math.abs(papua.box[3])}°S, drawn dashed on the map.`, id: `Papua bagian selatan di sini adalah kotak tetap, ${papua.box[0]}–${papua.box[2]}°BT dan ${Math.abs(papua.box[1])}–${Math.abs(papua.box[3])}°LS, digambar putus-putus di peta.` } }} />
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
            label={tr(lang, { en: "Southern Papua, same week each year since 2012", id: "Papua bagian selatan, minggu yang sama setiap tahun sejak 2012" })}
          />
          {papua.official || papua.independent ? (
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
                <div className="stat">
                  <b className="num ember">{fmtInt(papua.independent.ha, lang)} ha</b>
                  <span>
                    {tr(lang, { en: "Independent", id: "Independen" })}
                    {papua.independent.window ? `, ${fmtRange(papua.independent.window[0], papua.independent.window[1], lang)}` : ""} ({papua.independent.source})
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {papua.walhi_psn_hotspots_jan_aug ? (
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
            </div>
          ) : null}
          <PolicyCheck chapter="papua" inCard />
        </div>
      </div>
    </MapWindow>
  );
}
