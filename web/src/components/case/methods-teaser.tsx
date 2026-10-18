"use client";
import Link from "next/link";
import { useReady } from "@/lib/data";
import { fmtAgo, fmtWib } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { ChapterHead } from "./chapter";

export const RULES: { en: [string, string]; id: [string, string] }[] = [
  { en: ["Detections are not fires, and fires are not hectares.", "Every number names its unit. Detections are a lower bound: cloud and smoke hide fires, and satellites miss many smouldering peat fires."], id: ["Deteksi bukan api, dan api bukan hektare.", "Setiap angka menyebut satuannya. Deteksi adalah batas bawah: awan dan asap menutupi api, dan satelit melewatkan banyak api gambut yang membara."] },
  { en: ["Like for like.", "The same satellite and the same calendar days across years. Never January to July against a full year."], id: ["Bandingkan yang setara.", "Satelit yang sama dan hari kalender yang sama antar tahun. Tidak pernah Januari sampai Juli dibandingkan dengan satu tahun penuh."] },
  { en: ["Baselines, not raw shares.", "A share is compared with what chance would give."], id: ["Pakai pembanding, bukan porsi mentah.", "Sebuah porsi selalu dibandingkan dengan apa yang terjadi secara kebetulan."] },
  { en: ["Every figure is dated and sourced.", "Each number has a “how we know” note one tap away."], id: ["Setiap angka bertanggal dan bersumber.", "Setiap angka punya catatan “dari mana angka ini” yang bisa dibuka sekali ketuk."] },
  { en: ["Detection is not responsibility.", "Companies are named only from official lists, with dates. Nobody is called a perpetrator."], id: ["Deteksi bukan tanggung jawab.", "Perusahaan hanya disebut dari daftar resmi, dengan tanggal. Tidak ada yang disebut pelaku."] },
  { en: ["No number is invented.", "If a data file is missing, its block disappears instead of showing a guess."], id: ["Tidak ada angka yang dikarang.", "Kalau satu berkas data hilang, bagiannya disembunyikan, bukan diisi tebakan."] },
];

export function MethodsTeaser() {
  const lang = useLang();
  const summary = useReady("summary");
  return (
    <section id="methods" className="chapter haze" aria-labelledby="methods-h">
      <div className="wrap">
        <ChapterHead n="08" id="methods-h" en={["How we know"]} idn={["Dari mana", "kami tahu"]} />
        <div className="grid-2">
          <div className="stack">
            <p className="lede">
              <T en="Every number on this page comes from open data that anyone can download and check. These are the rules we hold ourselves to." id="Setiap angka di halaman ini berasal dari data terbuka yang bisa diunduh dan diperiksa siapa saja. Ini aturan yang kami pegang." />
            </p>
            {summary ? (
              <p className="src">
                {tr(lang, { en: "Data updated", id: "Data diperbarui" })} {fmtWib(summary.generated_at, lang)} ({fmtAgo(summary.generated_at, lang)}). {tr(lang, { en: "Refreshed every few hours.", id: "Diperbarui setiap beberapa jam." })}
              </p>
            ) : null}
            <div className="chips">
              <Link className="btn btn--line" href="/karhutla/methods">
                <T en="Methods, sources and licences" id="Metode, sumber dan lisensi" />
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
          <ol className="rules">
            {RULES.map((r, i) => (
              <li key={i}>
                <span className="rules__n mono">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="rules__h">
                    <T en={r.en[0]} id={r.id[0]} />
                  </p>
                  <p className="small">
                    <T en={r.en[1]} id={r.id[1]} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
