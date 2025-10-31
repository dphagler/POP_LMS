"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Stack,
  Text,
  Textarea,
  VisuallyHidden,
  useColorModeValue
} from "@chakra-ui/react";

import {
  type AugmentMessage,
  type AugmentSendArgs,
  type AugmentSendResult
} from "@/lib/hooks/useAugment";

type AugmentDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  messages: AugmentMessage[];
  pending: boolean;
  error: string | null;
  onSend: (payload: AugmentSendArgs) => Promise<AugmentSendResult>;
  mockMode?: boolean;
};

const REFLECTION_PROMPT = "Here’s my takeaway: ...";

export function AugmentDrawer({
  isOpen,
  onClose,
  lessonTitle,
  messages,
  pending,
  error,
  onSend,
  mockMode = false
}: AugmentDrawerProps) {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [liveRegion, setLiveRegion] = useState("");

  const assistantBubbleBg = useColorModeValue("gray.100", "gray.700");
  const assistantBubbleColor = useColorModeValue("gray.800", "gray.50");
  const userBubbleBg = useColorModeValue("primary.600", "primary.400");
  const userBubbleColor = useColorModeValue("white", "gray.900");
  const toolbarBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const captionColor = useColorModeValue("gray.600", "gray.400");
  const errorColor = useColorModeValue("red.600", "red.300");
  const emptyStateColor = useColorModeValue("gray.500", "gray.400");

  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }

    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (lastAssistant) {
      setLiveRegion(lastAssistant.content);
    }
  }, [messages]);

  const friendlyError = useMemo(() => {
    if (!error) {
      return null;
    }

    if (error === "quota_exceeded") {
      return "You’ve reached today’s prompt limit.";
    }

    return error;
  }, [error]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = inputValue.trim();
      if (!trimmed || pending) {
        return;
      }

      const result = await onSend({ kind: "probe", message: trimmed });
      if (result.ok) {
        setInputValue("");
      }
    },
    [inputValue, onSend, pending]
  );

  const handleReflect = useCallback(async () => {
    if (pending) {
      return;
    }

    const result = await onSend({
      kind: "reflection",
      message: REFLECTION_PROMPT
    });
    if (result.ok) {
      setInputValue("");
    }
  }, [onSend, pending]);

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size="md"
      onClose={onClose}
      initialFocusRef={textareaRef}
      trapFocus
    >
      <DrawerOverlay />
      <DrawerContent display="flex" flexDirection="column">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          <Stack spacing={1} align="flex-start">
            <Flex align="center" gap={3} w="full">
              <Text fontWeight="semibold" fontSize="lg" flex="1" noOfLines={2}>
                {lessonTitle}
              </Text>
              {mockMode ? <Badge colorScheme="orange">Mock Mode</Badge> : null}
            </Flex>
            <Text fontSize="sm" color={captionColor}>
              3 prompts/hour
            </Text>
          </Stack>
        </DrawerHeader>
        <DrawerBody display="flex" flexDirection="column" gap={4} py={4}>
          <VisuallyHidden aria-live="polite">{liveRegion}</VisuallyHidden>
          <Box
            flex="1"
            overflowY="auto"
            pr={1}
            display="flex"
            flexDirection="column"
            gap={3}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 ? (
              <Flex
                flex="1"
                align="center"
                justify="center"
                textAlign="center"
                color={emptyStateColor}
              >
                <Text fontSize="sm">
                  Ask POP Bot for help with this lesson.
                </Text>
              </Flex>
            ) : (
              <Stack spacing={3} flex="1">
                {messages.map((message, index) => {
                  const key = `${message.role}-${message.at.getTime()}-${index}`;
                  const isUser = message.role === "user";
                  const bubbleBg = isUser ? userBubbleBg : assistantBubbleBg;
                  const bubbleColor = isUser
                    ? userBubbleColor
                    : assistantBubbleColor;

                  return (
                    <Box
                      key={key}
                      alignSelf={isUser ? "flex-end" : "flex-start"}
                      maxW="85%"
                    >
                      <Stack
                        spacing={1}
                        bg={bubbleBg}
                        color={bubbleColor}
                        borderRadius="lg"
                        px={4}
                        py={3}
                      >
                        <Text fontSize="xs" fontWeight="medium">
                          {isUser ? "You" : "POP Bot"}
                        </Text>
                        <Text whiteSpace="pre-wrap">{message.content}</Text>
                      </Stack>
                    </Box>
                  );
                })}
                <Box ref={messagesEndRef} />
              </Stack>
            )}
          </Box>
          <Stack spacing={3} bg={toolbarBg} borderRadius="lg" p={4}>
            <HStack justify="space-between">
              <Text fontSize="sm" color={captionColor}>
                Quick actions
              </Text>
              <Button
                size="xs"
                variant="outline"
                onClick={handleReflect}
                isDisabled={pending}
                aria-label="Send a reflection prompt"
              >
                Reflect
              </Button>
            </HStack>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel htmlFor="augment-message" srOnly>
                    Message for POP Bot
                  </FormLabel>
                  <Textarea
                    id="augment-message"
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Ask a question about the lesson"
                    minH="120px"
                    resize="vertical"
                    isDisabled={pending}
                  />
                </FormControl>
                {friendlyError ? (
                  <Text fontSize="sm" color={errorColor}>
                    {friendlyError}
                  </Text>
                ) : null}
                <Flex justify="flex-end">
                  <Button
                    type="submit"
                    colorScheme="primary"
                    isLoading={pending}
                    isDisabled={pending || inputValue.trim().length === 0}
                    aria-label="Send message to POP Bot"
                  >
                    Send
                  </Button>
                </Flex>
              </Stack>
            </form>
          </Stack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
