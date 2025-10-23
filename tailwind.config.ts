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
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans]
      },
      colors: {
        border: "var(--surface-border)",
        input: "var(--surface-input)",
        ring: "var(--color-primary-ring)",
        background: "var(--app-background)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-content)"
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-content)"
        },
        muted: {
          DEFAULT: "var(--surface-muted)",
          foreground: "var(--text-muted)"
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
        card: {
          DEFAULT: "var(--surface-card)",
          foreground: "var(--text-primary)"
        }
      },
      borderRadius: {
        lg: "1.25rem",
        md: "1rem",
        sm: "0.75rem"
      }
    }
  },
  daisyui: {
    themes: [
      {
        pop: {
          primary: "#2563eb",
          "primary-content": "#f8fafc",
          secondary: "#f97316",
          "secondary-content": "#0f172a",
          accent: "#facc15",
          "accent-content": "#0f172a",
          neutral: "#111827",
          "neutral-content": "#f8fafc",
          "base-100": "#f9fafb",
          "base-200": "#e5e7eb",
          "base-300": "#d1d5db",
          info: "#0284c7",
          success: "#16a34a",
          warning: "#d97706",
          error: "#dc2626"
        }
      },
      {
        "pop-dark": {
          primary: "#60a5fa",
          "primary-content": "#0b1120",
          secondary: "#fb923c",
          "secondary-content": "#0f172a",
          accent: "#facc15",
          "accent-content": "#0f172a",
          neutral: "#0f172a",
          "neutral-content": "#e2e8f0",
          "base-100": "#020617",
          "base-200": "#111827",
          "base-300": "#1f2937",
          info: "#0ea5e9",
          success: "#22c55e",
          warning: "#fbbf24",
          error: "#f87171"
        }
      }
    ]
  },
  plugins: [require("daisyui"), require("tailwindcss-animate")]
} satisfies Config & { daisyui: unknown };

export default config;
