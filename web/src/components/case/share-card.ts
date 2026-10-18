import type { Cells7d, Province } from "@/lib/data";
import { fmtInt, fmtRange, ordinal } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { SHORT_LINK } from "@/lib/base";

/**
 * The share card: a 1080 × 1350 PNG drawn in the browser, in Indonesian or English, with the province's shape lit
 * by its own week of detections, its number, and the site link. Nothing leaves the device until the visitor shares.
 */
export type CardInput = {
  province: Province;
  cells: Cells7d | null;
  week: { start: string; end: string } | null;
  lang: Lang;
};

const W = 1080;
const H = 1350;

function inside(x: number, y: number, ring: number[][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function provinceTotal(p: Province) {
  return p.week_7d ? Object.values(p.week_7d).reduce<number>((a, b) => a + (b ?? 0), 0) : null;
}

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min: number, font: (px: number) => string) {
  let px = start;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

export async function drawCard(input: CardInput): Promise<Blob | null> {
  const { province: p, cells, week, lang } = input;
  const display = fontVar("--font-archivo", "Archivo");
  const mono = fontVar("--font-mono", "IBM Plex Mono");
  const serif = fontVar("--font-serif", "Source Serif 4");
  try {
    await Promise.all([document.fonts.load(`900 120px ${display}`), document.fonts.load(`400 30px ${mono}`), document.fonts.load(`italic 400 34px ${serif}`)]);
  } catch {
    /* draw with whatever is available */
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const setStretch = (v: string) => {
    if ("fontStretch" in ctx) (ctx as unknown as { fontStretch: string }).fontStretch = v;
  };

  // Night.
  ctx.fillStyle = "#070a09";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 620);
  glow.addColorStop(0, "rgba(120,36,10,0.55)");
  glow.addColorStop(1, "rgba(7,10,9,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Grain.
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);

  // Masthead.
  setStretch("ultra-expanded");
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 40px ${display}`;
  ctx.fillStyle = "#e7ece7";
  ctx.fillText("SAKSI", 72, 104);
  const sw = ctx.measureText("SAKSI ").width;
  ctx.fillStyle = "#ff6b36";
  ctx.fillText("SATELIT", 72 + sw, 104);
  setStretch("normal");
  ctx.font = `500 24px ${mono}`;
  ctx.fillStyle = "#a3b0a9";
  ctx.textAlign = "right";
  ctx.fillText("KARHUTLA 2026", W - 72, 100);
  ctx.textAlign = "left";

  // Province shape, fitted into the upper half (longitude scaled by cos(latitude)).
  let w = 180, s = 90, e = -180, n = -90;
  for (const r of p.rings) for (const pt of r) {
    const x = pt[0]!;
    const y = pt[1]!;
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  const k = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const box = { x: 90, y: 160, w: W - 180, h: 560 };
  const scale = Math.min(box.w / Math.max(0.01, (e - w) * k), box.h / Math.max(0.01, n - s));
  const ox = box.x + (box.w - (e - w) * k * scale) / 2;
  const oy = box.y + (box.h - (n - s) * scale) / 2;
  const px = (x: number) => ox + (x - w) * k * scale;
  const py = (y: number) => oy + (n - y) * scale;
  ctx.beginPath();
  for (const r of p.rings) {
    r.forEach((pt, i) => (i ? ctx.lineTo(px(pt[0]!), py(pt[1]!)) : ctx.moveTo(px(pt[0]!), py(pt[1]!))));
    ctx.closePath();
  }
  ctx.fillStyle = "#131c18";
  ctx.fill("evenodd");
  ctx.strokeStyle = "#ffb37a";
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.65;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Embers: the province's own week of detections.
  if (cells) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sc = sprite.getContext("2d")!;
    const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,240,215,1)");
    g.addColorStop(0.18, "rgba(255,170,95,0.9)");
    g.addColorStop(0.45, "rgba(255,95,35,0.32)");
    g.addColorStop(1, "rgba(255,60,10,0)");
    sc.fillStyle = g;
    sc.fillRect(0, 0, 64, 64);
    const cellPx = Math.max(6, cells.cell_deg * k * scale * 1.6);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const cell of cells.cells) {
      const x = cell[0]!;
      const y = cell[1]!;
      const count = cell[2] ?? 0;
      if (x < w || x > e || y < s || y > n || count <= 0) continue;
      if (!p.rings.some((r) => inside(x, y, r))) continue;
      const r = cellPx * (0.7 + Math.min(1.6, Math.log10(count + 1) * 0.7));
      ctx.globalAlpha = Math.min(0.95, 0.25 + Math.log10(count + 1) * 0.3);
      ctx.drawImage(sprite, px(x) - r, py(y) - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // Name, number, words.
  const name = (lang === "id" ? p.name_id : p.name_en).toUpperCase();
  setStretch("expanded");
  const namePx = fitText(ctx, name, W - 144, 96, 40, (v) => `900 ${v}px ${display}`);
  ctx.fillStyle = "#e7ece7";
  ctx.fillText(name, 72, 820);
  const total = provinceTotal(p);
  let y = 820 + 24;
  if (total != null) {
    setStretch("ultra-expanded");
    const nPx = fitText(ctx, fmtInt(total, lang), W - 144, 200, 80, (v) => `900 ${v}px ${display}`);
    y += nPx * 0.86;
    ctx.fillStyle = "#ffe9cf";
    ctx.fillText(fmtInt(total, lang), 66, y);
    setStretch("normal");
    y += 52;
    ctx.font = `500 28px ${mono}`;
    ctx.fillStyle = "#ff6b36";
    const range = week ? fmtRange(week.start, week.end, lang) : "";
    ctx.fillText(lang === "id" ? `TITIK PANAS DARI 3 SATELIT NASA · ${range.toUpperCase()}` : `HOTSPOTS FROM 3 NASA SATELLITES · ${range.toUpperCase()}`, 72, y);
  }
  setStretch("normal");
  const lines: string[] = [];
  if (p.snpp_week) {
    const r = p.snpp_week;
    lines.push(
      lang === "id"
        ? r.rank === 1
          ? `Minggu terparah sejak ${r.since ?? 2012} untuk provinsi ini (Suomi-NPP).`
          : `Terparah ${ordinal(r.rank, "id")} dari ${r.of} sejak ${r.since ?? 2012} untuk provinsi ini (Suomi-NPP).`
        : r.rank === 1
          ? `The worst week since ${r.since ?? 2012} for this province (Suomi-NPP).`
          : `The ${ordinal(r.rank, "en")} worst of ${r.of} since ${r.since ?? 2012} for this province (Suomi-NPP).`,
    );
  }
  const off = p.official_ha?.["2026_jan_jul"];
  if (typeof off === "number") lines.push(lang === "id" ? `Luas terbakar resmi Jan–Jul 2026: ${fmtInt(off, "id")} ha.` : `Official burned area, Jan–Jul 2026: ${fmtInt(off, "en")} ha.`);
  ctx.font = `italic 400 34px ${serif}`;
  ctx.fillStyle = "#e7ece7";
  y += 66;
  for (const l of lines) {
    ctx.fillText(l, 72, y, W - 144);
    y += 48;
  }

  // Footer.
  ctx.fillStyle = "#24302a";
  ctx.fillRect(72, H - 150, W - 144, 2);
  setStretch("expanded");
  ctx.font = `850 46px ${display}`;
  ctx.fillStyle = "#ff6b36";
  ctx.fillText(SHORT_LINK, 72, H - 84);
  setStretch("normal");
  ctx.font = `400 20px ${mono}`;
  ctx.fillStyle = "#86948d";
  ctx.fillText(lang === "id" ? "Data: NASA FIRMS (LANCE) · Sumber: SIPONGI KEMENHUT · geoBoundaries" : "Data: NASA FIRMS (LANCE) · SIPONGI KEMENHUT · geoBoundaries", 72, H - 44);
  void namePx;

  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}
