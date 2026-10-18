import type { Metadata } from "next";
import { MethodsPage } from "@/components/case/methods-page";

export const metadata: Metadata = {
  title: "Methods, sources and licences · Karhutla 2026",
  description: "How Saksi Satelit counts fire detections, compares years, lines up burned-area figures and credits its sources.",
  alternates: { canonical: "/saksi-satelit/karhutla/methods" },
};

export default function Page() {
  return <MethodsPage />;
}
