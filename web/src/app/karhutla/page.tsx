import type { Metadata } from "next";
import { CasePage } from "@/components/case/case-page";

export const metadata: Metadata = {
  title: "Karhutla 2026",
  description:
    "What the satellites saw: Indonesia's 2026 forest and land fires, checked against NASA satellite detections and official figures. Apa yang dilihat satelit.",
  alternates: { canonical: "/saksi-satelit/karhutla" },
};

export default function Page() {
  return <CasePage />;
}
