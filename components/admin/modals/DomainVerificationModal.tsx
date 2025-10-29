"use client";

import {
  Button,
  Code,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";

type VerificationToken = {
  token: string;
  recordName: string;
};

type DomainVerificationModalProps = {
  isOpen: boolean;
  isVerifying?: boolean;
  onClose: () => void;
  onVerify: () => void;
  verificationToken: VerificationToken | null;
  domain?: string | null;
};

export function DomainVerificationModal({
  isOpen,
  isVerifying = false,
  onClose,
  onVerify,
  verificationToken,
  domain,
}: DomainVerificationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      closeOnOverlayClick
      closeOnEsc
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Verify domain</ModalHeader>
        <ModalCloseButton isDisabled={isVerifying} />
        <ModalBody>
          {verificationToken ? (
            <Stack spacing={4}>
              {domain ? (
                <Text>
                  Verify <strong>{domain}</strong> by adding the TXT record below, then
                  click <strong>Verify</strong>.
                </Text>
              ) : (
                <Text>
                  Add the following TXT record to your DNS provider, then click
                  <strong> Verify</strong>.
                </Text>
              )}
              <Stack spacing={2}>
                <Text fontWeight="semibold">Host</Text>
                <Code>{verificationToken.recordName}</Code>
              </Stack>
              <Stack spacing={2}>
                <Text fontWeight="semibold">Value</Text>
                <Code>{verificationToken.token}</Code>
              </Stack>
            </Stack>
          ) : (
            <Text color="fg.muted">Enter a domain to generate verification details.</Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isVerifying} type="button">
            Cancel
          </Button>
          <Button colorScheme="primary" onClick={onVerify} isLoading={isVerifying}>
            Verify
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
