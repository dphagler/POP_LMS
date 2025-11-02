import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { publicEnv } from "@/lib/env.client";

export async function GET() {
  return NextResponse.json({
    ok: true,
    projectId: {
      server: env.SANITY_PROJECT_ID || "(empty)",
      client: publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID || "(empty)"
    },
    dataset: {
      server: env.SANITY_DATASET || "(empty)",
      client: publicEnv.NEXT_PUBLIC_SANITY_DATASET || "(empty)"
    }
  });
}
