"use client";

import { forwardRef, type ComponentProps } from "react";
import {
  Table as ChakraTable,
  TableCaption,
  TableContainer as ChakraTableContainer,
  Tbody as ChakraTbody,
  Td as ChakraTd,
  Tfoot as ChakraTfoot,
  Th as ChakraTh,
  Thead as ChakraThead,
  Tr as ChakraTr
} from "@chakra-ui/react";

type ChakraTableProps = ComponentProps<typeof ChakraTable>;
type ChakraTableContainerProps = ComponentProps<typeof ChakraTableContainer>;
type ChakraTheadProps = ComponentProps<typeof ChakraThead>;
type ChakraTbodyProps = ComponentProps<typeof ChakraTbody>;
type ChakraTfootProps = ComponentProps<typeof ChakraTfoot>;
type ChakraTrProps = ComponentProps<typeof ChakraTr>;
type ChakraThProps = ComponentProps<typeof ChakraTh>;
type ChakraTdProps = ComponentProps<typeof ChakraTd>;

const Table = forwardRef<HTMLTableElement, ChakraTableProps>(
  ({ variant = "simple", size = "md", colorScheme = "gray", ...props }, ref) => (
    <ChakraTable
      ref={ref}
      variant={variant}
      size={size}
      colorScheme={colorScheme}
      borderColor="border.subtle"
      sx={{
        "th, td": {
          borderColor: "border.subtle",
          fontSize: "sm"
        }
      }}
      {...props}
    />
  )
);
Table.displayName = "Table";

const TableContainer = forwardRef<HTMLDivElement, ChakraTableContainerProps>(
  ({ borderRadius = "xl", borderWidth = "1px", borderColor = "border.subtle", boxShadow = "sm", ...props }, ref) => (
    <ChakraTableContainer
      ref={ref}
      borderRadius={borderRadius}
      borderWidth={borderWidth}
      borderColor={borderColor}
      boxShadow={boxShadow}
      background="bg.surface"
      overflowX="auto"
      {...props}
    />
  )
);
TableContainer.displayName = "TableContainer";

const TableHeader = forwardRef<HTMLTableSectionElement, ChakraTheadProps>((props, ref) => (
  <ChakraThead ref={ref} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<HTMLTableSectionElement, ChakraTbodyProps>((props, ref) => (
  <ChakraTbody ref={ref} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = forwardRef<HTMLTableSectionElement, ChakraTfootProps>((props, ref) => (
  <ChakraTfoot ref={ref} {...props} />
));
TableFooter.displayName = "TableFooter";

const TableRow = forwardRef<HTMLTableRowElement, ChakraTrProps>(
  ({ _hover = { background: "bg.muted" }, ...props }, ref) => (
    <ChakraTr ref={ref} _hover={_hover} transition="background 0.2s ease" {...props} />
  )
);
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, ChakraThProps>(
  (
    {
      fontSize = "xs",
      textTransform = "uppercase",
      letterSpacing = "0.08em",
      color = "fg.muted",
      fontWeight = "semibold",
      ...props
    },
    ref
  ) => (
    <ChakraTh
      ref={ref}
      fontSize={fontSize}
      textTransform={textTransform}
      letterSpacing={letterSpacing}
      color={color}
      fontWeight={fontWeight}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, ChakraTdProps>(
  ({ fontSize = "sm", color = "fg.default", ...props }, ref) => (
    <ChakraTd ref={ref} fontSize={fontSize} color={color} {...props} />
  )
);
TableCell.displayName = "TableCell";

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
};
