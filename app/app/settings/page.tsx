import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

import { AppearanceSettings } from "./appearance-tab";
import { AccountSettings } from "./account-tab";
import {
  updateProfileAction,
  type UpdateProfileFormState
} from "./actions";
import { ProfileSettingsForm } from "./profile-form";

const INITIAL_STATE: UpdateProfileFormState = { status: "idle" };

export default async function SettingsPage() {
  const session = await requireUser();
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true, passwordHash: true },
  });

  const displayName = userRecord?.name ?? session.user.name ?? "Learner";
  const avatar = userRecord?.image ?? session.user.image ?? null;
  const email = session.user.email ?? "Not available";

  const passwordAuthEnabled = Boolean(userRecord?.passwordHash);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Profile &amp; settings</h1>
        <div className="prose prose-sm text-muted-foreground max-w-none">
          <p>
            Update your account details and tailor the POP Initiative experience to your preferences.
          </p>
        </div>
      </header>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileSettingsForm
            action={updateProfileAction}
            initialState={INITIAL_STATE}
            initialName={displayName}
            initialEmail={email}
            initialAvatar={avatar}
          />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="account">
          <AccountSettings passwordAuthEnabled={passwordAuthEnabled} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
