"use client";
import { useSyncExternalStore, type ReactNode } from "react";

/**
 * English and Indonesian. Static copy is rendered in both languages and CSS shows one (html[data-lang]), so the
 * language chosen before first paint (stored choice, else the browser language) never flashes the other one.
 * Text built from data uses `useLang()` and is rendered on the client only.
 */
export type Lang = "en" | "id";
export const LANG_KEY = "saksi-lang";

/** Runs in <head> before first paint: picks the language and restores "Pause motion". */
export const bootScript = `(function(){try{var d=document.documentElement,l=null;try{l=localStorage.getItem("${LANG_KEY}")}catch(e){}if(l!=="en"&&l!=="id"){var n=((navigator.languages&&navigator.languages[0])||navigator.language||"").toLowerCase();l=/^(id|in)\\b/.test(n)?"id":"en"}d.lang=l;d.dataset.lang=l;var m=null;try{m=localStorage.getItem("saksi-motion")}catch(e){}if(m==="paused")d.dataset.motion="paused"}catch(e){}})();`;

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lang"] });
  return () => obs.disconnect();
}
const read = (): Lang => (document.documentElement.dataset.lang === "id" ? "id" : "en");

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "en");
}

export function setLang(lang: Lang) {
  const d = document.documentElement;
  d.dataset.lang = lang;
  d.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage can be blocked; the choice still applies to this page */
  }
}

/** Both languages in the HTML, one shown. Use for static copy. */
export function T({ en, id }: { en: ReactNode; id: ReactNode }) {
  return (
    <>
      <span lang="en" className="l-en">
        {en}
      </span>
      <span lang="id" className="l-id">
        {id}
      </span>
    </>
  );
}

/** Picks the string for the current language (client-side text, attributes). */
export function tr<T>(lang: Lang, v: { en: T; id: T }): T {
  return lang === "id" ? v.id : v.en;
}
