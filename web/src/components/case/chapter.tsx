"use client";
import type { ReactNode } from "react";
import { RevealLines } from "@/lib/motion";
import { T } from "@/lib/i18n";

/** Chapter number, a heading that rises out of its mask line by line, and an optional lede. */
export function ChapterHead({ n, id, en, idn, lede }: { n: string; id: string; en: string[]; idn: string[]; lede?: ReactNode }) {
  return (
    <header className="chapter__head">
      <p className="chapter__n">{n}</p>
      <h2 className="h2" id={id}>
        <span className="l-en" lang="en">
          {en.map((l) => (
            <RevealLines key={l}>{l}</RevealLines>
          ))}
        </span>
        <span className="l-id" lang="id">
          {idn.map((l) => (
            <RevealLines key={l}>{l}</RevealLines>
          ))}
        </span>
      </h2>
      {lede ? <div className="lede">{lede}</div> : null}
    </header>
  );
}

export function Loading({ h = 320 }: { h?: number }) {
  return (
    <div className="loading" style={{ minHeight: h }} aria-busy="true">
      <span className="src">
        <T en="Loading the data…" id="Memuat data…" />
      </span>
    </div>
  );
}
