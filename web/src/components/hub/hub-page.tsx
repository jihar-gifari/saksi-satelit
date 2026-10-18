"use client";
import Link from "next/link";
import { KineticTitle } from "@/components/case/hero";
import { ChapterHead } from "@/components/case/chapter";
import { RULES } from "@/components/case/methods-teaser";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { LivingLight } from "@/components/site/living-light";
import { Marquee, type MarqueeItem } from "@/components/site/marquee";
import { useReady } from "@/lib/data";
import { fmtInt, fmtWib } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { Reveal } from "@/lib/motion";

const STEPS = [
  { en: ["Sources", "NASA fire satellites, official Indonesian figures, independent satellite maps and climate indices."], id: ["Sumber", "Satelit api NASA, angka resmi Indonesia, peta satelit independen, dan indeks iklim."] },
  { en: ["Checks", "Every row keeps its source, licence, retrieval time and time window."], id: ["Pemeriksaan", "Setiap baris menyimpan sumber, lisensi, waktu pengambilan, dan rentang waktunya."] },
  { en: ["Analyses", "Like-for-like comparisons across years, baselines instead of raw shares, and official claims checked against the data."], id: ["Analisis", "Perbandingan setara antartahun, pembanding alih-alih porsi mentah, dan klaim resmi diperiksa dengan data."] },
  { en: ["Outputs", "A public page in Indonesian and English, share cards, and the graphics for a video series."], id: ["Hasil", "Halaman publik dalam bahasa Indonesia dan Inggris, kartu untuk dibagikan, dan grafis untuk seri video."] },
];

const CASES = [
  { n: "01", live: true, href: "/karhutla", en: ["Karhutla 2026", "Indonesia's forest and land fires, checked against three NASA satellites and the official figures."], id: ["Karhutla 2026", "Kebakaran hutan dan lahan Indonesia, diperiksa dengan tiga satelit NASA dan angka resmi."] },
  { n: "02", en: ["Merauke food estate", "Land clearing in southern Papua, seen from space."], id: ["Food estate Merauke", "Pembukaan lahan di Papua bagian selatan, dilihat dari luar angkasa."] },
  { n: "03", en: ["Nickel", "Halmahera, Sulawesi and Raja Ampat: mines, forest loss and sediment in the sea."], id: ["Nikel", "Halmahera, Sulawesi dan Raja Ampat: tambang, hilangnya hutan, dan sedimen di laut."] },
  { n: "04", en: ["Floods", "Radar satellites (Sentinel-1) see flood water through cloud."], id: ["Banjir", "Satelit radar (Sentinel-1) melihat air banjir menembus awan."] },
  { n: "05", en: ["Jakarta air", "What satellites and air models say about the air over Jakarta."], id: ["Udara Jakarta", "Apa kata satelit dan model udara tentang udara di atas Jakarta."] },
];

function LiveLine() {
  const lang = useLang();
  const s = useReady("summary");
  const l = s?.last24h;
  if (!l) return null;
  return (
    <p className="hub-live mono">
      <span className="dot" aria-hidden="true" />
      {tr(lang, { en: "Live", id: "Langsung" })} · {fmtInt(l.total, lang)} {tr(lang, { en: "hotspots over Indonesia in the last 24 hours, to", id: "titik panas di Indonesia dalam 24 jam terakhir, sampai" })} {fmtWib(l.end, lang)}
    </p>
  );
}

