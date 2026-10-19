import { Map as MLMap, setWorkerUrl, type LngLatBoundsLike, type StyleSpecification } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer, ScatterplotLayer } from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import type { Layer } from "@deck.gl/core";
import { asset } from "@/lib/base";
import type { Cells7d, Hotspots, Provinces, Recurrence } from "@/lib/data";
import type { SceneName, SceneState } from "./scene";

/**
 * Fire light on a night planet. MapLibre draws the globe and the land (Natural Earth, plus Indonesia's provinces
 * from provinces.json); deck.gl draws the detections interleaved in the same WebGL context, as soft sprites with
 * additive blending so dense fires glow like embers. Colour and size follow fire radiative power (FRP).
 *
 * The map is not interactive (it would trap scrolling on phones): the story moves the camera.
 */

const MAPLIBRE_VERSION = "6.15.0";
const PAPUA_SELATAN = "ID-PS";
const INDONESIA: [[number, number], [number, number]] = [
  [95, -11],
  [141.2, 6],
];

/* ------------------------------------------------------------- colours ------------------------------------------------------------- */

/** FRP (MW) to ember colour: deep ember, ember, orange, amber, white-hot. Interpolated in log space. */
const RAMP: [number, [number, number, number]][] = [
  [0.5, [120, 24, 6]],
  [2, [184, 52, 14]],
  [5, [232, 86, 30]],
  [12, [255, 122, 58]],
  [30, [255, 170, 102]],
  [80, [255, 214, 160]],
  [220, [255, 246, 232]],
];
function emberColour(frp: number): [number, number, number] {
  const v = Math.log(Math.max(frp, RAMP[0]![0]));
  for (let i = 1; i < RAMP.length; i++) {
    const [f1, c1] = RAMP[i]!;
    const [f0, c0] = RAMP[i - 1]!;
    const l1 = Math.log(f1);
    const l0 = Math.log(f0);
    if (v <= l1) {
      const t = (v - l0) / (l1 - l0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return RAMP[RAMP.length - 1]![1];
}
/** 0..1 intensity from FRP, for size and alpha. */
const heat = (frp: number) => Math.min(1, Math.log10(Math.max(frp, 0.3) + 1) / 2.3);

/* Additive blending: overlapping glows add up towards white, like light. Depth is ignored so sprites never cut each other. */
const ADDITIVE = {
  blend: true,
  blendColorOperation: "add",
  blendColorSrcFactor: "src-alpha",
  blendColorDstFactor: "one",
  blendAlphaOperation: "add",
  blendAlphaSrcFactor: "one",
  blendAlphaDstFactor: "one-minus-src-alpha",
  depthWriteEnabled: false,
  depthCompare: "always",
} as const;
const NORMAL = {
  blend: true,
  blendColorOperation: "add",
  blendColorSrcFactor: "src-alpha",
  blendColorDstFactor: "one-minus-src-alpha",
  blendAlphaOperation: "add",
  blendAlphaSrcFactor: "one",
  blendAlphaDstFactor: "one-minus-src-alpha",
  depthWriteEnabled: false,
  depthCompare: "always",
} as const;

/** A soft radial sprite, tinted per point (IconLayer mask mode). */
function glowSprite(): HTMLCanvasElement {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.12, "rgba(255,255,255,0.85)");
  r.addColorStop(0.3, "rgba(255,255,255,0.38)");
  r.addColorStop(0.55, "rgba(255,255,255,0.12)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
  return c;
}
const ICON_MAPPING = { glow: { x: 0, y: 0, width: 128, height: 128, mask: true } };

/* ----------------------------------------------------------- binary data ----------------------------------------------------------- */

type Binary = {
  length: number;
  position: Float32Array;
  colour: Uint8Array;
  core: Uint8Array;
  size: Float32Array;
  coreRadius: Float32Array;
  /** [order, phase]: order 0 = oldest .. 48 = newest (hotspots), phase 0..1 random (flicker). */
  filter: Float32Array;
};

function packHotspots(h: Hotspots): Binary {
  const pts = h.points.filter((p) => p.length >= 6 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  // Oldest first, so newer (brighter, on top) fires draw last.
  pts.sort((a, b) => (b[5] ?? 0) - (a[5] ?? 0));
  const n = pts.length;
  const out: Binary = {
    length: n,
    position: new Float32Array(n * 2),
    colour: new Uint8Array(n * 4),
    core: new Uint8Array(n * 4),
    size: new Float32Array(n),
    coreRadius: new Float32Array(n),
    filter: new Float32Array(n * 2),
  };
  const maxH = Math.max(1, ...pts.slice(0, 1).map((p) => p[5] ?? 48), 48);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const frp = p[2] ?? 1;
    const k = heat(frp);
    const [r, g, b] = emberColour(frp);
    out.position[i * 2] = p[0]!;
    out.position[i * 2 + 1] = p[1]!;
    out.colour.set([r, g, b, 18 + 62 * k], i * 4);
    const [cr, cg, cb] = emberColour(frp * 1.6);
    out.core.set([cr, cg, cb, 60 + 150 * k], i * 4);
    out.size[i] = 5 + 17 * k;
    out.coreRadius[i] = 0.55 + 1.6 * k;
    out.filter[i * 2] = maxH - (p[5] ?? 0);
    out.filter[i * 2 + 1] = Math.random();
  }
  return out;
}

function packCells(c: Cells7d): Binary {
  const cells = c.cells.filter((x) => x.length >= 3 && Number.isFinite(x[0]) && Number.isFinite(x[1]) && (x[2] ?? 0) > 0);
  cells.sort((a, b) => (a[2] ?? 0) - (b[2] ?? 0));
  const n = cells.length;
  const out: Binary = {
    length: n,
    position: new Float32Array(n * 2),
    colour: new Uint8Array(n * 4),
    core: new Uint8Array(n * 4),
    size: new Float32Array(n),
    coreRadius: new Float32Array(n),
    filter: new Float32Array(n * 2),
  };
  for (let i = 0; i < n; i++) {
    const x = cells[i]!;
    const count = x[2] ?? 1;
    const meanFrp = (x[3] ?? count * 4) / Math.max(1, count);
    const k = Math.min(1, Math.log10(count + 1) / 3);
    const [r, g, b] = emberColour(meanFrp * (1 + 4 * k));
    out.position[i * 2] = x[0]!;
    out.position[i * 2 + 1] = x[1]!;
    out.colour.set([r, g, b, 30 + 90 * k], i * 4);
    const [cr, cg, cb] = emberColour(meanFrp * (1.5 + 6 * k));
    out.core.set([cr, cg, cb, 80 + 140 * k], i * 4);
    out.size[i] = 8 + 30 * k;
    out.coreRadius[i] = 0.9 + 2.4 * k;
    out.filter[i * 2] = 0;
    out.filter[i * 2 + 1] = Math.random();
  }
  return out;
}

/* -------------------------------------------------------------- style -------------------------------------------------------------- */

function graticule() {
  const features: GeoJSON.Feature[] = [];
  for (let lon = -180; lon <= 180; lon += 15) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 4) coords.push([lon, lat]);
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 4) coords.push([lon, lat]);
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }
  return { type: "FeatureCollection" as const, features };
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function makeStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": "#0B0F0D",
      "horizon-color": "#1A2A27",
      "fog-color": "#0B0F0D",
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "fog-ground-blend": 0.9,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 4, 0.45, 7, 0],
    },
    sources: {
      graticule: { type: "geojson", data: graticule() },
      land110: { type: "geojson", data: asset("/geo/land-110m.json") },
      land50: { type: "geojson", data: asset("/geo/land-50m-sea.json") },
      prov: { type: "geojson", data: EMPTY },
      box: { type: "geojson", data: EMPTY },
    },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": "#060A0B" } },
      { id: "graticule", type: "line", source: "graticule", paint: { "line-color": "#14201E", "line-width": 0.6, "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.9, 5, 0.25] } },
      { id: "land110", type: "fill", source: "land110", maxzoom: 3.6, paint: { "fill-color": "#111815", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 1, 3.5, 0] } },
      { id: "land50", type: "fill", source: "land50", minzoom: 2.9, paint: { "fill-color": "#111815", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 3.5, 1] } },
      { id: "prov-fill", type: "fill", source: "prov", paint: { "fill-color": "#16201C" } },
      { id: "prov-line", type: "line", source: "prov", paint: { "line-color": "#2B3934", "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.25, 6, 0.9] } },
      { id: "prov-hl-fill", type: "fill", source: "prov", filter: ["==", ["get", "id"], ""], paint: { "fill-color": "#FF6B36", "fill-opacity": 0.07 } },
      { id: "prov-hl", type: "line", source: "prov", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#FFB37A", "line-width": 1.8 } },
      { id: "box", type: "line", source: "box", paint: { "line-color": "#E7ECE7", "line-width": 1.1, "line-dasharray": [2, 2], "line-opacity": 0, "line-opacity-transition": { duration: 600 } } },
    ],
  };
}

