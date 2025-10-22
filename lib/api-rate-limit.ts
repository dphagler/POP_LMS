import { NextResponse } from "next/server";
import { enforceRateLimit } from "./rate-limit";

type ApiRateLimitOptions = {
  key: string;
  limit: number;
  windowInSeconds: number;
  requestId?: string;
  message?: string;
};

export function buildRateLimitKey(prefix: string, request: Request, identifier?: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const remoteAddress = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || cloudflareIp?.trim() || "anonymous";
  const safeIdentifier = identifier ? identifier.replace(/[^a-zA-Z0-9:_-]+/g, "_") : "";
  const suffix = safeIdentifier ? `${safeIdentifier}:${remoteAddress}` : remoteAddress;
  return `${prefix}:${suffix}`;
}

export async function enforceApiRateLimit({
  key,
  limit,
  windowInSeconds,
  requestId,
  message = "Too Many Requests"
}: ApiRateLimitOptions): Promise<NextResponse | null> {
  const result = await enforceRateLimit(key, limit, windowInSeconds);
  if (result.success) {
    return null;
  }

  const retryAfterSeconds = result.reset
    ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    : Math.max(1, windowInSeconds);

  const response = NextResponse.json(
    {
      error: message,
      requestId
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString()
      }
    }
  );

  return response;
}
