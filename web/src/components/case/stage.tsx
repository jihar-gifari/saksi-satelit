"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { LivingLight } from "@/components/site/living-light";
import { useSceneState } from "@/components/map/scene";

const MapStage = dynamic(() => import("@/components/map/map-stage"), { ssr: false });

/**
 * The fixed backdrop of the case page: the living ember light (seen around the globe in the opening) and the one
 * map. Opaque chapters scroll over it; map chapters are transparent windows onto it.
 */
export function Stage() {
  const ready = useSceneState((s) => s.ready);
  const failed = useSceneState((s) => s.failed);
  const smoke = useSceneState((s) => s.smoke);
  const light = useRef<HTMLDivElement>(null);

  // The light belongs to the opening: it fades as the hero scrolls away.
  useEffect(() => {
    const el = light.current;
    if (!el) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const t = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
        el.style.opacity = String(1 - t);
        el.style.visibility = t >= 1 ? "hidden" : "visible";
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={`map-stage ${ready ? "is-ready" : ""} ${failed ? "is-failed" : ""} ${smoke ? "is-smoke" : ""}`} aria-hidden="true">
      <div ref={light} className="map-stage__light">
        <LivingLight css="radial-gradient(70% 55% at 50% 100%, #3b1408 0%, transparent 70%), radial-gradient(60% 50% at 15% 10%, #0d1a19 0%, transparent 70%), #050807" />
      </div>
      {failed ? null : <MapStage />}
      <div className="map-stage__vignette" />
    </div>
  );
}
