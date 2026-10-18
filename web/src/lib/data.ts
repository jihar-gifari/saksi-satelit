"use client";
import { useEffect, useSyncExternalStore } from "react";
import { asset } from "./base";

/**
 * The pipeline's JSON files (docs/DATA_CONTRACT.md), fetched on the client from /data/karhutla/. Each file is
 * checked for the fields the page needs; a missing or malformed file is "missing" and the blocks that need it hide.
 * The app never substitutes a number of its own.
 */

export type SatCode = "0" | "1" | "2";
export type ConfCode = "1" | "2";
export type RegionCode = "ID" | "KAL" | "SUM" | "PAP" | "PAPS" | "OTH";

export type Source = { id: string; name: string; licence?: string; url?: string; retrieved_at?: string };

export type WeekRank = {
  count: number;
  rank: number;
  of: number;
  since?: number;
  higher: number[];
  median: number;
  by_year: Record<string, number>;
};

export type Summary = {
  generated_at: string;
  as_of: string;
  snpp_end?: string;
  week?: { start: string; end: string; sensor: string; regions: Partial<Record<RegionCode, WeekRank>> };
  recurrence?: {
    years: number[];
    cell_deg: number;
    share_detections: number;
    share_land: number;
    n_detections?: number;
    land_km2?: number;
    burned_before_km2?: number;
    window?: [string, string];
    sensor?: string;
  };
  last24h?: { start: string; end: string; total: number; by_sat?: Partial<Record<SatCode, number>>; by_region?: Partial<Record<RegionCode, number>> };
  official_total_ha?: Record<string, number>;
  sources?: Source[];
};

export type Hotspots = {
  generated_at: string;
  start: string;
  end: string;
  fields: string[];
  points: number[][];
};

export type Cells7d = { generated_at: string; start: string; end: string; cell_deg: number; cells: number[][] };

export type Season = {
  generated_at: string;
  sensor: string;
  regions: string[];
  years: Record<string, Partial<Record<RegionCode, (number | null)[]>>>;
  coverage_2026?: [string, string];
  note?: string;
};

export type Recurrence = { generated_at: string; cell_deg: number; bits: Record<string, number>; cells: number[][]; window_2026w?: [string, string] };

export type Satellites = {
  generated_at: string;
  days: string[];
  counts: Partial<Record<SatCode, Partial<Record<ConfCode, number[]>>>>;
  example_day?: string;
  example?: { n20_high: number; all: number };
  snpp_share_all3?: number;
  snpp_share_sipongi_viirs?: number;
  snpp_end?: string;
  note?: string;
};

export type Province = {
  id: string;
  name_en: string;
  name_id: string;
  region: RegionCode;
  rings: number[][][];
  week_7d?: Partial<Record<SatCode, number>>;
  snpp_week?: WeekRank;
  official_ha?: Record<string, number>;
};
export type Provinces = { generated_at: string; boundary_source?: string; window?: [string, string]; provinces: Province[] };

export type Estimate = {
  source: string;
  kind: "official" | "independent" | string;
  window: [string, string];
  hectares: number;
  method?: string;
  url?: string;
  note_en?: string;
  note_id?: string;
};
export type PairSide = { source: string; hectares: number; until?: string; until_note?: string; url?: string };
export type Pair = { place_en: string; place_id: string; official: PairSide; independent: PairSide; note_en?: string; note_id?: string };
export type Claim = {
  date: string;
  who: string;
  claim_en: string;
  claim_id: string;
  url?: string;
  check_en: string;
  check_id: string;
  check_url?: string;
};
export type Numbers = {
  generated_at: string;
  estimates: Estimate[];
  pairs?: Pair[];
  claims?: Claim[];
  monthly_sipongi_n20_high?: Record<string, number>;
  detections_by_day_all3?: Record<string, number>;
  official_total_2025_ha?: number;
};

export type Papua = {
  generated_at: string;
  box: [number, number, number, number];
  regencies?: string[];
  week: { start: string; end: string };
  sensor?: string;
  by_year: Record<string, number>;
  rank?: number;
  median_2012_2025: number;
  official?: { source: string; ha_2025?: number; ha_2026_jan_jul?: number };
  independent?: { source: string; ha: number; window?: [string, string]; url?: string };
  walhi_psn_hotspots_jan_aug?: { value: number; source: string; url?: string };
};

export type Climate = {
  generated_at: string;
  oni?: { season: string; year: number; value: number }[];
  oni_source?: string;
  iod?: { value: number; week_to: string; source: string };
  notes?: { en: string; id: string; url?: string }[];
};

