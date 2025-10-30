// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
import { assertRequiredForProd } from "@/lib/env.runtime";

export const runtime = "nodejs";

const nextAuthGET = handlers.GET!;
const nextAuthPOST = handlers.POST!;

export const GET = (async (
  ...args: Parameters<typeof nextAuthGET>
) => {
  assertRequiredForProd();
  return nextAuthGET(...args);
}) satisfies typeof nextAuthGET;

export const POST = (async (
  ...args: Parameters<typeof nextAuthPOST>
) => {
  assertRequiredForProd();
  return nextAuthPOST(...args);
}) satisfies typeof nextAuthPOST;
