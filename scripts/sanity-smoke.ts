import { syncFromSanity } from "@/lib/sanity/sync";
import { prisma } from "@/lib/prisma";

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org");
  const res = await syncFromSanity({
    orgId: org.id,
    dryRun: true,
    allowDelete: false
  });
  console.log("Dry run:", res);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
