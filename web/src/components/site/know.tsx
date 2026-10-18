"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { tr, useLang, type Lang } from "@/lib/i18n";

/**
 * "How we know": every number on screen has a small button that opens a sheet with its source, time window and
 * method, and a link to the methods page. One native <dialog> for the page (focus trap, Escape and focus return
 * come with it); a bottom sheet on phones, a side panel on desktop.
 */
export type Bi = { en: string; id: string };
export type KnowItem = {
  title: Bi;
  value?: string;
  source: Bi;
  window?: Bi;
  method: Bi;
  note?: Bi;
  links?: { label: string; href: string }[];
  anchor?: string;
};

const Ctx = createContext<(item: KnowItem) => void>(() => {});

export function KnowProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<KnowItem | null>(null);
  const lang = useLang();
  const open = useCallback((it: KnowItem) => {
    setItem(it);
    requestAnimationFrame(() => {
      const d = ref.current;
      if (d && !d.open) d.showModal();
    });
  }, []);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close();
    };
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, []);
  return (
    <Ctx.Provider value={open}>
      {children}
      <dialog ref={ref} className="know-sheet" aria-labelledby="know-title">
        {item ? <KnowBody item={item} lang={lang} onClose={() => ref.current?.close()} /> : null}
      </dialog>
    </Ctx.Provider>
  );
}

function KnowBody({ item, lang, onClose }: { item: KnowItem; lang: Lang; onClose: () => void }) {
  const rows: [Bi, Bi | undefined][] = [
    [{ en: "Source", id: "Sumber" }, item.source],
    [{ en: "Window", id: "Rentang waktu" }, item.window],
    [{ en: "Method", id: "Metode" }, item.method],
    [{ en: "Note", id: "Catatan" }, item.note],
  ];
  return (
    <div className="know-sheet__in">
      <div className="know-sheet__head">
        <p className="kicker">{tr(lang, { en: "How we know", id: "Dari mana angka ini" })}</p>
        <button type="button" className="btn-ghost" onClick={onClose} autoFocus>
          {tr(lang, { en: "Close", id: "Tutup" })}
        </button>
      </div>
      <h2 id="know-title" className="know-sheet__title">
        {tr(lang, item.title)}
      </h2>
      {item.value ? <p className="know-sheet__value num">{item.value}</p> : null}
      <dl className="know-sheet__rows">
        {rows.map(([k, v]) =>
          v ? (
            <div key={k.en}>
              <dt>{tr(lang, k)}</dt>
              <dd>{tr(lang, v)}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {item.links?.length ? (
        <ul className="know-sheet__links">
          {item.links.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <Link className="know-sheet__more" href={`/karhutla/methods${item.anchor ? `#${item.anchor}` : ""}`} onClick={onClose}>
        {tr(lang, { en: "Full methods and sources", id: "Metode dan sumber lengkap" })}
      </Link>
    </div>
  );
}

export function useKnow() {
  return useContext(Ctx);
}

/** The small button next to a number. */
export function Know({ item, className = "" }: { item: KnowItem; className?: string }) {
  const open = useKnow();
  const lang = useLang();
  return (
    <button type="button" className={`know ${className}`} onClick={() => open(item)} aria-label={`${tr(lang, { en: "How we know", id: "Dari mana angka ini" })}: ${tr(lang, item.title)}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 7.1v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
      </svg>
    </button>
  );
}

/** A text link version, for under charts. */
export function KnowLink({ item, children }: { item: KnowItem; children?: ReactNode }) {
  const open = useKnow();
  const lang = useLang();
  return (
    <button type="button" className="know-link" onClick={() => open(item)}>
      {children ?? tr(lang, { en: "How we know", id: "Dari mana angka ini" })}
    </button>
  );
}
