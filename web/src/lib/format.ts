import type { Lang } from "./i18n";

const locale = (lang: Lang) => (lang === "id" ? "id-ID" : "en-GB");
const nfCache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, opts: Intl.NumberFormatOptions = {}) {
  const key = lang + JSON.stringify(opts);
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale(lang), opts);
    nfCache.set(key, f);
  }
  return f;
}

/** 48,039 (en) or 48.039 (id). */
export const fmtInt = (n: number, lang: Lang) => nf(lang, { maximumFractionDigits: 0 }).format(Math.round(n));
export const fmtNum = (n: number, lang: Lang, digits = 1) => nf(lang, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
/** 0.6449 -> 64% (or 64,5% with digits=1). */
export const fmtPct = (x: number, lang: Lang, digits = 0) => nf(lang, { style: "percent", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(x);
/** "about 11 times" style multipliers: one decimal under 10, whole numbers above. */
export const fmtTimes = (x: number, lang: Lang) => (x < 10 ? fmtNum(x, lang, 1) : fmtInt(x, lang)) + "×";
/** Compact for axes: 20k / 20 rb. */
export function fmtAxis(n: number, lang: Lang) {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1000) return fmtNum(n / 1000, lang, n % 1000 === 0 ? 0 : 1) + (lang === "id" ? " rb" : "k");
  return fmtInt(n, lang);
}

const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
};
const MONTHS_LONG: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
};
export const monthShort = (m: number, lang: Lang) => MONTHS[lang][m] ?? "";
export const monthLong = (m: number, lang: Lang) => MONTHS_LONG[lang][m] ?? "";

/** Parses YYYY-MM-DD as a calendar date (no time zone games). */
export function parseDay(s: string): { y: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!r) return null;
  return { y: Number(r[1]), m: Number(r[2]) - 1, d: Number(r[3]) };
}

/** 17 Oct 2026 / 17 Okt 2026 (year optional). */
export function fmtDay(s: string, lang: Lang, withYear = true) {
  const p = parseDay(s);
  if (!p) return s;
  return `${p.d} ${monthShort(p.m, lang)}${withYear ? ` ${p.y}` : ""}`;
}

/** 11–17 Oct 2026, or 28 Sep – 4 Oct 2026. */
export function fmtRange(a: string, b: string, lang: Lang, withYear = true) {
  const p = parseDay(a);
  const q = parseDay(b);
  if (!p || !q) return `${a} – ${b}`;
  const y = withYear ? ` ${q.y}` : "";
  if (p.y === q.y && p.m === q.m) return `${p.d}–${q.d} ${monthShort(q.m, lang)}${y}`;
  if (p.y === q.y) return `${p.d} ${monthShort(p.m, lang)} – ${q.d} ${monthShort(q.m, lang)}${y}`;
  return `${fmtDay(a, lang)} – ${fmtDay(b, lang)}`;
}

/** 18 Oct, 00:28 WIB: times are shown in western Indonesian time. */
export function fmtWib(iso: string, lang: Lang, withDate = true) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(t);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  const time = `${get("hour")}${lang === "id" ? "." : ":"}${get("minute")} WIB`;
  if (!withDate) return time;
  return `${get("day")} ${monthShort(Number(get("month")) - 1, lang)}, ${time}`;
}

/** "3 hours ago" / "3 jam yang lalu". */
export function fmtAgo(iso: string, lang: Lang, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
  const mins = Math.round((t - now) / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

/** 2 -> "2nd" / "ke-2". */
export function ordinal(n: number, lang: Lang) {
  if (lang === "id") return `ke-${n}`;
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** "2015", "2015 and 2019", "2014, 2015 and 2019". */
export function listYears(years: (number | string)[], lang: Lang) {
  const ys = years.map(String);
  if (ys.length <= 1) return ys.join("");
  const and = lang === "id" ? " dan " : " and ";
  return ys.slice(0, -1).join(", ") + and + ys[ys.length - 1];
}

/** Day of year (0-based) for YYYY-MM-DD. */
export function dayOfYear(s: string) {
  const p = parseDay(s);
  if (!p) return 0;
  return Math.round((Date.UTC(p.y, p.m, p.d) - Date.UTC(p.y, 0, 1)) / 86400000);
}
