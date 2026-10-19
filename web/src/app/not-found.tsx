import Link from "next/link";
import { T } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main id="main" className="grain" style={{ minHeight: "100svh", display: "grid", alignItems: "center" }}>
      <div className="wrap stack" style={{ gap: 18 }}>
        <p className="kicker">404</p>
        <h1 className="h2">
          <T en="The satellites saw nothing here." id="Satelit tidak melihat apa pun di sini." />
        </h1>
        <p>
          <Link className="btn btn--ember" href="/karhutla">
            <T en="Go to case 01: Karhutla 2026" id="Ke kasus 01: Karhutla 2026" />
          </Link>
        </p>
      </div>
    </main>
  );
}
