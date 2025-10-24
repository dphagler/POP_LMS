"use client";

import {
  ChangeEvent,
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Box,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Stack,
  Text,
  useToast
} from "@chakra-ui/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type UpdateProfileFormState } from "./actions";

type ProfileSettingsFormProps = {
  action: (
    state: UpdateProfileFormState,
    formData: FormData
  ) => Promise<UpdateProfileFormState>;
  initialState: UpdateProfileFormState;
  initialName: string;
  initialEmail: string;
  initialAvatar?: string | null;
};

export function ProfileSettingsForm({
  action,
  initialState,
  initialName,
  initialEmail,
  initialAvatar = null,
}: ProfileSettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [displayName, setDisplayName] = useState(initialName);
  const [savedAvatar, setSavedAvatar] = useState<string | null>(initialAvatar);
  const [preview, setPreview] = useState<string | null>(initialAvatar);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const avatarInputId = useId();
  const toast = useToast();

  useEffect(() => {
    setDisplayName(initialName);
  }, [initialName]);

  useEffect(() => {
    setSavedAvatar(initialAvatar ?? null);
    setPreview(initialAvatar ?? null);
    setRemoveAvatar(false);
  }, [initialAvatar]);

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    if (state.status === "success") {
      if (typeof state.name === "string") {
        setDisplayName(state.name);
      }
      if (typeof state.image !== "undefined") {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setPreview(state.image);
        setSavedAvatar(state.image ?? null);
        setRemoveAvatar(!state.image);
        if (!state.image && fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }

    const isSuccess = state.status === "success";
    toast({
      status: isSuccess ? "success" : "error",
      title: isSuccess ? "Profile updated" : "Update failed",
      description:
        state.message ??
        (isSuccess
          ? "Your profile has been updated."
          : "We couldn’t update your profile. Please try again."),
      duration: 5000,
      isClosable: true,
      position: "top-right"
    });
  }, [state, toast]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const avatarInitials = useMemo(() => {
    const segments = displayName.split(" ").map((segment) => segment.trim()).filter(Boolean);
    const [first = "", second = ""] = segments;
    const initials = `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
    if (initials) return initials;
    const fallback = displayName.trim().slice(0, 2).toUpperCase();
    return fallback || "PO";
  }, [displayName]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreview(savedAvatar);
      setRemoveAvatar(false);
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(null);
    setRemoveAvatar(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};
  const displayNameError = fieldErrors.displayName;
  const avatarError = fieldErrors.avatar;
  const successMessage =
    state.status === "success"
      ? state.message ?? "Your profile has been updated."
      : null;
  const generalError =
    state.status === "error" && !displayNameError && !avatarError
      ? state.message ?? "We couldn’t update your profile. Please try again."
      : null;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
      <Stack spacing={8}>
        <Stack spacing={1}>
          <Heading size="md">Profile details</Heading>
          <Text fontSize="sm" color="fg.muted">
            Update your name and photo so classmates recognize you.
          </Text>
        </Stack>

        <Stack spacing={6}>
          <Stack direction={{ base: "column", md: "row" }} spacing={6} align={{ base: "flex-start", md: "center" }}>
            <Avatar
              name={displayName}
              src={preview ?? undefined}
              size="xl"
              bg="primary.500"
              color="white"
            >
              {avatarInitials}
            </Avatar>
            <FormControl isInvalid={Boolean(avatarError)} isDisabled={pending} flex="1">
              <FormLabel htmlFor={avatarInputId}>Profile photo</FormLabel>
              <Stack spacing={3} align={{ base: "stretch", sm: "flex-start" }}>
                <HStack spacing={3} w="full" flexWrap="wrap" align={{ base: "stretch", sm: "center" }}>
                  <Input
                    ref={fileInputRef}
                    id={avatarInputId}
                    name="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={pending}
                    maxW={{ base: "full", sm: "xs" }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    isDisabled={pending || (!preview && !savedAvatar)}
                  >
                    Remove photo
                  </Button>
                </HStack>
                <FormHelperText>
                  Use a square image (240px or larger). PNG or JPG files up to 4 MB are supported.
                </FormHelperText>
                {avatarError ? <FormErrorMessage>{avatarError}</FormErrorMessage> : null}
              </Stack>
            </FormControl>
          </Stack>

          <FormControl isRequired isInvalid={Boolean(displayNameError)} isDisabled={pending}>
            <FormLabel htmlFor="displayName">Display name</FormLabel>
            <Input
              id="displayName"
              name="displayName"
              value={displayName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)}
              maxLength={80}
              autoComplete="name"
              required
              disabled={pending}
            />
            <FormHelperText>This name will appear on certificates and progress reports.</FormHelperText>
            {displayNameError ? <FormErrorMessage>{displayNameError}</FormErrorMessage> : null}
          </FormControl>

          <Box>
            <Text fontSize="sm" fontWeight="semibold">Email</Text>
            <Text fontSize="sm" color="fg.muted">
              {initialEmail}
            </Text>
          </Box>
        </Stack>

        <Stack spacing={4}>
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
          <Flex justify="flex-end">
            <Button
              type="submit"
              colorScheme="primary"
              isLoading={pending}
              loadingText="Saving..."
            >
              Save changes
            </Button>
          </Flex>
        </Stack>
      </Stack>
    </form>
  );
}
