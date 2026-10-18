"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { getLoaded, onData, request } from "@/lib/data";
import { motionOff } from "@/lib/motion";
import { EmberMap } from "./ember-map";
import { sceneStore } from "./scene";

/** Mounts the one map (client only, lazy) and keeps it in step with the story's scene and the data files. */
export default function MapStage() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: EmberMap | null = null;
    try {
      const canvas = document.createElement("canvas");
      if (!canvas.getContext("webgl2")) throw new Error("no webgl2");
      map = new EmberMap(el, {
        onReady: () => sceneStore.set({ ready: true }),
        onReplay: (t) => sceneStore.set({ replay: t }),
        still: motionOff,
      });
    } catch {
      sceneStore.set({ failed: true });
      return;
    }
    const m = map;
    (["hotspots", "cells7d", "recurrence", "provinces", "papua", "summary"] as const).forEach(request);
    const feed = () => {
      const papua = getLoaded("papua");
      const summary = getLoaded("summary");
      m.setData({
        hotspots: getLoaded("hotspots"),
        cells: getLoaded("cells7d"),
        recurrence: getLoaded("recurrence"),
        provinces: getLoaded("provinces"),
        papuaBox: papua?.box ?? null,
        smokeDate: summary?.as_of ?? null,
      });
    };
    feed();
    const offData = onData(feed);
    m.setScene(sceneStore.get());
    const offScene = sceneStore.subscribe(() => m.setScene(sceneStore.get()));

    const motionObs = new MutationObserver(() => m.onStillChange());
    motionObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => m.onStillChange();
    mq.addEventListener("change", onMq);

    let lastW = window.innerWidth;
    let t = 0;
    const onResize = () => {
      if (Math.abs(window.innerWidth - lastW) < 2) return;
      lastW = window.innerWidth;
      window.clearTimeout(t);
      t = window.setTimeout(() => m.onResize(), 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      offData();
      offScene();
      motionObs.disconnect();
      mq.removeEventListener("change", onMq);
      window.removeEventListener("resize", onResize);
      m.destroy();
    };
  }, []);

  return <div ref={box} className="map-stage__map" aria-hidden="true" />;
}
