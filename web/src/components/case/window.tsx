"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { sceneStore, type SceneName, type SceneState } from "@/components/map/scene";

/* How many map windows are on screen: the map animates only while at least one is. */
const onScreen = new Set<Element>();

/**
 * A transparent chapter that looks through to the fixed map. When its middle band crosses the centre of the
 * viewport it sets the map's scene (the camera flies there).
 */
export function MapWindow({ id, scene, extra, className = "", children, labelledBy }: { id: string; scene: SceneName; extra?: Partial<SceneState>; className?: string; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLElement>(null);
  const extraRef = useRef(extra);
  extraRef.current = extra;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vis = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) onScreen.add(el);
        else onScreen.delete(el);
        sceneStore.set({ visible: onScreen.size > 0 });
      },
      { threshold: 0 },
    );
    const act = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) sceneStore.set({ scene, ...(extraRef.current ?? {}) });
      },
      { rootMargin: "-38% 0px -38% 0px", threshold: 0 },
    );
    vis.observe(el);
    act.observe(el);
    return () => {
      vis.disconnect();
      act.disconnect();
      onScreen.delete(el);
    };
  }, [scene]);

  // Keep scene-specific extras (selected province, recurrence years) in step while active.
  useEffect(() => {
    if (sceneStore.get().scene === scene && extra) sceneStore.set(extra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, JSON.stringify(extra ?? {})]);

  return (
    <section ref={ref} id={id} className={`window ${className}`} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
