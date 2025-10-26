"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Text,
  Textarea,
  VStack,
  useBreakpointValue,
  useColorModeValue,
} from "@chakra-ui/react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type ChatProbeSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transcript: string[]) => Promise<void>;
  title?: string;
  initialAssistantPrompt?: string;
};

const MAX_USER_MESSAGES = 4;

export function ChatProbeSheet({
  isOpen,
  onClose,
  onSubmit,
  title = "Lesson reflection",
  initialAssistantPrompt = "I'd love to hear what stood out to you. Share a few takeaways below.",
}: ChatProbeSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "assistant-0",
      role: "assistant",
      content: initialAssistantPrompt,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placement =
    useBreakpointValue<"bottom" | "right">({ base: "bottom", md: "right" }) ?? "right";
  const size = useBreakpointValue({ base: "full", md: "md" }) ?? "md";

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userMessageCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMessages([
      {
        id: "assistant-0",
        role: "assistant",
        content: initialAssistantPrompt,
      },
    ]);
    setInputValue("");
  }, [initialAssistantPrompt, isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const canSendMessage =
    Boolean(inputValue.trim()) && userMessageCount < MAX_USER_MESSAGES && !isSubmitting;

  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || userMessageCount >= MAX_USER_MESSAGES) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${current.length}`,
        role: "user",
        content: trimmed,
      },
    ]);
    setInputValue("");
  };

  const handleFinish = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const transcript = messages
        .filter((message) => message.role === "user")
        .map((message) => message.content);
      await onSubmit(transcript);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assistantBubbleColor = useColorModeValue("gray.100", "gray.700");
  const userBubbleColor = useColorModeValue("blue.500", "blue.300");
  const userTextColor = useColorModeValue("white", "gray.900");

  const inputDisabled = isSubmitting || userMessageCount >= MAX_USER_MESSAGES;

  return (
    <Drawer
      isOpen={isOpen}
      placement={placement}
      size={size}
      onClose={onClose}
      returnFocusOnClose={false}
    >
      <DrawerOverlay />
      <DrawerContent borderTopRadius={{ base: "2xl", md: "none" }}>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">{title}</DrawerHeader>
        <DrawerBody display="flex" flexDirection="column" gap={4} px={{ base: 2, md: 6 }}>
          <VStack
            spacing={3}
            align="stretch"
            flex="1"
            overflowY="auto"
            py={2}
            px={{ base: 1, md: 0 }}
          >
            {messages.map((message) => (
              <Flex
                key={message.id}
                justify={message.role === "user" ? "flex-end" : "flex-start"}
              >
                <Box
                  maxW="85%"
                  bg={
                    message.role === "user" ? userBubbleColor : assistantBubbleColor
                  }
                  color={message.role === "user" ? userTextColor : undefined}
                  px={4}
                  py={3}
                  borderRadius="xl"
                  borderTopRightRadius={message.role === "user" ? "sm" : "xl"}
                  borderTopLeftRadius={message.role === "assistant" ? "sm" : "xl"}
                  boxShadow="md"
                >
                  <Text fontSize="sm">{message.content}</Text>
                </Box>
              </Flex>
            ))}
            <Box ref={messagesEndRef} h="1px" />
          </VStack>
          <Box>
            <Textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={
                userMessageCount >= MAX_USER_MESSAGES
                  ? "You've reached the reflection limit."
                  : "Share your reflection..."
              }
              isDisabled={inputDisabled}
              minH="100px"
              resize="vertical"
            />
            <Flex mt={2} justify="space-between" align="center">
              <Text fontSize="xs" color="gray.500">
                {userMessageCount} / {MAX_USER_MESSAGES} reflections shared
              </Text>
              <Button
                colorScheme="blue"
                onClick={handleSendMessage}
                isDisabled={!canSendMessage}
                size="sm"
              >
                Send
              </Button>
            </Flex>
          </Box>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button colorScheme="green" onClick={handleFinish} isLoading={isSubmitting}>
            Finish
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
