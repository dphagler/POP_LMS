"use client";

import dynamic from "next/dynamic";

// Import sanity.config with a RELATIVE path from this file.
// Do NOT use "@/sanity.config" unless your tsconfig/baseUrl actually points to the repo root.
const NextStudio = dynamic(
  () => import("next-sanity/studio").then(mod => mod.NextStudio),
  { ssr: false }
);

// Adjust the relative path below if your sanity.config.ts sits at the repo root:
import config from "../../../sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
