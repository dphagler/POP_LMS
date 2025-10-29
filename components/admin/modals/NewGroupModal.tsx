"use client";

import { useEffect, useState } from "react";
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
  Stack,
} from "@chakra-ui/react";

export type NewGroupFormValues = {
  name: string;
  description: string;
};

type NewGroupModalProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: NewGroupFormValues) => void;
};

const initialFormValues: NewGroupFormValues = {
  name: "",
  description: "",
};

export function NewGroupModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: NewGroupModalProps) {
  const [formValues, setFormValues] = useState<NewGroupFormValues>(initialFormValues);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormValues(initialFormValues);
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="lg"
      closeOnOverlayClick
      closeOnEsc
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Create a new group</ModalHeader>
        <ModalCloseButton isDisabled={isSubmitting} />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel htmlFor="group-name">Group name</FormLabel>
              <Input
                id="group-name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Regional managers"
                autoFocus
                isDisabled={isSubmitting}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="group-description">Description (optional)</FormLabel>
              <Input
                id="group-description"
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Quarterly onboarding cohort"
                isDisabled={isSubmitting}
              />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button
            variant="ghost"
            onClick={onClose}
            isDisabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button colorScheme="primary" type="submit" isLoading={isSubmitting}>
            Create group
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
