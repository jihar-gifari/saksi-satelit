import type { Metadata } from "next";
import { HubPage } from "@/components/hub/hub-page";

export const metadata: Metadata = {
  title: { absolute: "Saksi Satelit · What the satellites saw" },
  alternates: { canonical: "/saksi-satelit" },
};

export default function Page() {
  return <HubPage />;
}
