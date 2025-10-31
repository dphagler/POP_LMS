"use client";
import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  IconButton,
  Kbd,
  Spinner,
  Text,
  Textarea,
  VStack
} from "@chakra-ui/react";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import { useAugment, AugmentMessage } from "@/lib/hooks/useAugment";

type Props = {
  lessonId: string;
  lessonTitle: string;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
};

export function AugmentDrawer({
  lessonId,
  lessonTitle,
  open,
  onOpenChange
}: Props) {
  const chat = useAugment({ lessonId, initialOpen: open ?? false });
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { setOpen } = chat;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.messages, chat.pending]);

  useEffect(() => {
    if (open === undefined) {
      return;
    }
    setOpen(open);
  }, [open, setOpen]);

  const send = async (
    kind: "probe" | "remediation" | "reflection",
    msg?: string
  ) => {
    await chat.send({ kind, message: msg ?? draft });
    if (msg === undefined) setDraft("");
  };

  return (
    <>
      <IconButton
        aria-label="Chat with POP Bot"
        size="sm"
        variant="outline"
        icon={<MessageSquare size={16} />}
        onClick={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
      >
        {/* icon only */}
      </IconButton>
      <Drawer
        isOpen={chat.open}
        onClose={() => {
          setOpen(false);
          onOpenChange?.(false);
        }}
        placement="right"
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
            <HStack justify="space-between">
              <Text fontWeight="bold">Chat with POP Bot</Text>
              <HStack>
                {chat.mockMode && <Badge colorScheme="purple">Mock</Badge>}
                <Badge colorScheme="gray">3 prompts/hour</Badge>
              </HStack>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              {lessonTitle}
            </Text>
          </DrawerHeader>
          <Divider />
          <DrawerBody display="flex" flexDir="column" gap={3} pt={3}>
            <VStack
              ref={listRef}
              align="stretch"
              spacing={3}
              flex="1"
              overflowY="auto"
              px={1}
            >
              {chat.messages.length === 0 && (
                <Box p={3} rounded="md" bg="gray.50">
                  <Text fontSize="sm">
                    Ask a question about the video, or hit <Kbd>Reflect</Kbd> to
                    summarize your takeaway.
                  </Text>
                </Box>
              )}
              {chat.messages.map((m: AugmentMessage, i) => (
                <Box
                  key={i}
                  p={3}
                  bg={m.role === "assistant" ? "blue.50" : "gray.50"}
                  rounded="md"
                >
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    {m.role === "assistant" ? "POP Bot" : "You"}
                  </Text>
                  <Text whiteSpace="pre-wrap">{m.content}</Text>
                </Box>
              ))}
              {chat.pending && (
                <HStack color="gray.500" fontSize="sm">
                  <Spinner size="xs" />
                  <Text>Thinking…</Text>
                </HStack>
              )}
              {chat.error && (
                <Box
                  p={2}
                  bg="red.50"
                  color="red.700"
                  rounded="md"
                  fontSize="sm"
                >
                  {chat.error}
                </Box>
              )}
            </VStack>

            <HStack>
              <Button
                size="sm"
                leftIcon={<Sparkles size={14} />}
                onClick={() => send("reflection", "Here’s my takeaway: ")}
              >
                Reflect
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  send("probe", "I’m not sure I understood this part.")
                }
              >
                I’m confused
              </Button>
            </HStack>

            <HStack>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question or write your reflection…"
                rows={3}
              />
              <IconButton
                aria-label="Send"
                icon={<Send size={16} />}
                onClick={() => send("probe")}
                isDisabled={!draft.trim()}
                isLoading={chat.pending}
              />
            </HStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default AugmentDrawer;
