import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        heading: ["var(--font-heading)", ...defaultTheme.fontFamily.sans]
      },
      colors: {
        border: "var(--surface-border)",
        input: "var(--surface-input)",
        ring: "var(--color-primary-ring)",
        background: "var(--app-background)",
        foreground: "var(--text-primary)",
        card: {
          DEFAULT: "var(--surface-card)",
          foreground: "var(--text-primary)"
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-content)"
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-content)"
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-content)"
        },
        info: {
          DEFAULT: "var(--color-info)",
          foreground: "var(--color-info-content)"
        },
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-success-content)"
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-warning-content)"
        },
        destructive: {
          DEFAULT: "var(--color-error)",
          foreground: "var(--color-error-content)"
        },
        neutral: {
          DEFAULT: "var(--color-neutral)",
          foreground: "var(--color-neutral-content)"
        },
        muted: {
          DEFAULT: "var(--surface-muted)",
          foreground: "var(--text-muted)"
        },
        base: {
          100: "var(--color-base-100)",
          200: "var(--color-base-200)",
          300: "var(--color-base-300)"
        },
        "base-content": "var(--color-base-content)",
        "base-content-strong": "var(--color-base-content-strong)"
      },
      borderRadius: {
        lg: "1.25rem",
        md: "1rem",
        sm: "0.75rem"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;

export default config;
