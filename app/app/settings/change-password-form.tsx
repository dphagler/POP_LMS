"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Stack,
  useToast
} from "@chakra-ui/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ChangePasswordFormState } from "./actions";

type ChangePasswordFormProps = {
  action: (state: ChangePasswordFormState, formData: FormData) => Promise<ChangePasswordFormState>;
  initialState: ChangePasswordFormState;
};

export function ChangePasswordForm({ action, initialState }: ChangePasswordFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    const isSuccess = state.status === "success";
    toast({
      status: isSuccess ? "success" : "error",
      title: isSuccess ? "Password updated" : "Update failed",
      description:
        state.message ??
        (isSuccess
          ? "Your password has been updated."
          : "We couldn’t update your password. Please try again."),
      duration: 5000,
      isClosable: true,
      position: "top-right"
    });
  }, [state, toast]);

  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};
  const currentPasswordError = fieldErrors.currentPassword;
  const newPasswordError = fieldErrors.newPassword;
  const confirmPasswordError = fieldErrors.confirmPassword;
  const generalError = useMemo(() => {
    if (state.status !== "error") return null;
    if (currentPasswordError || newPasswordError || confirmPasswordError) {
      return undefined;
    }
    return state.message ?? "We couldn’t update your password. Please try again.";
  }, [state.status, state.message, currentPasswordError, newPasswordError, confirmPasswordError]);
  const successMessage = state.status === "success" ? state.message ?? "Your password has been updated." : null;

  return (
    <form ref={formRef} action={formAction} noValidate>
      <Stack spacing={5}>
        <FormControl isRequired isInvalid={Boolean(currentPasswordError)} isDisabled={pending}>
          <FormLabel htmlFor="currentPassword">Current password</FormLabel>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
          {currentPasswordError ? (
            <FormErrorMessage>{currentPasswordError}</FormErrorMessage>
          ) : null}
        </FormControl>

        <FormControl isRequired isInvalid={Boolean(newPasswordError)} isDisabled={pending}>
          <FormLabel htmlFor="newPassword">New password</FormLabel>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
          />
          {newPasswordError ? <FormErrorMessage>{newPasswordError}</FormErrorMessage> : null}
        </FormControl>

        <FormControl isRequired isInvalid={Boolean(confirmPasswordError)} isDisabled={pending}>
          <FormLabel htmlFor="confirmPassword">Confirm new password</FormLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            disabled={pending}
          />
          {confirmPasswordError ? (
            <FormErrorMessage>{confirmPasswordError}</FormErrorMessage>
          ) : null}
        </FormControl>

        <Button
          type="submit"
          colorScheme="primary"
          isLoading={pending}
          loadingText="Saving..."
          w="full"
        >
          Change password
        </Button>

        {successMessage ? (
          <Alert status="success" borderRadius="lg" variant="subtle">
            <AlertIcon />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}
        {generalError ? (
          <Alert status="error" borderRadius="lg" variant="subtle">
            <AlertIcon />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        ) : null}
      </Stack>
    </form>
  );
}
