"use client";
import dynamic from "next/dynamic";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import { useHydrated, useStill } from "@/lib/motion";

/**
 * The living light: a Paper Shaders mesh gradient drifting slowly with film grain, in night and ember tones, like a
 * sky lit from below by fire. A CSS version of the same light sits underneath and is all that renders without
 * WebGL2, with Save-Data, on low-memory devices, if the shader throws, or (held still) under reduced motion and
 * "Pause motion". Paper Shaders pauses itself off screen and in hidden tabs.
 */
const MeshGradient = dynamic(() => import("@paper-design/shaders-react").then((m) => m.MeshGradient), { ssr: false });

function canUseWebGl(): boolean {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}
let cache: boolean | null = null;
const noSub = () => () => {};
function useWebGl() {
  return useSyncExternalStore(noSub, () => (cache ??= canUseWebGl()), () => false);
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const NIGHT_EMBER = ["#050807", "#0d1a19", "#3b1408", "#a8350f", "#120d09"];

export function LivingLight({ colors = NIGHT_EMBER, css, className = "", speed = 0.16, maxPixelCount = 900_000 }: { colors?: string[]; css: string; className?: string; speed?: number; maxPixelCount?: number }) {
  const hydrated = useHydrated();
  const webgl = useWebGl();
  const still = useStill();
  return (
    <div aria-hidden="true" className={`light ${className}`}>
      <div className="light__css" style={{ background: css }} />
      {hydrated && webgl ? (
        <Boundary>
          <MeshGradient
            className="light__shader"
            colors={colors}
            distortion={0.8}
            swirl={0.28}
            grainMixer={0.2}
            grainOverlay={0.24}
            speed={still ? 0 : speed}
            minPixelRatio={1}
            maxPixelCount={maxPixelCount}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        </Boundary>
      ) : null}
    </div>
  );
}