export function HubPage() {
  const lang = useLang();
  const marquee: MarqueeItem[][] = [
    [
      { text: tr(lang, { en: "What the satellites saw", id: "Apa yang dilihat satelit" }), style: "x" },
      { text: "Karhutla 2026", style: "e" },
      { text: "Merauke", style: "c" },
      { text: tr(lang, { en: "Nickel", id: "Nikel" }), style: "o" },
      { text: tr(lang, { en: "Floods", id: "Banjir" }), style: "c" },
      { text: tr(lang, { en: "Jakarta air", id: "Udara Jakarta" }), style: "x" },
    ],
  ];
  return (
    <>
      <a className="skip" href="#main">
        <T en="Skip to content" id="Langsung ke isi" />
      </a>
      <SiteHeader />
      <main id="main">
        <section className="hub-hero grain" aria-labelledby="hub-title">
          <LivingLight
            colors={["#050807", "#0f2422", "#4a1a0a", "#c9411a", "#0b0f0d"]}
            css="radial-gradient(60% 50% at 75% 85%, #4a1a0a 0%, transparent 70%), radial-gradient(55% 45% at 20% 15%, #0f2422 0%, transparent 70%), #050807"
            speed={0.2}
          />
          <svg className="orbit" viewBox="0 0 1000 1000" aria-hidden="true">
            <ellipse cx="500" cy="500" rx="470" ry="150" transform="rotate(-18 500 500)" fill="none" stroke="rgba(231,236,231,0.18)" strokeDasharray="2 7" />
            <ellipse cx="500" cy="500" rx="420" ry="230" transform="rotate(24 500 500)" fill="none" stroke="rgba(231,236,231,0.1)" />
          </svg>
          <span className="orbit__sat" aria-hidden="true" />
          <span className="orbit__sat orbit__sat--b" aria-hidden="true" />
          <div className="hub-hero__in wrap" id="hub-title">
            <p className="kicker rise-in" style={{ ["--d" as string]: "0.1s" } as React.CSSProperties}>
              <T en="An open-data engine by Aldran Group" id="Mesin data terbuka dari Aldran Group" />
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
            <p className="lede rise-in" style={{ ["--d" as string]: "1.25s", maxWidth: "40ch" } as React.CSSProperties}>
              <T
                en="We check Indonesia's biggest public stories against open satellite evidence. Every number is dated, sourced, and one tap from its method."
                id="Kami memeriksa cerita publik terbesar Indonesia dengan bukti satelit terbuka. Setiap angka bertanggal, bersumber, dan metodenya bisa dibuka sekali ketuk."
              />
            </p>
            <div className="hub-hero__cta rise-in" style={{ ["--d" as string]: "1.45s" } as React.CSSProperties}>
              <Link className="btn btn--ember" href="/karhutla">
                <T en="Open case 01: Karhutla 2026" id="Buka kasus 01: Karhutla 2026" />
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <LiveLine />
            </div>
          </div>
        </section>
        <Marquee rows={marquee} />
        <section className="chapter chapter--2 grain" aria-labelledby="how-h">
          <div className="wrap">
            <ChapterHead n="01" id="how-h" en={["One engine,", "many cases"]} idn={["Satu mesin,", "banyak kasus"]} lede={<T en="A case is a place, a time window and a set of open data sources. The same engine turns each case into a public page anyone can check." id="Sebuah kasus adalah satu tempat, satu rentang waktu, dan sekumpulan sumber data terbuka. Mesin yang sama mengubah setiap kasus menjadi halaman publik yang bisa diperiksa siapa saja." />} />
            <ol className="steps">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.en[0]} delay={i * 0.08} className="step">
                  <span className="step__n mono">{String(i + 1).padStart(2, "0")}</span>
                  <p className="step__h">
                    <T en={s.en[0]} id={s.id[0]} />
                  </p>
                  <p className="small">
                    <T en={s.en[1]} id={s.id[1]} />
                  </p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
        <section className="chapter haze" aria-labelledby="cases-h">
          <div className="wrap">
            <ChapterHead n="02" id="cases-h" en={["Cases"]} idn={["Kasus"]} />
            <ol className="cases">
              {CASES.map((c) => {
                const body = (
                  <>
                    <span className="case__n mono">{c.n}</span>
                    <span className="case__name">
                      <T en={c.en[0]} id={c.id[0]} />
                    </span>
                    <span className="case__desc small">
                      <T en={c.en[1]} id={c.id[1]} />
                    </span>
                    <span className={`case__tag mono ${c.live ? "is-live" : ""}`}>{c.live ? <T en="Live now" id="Sedang berjalan" /> : <T en="Upcoming" id="Segera" />}</span>
                  </>
                );
                return (
                  <li key={c.n} className={`case ${c.live ? "case--live" : ""}`}>
                    {c.href ? (
                      <Link href={c.href} className="case__link">
                        {body}
                        <span className="case__arrow" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    ) : (
                      <div className="case__link">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
        <section className="chapter grain" aria-labelledby="rules-h">
          <div className="wrap grid-2">
            <ChapterHead n="03" id="rules-h" en={["The rules"]} idn={["Aturannya"]} lede={<T en="The engine and every video built on it follow the same rules." id="Mesin ini dan setiap video yang dibuat darinya mengikuti aturan yang sama." />} />
            <ol className="rules rules--dark">
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
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
