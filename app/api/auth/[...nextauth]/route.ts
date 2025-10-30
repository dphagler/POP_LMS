// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
import { assertRequiredForProd } from "@/lib/env.runtime";

export const runtime = "nodejs";

const nextAuthGET = handlers.GET!;
const nextAuthPOST = handlers.POST!;

export const GET: typeof nextAuthGET = async (request, context) => {
  assertRequiredForProd();
  return nextAuthGET(request, context);
};

export const POST: typeof nextAuthPOST = async (request, context) => {
  assertRequiredForProd();
  return nextAuthPOST(request, context);
};
