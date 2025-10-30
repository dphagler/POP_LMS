import { assertRequiredForProd } from "../lib/env";

if (process.env.VERCEL_ENV === "production" && process.env.SKIP_ENV_VALIDATION !== "1") {
  assertRequiredForProd();
} else {
  console.log("[env] Skipping strict validation for", process.env.VERCEL_ENV || "local");
}
