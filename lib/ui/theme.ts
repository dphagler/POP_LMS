import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true
};

const colors = {
  primary: {
    50: "#f3f0ff",
    100: "#e0d7ff",
    200: "#c7b3ff",
    300: "#ae8eff",
    400: "#956bff",
    500: "#7c49ff",
    600: "#5f36d4",
    700: "#4527a1",
    800: "#2d186d",
    900: "#180b3b"
  },
  secondary: {
    50: "#ecfcff",
    100: "#c4f5ff",
    200: "#9aebff",
    300: "#70e1ff",
    400: "#4bd4ff",
    500: "#23bdf2",
    600: "#1696c7",
    700: "#0c7299",
    800: "#064d69",
    900: "#02293a"
  },
  gray: {
    50: "#f8fafc",
    100: "#edf1f7",
    200: "#dbe2ec",
    300: "#c0c9d6",
    400: "#99a5b4",
    500: "#738193",
    600: "#566071",
    700: "#3b4453",
    800: "#262d38",
    900: "#11161f"
  }
};

const space = {
  px: "1px",
  0: "0px",
  1: "0.5rem",
  2: "1rem",
  3: "1.5rem",
  4: "2rem",
  5: "2.5rem",
  6: "3rem",
  7: "3.5rem",
  8: "4rem",
  9: "4.5rem",
  10: "5rem",
  11: "5.5rem",
  12: "6rem"
} as const;

const radii = {
  none: "0",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px"
} as const;

const semanticTokens = {
  colors: {
    "bg.canvas": { _light: "gray.50", _dark: "gray.900" },
    "bg.surface": { _light: "white", _dark: "gray.800" },
    "bg.muted": { _light: "gray.100", _dark: "gray.700" },
    "fg.default": { _light: "gray.900", _dark: "gray.100" },
    "fg.muted": { _light: "gray.600", _dark: "gray.300" },
    "border.subtle": { _light: "gray.200", _dark: "gray.700" },
    "border.emphasis": { _light: "gray.300", _dark: "gray.600" },
    "accent.primary": { _light: "primary.500", _dark: "primary.300" },
    "accent.secondary": { _light: "secondary.500", _dark: "secondary.300" }
  }
};

const components = {
  Heading: {
    baseStyle: {
      fontFamily: "var(--font-heading)",
      fontWeight: 700,
      color: "fg.default"
    },
    sizes: {
      "4xl": {
        fontSize: ["2.5rem", "3rem"],
        lineHeight: ["2.75rem", "3.25rem"],
        letterSpacing: "-0.04em"
      },
      "3xl": {
        fontSize: ["2rem", "2.5rem"],
        lineHeight: ["2.25rem", "2.75rem"],
        letterSpacing: "-0.03em"
      },
      "2xl": {
        fontSize: ["1.75rem", "2.25rem"],
        lineHeight: ["2.125rem", "2.5rem"],
        letterSpacing: "-0.025em"
      },
      xl: {
        fontSize: ["1.5rem", "2rem"],
        lineHeight: ["1.875rem", "2.25rem"],
        letterSpacing: "-0.02em"
      },
      lg: {
        fontSize: ["1.25rem", "1.5rem"],
        lineHeight: ["1.625rem", "1.875rem"],
        letterSpacing: "-0.015em"
      },
      md: {
        fontSize: ["1.125rem", "1.25rem"],
        lineHeight: ["1.5rem", "1.75rem"],
        letterSpacing: "-0.01em"
      }
    }
  }
};

const styles = {
  global: {
    html: {
      minHeight: "100%"
    },
    body: {
      fontFamily: "var(--font-sans)",
      minHeight: "100vh",
      backgroundColor: "bg.canvas",
      color: "fg.default"
    },
    "*::selection": {
      background: "primary.200",
      color: "gray.900"
    }
  }
};

export const popTheme = extendTheme({
  config,
  colors,
  radii,
  space,
  semanticTokens,
  components,
  styles,
  fonts: {
    heading: "var(--font-heading)",
    body: "var(--font-sans)",
    mono: "'JetBrains Mono', monospace"
  }
});

export type PopTheme = typeof popTheme;
