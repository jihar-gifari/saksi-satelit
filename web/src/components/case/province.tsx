"use client";
import { useEffect, useMemo, useState } from "react";
import { WeekBars } from "@/components/charts/week-bars";
import { Know } from "@/components/site/know";
import { useReady, type Province } from "@/lib/data";
import { CASE_URL, SHORT_LINK } from "@/lib/base";
import { fmtInt, fmtRange, ordinal } from "@/lib/format";
import { T, tr, useLang, type Lang } from "@/lib/i18n";
import { ChapterHead } from "./chapter";
import { drawCard, provinceTotal } from "./share-card";
import { MapWindow } from "./window";

const GROUPS: { key: string; en: string; id: string }[] = [
  { key: "SUM", en: "Sumatra", id: "Sumatera" },
  { key: "KAL", en: "Kalimantan", id: "Kalimantan" },
  { key: "PAP", en: "Papua", id: "Papua" },
  { key: "OTH", en: "Java, Bali, Nusa Tenggara, Sulawesi, Maluku", id: "Jawa, Bali, Nusa Tenggara, Sulawesi, Maluku" },
];
const PROV_KEY = "saksi-province";

function rankLine(p: Province, lang: Lang) {
  const r = p.snpp_week;
  if (!r) return null;
  const since = r.since ?? 2012;
  if (lang === "id") return r.rank === 1 ? `Minggu ini yang terparah sejak ${since} untuk provinsi ini.` : `Minggu ini terparah ${ordinal(r.rank, "id")} dari ${r.of} sejak ${since} untuk provinsi ini.`;
  return r.rank === 1 ? `This is the province's worst week since ${since}.` : `This week ranks ${ordinal(r.rank, "en")} worst of ${r.of} since ${since} for this province.`;
}