export type PolicyAction = { date: string; actor: string; en: string; id: string; url?: string };
export type PolicyEvidence = { en: string; id: string; source?: string; url?: string };
export type PolicyChapter = {
  question_en: string;
  question_id: string;
  predictable_en?: string;
  predictable_id?: string;
  actions?: PolicyAction[];
  evidence?: PolicyEvidence[];
  verdict: "avoidable" | "partly" | "not" | string;
  verdict_en: string;
  verdict_id: string;
  fix_en?: string;
  fix_id?: string;
  fix_source?: string;
  fix_url?: string;
};
export type PolicyEvent = { date: string; actor: string; kind: "warning" | "decision" | "action" | "claim" | "ruling" | "budget" | string; en: string; id: string; url?: string };
export type Policy = {
  generated_at: string;
  method_en?: string;
  method_id?: string;
  framework?: { key: string; en: string; id: string }[];
  chapters?: Record<string, PolicyChapter>;
  timeline?: PolicyEvent[];
};

export type Files = {
  summary: Summary;
  policy: Policy;
  hotspots: Hotspots;
  cells7d: Cells7d;
  season: Season;
  recurrence: Recurrence;
  satellites: Satellites;
  provinces: Provinces;
  numbers: Numbers;
  papua: Papua;
  climate: Climate;
};
export type FileName = keyof Files;
export const FILE_NAMES: FileName[] = ["summary", "hotspots", "cells7d", "season", "recurrence", "satellites", "provinces", "numbers", "papua", "climate", "policy"];

/* ------------------------------------------------------------ validation ------------------------------------------------------------ */

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string" && x.length > 0;
const isArr = Array.isArray;
const isWeekRank = (x: unknown): x is WeekRank =>
  isObj(x) && isNum(x.count) && isNum(x.rank) && isNum(x.of) && isNum(x.median) && isArr(x.higher) && isObj(x.by_year);

const validators: { [K in FileName]: (x: unknown) => boolean } = {
  summary: (x) => isObj(x) && isStr(x.generated_at) && isStr(x.as_of),
  hotspots: (x) => isObj(x) && isStr(x.end) && isArr(x.points) && isArr(x.fields) && (x.fields as unknown[]).join(",").startsWith("lon,lat,frp,sat,conf,h"),
  cells7d: (x) => isObj(x) && isArr(x.cells) && isNum(x.cell_deg),
  season: (x) => isObj(x) && isObj(x.years),
  recurrence: (x) => isObj(x) && isArr(x.cells) && isObj(x.bits),
  satellites: (x) => isObj(x) && isArr(x.days) && isObj(x.counts),
  provinces: (x) => isObj(x) && isArr(x.provinces) && (x.provinces as unknown[]).every((p) => isObj(p) && isStr(p.id) && isArr(p.rings)),
  numbers: (x) => isObj(x) && isArr(x.estimates),
  papua: (x) => isObj(x) && isArr(x.box) && isObj(x.by_year) && isNum(x.median_2012_2025),
  climate: (x) => isObj(x),
  policy: (x) => isObj(x) && (isObj(x.chapters) || isArr(x.timeline)),
};

export const valid = { isWeekRank, isNum, isStr, isObj };

/* --------------------------------------------------------------- store --------------------------------------------------------------- */

export type Loaded<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "missing" };

const LOADING = { status: "loading" } as const;
const MISSING = { status: "missing" } as const;
const store = new Map<FileName, Loaded<unknown>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const dataUrl = (name: FileName) => asset(`/data/karhutla/${name}.json`);

export function request(name: FileName) {
  if (store.has(name)) return;
  store.set(name, LOADING);
  fetch(dataUrl(name), { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json: unknown) => {
      store.set(name, json != null && validators[name](json) ? { status: "ready", data: json } : MISSING);
      emit();
    })
    .catch(() => {
      store.set(name, MISSING);
      emit();
    });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Loads a data file (once per page) and returns its state. Server HTML always sees "loading". */
export function useData<K extends FileName>(name: K): Loaded<Files[K]> {
  useEffect(() => request(name), [name]);
  return useSyncExternalStore(
    subscribe,
    () => (store.get(name) ?? LOADING) as Loaded<Files[K]>,
    () => LOADING,
  );
}

/** The data, or null while loading or when missing. */
export function useReady<K extends FileName>(name: K): Files[K] | null {
  const s = useData(name);
  return s.status === "ready" ? s.data : null;
}

/** Imperative access for non-React code (the map). */
export function getLoaded<K extends FileName>(name: K): Files[K] | null {
  const s = store.get(name);
  return s && s.status === "ready" ? (s.data as Files[K]) : null;
}
export function onData(cb: () => void) {
  return subscribe(cb);
}
