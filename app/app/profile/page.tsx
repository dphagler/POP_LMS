import { requireUser } from "@/lib/authz";

export default async function ProfilePage() {
  const session = await requireUser();
  const { user } = session;

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile &amp; settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your POP Initiative account details. Additional settings are coming soon.
        </p>
      </header>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Name</dt>
            <dd className="text-base font-semibold text-foreground">{user.name ?? "Learner"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
            <dd className="text-base font-semibold text-foreground">{user.email ?? "Not available"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
