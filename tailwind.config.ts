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
          primary: "#4338ca",
          "primary-content": "#eef2ff",
          secondary: "#0ea5e9",
          "secondary-content": "#041f33",
          accent: "#f973ab",
          "accent-content": "#311024",
          neutral: "#1f2937",
          "neutral-content": "#f8fafc",
          "base-100": "#f8faff",
          "base-200": "#eef1ff",
          "base-300": "#e0e4ff",
          info: "#2563eb",
          success: "#16a34a",
          warning: "#f59e0b",
          error: "#dc2626"
        }
      },
      {
        "pop-dark": {
          primary: "#a5b4ff",
          "primary-content": "#050816",
          secondary: "#38bdf8",
          "secondary-content": "#011a2c",
          accent: "#f9a8d4",
          "accent-content": "#2f1024",
          neutral: "#1e293b",
          "neutral-content": "#e2e8f0",
          "base-100": "#050816",
          "base-200": "#0f172a",
          "base-300": "#1b253f",
          info: "#60a5fa",
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171"
        }
      }
    ]
  },
  plugins: [require("daisyui"), require("tailwindcss-animate")]
} satisfies Config & { daisyui: unknown };

export default config;
