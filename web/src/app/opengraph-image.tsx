import { ImageResponse } from "next/og";

export const alt = "Saksi Satelit: what the satellites saw. Case 01, karhutla 2026.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function font(weight: number, family = "Archivo", extra = "wdth,wght@125,"): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:${extra}${weight}&display=swap`)).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [display, mono] = await Promise.all([font(900), font(400, "IBM+Plex+Mono", "wght@")]);
  const fonts = [
    ...(display ? [{ name: "Archivo", data: display, weight: 900 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Plex", data: mono, weight: 400 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b0f0d", padding: "64px 72px", position: "relative", fontFamily: "Archivo" }}>
        <div style={{ position: "absolute", left: 640, top: 250, width: 980, height: 980, borderRadius: 490, background: "#111815", border: "2px solid #2b4a44", boxShadow: "0 0 140px 30px rgba(255,107,54,0.22)", display: "flex" }} />
        <div style={{ display: "flex", fontFamily: "Plex", fontSize: 24, color: "#a3b0a9", letterSpacing: 3 }}>CASE 01 · KARHUTLA 2026</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, lineHeight: 0.86, color: "#e7ece7", letterSpacing: -4 }}>SAKSI</div>
          <div style={{ display: "flex", fontSize: 150, lineHeight: 0.86, color: "#ff6b36", letterSpacing: -4 }}>SATELIT</div>
          <div style={{ display: "flex", marginTop: 28, fontFamily: "Plex", fontSize: 30, color: "#e7ece7" }}>What the satellites saw · Apa yang dilihat satelit</div>
        </div>
        <div style={{ display: "flex", fontFamily: "Plex", fontSize: 26, color: "#ffb37a" }}>aldrangroup.com/karhutla</div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
