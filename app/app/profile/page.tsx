import { redirect } from "next/navigation";

import { requireUser } from "@/lib/authz";

export default async function ProfilePage() {
  await requireUser();
  redirect("/app/settings");
}
