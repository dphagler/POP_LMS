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
          primary: "#0ea5e9",
          "primary-content": "#02192f",
          secondary: "#6366f1",
          "secondary-content": "#eef2ff",
          accent: "#f472b6",
          "accent-content": "#2f1022",
          neutral: "#1e293b",
          "neutral-content": "#f8fafc",
          "base-100": "#f8fafc",
          "base-200": "#e2e8f0",
          "base-300": "#cbd5e1",
          info: "#38bdf8",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444"
        }
      },
      {
        "pop-dark": {
          primary: "#38bdf8",
          "primary-content": "#031322",
          secondary: "#818cf8",
          "secondary-content": "#151a37",
          accent: "#f472b6",
          "accent-content": "#310f24",
          neutral: "#0f172a",
          "neutral-content": "#e2e8f0",
          "base-100": "#020617",
          "base-200": "#0b1220",
          "base-300": "#1e293b",
          info: "#38bdf8",
          success: "#22c55e",
          warning: "#fbbf24",
          error: "#f87171"
        }
      }
    ]
  },
  plugins: [require("daisyui"), require("tailwindcss-animate")]
} satisfies Config & {
  daisyui: {
    themes: Record<string, unknown>[];
  };
};

export default config;
