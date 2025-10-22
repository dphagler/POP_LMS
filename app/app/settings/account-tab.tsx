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
        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Change password</h3>
            <p className="text-sm text-muted-foreground">
              Update your password to keep your account secure.
            </p>
          </div>
          <div className="mt-4">
            <ChangePasswordForm action={changePasswordAction} initialState={initialPasswordState} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
          Your organization uses single sign-on—no password needed.
        </div>
      )}
    </div>
  );
}
