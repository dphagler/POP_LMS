"use server";

import { signOut } from "@/lib/auth";

export async function signOutAction() {
  await signOut({ redirect: false });
  return { success: true as const };
}
