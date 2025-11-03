import { extendTheme, type Theme, type ThemeConfig } from "@chakra-ui/react";

const themeConfig: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true
};

type PaletteShade =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";
type Palette = Record<PaletteShade, string>;

const FALLBACK_PRIMARY_PALETTE: Palette = {
  "50": "#f3f0ff",
  "100": "#e0d7ff",
  "200": "#c7b3ff",
  "300": "#ae8eff",
  "400": "#956bff",
  "500": "#7c49ff",
  "600": "#5f36d4",
  "700": "#4527a1",
  "800": "#2d186d",
  "900": "#180b3b"
};

const FALLBACK_ACCENT_PALETTE: Palette = {
  "50": "#ecfcff",
  "100": "#c4f5ff",
  "200": "#9aebff",
  "300": "#70e1ff",
  "400": "#4bd4ff",
  "500": "#23bdf2",
  "600": "#1696c7",
  "700": "#0c7299",
  "800": "#064d69",
  "900": "#02293a"
};

const GRAY_PALETTE: Palette = {
  "50": "#f8fafc",
  "100": "#edf1f7",
  "200": "#dbe2ec",
  "300": "#c0c9d6",
  "400": "#99a5b4",
  "500": "#738193",
  "600": "#566071",
  "700": "#3b4453",
  "800": "#262d38",
  "900": "#11161f"
};

const SPACE = {
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

const RADII = {
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
    "surface.elevated": { _light: "white", _dark: "gray.800" },
    "fg.default": { _light: "gray.900", _dark: "gray.100" },
    "fg.muted": { _light: "gray.600", _dark: "gray.300" },
    "border.subtle": { _light: "gray.200", _dark: "gray.700" },
    "border.emphasis": { _light: "gray.300", _dark: "gray.600" },
    "brand.primary": { _light: "primary.500", _dark: "primary.300" },
    "brand.secondary": { _light: "secondary.500", _dark: "secondary.300" },
    "brand.accent": { _light: "secondary.400", _dark: "secondary.200" },
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
  },
  Button: {
    baseStyle: {
      fontWeight: 600,
      borderRadius: "md"
    },
    sizes: {
      sm: {
        h: "44px",
        minH: "44px",
        px: 4,
        fontSize: "sm"
      },
      md: {
        h: "48px",
        minH: "48px",
        px: 5,
        fontSize: "md"
      },
      lg: {
        h: "56px",
        minH: "56px",
        px: 6,
        fontSize: "lg"
      }
    }
  },
  Card: {
    baseStyle: {
      container: {
        bg: "surface.elevated",
        color: "fg.default"
      }
    }
  },
  Modal: {
    baseStyle: {
      dialog: {
        bg: "surface.elevated",
        color: "fg.default"
      }
    },
    defaultProps: {
      blockScrollOnMount: true,
      preserveScrollBarGap: true
    }
  },
  Drawer: {
    baseStyle: {
      dialog: {
        bg: "surface.elevated",
        color: "fg.default",
        h: { base: "100vh", md: "auto" },
        maxH: { base: "100vh", md: "calc(100vh - 4rem)" },
        borderRadius: { base: "0", md: "xl" },
        m: { base: 0, md: 6 }
      },
      dialogContainer: {
        alignItems: { base: "stretch", md: "center" }
      }
    },
    defaultProps: {
      blockScrollOnMount: true,
      preserveScrollBarGap: true
    }
  },
  Progress: {
    variants: {
      lesson: {
        track: {
          bg: "bg.muted"
        },
        filledTrack: {
          bg: "brand.primary"
        }
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
    },
    ":focus-visible": {
      outline: "2px solid",
      outlineColor: "brand.primary",
      outlineOffset: "2px"
    }
  }
};

const paletteShades: PaletteShade[] = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900"
];

