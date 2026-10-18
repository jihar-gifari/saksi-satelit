"use client";
import { inView, MotionConfig, stagger, useAnimate } from "motion/react";
import { useEffect, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

/**
 * Motion rules (from the Foren's Kitchen v3 standard): server HTML is always readable, entrances arm only below the
 * fold after hydration, reduced motion renders final states, and "Pause motion" (html[data-motion=paused]) stops
 * every animation, CSS and JS. Entrances 450–950 ms, out-expo, staggers 40–90 ms.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
const MOTION_KEY = "saksi-motion";

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

const noop = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}
export function useMedia(query: string, fallback = false) {
  const s = mediaStore(query);
  return useSyncExternalStore(s.subscribe, s.get, () => fallback);
}
export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");

/* "Pause motion" lives on <html data-motion="paused"> so CSS and every component read the same switch. */
export const isPaused = () => typeof document !== "undefined" && document.documentElement.dataset.motion === "paused";
export const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** True when nothing may move: the visitor paused motion or asked the system for reduced motion. */
export const motionOff = () => isPaused() || prefersReduced();

function subscribePaused(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => obs.disconnect();
}
export function usePaused(): boolean {
  return useSyncExternalStore(subscribePaused, isPaused, () => false);
}
export function setPaused(v: boolean) {
  document.documentElement.dataset.motion = v ? "paused" : "running";
  try {
    localStorage.setItem(MOTION_KEY, v ? "paused" : "running");
  } catch {
    /* storage can be blocked */
  }
}
/** Reduced motion or paused: render still. */
export function useStill(): boolean {
  const reduced = useReducedMotion();
  const paused = usePaused();
  return reduced || paused;
}

function belowFold(el: Element) {
  return el.getBoundingClientRect().top > window.innerHeight * 0.92;
}

/** A heading line that slides up out of its mask when scrolled into view. */
export function RevealLines({ children, className }: { children: ReactNode; className?: string }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  useEffect(() => {
    const el = scope.current;
    const mask = el?.parentElement;
    if (!el || !mask || motionOff() || !belowFold(mask)) return;
    animate(el, { y: "110%" }, { duration: 0 });
    const stop = inView(mask, () => void animate(el, { y: "0%" }, { duration: motionOff() ? 0 : 0.95, ease: EASE }), { amount: 0.5 });
    return () => {
      stop();
      animate(el, { y: "0%" }, { duration: 0 });
    };
  }, [animate, scope]);
  return (
    <span className={`line-mask ${className ?? ""}`}>
      <span ref={scope} className="line-mask__in">
        {children}
      </span>
    </span>
  );
}

/** Giant type that arrives letter by letter out of a blur when scrolled into view. Decorative copies are aria-hidden. */
export function RevealLetters({ text, className, style }: { text: string; className?: string; style?: CSSProperties }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  useEffect(() => {
    const el = scope.current;
    if (!el || motionOff() || !belowFold(el)) return;
    const letters = el.querySelectorAll("[data-l]");
    animate(letters, { opacity: 0, y: "60%", filter: "blur(12px)" }, { duration: 0 });
    const stop = inView(el, () => void animate(letters, { opacity: 1, y: "0%", filter: "blur(0px)" }, { duration: motionOff() ? 0 : 0.8, delay: stagger(0.04), ease: EASE }), { amount: 0.4 });
    return () => {
      stop();
      animate(letters, { opacity: 1, y: "0%", filter: "blur(0px)" }, { duration: 0 });
    };
  }, [animate, scope]);
  return (
    <span ref={scope} aria-hidden="true" className={className} style={style}>
      {Array.from(text).map((ch, i) => (
        <span key={i} data-l="" className="ltr">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** Fade and rise in when scrolled into view (armed only below the fold after hydration). */
export function Reveal({ children, className, delay = 0, y = 22, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; y?: number; as?: "div" | "section" | "li" | "figure" }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  useEffect(() => {
    const el = scope.current;
    if (!el || motionOff() || !belowFold(el)) return;
    animate(el, { opacity: 0, y }, { duration: 0 });
    const stop = inView(el, () => void animate(el, { opacity: 1, y: 0 }, { duration: motionOff() ? 0 : 0.6, delay, ease: EASE }), { amount: 0.15 });
    return () => {
      stop();
      animate(el, { opacity: 1, y: 0 }, { duration: 0 });
    };
  }, [animate, scope, delay, y]);
  return (
    <Tag ref={scope as never} className={className}>
      {children}
    </Tag>
  );
}

/** Restores the visitor's "Pause motion" choice (the head script already did, this keeps React in step). */
export function useMotionPreference() {
  useEffect(() => {
    try {
      if (localStorage.getItem(MOTION_KEY) === "paused") document.documentElement.dataset.motion = "paused";
    } catch {
      /* ignore */
    }
  }, []);
}

/** Calls `fn(isVisible)` as an element enters or leaves the viewport. */
export function useInView(ref: React.RefObject<Element | null>, fn: (visible: boolean) => void, rootMargin = "0px", threshold = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => fn(Boolean(e?.isIntersecting)), { rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, rootMargin, threshold]);
}
