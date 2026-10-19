"use client";
import Link from "next/link";
import { useEffect } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { dataUrl, FILE_NAMES, request, useData, type FileName } from "@/lib/data";
import { fmtAgo, fmtWib } from "@/lib/format";
import { T, tr, useLang } from "@/lib/i18n";
import { RevealLines } from "@/lib/motion";

type Sec = { id: string; en: string; idn: string; body: { en: string; id: string }[] };

const SECTIONS: Sec[] = [
  {
    id: "hotspots",
    en: "Hotspots (fire detections)",
    idn: "Titik panas (deteksi api)",
    body: [
      {
        en: "A hotspot is a 375-metre pixel in which the VIIRS instrument measured unusual heat during an overpass. We use NASA FIRMS data from three satellites that carry VIIRS: Suomi-NPP, NOAA-20 and NOAA-21. Each passes over Indonesia about twice a day. Low-confidence detections are dropped everywhere; nominal and high are kept unless a chart says otherwise.",
        id: "Titik panas adalah satu piksel berukuran 375 meter tempat instrumen VIIRS mengukur panas yang tidak biasa saat melintas. Kami memakai data NASA FIRMS dari tiga satelit yang membawa VIIRS: Suomi-NPP, NOAA-20, dan NOAA-21. Masing-masing melintasi Indonesia sekitar dua kali sehari. Deteksi berkeyakinan rendah dibuang di semua bagian; yang nominal dan tinggi dipakai kecuali grafik menyebut lain.",
      },
      {
        en: "A detection is not a fire and not a hectare. One large fire produces many detections, the same fire seen by two satellites counts twice, and cloud, thick smoke and smouldering peat hide fires, so detections are a lower bound. The map shows the last 48 hours; the counter shows the last 24 hours. Fire radiative power (FRP, in megawatts) sets each glow's colour and size.",
        id: "Satu deteksi bukan satu kebakaran dan bukan satu hektare. Satu kebakaran besar menghasilkan banyak deteksi, api yang sama yang terlihat dua satelit dihitung dua kali, dan awan, asap tebal, serta gambut yang membara menyembunyikan api, sehingga deteksi adalah batas bawah. Peta menampilkan 48 jam terakhir; penghitung menampilkan 24 jam terakhir. Daya radiasi api (FRP, dalam megawatt) menentukan warna dan ukuran setiap cahaya.",
      },
    ],
  },
  {
    id: "same-week",
    en: "Same week, every year",
    idn: "Minggu yang sama, setiap tahun",
    body: [
      {
        en: "To compare years fairly we use one satellite, Suomi-NPP, the only VIIRS satellite flying in every year since 2012, and the same seven calendar days in each year. 2012–2025 come from the FIRMS standard archive and 2026 from near-real-time data; the two processing streams can differ slightly. The rank and the list of higher years are computed by the pipeline, not written by hand. The median is of the years before the current one.",
        id: "Agar perbandingan antartahun adil, kami memakai satu satelit, Suomi-NPP, satu-satunya satelit VIIRS yang terbang setiap tahun sejak 2012, dan tujuh hari kalender yang sama setiap tahun. 2012–2025 berasal dari arsip standar FIRMS dan 2026 dari data hampir waktu nyata; kedua jalur pemrosesan bisa sedikit berbeda. Peringkat dan daftar tahun yang lebih tinggi dihitung oleh pipeline, bukan ditulis tangan. Median dihitung dari tahun-tahun sebelum tahun berjalan.",
      },
      {
        en: "The season chart adds up the same series since 1 January, and compares this year with 2015 over exactly the same dates. Its seven-day view is the running seven-day total, so its value on the last day of the week equals that year's bar.",
        id: "Grafik musim menjumlahkan seri yang sama sejak 1 Januari, dan membandingkan tahun ini dengan 2015 pada tanggal yang persis sama. Tampilan tujuh harinya adalah total tujuh hari berjalan, sehingga nilainya pada hari terakhir minggu itu sama dengan batang tahun tersebut.",
      },
    ],
  },
  {
    id: "burned-area",
    en: "Burned area: the numbers war",
    idn: "Luas terbakar: perang angka",
    body: [
      {
        en: "Burned-area figures are published by different organisations, with different methods and, above all, different time windows. We place each figure on a timeline by the exact window it covers. Official figures are SiPongi's indicative burned area (Sumber: SIPONGI KEMENHUT). Independent figures are quoted as their publishers or the press reported them, with links. We do not average or adjust anyone's numbers.",
        id: "Angka luas terbakar diterbitkan oleh berbagai lembaga, dengan metode berbeda dan, yang terpenting, rentang waktu berbeda. Kami menempatkan setiap angka di garis waktu sesuai rentang yang dicakupnya. Angka resmi adalah luas indikatif SiPongi (Sumber: SIPONGI KEMENHUT). Angka independen dikutip seperti yang diterbitkan atau diberitakan, dengan tautan. Kami tidak merata-rata atau mengubah angka siapa pun.",
      },
      {
        en: "The monthly bars under the timeline are SiPongi's own chart series, which counts NOAA-20 high-confidence detections only. They show when the fires grew; they are not comparable with the all-satellite counts elsewhere. Claims are quoted word for word with their date, and the check uses only the data on this page or the cited source.",
        id: "Batang bulanan di bawah garis waktu adalah seri grafik SiPongi sendiri, yang hanya menghitung deteksi NOAA-20 berkeyakinan tinggi. Batang ini menunjukkan kapan api membesar; tidak bisa dibandingkan dengan hitungan semua satelit di bagian lain. Klaim dikutip kata per kata dengan tanggalnya, dan pemeriksaannya hanya memakai data di halaman ini atau sumber yang dikutip.",
      },
    ],
  },
  {
    id: "papua",
    en: "Papua Selatan",
    idn: "Papua Selatan",
    body: [
      {
        en: "The Papua chapter counts Suomi-NPP detections inside Papua Selatan province (the Merauke, Boven Digoel, Mappi and Asmat regencies), using a province outline built from geoBoundaries regency outlines, and compares the province with itself in the same week of every year since 2012. Its savanna burns in most dry seasons, which is why the comparison is with its own past rather than with other regions. Burned area for the province is shown from SiPongi and from an independent Sentinel-2 product as reported, and WALHI's count of hotspots in National Strategic Project areas is quoted as published.",
        id: "Bab Papua menghitung deteksi Suomi-NPP di dalam Provinsi Papua Selatan (Kabupaten Merauke, Boven Digoel, Mappi, dan Asmat), memakai batas provinsi yang disusun dari batas kabupaten geoBoundaries, dan membandingkan provinsi ini dengan dirinya sendiri pada minggu yang sama setiap tahun sejak 2012. Savananya terbakar hampir setiap musim kemarau, karena itu pembandingnya adalah masa lalunya sendiri, bukan wilayah lain. Luas terbakar provinsi ditampilkan dari SiPongi dan dari produk Sentinel-2 independen seperti yang diberitakan, dan hitungan WALHI atas titik panas di kawasan Proyek Strategis Nasional dikutip sesuai publikasi.",
      },
    ],
  },
  {
    id: "satellites",
    en: "Why counts disagree",
    idn: "Kenapa hitungan berbeda",
    body: [
      {
        en: "The explorer adds up detections by satellite and confidence level for each UTC day. Every combination is a correct count of something different. NASA ends near-real-time Suomi-NPP fire data on 2 November 2026 (one source gives 1 November); totals that include it will fall for a technical reason. The shares that will vanish are computed over the week shown. SiPongi's VIIRS sources are Suomi-NPP and NOAA-20, without NOAA-21.",
        id: "Penjelajah menjumlahkan deteksi per satelit dan tingkat keyakinan untuk setiap hari UTC. Setiap kombinasi adalah hitungan yang benar untuk hal yang berbeda. NASA menghentikan data api hampir waktu nyata Suomi-NPP pada 2 November 2026 (satu sumber menyebut 1 November); total yang memakainya akan turun karena alasan teknis. Porsi yang akan hilang dihitung untuk minggu yang ditampilkan. Sumber VIIRS SiPongi adalah Suomi-NPP dan NOAA-20, tanpa NOAA-21.",
      },
    ],
  },
  {
    id: "recurrence",
    en: "Same places, every El Niño",
    idn: "Tempat yang sama, setiap El Niño",
    body: [
      {
        en: "Indonesia's land is divided into 0.01° squares (about 1.1 km). A square has burned before if it held at least one Suomi-NPP detection in 2015, 2019 or 2023, the recent El Niño fire years. We report the share of this week's detections that fall in those squares next to the share of land they cover, which is what chance alone would give. The map draws coarser 0.1° squares so they are visible.",
        id: "Daratan Indonesia dibagi menjadi kotak 0,01° (sekitar 1,1 km). Sebuah kotak pernah terbakar jika berisi setidaknya satu deteksi Suomi-NPP pada 2015, 2019 atau 2023, tahun-tahun kebakaran El Niño terakhir. Kami melaporkan porsi deteksi minggu ini yang jatuh di kotak-kotak itu di samping porsi daratan yang dicakupnya, yaitu angka yang akan muncul jika semuanya kebetulan. Peta menggambar kotak 0,1° yang lebih besar agar terlihat.",
      },
    ],
  },
  {
    id: "provinces",
    en: "Your province and the share card",
    idn: "Provinsimu dan kartu untuk dibagikan",
    body: [
      {
        en: "Province outlines are geoBoundaries ADM1 (ODbL, from OpenStreetMap), with the 2022 Papua provinces built from their regencies. Detections are assigned to a province by point in polygon. The card is drawn in your browser; nothing is uploaded unless you share it.",
        id: "Batas provinsi berasal dari geoBoundaries ADM1 (ODbL, dari OpenStreetMap), dengan provinsi Papua 2022 disusun dari kabupatennya. Deteksi dimasukkan ke provinsi berdasarkan titik di dalam poligon. Kartu digambar di perambanmu; tidak ada yang diunggah kecuali kamu membagikannya.",
      },
    ],
  },
  {
    id: "policy",
    en: "Policy checks",
    idn: "Cek kebijakan",
    body: [
      {
        en: "Each policy check asks the same five questions: was it predictable, what did the government do, what does the evidence say, was it avoidable, and what has worked. Government actions are listed with dates, including those that worked. Officials are quoted word for word. Verdicts follow the cited evidence and say what it cannot prove.",
        id: "Setiap cek kebijakan mengajukan lima pertanyaan yang sama: apakah bisa diprediksi, apa yang dilakukan pemerintah, apa kata bukti, apakah bisa dicegah, dan apa yang terbukti berhasil. Tindakan pemerintah dicantumkan dengan tanggal, termasuk yang berhasil. Pejabat dikutip kata per kata. Penilaian mengikuti bukti yang dikutip dan menyebut apa yang tidak bisa dibuktikannya.",
      },
    ],
  },
  {
    id: "licences",
    en: "Sources and licences",
    idn: "Sumber dan lisensi",
    body: [
      {
        en: "We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA's Earth Science Data and Information System (ESDIS). True-colour imagery: NASA GIBS. Official figures: Sumber: SIPONGI KEMENHUT. Boundaries: geoBoundaries (ODbL). Land outlines: Natural Earth (public domain). Climate: NOAA Climate Prediction Center (ONI) and the Australian Bureau of Meteorology (IOD). Independent burned-area and policy sources are linked where they are used.",
        id: "Kami menggunakan data dan citra dari LANCE FIRMS yang dioperasikan oleh Earth Science Data and Information System (ESDIS) NASA. Citra warna asli: NASA GIBS. Angka resmi: Sumber: SIPONGI KEMENHUT. Batas wilayah: geoBoundaries (ODbL). Garis daratan: Natural Earth (domain publik). Iklim: NOAA Climate Prediction Center (ONI) dan Biro Meteorologi Australia (IOD). Sumber luas terbakar dan kebijakan independen ditautkan di tempat dipakai.",
      },
      {
        en: "Software: MapLibre GL JS (BSD-3-Clause), deck.gl (MIT), Motion (MIT), Next.js (MIT). Paper Shaders, Copyright 2026 Paper, Apache-2.0: Powered by Paper Shaders, shaders.paper.design. Fonts: Archivo, Source Serif 4 and IBM Plex Mono (SIL Open Font License).",
        id: "Perangkat lunak: MapLibre GL JS (BSD-3-Clause), deck.gl (MIT), Motion (MIT), Next.js (MIT). Paper Shaders, Copyright 2026 Paper, Apache-2.0: Powered by Paper Shaders, shaders.paper.design. Huruf: Archivo, Source Serif 4, dan IBM Plex Mono (SIL Open Font License).",
      },
    ],
  },
  {
    id: "limits",
    en: "What this cannot tell you",
    idn: "Apa yang tidak bisa diberitahukan",
    body: [
      {
        en: "Satellite detections are not proof of who started a fire, and they do not measure land burned. Companies are named only from official lists, with dates. Health and smoke figures quoted elsewhere are models or official counts, labelled as such. If a data file is missing or fails a check, its block disappears instead of showing a guess.",
        id: "Deteksi satelit bukan bukti siapa yang menyalakan api, dan tidak mengukur lahan yang terbakar. Perusahaan hanya disebut dari daftar resmi, dengan tanggal. Angka kesehatan dan asap yang dikutip adalah hasil model atau hitungan resmi, dan diberi label begitu. Jika satu berkas data hilang atau gagal diperiksa, bagiannya disembunyikan, bukan diisi tebakan.",
      },
    ],
  },
];

