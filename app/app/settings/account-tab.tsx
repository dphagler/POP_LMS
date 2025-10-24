import { Alert, AlertDescription, AlertIcon, Stack, Text } from "@chakra-ui/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ChangePasswordForm } from "./change-password-form";
import { changePasswordAction, type ChangePasswordFormState } from "./actions";

type AccountSettingsProps = {
  passwordAuthEnabled: boolean;
};

export function AccountSettings({ passwordAuthEnabled }: AccountSettingsProps) {
  const initialPasswordState: ChangePasswordFormState = { status: "idle" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account security</CardTitle>
        <CardDescription>Manage how you sign in to POP Initiative.</CardDescription>
      </CardHeader>
      <CardContent>
        {passwordAuthEnabled ? (
          <Stack spacing={5}>
            <Stack spacing={1}>
              <Text fontSize="lg" fontWeight="semibold">
                Change password
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Update your password to keep your account secure.
              </Text>
            </Stack>
            <ChangePasswordForm action={changePasswordAction} initialState={initialPasswordState} />
          </Stack>
        ) : (
          <Alert status="info" borderRadius="lg" variant="subtle">
            <AlertIcon />
            <AlertDescription>
              Your organization uses single sign-on—no password needed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
