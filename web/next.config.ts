import type { NextConfig } from "next";

/** Served at aldrangroup.com/saksi-satelit through a rewrite from the main site. */
const basePath = "/saksi-satelit";

const nextConfig: NextConfig = {
  basePath,
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  async redirects() {
    // The bare vercel.app address has no page of its own (everything lives under the basePath).
    return [{ source: "/", destination: "/saksi-satelit/karhutla", basePath: false, permanent: false }];
  },
  async headers() {
    return [
      {
        // Data files are refreshed every few hours by the pipeline: always revalidate.
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=600, stale-while-revalidate=3600" }],
      },
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
