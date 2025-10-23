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
          primary: "#4f46e5",
          "primary-content": "#eef2ff",
          secondary: "#0ea5e9",
          "secondary-content": "#052241",
          accent: "#f472b6",
          "accent-content": "#2f0f23",
          neutral: "#111827",
          "neutral-content": "#f8fafc",
          "base-100": "#f6f7ff",
          "base-200": "#e9ebff",
          "base-300": "#d9ddff",
          info: "#2563eb",
          success: "#16a34a",
          warning: "#f59e0b",
          error: "#dc2626"
        }
      },
      {
        "pop-dark": {
          primary: "#818cf8",
          "primary-content": "#0b1120",
          secondary: "#38bdf8",
          "secondary-content": "#021427",
          accent: "#f472b6",
          "accent-content": "#311022",
          neutral: "#0f172a",
          "neutral-content": "#e2e8f0",
          "base-100": "#020617",
          "base-200": "#0f172a",
          "base-300": "#1e293b",
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
