import { env } from "./env";

export function assertRequiredForProd() {
  const missing: string[] = [];
  if (!process.env.VERCEL || process.env.VERCEL_ENV === "production") {
    if (!env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
  }
  if (missing.length) {
    throw new Error("Missing required envs in production: " + missing.join(", "));
  }
}
