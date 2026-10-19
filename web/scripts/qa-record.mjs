// QA walkthrough: records a scroll video of the case page (and the hub) at phone and desktop sizes against a
// running production build, logs console errors, and writes frame contact sheets.
//
//   pnpm build && pnpm start            (in one terminal)
//   pnpm qa:record                      (in another; needs ffmpeg on PATH)
//
// Output: ../docs/qa/. Set QA_BASE to point at another server, HEADLESS=1 to run without a window (WebGL then
// falls back to software rendering and the map animates slowly).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "..", "docs", "qa");
const tmp = join(out, ".tmp");
const BASE = process.env.QA_BASE ?? "http://localhost:3100/saksi-satelit";
mkdirSync(tmp, { recursive: true });

const sizes = [
  { name: "390x844", width: 390, height: 844, lang: "id" },
  { name: "1440x900", width: 1440, height: 900, lang: "en" },
];

async function smoothTo(page, y, ms = 1400) {
  await page.evaluate(
    ([target, dur]) =>
      new Promise((done) => {
        const from = window.scrollY;
        const t0 = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          window.scrollTo(0, from + (target - from) * ease(t));
          if (t < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
}

async function walkSection(page, id, h, hooks = {}) {
  const top = await page.evaluate((s) => {
    const el = document.getElementById(s);
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  }, id);
  if (top == null) return;
  const height = await page.evaluate((s) => document.getElementById(s).getBoundingClientRect().height, id);
  await smoothTo(page, top - 10, 1500);
  await page.waitForTimeout(2600);
  let y = top;
  let n = 0;
  while (y + h * 0.75 < top + height && n < 14) {
    y += Math.round(h * 0.72);
    await smoothTo(page, y, 1100);
    await page.waitForTimeout(1300);
    if (hooks[n]) await hooks[n](page);
    n++;
  }
}

async function clickText(page, text) {
  const el = page.getByRole("button", { name: text }).first();
  if (await el.isVisible().catch(() => false)) {
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.click().catch(() => {});
    await page.waitForTimeout(1500);
  }
}

const only = process.env.QA_SIZES?.split(",");
for (const size of sizes.filter((s) => !only || only.includes(s.name))) {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "1" });
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    locale: size.lang === "id" ? "id-ID" : "en-GB",
    recordVideo: { dir: tmp, size: { width: size.width, height: size.height } },
  });
  const page = await context.newPage();
  page.on("crash", () => console.log("page crashed"));
  browser.on("disconnected", () => console.log("browser disconnected"));
  const log = [];
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && log.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => log.push(`pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && log.push(`http ${r.status()}: ${r.url()}`));

  // The case page.
  await page.goto(`${BASE}/karhutla`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(9000);
  await clickText(page, size.lang === "id" ? "Apa itu titik panas?" : "What is a hotspot?");
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  await walkSection(page, "how-bad", size.height, { 0: (p) => clickText(p, "Kalimantan"), 2: (p) => clickText(p, "Indonesia") });
  await walkSection(page, "numbers", size.height);
  await walkSection(page, "papua", size.height);
  await walkSection(page, "count", size.height, {
    0: async (p) => {
      await clickText(p, size.lang === "id" ? "NOAA-20, tinggi saja" : "NOAA-20, high only");
      await clickText(p, size.lang === "id" ? "Semuanya" : "Everything");
    },
  });
  await walkSection(page, "same-places", size.height, { 0: (p) => clickText(p, "2015") });
  await walkSection(page, "province", size.height, {
    0: async (p) => {
      await p.selectOption("#prov-select", "ID-PS").catch(() => {});
      await p.waitForTimeout(2500);
    },
  });
  await walkSection(page, "warnings", size.height);
  await walkSection(page, "methods", size.height);
  await smoothTo(page, await page.evaluate(() => document.documentElement.scrollHeight), 1500);
  await page.waitForTimeout(1500);
  // Back to the top: switch language, open a "how we know" sheet, pause motion.
  await smoothTo(page, 0, 1800);
  await page.waitForTimeout(1200);
  await clickText(page, size.lang === "id" ? "EN" : "ID");
  await page.locator(".counter .know").first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  await page.locator(".pause").first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await page.locator(".pause").first().click().catch(() => {});

  // The hub.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);
  const hubH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hubH; y += Math.round(size.height * 0.8)) {
    await smoothTo(page, y, 1000);
    await page.waitForTimeout(1100);
  }

  const video = page.video();
  await context.close();
  await browser.close();
  const src = await video.path();
  const webm = join(out, `case-${size.name}.webm`);
  renameSync(src, webm);
  writeFileSync(join(out, `console-${size.name}.txt`), log.length ? [...new Set(log)].join("\n") + "\n" : "No console errors or failed requests.\n");

  const mp4 = join(out, `case-${size.name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", mp4]);
  rmSync(webm);
  const cols = size.width < 800 ? 8 : 4;
  const tw = size.width < 800 ? 260 : 480;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf", `fps=1/4,scale=${tw}:-1,tile=${cols}x6:padding=6:color=0x222222`, "-frames:v", "3", join(out, `contact-${size.name}-%d.jpg`)]);
  console.log(`recorded ${mp4}`);
}
for (const f of readdirSync(tmp)) rmSync(join(tmp, f));
rmSync(tmp, { recursive: true, force: true });
