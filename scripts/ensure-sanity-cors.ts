import "dotenv/config";
import process from "node:process";

import { env } from "@/lib/env";

const projectId = env.SANITY_PROJECT_ID;
const managementToken = process.env.SANITY_MANAGEMENT_TOKEN;

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const userDefinedOrigins = (env.SANITY_DEV_CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const origins = Array.from(new Set([...defaultOrigins, ...userDefinedOrigins]));

function log(message: string) {
  process.stdout.write(`\u001b[36m[sanity-cors]\u001b[0m ${message}\n`);
}

if (!projectId) {
  log("No Sanity project id found in the environment, skipping CORS check.");
  process.exit(0);
}

if (!managementToken) {
  log(
    "No SANITY_MANAGEMENT_TOKEN set, skipping automatic Sanity CORS configuration."
  );
  process.exit(0);
}

if (!origins.length) {
  log("No origins configured, skipping CORS check.");
  process.exit(0);
}

const apiVersion = "v2021-06-07";
const endpoint = `https://api.sanity.io/${apiVersion}/projects/${projectId}/cors`;

async function ensureCors() {
  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${managementToken}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(
        `[sanity-cors] Failed to read existing CORS entries (${response.status}): ${text}`
      );
      process.exit(0);
    }

    const existing = (await response.json()) as {
      origin?: string;
      allowCredentials?: boolean;
    }[];

    const missing = origins.filter(
      (origin) =>
        !existing.some(
          (entry) => entry.origin === origin && entry.allowCredentials
        )
    );

    if (missing.length === 0) {
      log("All required CORS origins are already configured.");
      return;
    }

    for (const origin of missing) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${managementToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ origin, allowCredentials: true })
        });

        if (res.ok) {
          log(`Added Sanity CORS origin: ${origin}`);
        } else if (res.status === 409) {
          log(`CORS origin already exists: ${origin}`);
        } else {
          const text = await res.text();
          console.warn(
            `[sanity-cors] Failed to add Sanity CORS origin ${origin} (${res.status}): ${text}`
          );
          process.exit(0);
        }
      } catch (error) {
        console.warn(
          `[sanity-cors] Unable to add Sanity CORS origin ${origin}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        process.exit(0);
      }
    }
  } catch (error) {
    console.warn(
      `[sanity-cors] Unable to verify Sanity CORS configuration: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(0);
  }
}

void ensureCors();