const COLOR_SCALE_STOPS: Record<PaletteShade, number> = {
  "50": 0.92,
  "100": 0.78,
  "200": 0.62,
  "300": 0.46,
  "400": 0.24,
  "500": 0,
  "600": -0.12,
  "700": -0.28,
  "800": -0.46,
  "900": -0.62
};

type Rgb = { r: number; g: number; b: number };

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

function normalizeHexColor(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^#?([0-9a-fA-F]{6})$/u.exec(trimmed);
  if (!match) {
    return null;
  }
  return `#${match[1].toLowerCase()}`;
}

function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  return { r, g, b };
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (component: number) => component.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixRgb(base: Rgb, target: Rgb, amount: number): Rgb {
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  return {
    r: clamp(Math.round(base.r + (target.r - base.r) * amount)),
    g: clamp(Math.round(base.g + (target.g - base.g) * amount)),
    b: clamp(Math.round(base.b + (target.b - base.b) * amount))
  };
}

function buildPaletteFromHex(baseHex: string, fallback: Palette): Palette {
  const baseRgb = hexToRgb(baseHex);
  if (!baseRgb) {
    return fallback;
  }

  const palette: Palette = { ...fallback };
  for (const shade of paletteShades) {
    const ratio = COLOR_SCALE_STOPS[shade];
    if (ratio === 0) {
      palette[shade] = normalizeHexColor(baseHex) ?? fallback[shade];
      continue;
    }

    const amount = Math.min(Math.max(Math.abs(ratio), 0), 1);
    const target = ratio > 0 ? WHITE : BLACK;
    palette[shade] = rgbToHex(mixRgb(baseRgb, target, amount));
  }
  return palette;
}

function createPalette(
  value: string | null | undefined,
  fallback: Palette
): Palette {
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    return fallback;
  }
  return buildPaletteFromHex(normalized, fallback);
}

function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

function sanitizeLogoUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return null;
}

function sanitizeOrgName(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const DEFAULT_LOGIN_BLURB =
  "Choose how you’d like to sign in to your POP Initiative account. Your progress syncs across web and mobile.";

export const DEFAULT_LOGO_URL = "/logo.svg";

export type ThemeFactoryInput = {
  themePrimary?: string | null;
  themeAccent?: string | null;
  loginBlurb?: string | null;
  logoUrl?: string | null;
  orgName?: string | null;
};

export type OrgThemeMetadata = {
  loginBlurb: string;
  logoUrl: string | null;
  orgName: string | null;
  primaryHex: string;
  accentHex: string;
};

export type OrgTheme = Theme & { metadata: OrgThemeMetadata };

export function createOrgTheme(input: ThemeFactoryInput = {}): OrgTheme {
  const primaryPalette = createPalette(
    input.themePrimary,
    FALLBACK_PRIMARY_PALETTE
  );
  const accentPalette = createPalette(
    input.themeAccent,
    FALLBACK_ACCENT_PALETTE
  );
  const loginBlurb = sanitizeText(input.loginBlurb) ?? DEFAULT_LOGIN_BLURB;
  const logoUrl = sanitizeLogoUrl(input.logoUrl) ?? null;
  const orgName = sanitizeOrgName(input.orgName);

  const theme = extendTheme({
    config: themeConfig,
    colors: {
      primary: primaryPalette,
      secondary: accentPalette,
      accent: accentPalette,
      gray: GRAY_PALETTE
    },
    radii: RADII,
    space: SPACE,
    semanticTokens,
    components,
    styles,
    fonts: {
      heading: "var(--font-heading)",
      body: "var(--font-sans)",
      mono: "'JetBrains Mono', monospace"
    }
  }) as Theme & { metadata?: OrgThemeMetadata };

  theme.metadata = {
    loginBlurb,
    logoUrl,
    orgName,
    primaryHex: primaryPalette["500"],
    accentHex: accentPalette["500"]
  } satisfies OrgThemeMetadata;

  return theme as OrgTheme;
}

export const defaultOrgTheme = createOrgTheme();
