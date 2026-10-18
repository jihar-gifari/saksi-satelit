"use client";
import type { ReactNode } from "react";
import { MotionProvider, useMotionPreference } from "@/lib/motion";
import { KnowProvider } from "./know";

export function Providers({ children }: { children: ReactNode }) {
  useMotionPreference();
  return (
    <MotionProvider>
      <KnowProvider>{children}</KnowProvider>
    </MotionProvider>
  );
}
