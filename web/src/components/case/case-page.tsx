"use client";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Marquee, type MarqueeItem } from "@/components/site/marquee";
import { FILE_NAMES, request, useReady } from "@/lib/data";
import { fmtInt, fmtRange, ordinal } from "@/lib/format";
import { T, useLang } from "@/lib/i18n";
import { Count } from "./count";
import { Hero } from "./hero";
import { HowBad } from "./how-bad";
import { MethodsTeaser } from "./methods-teaser";
import { NumbersWar } from "./numbers";
import { Papua } from "./papua";
import { YourProvince } from "./province";
import { SamePlaces } from "./same-places";
import { Stage } from "./stage";
import { Warnings } from "./warnings";

const CHAPTERS = [
  { id: "how-bad", n: "01", en: "How bad is 2026?", idn: "Seberapa parah 2026?" },
  { id: "numbers", n: "02", en: "The numbers war", idn: "Perang angka" },
  { id: "papua", n: "03", en: "The forgotten epicentre", idn: "Pusat api yang terlupakan" },
  { id: "count", n: "04", en: "Why counts disagree", idn: "Kenapa hitungan berbeda" },
  { id: "same-places", n: "05", en: "Same places", idn: "Tempat yang sama" },
  { id: "province", n: "06", en: "Your province", idn: "Provinsimu" },
  { id: "warnings", n: "07", en: "Warnings vs decisions", idn: "Peringatan vs keputusan" },
  { id: "methods", n: "08", en: "How we know", idn: "Dari mana kami tahu" },
];

function useMarquee(): MarqueeItem[][] {
  const lang = useLang();
  const s = useReady("summary");
  const r = s?.week?.regions.ID;
  const paps = s?.week?.regions.PAPS;
  if (!s?.week || !r) return [];
  const range = fmtRange(s.week.start, s.week.end, lang, false).toUpperCase();
  const row1: MarqueeItem[] = [
    { text: `${fmtInt(r.count, lang)} ${lang === "id" ? "deteksi" : "detections"}`, style: "x" },
    { text: range, style: "c" },
    { text: lang === "id" ? (r.rank === 1 ? `terparah sejak ${r.since ?? 2012}` : `terparah ${ordinal(r.rank, "id")} sejak ${r.since ?? 2012}`) : r.rank === 1 ? `worst since ${r.since ?? 2012}` : `${ordinal(r.rank, "en")} worst since ${r.since ?? 2012}`, style: "e" },
  ];
  const row2: MarqueeItem[] = [
    { text: "Kalimantan", style: "o" },
    { text: lang === "id" ? "Sumatera" : "Sumatra", style: "c" },
    { text: "Papua", style: "e" },
    ...(paps ? [{ text: `${fmtInt(paps.count, lang)} ${lang === "id" ? "di Papua selatan" : "in southern Papua"}`, style: "x" as const }] : []),
  ];
  return [row1, row2];
}

export function CasePage() {
  const marquee = useMarquee();
  // Start every data file early; each block appears as its file arrives.
  useEffect(() => {
    FILE_NAMES.forEach(request);
  }, []);
  return (
    <>
      <a className="skip" href="#how-bad">
        <T en="Skip to the story" id="Langsung ke cerita" />
      </a>
      <SiteHeader caseLabel chapters={CHAPTERS} />
      <Stage />
      <main id="main">
        <Hero />
        <Marquee rows={marquee} />
        <HowBad />
        <NumbersWar />
        <Papua />
        <Count />
        <SamePlaces />
        <YourProvince />
        <Warnings />
        <MethodsTeaser />
      </main>
      <SiteFooter />
    </>
  );
}