/* ---------------------------------------------------------- the map class ---------------------------------------------------------- */

type Camera = { center: [number, number]; zoom: number; pitch: number; bearing: number };
type Data = { hotspots: Hotspots | null; cells: Cells7d | null; recurrence: Recurrence | null; provinces: Provinces | null; papuaBox: [number, number, number, number] | null; smokeDate: string | null };
type Group = "hot" | "cells" | "rec";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export class EmberMap {
  private map: MLMap;
  private overlay: MapboxOverlay;
  private sprite = glowSprite();
  /** One extension instance, reused every frame so layers never rebuild their shaders. */
  private filterExt = new DataFilterExtension({ filterSize: 2 });
  private hot: Binary | null = null;
  private cells: Binary | null = null;
  private rec: Recurrence | null = null;
  private recCells: { position: [number, number]; mask: number }[] = [];
  private provinces: Provinces | null = null;
  private box: [number, number, number, number] | null = null;
  private state: SceneState | null = null;
  private loaded = false;
  private raf = 0;
  private running = false;
  private visible = true;
  /** Ignition progress in hours of the 48-hour replay (-4 .. 52). */
  private cut = 60;
  private introStart = 0;
  private introDone = false;
  private flickerT = 0;
  private lastFrame = 0;
  private lastRender = 0;
  private opacity: Record<Group, number> = { hot: 1, cells: 0, rec: 0 };
  private target: Record<Group, number> = { hot: 1, cells: 0, rec: 0 };
  private sizeScale = 1;
  private onReady: () => void;
  private onReplay: (t: number) => void;
  private still: () => boolean;
  private narrow: boolean;
  private smokeDate: string | null = null;

  constructor(
    container: HTMLElement,
    opts: { onReady: () => void; onReplay: (t: number) => void; still: () => boolean },
  ) {
    setWorkerUrl(asset(`/vendor/maplibre-gl-worker-${MAPLIBRE_VERSION}.mjs`));
    this.onReady = opts.onReady;
    this.onReplay = opts.onReplay;
    this.still = opts.still;
    this.narrow = container.clientWidth < 768;
    const start = this.introCamera();
    this.map = new MLMap({
      container,
      style: makeStyle(),
      center: start.center,
      zoom: start.zoom,
      interactive: false,
      attributionControl: false,
      renderWorldCopies: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 0,
      maxZoom: 9,
      minZoom: -1,
    });
    // deck.gl 9.4 reads `map.transform` (height, elevation, near/far planes). MapLibre 6 moved the transform onto
    // its internal camera, so expose it again for the overlay. Remove once deck.gl supports MapLibre 6 natively.
    const m = this.map as unknown as { transform?: unknown; _camera?: { transform?: unknown } };
    if (m.transform === undefined && m._camera) {
      Object.defineProperty(m, "transform", { configurable: true, get: () => m._camera?.transform });
    }
    this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    this.map.addControl(this.overlay);
    this.map.on("load", () => {
      this.loaded = true;
      this.applyProvinces();
      this.applyBox();
      this.applySmoke();
      // The first frame after load (the map may never be "idle" while embers flicker).
      this.map.once("render", () => requestAnimationFrame(() => this.onReady()));
      if (this.state) this.applyScene(this.state, null);
      this.kick();
    });
    this.map.on("move", () => {
      const z = this.map.getZoom();
      const s = Math.pow(2, (z - 4) * 0.62);
      if (Math.abs(s - this.sizeScale) / this.sizeScale > 0.02) {
        this.sizeScale = s;
        if (!this.running) this.render();
      }
    });
    this.map.on("resize", () => {
      this.narrow = container.clientWidth < 768;
    });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    try {
      this.map.removeControl(this.overlay);
    } catch {
      /* already gone */
    }
    this.map.remove();
  }

  /* ------------------------------------------------------------ data ------------------------------------------------------------ */

  setData(d: Partial<Data>) {
    if (d.hotspots !== undefined && d.hotspots && !this.hot) {
      this.hot = packHotspots(d.hotspots);
      if (!this.introDone && this.still()) this.cut = 60;
    }
    if (d.cells !== undefined && d.cells && !this.cells) this.cells = packCells(d.cells);
    if (d.recurrence !== undefined && d.recurrence && !this.rec) {
      this.rec = d.recurrence;
      this.recCells = d.recurrence.cells.filter((c) => c.length >= 3).map((c) => ({ position: [c[0]!, c[1]!] as [number, number], mask: c[2]! }));
    }
    if (d.provinces !== undefined && d.provinces && !this.provinces) {
      this.provinces = d.provinces;
      this.applyProvinces();
    }
    if (d.papuaBox !== undefined && d.papuaBox && !this.box) {
      this.box = d.papuaBox;
      this.applyBox();
    }
    if (d.smokeDate !== undefined) this.smokeDate = d.smokeDate;
    this.render();
    this.kick();
  }

  private applyProvinces() {
    if (!this.loaded || !this.provinces) return;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: this.provinces.provinces.map((p) => ({
        type: "Feature",
        properties: { id: p.id },
        geometry: { type: "MultiPolygon", coordinates: p.rings.map((r) => [r]) as GeoJSON.Position[][][] },
      })),
    };
    const src = this.map.getSource("prov") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined;
    src?.setData?.(fc);
  }

  private applyBox() {
    if (!this.loaded || !this.box) return;
    const [w, s, e, n] = this.box;
    const src = this.map.getSource("box") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined;
    src?.setData?.({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[w, n], [e, n], [e, s], [w, s], [w, n]] } }],
    });
  }


  private applySmoke() {
    if (!this.loaded) return;
    const want = Boolean(this.state?.smoke && this.smokeDate);
    const has = Boolean(this.map.getLayer("gibs"));
    if (want && !has && this.smokeDate) {
      if (!this.map.getSource("gibs")) {
        this.map.addSource("gibs", {
          type: "raster",
          tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${this.smokeDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
          tileSize: 256,
          maxzoom: 9,
        });
      }
      this.map.addLayer(
        { id: "gibs", type: "raster", source: "gibs", paint: { "raster-opacity": 0.92, "raster-brightness-max": 0.74, "raster-saturation": -0.1, "raster-contrast": 0.08, "raster-fade-duration": 300 } },
        "prov-line",
      );
    } else if (!want && has) {
      this.map.removeLayer("gibs");
    }
  }

  /* ----------------------------------------------------------- scenes ----------------------------------------------------------- */

  private viewport() {
    const c = this.map.getContainer();
    return { w: c.clientWidth, h: c.clientHeight };
  }

  private introCamera(): Camera {
    return this.narrow ? { center: [-62, 12], zoom: 0.55, pitch: 0, bearing: 0 } : { center: [-62, 12], zoom: 1.35, pitch: 0, bearing: 0 };
  }

  private padding(scene: SceneName): { top: number; bottom: number; left: number; right: number } {
    const { w, h } = this.viewport();
    if (w < 768) {
      if (scene === "hero") return { top: h * 0.3, bottom: h * 0.24, left: 12, right: 12 };
      if (scene === "province") return { top: 84, bottom: h * 0.5, left: 28, right: 28 };
      return { top: 84, bottom: h * 0.46, left: 20, right: 20 };
    }
    const card = Math.min(540, w * 0.42);
    if (scene === "hero") return { top: h * 0.3, bottom: h * 0.14, left: Math.min(380, w * 0.26), right: 40 };
    return { top: 110, bottom: 70, left: card + 60, right: 70 };
  }

  private cameraFor(s: SceneState): Camera | null {
    // Fitted in Web Mercator by hand: MapLibre's cameraForBounds depends on the current globe view and fails when
    // the target is on the far side (as it is at the start of the opening).
    const fit = (b: LngLatBoundsLike, scene: SceneName, maxZoom: number, pitch = 0, bearing = 0): Camera | null => {
      const [[w, so], [e, n]] = b as [[number, number], [number, number]];
      const pad = this.padding(scene);
      const { w: vw, h: vh } = this.viewport();
      const mx = (lon: number) => ((lon + 180) / 360) * 512;
      const my = (lat: number) => ((180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360) * 512;
      const dx = Math.max(1e-6, mx(e) - mx(w));
      const dy = Math.max(1e-6, my(so) - my(n));
      const aw = Math.max(40, vw - pad.left - pad.right);
      const ah = Math.max(40, vh - pad.top - pad.bottom);
      const zoom = Math.min(maxZoom, Math.log2(Math.min(aw / dx, ah / dy)));
      const scale = Math.pow(2, zoom);
      // Shift the centre so the bounds sit in the middle of the padded area.
      const cx = (mx(w) + mx(e)) / 2 - (pad.left - pad.right) / 2 / scale;
      const cy = (my(n) + my(so)) / 2 - (pad.top - pad.bottom) / 2 / scale;
      const lon = (cx / 512) * 360 - 180;
      const lat = (360 / Math.PI) * Math.atan(Math.exp(((180 - (cy / 512) * 360) * Math.PI) / 180)) - 90;
      if (!Number.isFinite(zoom) || !Number.isFinite(lat)) return null;
      return { center: [lon, lat], zoom, pitch, bearing };
    };
    switch (s.scene) {
      case "hero":
        return fit(INDONESIA, "hero", 5.2);
      case "recurrence":
        return fit(INDONESIA, "recurrence", 5.2);
      case "papua": {
        // Papua Selatan province; the fixed box from papua.json only if the outline is missing.
        const pb = this.bounds(PAPUA_SELATAN);
        const b = pb ?? (this.box ? ([[this.box[0], this.box[1]], [this.box[2], this.box[3]]] as [[number, number], [number, number]]) : ([[137.5, -9.2], [140.95, -5.5]] as [[number, number], [number, number]]));
        return fit(b, "papua", 7.2, this.narrow ? 25 : 38, -14);
      }
      case "province": {
        const b = s.province ? this.bounds(s.province) : null;
        if (!b) return fit(INDONESIA, "province", 5.2);
        return fit(b, "province", 7.4, this.narrow ? 0 : 20, 0);
      }
    }
  }

  private bounds(id: string): [[number, number], [number, number]] | null {
    const p = this.provinces?.provinces.find((x) => x.id === id);
    if (!p) return null;
    let w = 180, so = 90, e = -180, n = -90;
    for (const r of p.rings) for (const [x, y] of r as [number, number][]) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < so) so = y;
      if (y > n) n = y;
    }
    return [[w, so], [e, n]];
  }

  setScene(next: SceneState) {
    const prev = this.state;
    this.state = next;
    this.visible = next.visible;
    if (!this.loaded) return;
    this.applyScene(next, prev);
  }

  private applyScene(next: SceneState, prev: SceneState | null) {
    // Highlighted province.
    const id = next.scene === "province" && next.province ? next.province : next.scene === "papua" && this.bounds(PAPUA_SELATAN) ? PAPUA_SELATAN : "";
    this.map.setFilter("prov-hl", ["==", ["get", "id"], id]);
    this.map.setFilter("prov-hl-fill", ["==", ["get", "id"], id]);
    this.map.setPaintProperty("box", "line-opacity", next.scene === "papua" && !this.bounds(PAPUA_SELATAN) ? 0.7 : 0);
    this.applySmoke();

    this.target = {
      hot: next.scene === "hero" ? 1 : 0,
      cells: next.scene === "papua" || next.scene === "province" ? 1 : 0,
      rec: next.scene === "recurrence" ? 1 : 0,
    };

    const sceneChanged = !prev || prev.scene !== next.scene || prev.province !== next.province;
    if (next.scene === "hero" && !this.introDone) {
      if (this.still()) this.finishIntro();
      else if (!this.introStart) this.introStart = performance.now();
    } else if (sceneChanged) {
      if (!this.introDone) this.finishIntro();
      const cam = this.cameraFor(next);
      if (cam) {
        if (this.still()) this.map.jumpTo(cam);
        else this.map.flyTo({ ...cam, duration: next.scene === "province" ? 1800 : 2600, curve: 1.3, essential: false });
      }
    }
    if (this.still()) {
      this.opacity = { ...this.target };
    }
    this.render();
    this.kick();
  }

  /** Jump to the end of the opening: camera on Indonesia, every ember lit. */
  finishIntro() {
    this.introDone = true;
    this.cut = 60;
    this.onReplay(1);
    if (this.state?.scene === "hero" || !this.state) {
      const cam = this.cameraFor(this.state ?? { scene: "hero" } as SceneState);
      if (cam) this.map.jumpTo(cam);
    }
  }

  /** Called when "Pause motion" or reduced motion changes. */
  onStillChange() {
    if (this.still()) {
      this.map.stop();
      if (!this.introDone) this.finishIntro();
      else if (this.state) {
        const cam = this.cameraFor(this.state);
        if (cam) this.map.jumpTo(cam);
      }
      this.opacity = { ...this.target };
      this.render();
    } else this.kick();
  }

  onResize() {
    if (!this.state || !this.loaded) return;
    if (this.introDone || this.state.scene !== "hero") {
      const cam = this.cameraFor(this.state);
      if (cam) this.map.jumpTo(cam);
    }
  }

  /* --------------------------------------------------------- animation ---------------------------------------------------------- */

  private kick() {
    if (this.running || !this.loaded || this.still() || !this.visible) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (this.still() || !this.visible) {
      this.running = false;
      this.render();
      return;
    }
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;
    let busy = false;

    // Opening: the globe spins Indonesia into view, then the last 48 hours replay as ignitions.
    if (!this.introDone && this.state?.scene === "hero" && this.introStart) {
      const t = (now - this.introStart) / 1000;
      const spin = clamp01(t / 3.4);
      const from = this.introCamera();
      const to = this.cameraFor(this.state);
      if (to) {
        const e = easeOutCubic(spin);
        const z = easeInOutCubic(clamp01((t - 0.5) / 2.9));
        this.map.jumpTo({
          center: [from.center[0] + (to.center[0] - from.center[0]) * e, from.center[1] + (to.center[1] - from.center[1]) * e],
          zoom: from.zoom + (to.zoom - from.zoom) * z,
          pitch: 0,
          bearing: 0,
        });
      }
      const ign = clamp01((t - 2.3) / 4.2);
      this.cut = -4 + ign * 56;
      this.onReplay(ign);
      if (t > 6.6) {
        this.introDone = true;
        this.cut = 60;
        this.onReplay(1);
      }
      busy = true;
    }

    // Layer cross-fades between scenes.
    for (const g of ["hot", "cells", "rec"] as Group[]) {
      const d = this.target[g] - this.opacity[g];
      if (Math.abs(d) > 0.004) {
        this.opacity[g] += d * Math.min(1, dt / 260);
        busy = true;
      } else this.opacity[g] = this.target[g];
    }

    // Idle flicker while embers are on screen, drawn at about 30 fps when nothing else moves (it is slow and
    // soft, and this halves the work on phones).
    const tweening = busy;
    if (this.opacity.hot > 0.01 || this.opacity.cells > 0.01) {
      this.flickerT = (this.flickerT + dt / 2600) % 1;
      busy = true;
    }

    if (tweening || this.map.isMoving() || now - this.lastRender > 30) {
      this.lastRender = now;
      this.render();
    }
    if (busy) this.raf = requestAnimationFrame(this.tick);
    else this.running = false;
  };

  /* ---------------------------------------------------------- layers ----------------------------------------------------------- */

  private render() {
    if (!this.loaded) return;
    const layers: Layer[] = [];
    const still = this.still();
    const s = this.sizeScale;
    const f = this.flickerT * 1.4 - 0.2;

    if (this.hot && this.opacity.hot > 0.005) {
      const b = this.hot;
      const cut = this.introDone ? 60 : this.cut;
      const data = { length: b.length, attributes: { getPosition: { value: b.position, size: 2 }, getColor: { value: b.colour, size: 4, normalized: true }, getSize: { value: b.size, size: 1 }, getFilterValue: { value: b.filter, size: 2 } } };
      const common = { data: data as never, iconAtlas: this.sprite as never, iconMapping: ICON_MAPPING, getIcon: () => "glow", sizeUnits: "pixels" as const, billboard: true, parameters: ADDITIVE as never, extensions: [this.filterExt], filterTransformSize: true, filterTransformColor: true };
      layers.push(
        new IconLayer({ ...common, id: "hot-glow", opacity: this.opacity.hot, sizeScale: s, sizeMinPixels: 1.6, sizeMaxPixels: 46, filterRange: [[-10, cut], [-1, 2]], filterSoftRange: [[-10, cut - 2.5], [-1, 2]] } as never),
      );
      layers.push(
        new ScatterplotLayer({
          id: "hot-core",
          data: { length: b.length, attributes: { getPosition: { value: b.position, size: 2 }, getFillColor: { value: b.core, size: 4, normalized: true }, getRadius: { value: b.coreRadius, size: 1 }, getFilterValue: { value: b.filter, size: 2 } } } as never,
          radiusUnits: "pixels",
          radiusScale: Math.max(0.5, Math.min(1.6, s)),
          radiusMinPixels: 0.45,
          stroked: false,
          antialiasing: true,
          opacity: this.opacity.hot,
          parameters: ADDITIVE as never,
          extensions: [this.filterExt],
          filterRange: [[-10, cut], [-1, 2]],
          filterSoftRange: [[-10, cut - 1.5], [-1, 2]],
          filterTransformSize: true,
          filterTransformColor: true,
        } as never),
      );
      if (!this.introDone && !still) {
        layers.push(
          new IconLayer({ ...common, id: "hot-spark", opacity: this.opacity.hot * 0.9, sizeScale: s * 2.6, sizeMinPixels: 6, sizeMaxPixels: 90, getColor: [255, 214, 170, 120] as never, filterRange: [[cut - 7, cut + 0.5], [-1, 2]], filterSoftRange: [[cut - 0.6, cut - 0.4], [-1, 2]], updateTriggers: { getColor: 1 } } as never),
        );
      }
      if (!still) {
        layers.push(
          new IconLayer({ ...common, id: "hot-flicker", opacity: this.opacity.hot * 0.45, sizeScale: s * 1.7, sizeMinPixels: 3, sizeMaxPixels: 70, filterRange: [[-10, cut - 2], [f - 0.16, f + 0.16]], filterSoftRange: [[-10, cut - 2], [f, f]] } as never),
        );
      }
    }

    if (this.cells && this.opacity.cells > 0.005) {
      const b = this.cells;
      const data = { length: b.length, attributes: { getPosition: { value: b.position, size: 2 }, getColor: { value: b.colour, size: 4, normalized: true }, getSize: { value: b.size, size: 1 }, getFilterValue: { value: b.filter, size: 2 } } };
      const common = { data: data as never, iconAtlas: this.sprite as never, iconMapping: ICON_MAPPING, getIcon: () => "glow", sizeUnits: "pixels" as const, billboard: true, parameters: ADDITIVE as never, extensions: [this.filterExt], filterTransformSize: true, filterTransformColor: true };
      layers.push(new IconLayer({ ...common, id: "cells-glow", opacity: this.opacity.cells, sizeScale: s * 1.1, sizeMinPixels: 2.4, sizeMaxPixels: 80, filterRange: [[-1, 1], [-1, 2]] } as never));
      layers.push(
        new ScatterplotLayer({
          id: "cells-core",
          data: { length: b.length, attributes: { getPosition: { value: b.position, size: 2 }, getFillColor: { value: b.core, size: 4, normalized: true }, getRadius: { value: b.coreRadius, size: 1 } } } as never,
          radiusUnits: "pixels",
          radiusScale: Math.max(0.6, Math.min(2, s)),
          radiusMinPixels: 0.7,
          stroked: false,
          opacity: this.opacity.cells,
          parameters: ADDITIVE as never,
        } as never),
      );
      if (!still) {
        layers.push(new IconLayer({ ...common, id: "cells-flicker", opacity: this.opacity.cells * 0.5, sizeScale: s * 1.8, sizeMinPixels: 3, sizeMaxPixels: 110, filterRange: [[-1, 1], [f - 0.16, f + 0.16]], filterSoftRange: [[-1, 1], [f, f]] } as never));
      }
    }

    if (this.recCells.length && this.opacity.rec > 0.005 && this.state) {
      const m = this.state.recMask;
      const past = m & 7;
      const now = m & 8;
      layers.push(
        new ScatterplotLayer<{ position: [number, number]; mask: number }>({
          id: "rec",
          data: this.recCells,
          getPosition: (d) => d.position,
          getFillColor: (d) => {
            const p = d.mask & past;
            const w = d.mask & now;
            if (p && w) return [255, 196, 140, 235];
            if (w) return [255, 92, 40, 220];
            if (p) return [110, 136, 126, 105];
            return [0, 0, 0, 0];
          },
          getRadius: 5200,
          radiusUnits: "meters",
          radiusMinPixels: 1.1,
          radiusMaxPixels: 14,
          stroked: false,
          opacity: this.opacity.rec,
          parameters: NORMAL as never,
          updateTriggers: { getFillColor: m },
        }),
      );
    }

    this.overlay.setProps({ layers });
  }
}
