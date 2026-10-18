// Copies the MapLibre worker into public/vendor. MapLibre 6 ships its worker as a separate ES module that it
// finds next to its own file, which a bundler moves, so the app points MapLibre at this copy (setWorkerUrl).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "node_modules/maplibre-gl/package.json"), "utf8"));
mkdirSync(join(root, "public/vendor"), { recursive: true });
copyFileSync(join(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"), join(root, `public/vendor/maplibre-gl-worker-${pkg.version}.mjs`));
console.log(`maplibre worker ${pkg.version} copied to public/vendor`);
