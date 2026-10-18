"use client";
import { useRef } from "react";
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity, wrap } from "motion/react";
import { motionOff } from "@/lib/motion";

/**
 * Giant type that keeps the page moving between chapters: two rows running in opposite directions that speed up,
 * reverse and lean with the scroll. Decorative (aria-hidden); still under reduced motion and "Pause motion".
 */
export type MarqueeItem = { text: string; style: "x" | "c" | "o" | "e" };

function Row({ items, base }: { items: MarqueeItem[]; base: number }) {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(vel, [-2000, 0, 2000], [-5, 0, 5], { clamp: false });
  const skew = useTransform(vel, [-2600, 0, 2600], [8, 0, -8]);
  const dir = useRef(1);
  const pct = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);
  useAnimationFrame((_, delta) => {
    if (motionOff()) return;
    const b = boost.get();
    if (b < -0.05) dir.current = -1;
    else if (b > 0.05) dir.current = 1;
    x.set(x.get() + dir.current * base * (delta / 1000) * (1 + Math.abs(b)));
  });
  const all = [...items, ...items];
  return (
    <motion.div className="marquee__row" style={{ x: pct, skewX: skew }}>
      {all.map((it, i) => (
        <span key={i} className="marquee__item">
          <span className={it.style === "x" ? "w-x" : it.style === "c" ? "w-c o" : it.style === "o" ? "w-x o" : "w-x e"}>{it.text}</span>
          <span className="star" />
        </span>
      ))}
    </motion.div>
  );
}

export function Marquee({ rows }: { rows: MarqueeItem[][] }) {
  if (!rows.length || !rows[0]!.length) return null;
  return (
    <div className="marquee grain" aria-hidden="true">
      {rows.map((r, i) => (
        <Row key={i} items={r} base={i % 2 ? 2.4 : -3} />
      ))}
    </div>
  );
}
