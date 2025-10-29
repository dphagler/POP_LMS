"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
} from "@chakra-ui/react";

export type RoleOption = "LEARNER" | "MANAGER" | "ADMIN";

export type InviteUserFormValues = {
  email: string;
  name: string;
  role: RoleOption;
};

type RoleOptionItem = {
  value: RoleOption;
  label: string;
};

type InviteUserModalProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: InviteUserFormValues) => void;
  roleOptions: RoleOptionItem[];
  defaultRole?: RoleOption;
};

export function InviteUserModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
  roleOptions,
  defaultRole = "LEARNER",
}: InviteUserModalProps) {
  const fallbackRole = useMemo(() => {
    const firstOption = roleOptions[0]?.value;
    return firstOption ?? defaultRole;
  }, [defaultRole, roleOptions]);

  const [formState, setFormState] = useState<InviteUserFormValues>({
    email: "",
    name: "",
    role: fallbackRole,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState({
      email: "",
      name: "",
      role: fallbackRole,
    });
  }, [fallbackRole, isOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formState);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      closeOnOverlayClick
      closeOnEsc
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Invite a user</ModalHeader>
        <ModalCloseButton isDisabled={isSubmitting} />
        <ModalBody pb={4}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email address</FormLabel>
              <Input
                type="email"
                autoFocus
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    email: event.target.value.trim(),
                  }))
                }
                isDisabled={isSubmitting}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                isDisabled={isSubmitting}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Role</FormLabel>
              <Select
                value={formState.role}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    role: event.target.value as RoleOption,
                  }))
                }
                isDisabled={isSubmitting}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button
            variant="outline"
            onClick={onClose}
            isDisabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button colorScheme="primary" type="submit" isLoading={isSubmitting}>
            Send invite
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
