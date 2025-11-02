import "dotenv/config";
import process from "node:process";

import { env } from "@/lib/env";

const projectId = env.SANITY_PROJECT_ID;

const managementToken =
  env.SANITY_MANAGEMENT_TOKEN ||
  env.SANITY_DEPLOY_STUDIO_TOKEN ||
  env.SANITY_MANAGE_TOKEN ||
  env.SANITY_READ_TOKEN ||
  undefined;

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
  console.warn(
    "[sanity-cors] No Sanity project id found in the environment, skipping CORS check."
  );
  process.exit(0);
}

if (!origins.length) {
  log("No origins configured, skipping CORS check.");
  process.exit(0);
}

if (!managementToken) {
  log(
    [
      "No Sanity management token found.",
      "Run `sanity cors add <origin> --credentials` for each missing origin",
      "or set SANITY_MANAGEMENT_TOKEN (or SANITY_DEPLOY_STUDIO_TOKEN) to allow",
      "the dev server to configure CORS automatically."
    ].join(" ")
  );
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
      log(`Failed to read existing CORS entries (${response.status}): ${text}`);
      return;
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
        log(`Failed to add CORS origin ${origin} (${res.status}): ${text}`);
      }
    }
  } catch (error) {
    log(
      `Unable to verify Sanity CORS configuration: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

void ensureCors();
