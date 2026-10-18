import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import { bootScript } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/base";
import { Providers } from "@/components/site/providers";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: "Saksi Satelit · What the satellites saw", template: "%s · Saksi Satelit" },
  description:
    "An open-data engine that checks Indonesia's biggest public stories against satellite evidence. Apa yang dilihat satelit. Built by Aldran Group.",
  applicationName: "Saksi Satelit",
  authors: [{ name: "Jihar Gifari" }, { name: "Aldran Group" }],
  openGraph: { siteName: "Saksi Satelit", type: "website", locale: "id_ID", alternateLocale: ["en_GB"] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0B0F0D",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-lang="en" suppressHydrationWarning className={`${archivo.variable} ${serif.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