export function YourProvince() {
  const lang = useLang();
  const prov = useReady("provinces");
  const cells = useReady("cells7d");
  const summary = useReady("summary");
  const [id, setId] = useState<string | null>(null);
  const [cardLang, setCardLang] = useState<Lang | null>(null);
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [status, setStatus] = useState<string>("");

  const list = useMemo(() => (prov?.provinces ?? []).filter((p) => p.rings?.length), [prov]);
  const top = useMemo(() => list.slice().sort((a, b) => (provinceTotal(b) ?? 0) - (provinceTotal(a) ?? 0))[0], [list]);

  useEffect(() => {
    if (id || !list.length) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PROV_KEY);
    } catch {
      /* ignore */
    }
    setId(list.some((p) => p.id === saved) ? saved : (top?.id ?? list[0]!.id));
  }, [id, list, top]);

  const p = list.find((x) => x.id === id) ?? null;
  const cl = cardLang ?? lang;
  const week = prov?.window ? { start: prov.window[0], end: prov.window[1] } : summary?.week ? { start: summary.week.start, end: summary.week.end } : null;

  useEffect(() => {
    if (!p) return;
    let alive = true;
    let url = "";
    drawCard({ province: p, cells, week, lang: cl }).then((blob) => {
      if (!alive || !blob) return;
      url = URL.createObjectURL(blob);
      setCard({ url, blob });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, cells, cl, week?.start]);

  if (!prov || !list.length) return null;
  const total = p ? provinceTotal(p) : null;
  const name = p ? (lang === "id" ? p.name_id : p.name_en) : "";
  const file = p ? `saksi-satelit-${p.id.toLowerCase()}-${cl}.png` : "saksi-satelit.png";
  const shareText = p && total != null && week
    ? cl === "id"
      ? `Satelit NASA mendeteksi ${fmtInt(total, "id")} titik panas di ${p.name_id} pada ${fmtRange(week.start, week.end, "id")}. Cek provinsimu: ${SHORT_LINK}`
      : `NASA satellites detected ${fmtInt(total, "en")} hotspots in ${p.name_en} on ${fmtRange(week.start, week.end, "en")}. Check your province: ${SHORT_LINK}`
    : SHORT_LINK;

  const choose = (v: string) => {
    setId(v);
    try {
      localStorage.setItem(PROV_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (!card) return;
    const f = new File([card.blob], file, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.share && nav.canShare?.({ files: [f] })) {
        await nav.share({ files: [f], text: shareText, url: CASE_URL });
        setStatus("");
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = card.url;
    a.download = file;
    a.click();
    setStatus(tr(lang, { en: "Saved to your downloads.", id: "Tersimpan di unduhan." }));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${CASE_URL}`);
      setStatus(tr(lang, { en: "Text and link copied.", id: "Teks dan tautan tersalin." }));
    } catch {
      setStatus(CASE_URL);
    }
  };

  return (
    <MapWindow id="province" scene="province" extra={{ province: id }} labelledBy="province-h">
      <div className="window__inner wrap">
        <div className="card card--wide">
          <ChapterHead n="06" id="province-h" en={["Your province"]} idn={["Provinsimu"]} />
          <label className="sr-only" htmlFor="prov-select">
            {tr(lang, { en: "Choose a province", id: "Pilih provinsi" })}
          </label>
          <div className="select">
            <select id="prov-select" value={id ?? ""} onChange={(e) => choose(e.target.value)}>
              {GROUPS.map((g) => {
                const ps = list.filter((x) => x.region === g.key).sort((a, b) => (lang === "id" ? a.name_id : a.name_en).localeCompare(lang === "id" ? b.name_id : b.name_en));
                return ps.length ? (
                  <optgroup key={g.key} label={tr(lang, g)}>
                    {ps.map((x) => (
                      <option key={x.id} value={x.id}>
                        {lang === "id" ? x.name_id : x.name_en}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>
          {p ? (
            <>
              <div>
                <p className="kicker">
                  {name}
                  {week ? ` · ${fmtRange(week.start, week.end, lang)}` : ""}
                </p>
                {total != null ? (
                  <p className="bignum num" style={{ fontSize: "clamp(56px, 11vw, 112px)" }}>
                    {fmtInt(total, lang)}
                    <Know
                      item={{
                        title: { en: `Hotspots in ${p.name_en}, 7 days`, id: `Titik panas di ${p.name_id}, 7 hari` },
                        value: fmtInt(total, lang),
                        source: { en: "NASA FIRMS VIIRS 375 m (Suomi-NPP, NOAA-20, NOAA-21); province outlines from geoBoundaries (ODbL)", id: "NASA FIRMS VIIRS 375 m (Suomi-NPP, NOAA-20, NOAA-21); batas provinsi dari geoBoundaries (ODbL)" },
                        window: week ? { en: fmtRange(week.start, week.end, "en"), id: fmtRange(week.start, week.end, "id") } : undefined,
                        method: {
                          en: "Detections from all three satellites (nominal and high confidence) that fall inside the province outline, added up. A fire seen by two satellites counts twice. The ranking uses Suomi-NPP only, the one satellite flying in every year since 2012.",
                          id: "Deteksi dari ketiga satelit (keyakinan nominal dan tinggi) yang jatuh di dalam batas provinsi, dijumlahkan. Api yang terlihat oleh dua satelit dihitung dua kali. Peringkat hanya memakai Suomi-NPP, satu-satunya satelit yang terbang setiap tahun sejak 2012.",
                        },
                        anchor: "provinces",
                      }}
                    />
                  </p>
                ) : null}
                <p className="small">
                  <T en="hotspots detected by three NASA satellites in seven days" id="titik panas terdeteksi tiga satelit NASA dalam tujuh hari" />
                </p>
              </div>
              {p.week_7d ? (
                <div className="statrow">
                  {(["0", "1", "2"] as const).map((k) => (
                    <div key={k} className="stat">
                      <b className="num">{fmtInt(p.week_7d?.[k] ?? 0, lang)}</b>
                      <span>{["Suomi-NPP", "NOAA-20", "NOAA-21"][Number(k)]}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {p.snpp_week ? (
                <>
                  <p className="statement" style={{ fontSize: "clamp(19px, 2.4vw, 24px)" }}>
                    <b>{rankLine(p, lang)}</b>
                  </p>
                  <WeekBars key={p.id} rank={p.snpp_week} label={tr(lang, { en: `${p.name_en}, Suomi-NPP detections in the same week each year since 2012`, id: `${p.name_id}, deteksi Suomi-NPP pada minggu yang sama setiap tahun sejak 2012` })} />
                </>
              ) : null}
              {p.official_ha ? (
                <div className="statrow" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {typeof p.official_ha["2026_jan_jul"] === "number" ? (
                    <div className="stat stat--official">
                      <b className="num">{fmtInt(p.official_ha["2026_jan_jul"], lang)} ha</b>
                      <span>{tr(lang, { en: "Official burned area, Jan–Jul 2026 (SiPongi)", id: "Luas terbakar resmi, Jan–Jul 2026 (SiPongi)" })}</span>
                    </div>
                  ) : null}
                  {typeof p.official_ha["2025"] === "number" ? (
                    <div className="stat stat--official">
                      <b className="num">{fmtInt(p.official_ha["2025"], lang)} ha</b>
                      <span>{tr(lang, { en: "Official burned area, all of 2025 (SiPongi)", id: "Luas terbakar resmi, seluruh 2025 (SiPongi)" })}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="sharecard">
                <p className="kicker">{tr(lang, { en: "Share this province's card", id: "Bagikan kartu provinsi ini" })}</p>
                <div className="sharecard__row">
                  {card ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.url} alt={shareText} width={1080} height={1350} />
                  ) : (
                    <div className="sharecard__ph" />
                  )}
                  <div className="stack" style={{ gap: 10 }}>
                    <div className="seg seg--light" role="group" aria-label={tr(lang, { en: "Card language", id: "Bahasa kartu" })}>
                      <button type="button" aria-pressed={cl === "id"} onClick={() => setCardLang("id")}>
                        ID
                      </button>
                      <button type="button" aria-pressed={cl === "en"} onClick={() => setCardLang("en")}>
                        EN
                      </button>
                    </div>
                    <button type="button" className="btn btn--ember" onClick={share} disabled={!card}>
                      {tr(lang, { en: "Share the card", id: "Bagikan kartu" })}
                    </button>
                    <button type="button" className="btn btn--line" onClick={copy}>
                      {tr(lang, { en: "Copy text and link", id: "Salin teks dan tautan" })}
                    </button>
                    <p className="src" role="status" aria-live="polite">
                      {status}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </MapWindow>
  );
}
