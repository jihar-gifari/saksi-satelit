import Link from "next/link";
import { T } from "@/lib/i18n";

/** Credits and licences on every page. */
export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <h2>Saksi Satelit</h2>
            <p>
              <T en="What the satellites saw. Open satellite data checked against Indonesia's biggest public stories, in English and Indonesian." id="Apa yang dilihat satelit. Data satelit terbuka untuk memeriksa cerita publik terbesar Indonesia, dalam bahasa Indonesia dan Inggris." />
            </p>
            <p style={{ marginTop: 14 }}>
              <T en="Built by" id="Dibuat oleh" />{" "}
              <a href="https://aldrangroup.com" rel="noopener">
                Aldran Group
              </a>{" "}
              · Jihar Gifari
            </p>
            <p style={{ marginTop: 14, color: "var(--ink)" }}>
              <T en="Satellite detections are not proof of who started a fire." id="Deteksi satelit bukan bukti siapa yang menyalakan api." />
            </p>
          </div>
          <div>
            <h2>
              <T en="Credits" id="Kredit" />
            </h2>
            <ul>
              <li>We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA&apos;s Earth Science Data and Information System (ESDIS).</li>
              <li>
                <T en="Official figures:" id="Angka resmi:" /> Sumber: SIPONGI KEMENHUT.
              </li>
              <li>
                <T en="Province boundaries: geoBoundaries (ODbL), from OpenStreetMap contributors." id="Batas provinsi: geoBoundaries (ODbL), dari kontributor OpenStreetMap." />
              </li>
              <li>
                <T en="True-colour imagery: NASA GIBS (Worldview)." id="Citra warna asli: NASA GIBS (Worldview)." />
              </li>
              <li>
                <T en="Land outlines: Natural Earth (public domain). Climate indices: NOAA CPC, Australian Bureau of Meteorology." id="Garis daratan: Natural Earth (domain publik). Indeks iklim: NOAA CPC, Biro Meteorologi Australia." />
              </li>
            </ul>
          </div>
          <div>
            <h2>
              <T en="More" id="Lainnya" />
            </h2>
            <ul>
              <li>
                <Link href="/karhutla">
                  <T en="Case 01: Karhutla 2026" id="Kasus 01: Karhutla 2026" />
                </Link>
              </li>
              <li>
                <Link href="/karhutla/methods">
                  <T en="Methods, sources and licences" id="Metode, sumber dan lisensi" />
                </Link>
              </li>
              <li>
                <Link href="/karhutla/methods#data">
                  <T en="Download the data (JSON)" id="Unduh datanya (JSON)" />
                </Link>
              </li>
              <li>
                <Link href="/">
                  <T en="All cases" id="Semua kasus" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="footer__big" aria-hidden="true">
          Saksi <span>Satelit</span>
        </p>
      </div>
    </footer>
  );
}
