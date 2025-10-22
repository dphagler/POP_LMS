import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ChangePasswordForm } from "./change-password-form";
import { changePasswordAction, type ChangePasswordFormState } from "./actions";

type AccountSettingsProps = {
  passwordAuthEnabled: boolean;
};

export function AccountSettings({ passwordAuthEnabled }: AccountSettingsProps) {
  const initialPasswordState: ChangePasswordFormState = { status: "idle" };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Account security</h2>
        <p className="text-sm text-muted-foreground">
          Manage how you sign in to POP Initiative.
        </p>
      </header>
      {passwordAuthEnabled ? (
        <Card>
          <CardHeader className="space-y-1 pb-0">
            <CardTitle className="text-base font-semibold">Change password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChangePasswordForm action={changePasswordAction} initialState={initialPasswordState} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed bg-muted/40">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Your organization uses single sign-on—no password needed.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