function FileRow({ name }: { name: FileName }) {
  const lang = useLang();
  const s = useData(name);
  const gen = s.status === "ready" ? (s.data as { generated_at?: string }).generated_at : undefined;
  return (
    <li className="files__row">
      <a className="mono" href={dataUrl(name)} download>
        {name}.json
      </a>
      <span className="src">
        {s.status === "loading" ? "…" : s.status === "missing" ? tr(lang, { en: "not available", id: "tidak tersedia" }) : gen ? `${fmtWib(gen, lang)} · ${fmtAgo(gen, lang)}` : ""}
      </span>
    </li>
  );
}

export function MethodsPage() {
  const lang = useLang();
  useEffect(() => FILE_NAMES.forEach(request), []);
  return (
    <>
      <SiteHeader caseLabel />
      <main id="main">
        <header className="methods-head grain">
          <div className="wrap">
            <p className="kicker">
              <T en="Case 01 · Karhutla 2026" id="Kasus 01 · Karhutla 2026" />
            </p>
            <h1 className="h2" style={{ marginTop: 14 }}>
              <span className="l-en" lang="en">
                <RevealLines>Methods, sources</RevealLines>
                <RevealLines>and licences</RevealLines>
              </span>
              <span className="l-id" lang="id">
                <RevealLines>Metode, sumber</RevealLines>
                <RevealLines>dan lisensi</RevealLines>
              </span>
            </h1>
            <nav className="toc" aria-label={tr(lang, { en: "On this page", id: "Di halaman ini" })}>
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="chip">
                  {lang === "id" ? s.idn : s.en}
                </a>
              ))}
              <a href="#data" className="chip">
                <T en="Data files" id="Berkas data" />
              </a>
            </nav>
          </div>
        </header>
        <div className="haze methods-body">
          <div className="wrap">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="msec">
                <p className="chapter__n">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="h3">
                  <T en={s.en} id={s.idn} />
                </h2>
                <div className="prose">
                  {s.body.map((b, k) => (
                    <p key={k}>
                      <T en={b.en} id={b.id} />
                    </p>
                  ))}
                </div>
              </section>
            ))}
            <section id="data" className="msec">
              <p className="chapter__n">{String(SECTIONS.length + 1).padStart(2, "0")}</p>
              <h2 className="h3">
                <T en="Data files" id="Berkas data" />
              </h2>
              <p className="prose">
                <T en="Every number on the case page comes from these files, refreshed every few hours. Download them, check them, reuse them with the credits above." id="Setiap angka di halaman kasus berasal dari berkas-berkas ini, diperbarui setiap beberapa jam. Unduh, periksa, dan pakai ulang dengan kredit di atas." />
              </p>
              <ul className="files">
                {FILE_NAMES.map((f) => (
                  <FileRow key={f} name={f} />
                ))}
              </ul>
              <p style={{ marginTop: 28 }}>
                <Link className="btn btn--line" href="/karhutla">
                  <span aria-hidden="true">←</span> <T en="Back to the case" id="Kembali ke kasus" />
                </Link>
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
