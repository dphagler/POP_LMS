import { useDisclosure } from "@chakra-ui/react";
import { useRef } from "react";

export function useModalState() {
  const disclosure = useDisclosure();
  const isOpenRef = useRef(false);

  const onOpen = () => {
    isOpenRef.current = true;
    disclosure.onOpen();
  };

  const onClose = () => {
    isOpenRef.current = false;
    disclosure.onClose();
  };

  return { ...disclosure, isOpenRef, onOpen, onClose };
}
