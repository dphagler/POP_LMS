import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export const revalidate = 0;
export async function GET() {
  return NextResponse.json(
    {
      projectId: env.SANITY_PROJECT_ID ?? "",
      dataset: env.SANITY_DATASET ?? "",
      apiVersion: env.NEXT_PUBLIC_SANITY_API_VERSION ?? "",
      clientSideProjectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ""
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
