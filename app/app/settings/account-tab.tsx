import { Card } from "@/components/ui/card";

import { ChangePasswordForm } from "./change-password-form";
import { changePasswordAction, type ChangePasswordFormState } from "./actions";

type AccountSettingsProps = {
  passwordAuthEnabled: boolean;
};

export function AccountSettings({ passwordAuthEnabled }: AccountSettingsProps) {
  const initialPasswordState: ChangePasswordFormState = { status: "idle" };

  return (
    <Card className="shadow-xl">
      <div className="card-body space-y-6">
        <header className="space-y-1">
          <h2 className="text-balance">Account security</h2>
          <p className="text-sm text-muted-foreground">
            Manage how you sign in to POP Initiative.
          </p>
        </header>
        {passwordAuthEnabled ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Change password</h3>
              <p className="text-sm text-muted-foreground">
                Update your password to keep your account secure.
              </p>
            </div>
            <ChangePasswordForm action={changePasswordAction} initialState={initialPasswordState} />
          </section>
        ) : (
          <div className="alert alert-info">
            <span>Your organization uses single sign-on—no password needed.</span>
          </div>
        )}
      </div>
    </Card>
  );
}
