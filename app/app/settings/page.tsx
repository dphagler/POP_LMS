import { Tabs, TabsContent, TabsList, TabsPanels, TabsTrigger } from "@/components/ui/tabs";
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
        <h1 className="text-balance">Profile &amp; settings</h1>
        <div className="prose prose-sm text-muted-foreground max-w-none">
          <p>
            Update your account details and tailor the POP Initiative experience to your preferences.
          </p>
        </div>
      </header>
      <Tabs w="full" defaultIndex={0}>
        <TabsList>
          <TabsTrigger>Profile</TabsTrigger>
          <TabsTrigger>Appearance</TabsTrigger>
          <TabsTrigger>Account</TabsTrigger>
        </TabsList>
        <TabsPanels>
          <TabsContent>
            <ProfileSettingsForm
              action={updateProfileAction}
              initialState={INITIAL_STATE}
              initialName={displayName}
              initialEmail={email}
              initialAvatar={avatar}
            />
          </TabsContent>
          <TabsContent>
            <AppearanceSettings />
          </TabsContent>
          <TabsContent>
            <AccountSettings passwordAuthEnabled={passwordAuthEnabled} />
          </TabsContent>
        </TabsPanels>
      </Tabs>
    </section>
  );
}
