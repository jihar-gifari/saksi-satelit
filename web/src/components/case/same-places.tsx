"use client";
import { useState } from "react";
import { Know } from "@/components/site/know";
import { useReady } from "@/lib/data";
import { fmtInt, fmtPct, fmtRange, fmtTimes, listYears } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { ChapterHead } from "./chapter";
import { PolicyCheck } from "./policy-check";
import { MapWindow } from "./window";

export function SamePlaces() {
  const lang = useLang();
  const rec = useReady("recurrence");
  const summary = useReady("summary");
  const [mask, setMask] = useState(15);
  if (!rec) return null;
  const bits = Object.entries(rec.bits).sort(([, a], [, b]) => a - b);
  const r = summary?.recurrence;
  const years = r?.years ?? bits.filter(([k]) => /^\d{4}$/.test(k)).map(([k]) => Number(k));
  const label = (k: string) => (k === "2026w" ? tr(lang, { en: "This week", id: "Minggu ini" }) : k);
  const toggle = (b: number) => setMask((m) => (m & b ? m & ~b : m | b) || b);
  const win = rec.window_2026w ?? r?.window;

  return (
    <MapWindow id="same-places" scene="recurrence" extra={{ recMask: mask }} labelledBy="same-places-h">
      <div className="window__inner wrap">
        <div className="card">
          <ChapterHead n="05" id="same-places-h" en={["Same places,", "every El Niño"]} idn={["Tempat yang sama,", "setiap El Niño"]} />
          {r && r.share_land > 0 ? (
            <>
              <p className="statement">
                <b>{fmtPct(r.share_detections, lang)}</b>{" "}
                {tr(lang, {
                  en: `of this week's detections fell on land that also burned in ${listYears(years, "en")}. That land is only `,
                  id: `deteksi minggu ini jatuh di lahan yang juga terbakar pada ${listYears(years, "id")}. Lahan itu hanya `,
                })}
                <b>{fmtPct(r.share_land, lang)}</b>
                {tr(lang, { en: " of Indonesia.", id: " dari daratan Indonesia." })}
                <Know
                  item={{
                    title: { en: "Places that burned before", id: "Tempat yang pernah terbakar" },
                    value: fmtPct(r.share_detections, lang),
                    source: { en: `NASA FIRMS, ${r.sensor ?? "Suomi-NPP"} VIIRS 375 m, ${listYears(years, "en")} and this week`, id: `NASA FIRMS, ${r.sensor ?? "Suomi-NPP"} VIIRS 375 m, ${listYears(years, "id")} dan minggu ini` },
                    window: win ? { en: `This week: ${fmtRange(win[0], win[1], "en")}. Past years: the whole year.`, id: `Minggu ini: ${fmtRange(win[0], win[1], "id")}. Tahun lalu: sepanjang tahun.` } : undefined,
                    method: {
                      en: `Indonesia's land is divided into squares of ${r.cell_deg}° (about ${Math.round(r.cell_deg * 111)} km). A square "burned before" if it had at least one detection in ${listYears(years, "en")}. We count the share of this week's ${r.n_detections ? fmtInt(r.n_detections, "en") + " " : ""}detections that fall in those squares, and the share of all land squares they make up${r.land_km2 && r.burned_before_km2 ? ` (${fmtInt(r.burned_before_km2, "en")} of ${fmtInt(r.land_km2, "en")} km²)` : ""}. If fires landed at random, the two shares would be about equal.`,
                      id: `Daratan Indonesia dibagi menjadi kotak ${String(r.cell_deg).replace(".", ",")}° (sekitar ${Math.round(r.cell_deg * 111)} km). Sebuah kotak "pernah terbakar" jika ada setidaknya satu deteksi pada ${listYears(years, "id")}. Kami menghitung porsi ${r.n_detections ? fmtInt(r.n_detections, "id") + " " : ""}deteksi minggu ini yang jatuh di kotak-kotak itu, dan porsi kotak itu dari seluruh daratan${r.land_km2 && r.burned_before_km2 ? ` (${fmtInt(r.burned_before_km2, "id")} dari ${fmtInt(r.land_km2, "id")} km²)` : ""}. Kalau api muncul secara acak, kedua porsi itu kira-kira sama.`,
                    },
                    note: { en: `The map shows coarser ${rec.cell_deg}° squares so they can be seen at this scale.`, id: `Peta menampilkan kotak ${String(rec.cell_deg).replace(".", ",")}° yang lebih besar agar terlihat pada skala ini.` },
                    anchor: "recurrence",
                  }}
                />
              </p>
              <p className="small">
                {tr(lang, {
                  en: `If fires fell at random, about ${fmtPct(r.share_land, "en")} of them would land there. The real share is ${fmtTimes(r.share_detections / r.share_land, "en")} that. The fires return to the same places, which makes them predictable, and so preventable.`,
                  id: `Kalau api muncul secara acak, sekitar ${fmtPct(r.share_land, "id")} akan jatuh di sana. Kenyataannya ${fmtTimes(r.share_detections / r.share_land, "id")} lipat. Api kembali ke tempat yang sama, jadi bisa diperkirakan, dan karena itu bisa dicegah.`,
                })}
              </p>
            </>
          ) : (
            <p className="small">
              <T en="Each square lights up by the years it burned." id="Setiap kotak menyala sesuai tahun terbakarnya." />
            </p>
          )}
          <div className="chips" role="group" aria-label={tr(lang, { en: "Years shown on the map", id: "Tahun yang tampil di peta" })}>
            {bits.map(([k, b]) => (
              <button key={k} type="button" className="chip" aria-pressed={Boolean(mask & b)} onClick={() => toggle(b)}>
                {label(k)}
              </button>
            ))}
          </div>
          <div className="legend">
            <span>
              <i className="sq" style={{ background: "#ffe2b8" }} />
              {tr(lang, { en: "this week, burned before", id: "minggu ini, pernah terbakar" })}
            </span>
            <span>
              <i className="sq" style={{ background: "var(--ember)" }} />
              {tr(lang, { en: "this week, new place", id: "minggu ini, tempat baru" })}
            </span>
            <span>
              <i className="sq" style={{ background: "#7e968c" }} />
              {tr(lang, { en: "burned in a chosen past year", id: "terbakar di tahun yang dipilih" })}
            </span>
          </div>
          <PolicyCheck chapter="same-places" inCard />
        </div>
      </div>
    </MapWindow>
  );
}
