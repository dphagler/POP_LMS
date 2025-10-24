import { forwardRef } from "react";
import type { ReactNode } from "react";
import { Container, type ContainerProps } from "@chakra-ui/react";

export type PageContainerProps = ContainerProps & { children?: ReactNode };

export const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(
  ({ children, ...props }, ref) => (
    <Container ref={ref} maxW="1200px" px={{ base: 6, md: 8 }} {...props}>
      {children}
    </Container>
  )
);

PageContainer.displayName = "PageContainer";
