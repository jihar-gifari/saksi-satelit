"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { setLang, T, tr, useLang } from "@/lib/i18n";
import { setPaused, usePaused } from "@/lib/motion";

/** The bar over every page: the wordmark, the case, EN/ID, and "Pause motion" (always visible, WCAG 2.2.2). */
export function SiteHeader({ caseLabel, chapters }: { caseLabel?: boolean; chapters?: { id: string; n: string; en: string; idn: string }[] }) {
  const lang = useLang();
  const paused = usePaused();
  const [solid, setSolid] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!chapters?.length) return;
    const els = chapters.map((c) => document.getElementById(c.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [chapters]);

  const cur = chapters?.find((c) => c.id === current);

  return (
    <header className={`site-header ${solid ? "is-solid" : ""}`}>
      <div className="site-header__in">
        <Link href="/" className="wordmark" aria-label="Saksi Satelit">
          <span className="wordmark__a">Saksi</span>
          <span className="wordmark__b">Satelit</span>
        </Link>
        {caseLabel ? (
          <Link href="/karhutla" className="site-header__case mono">
            <span aria-hidden="true">/ </span>Karhutla 2026
          </Link>
        ) : null}
        {cur ? (
          <a className="site-header__chapter mono" href={`#${cur.id}`} aria-live="off">
            <span className="site-header__n">{cur.n}</span> {lang === "id" ? cur.idn : cur.en}
          </a>
        ) : null}
        <div className="site-header__tools">
          <div className="seg" role="group" aria-label={tr(lang, { en: "Language", id: "Bahasa" })}>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en">
              EN
            </button>
            <button type="button" aria-pressed={lang === "id"} onClick={() => setLang("id")} lang="id">
              ID
            </button>
          </div>
          <button type="button" className="pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>
            <svg viewBox="0 0 12 12" aria-hidden="true">
              {paused ? <path d="M3 1.8v8.4L10.2 6z" fill="currentColor" /> : <path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" />}
            </svg>
            <span>{paused ? <T en="Play motion" id="Putar gerak" /> : <T en="Pause motion" id="Jeda gerak" />}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
