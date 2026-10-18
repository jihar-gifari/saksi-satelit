"use client";
import { useSyncExternalStore } from "react";

/**
 * Which part of the story the one map is showing. The map is a single fixed WebGL canvas behind the page; the
 * map chapters are transparent windows onto it and set the scene as they come into view.
 */
export type SceneName = "hero" | "papua" | "recurrence" | "province";
export type SceneState = {
  scene: SceneName;
  /** A map window is on screen (otherwise the map stops animating). */
  visible: boolean;
  province: string | null;
  /** Recurrence bits shown: 1 = 2015, 2 = 2019, 4 = 2023, 8 = this week. */
  recMask: number;
  smoke: boolean;
  /** The map has loaded and drawn its first frame. */
  ready: boolean;
  /** WebGL failed: the page carries on without the map. */
  failed: boolean;
  /** Replay clock of the opening (0..1), for the hero's "replaying 48 hours" readout. */
  replay: number;
};

let state: SceneState = { scene: "hero", visible: true, province: null, recMask: 15, smoke: false, ready: false, failed: false, replay: 0 };
const listeners = new Set<() => void>();

export const sceneStore = {
  get: () => state,
  set(patch: Partial<SceneState>) {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof SceneState)[]) if (state[k] !== patch[k]) changed = true;
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

const serverState = state;
export function useSceneState<T>(pick: (s: SceneState) => T): T {
  return useSyncExternalStore(
    sceneStore.subscribe,
    () => pick(sceneStore.get()),
    () => pick(serverState),
  );
}
