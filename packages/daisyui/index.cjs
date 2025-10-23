const plugin = require("tailwindcss/plugin");

function buttonVariant(token) {
  return {
    backgroundColor: `var(--color-${token})`,
    borderColor: `var(--color-${token})`,
    color: `var(--color-${token}-content)`,
    boxShadow: "var(--shadow-btn)",
    "&:hover": {
      backgroundColor: `var(--color-${token}-hover)`,
      borderColor: `var(--color-${token}-hover)`,
      boxShadow: "var(--shadow-btn-hover)",
      transform: "translateY(-1px)"
    },
    "&:focus-visible": {
      outline: `2px solid var(--color-${token}-ring)` ,
      outlineOffset: "2px"
    },
    "&:active": {
      transform: "translateY(0)",
      boxShadow: "var(--shadow-btn-active)"
    }
  };
}

module.exports = plugin(
  function ({ addBase, addComponents, addUtilities }) {
    addBase({
      ":root": {
        "--rounded-box": "1.25rem",
        "--rounded-btn": "9999px",
        "--btn-height": "2.75rem",
        "--btn-padding": "1.5rem",
        "--focus-ring": "rgba(14, 165, 233, 0.45)",
        "--surface-border": "rgba(15, 23, 42, 0.12)",
        "--surface-border-strong": "rgba(15, 23, 42, 0.2)",
        "--surface-card": "rgba(255, 255, 255, 0.9)",
        "--surface-card-hover": "rgba(255, 255, 255, 0.95)",
        "--surface-muted": "rgba(148, 163, 184, 0.16)",
        "--surface-input": "rgba(255, 255, 255, 0.9)",
        "--surface-input-dark": "rgba(15, 23, 42, 0.4)",
        "--shadow-card": "0 20px 45px -30px rgba(15, 23, 42, 0.6)",
        "--shadow-card-hover": "0 30px 55px -35px rgba(14, 165, 233, 0.45)",
        "--shadow-btn": "0 15px 35px -22px rgba(14, 165, 233, 0.7)",
        "--shadow-btn-hover": "0 18px 40px -20px rgba(14, 165, 233, 0.75)",
        "--shadow-btn-active": "0 10px 28px -18px rgba(14, 165, 233, 0.6)",
        "--shadow-input": "0 12px 30px -24px rgba(15, 23, 42, 0.4)",
        "--shadow-input-focus": "0 18px 40px -28px rgba(14, 165, 233, 0.5)",
        "--surface-hover": "rgba(14, 165, 233, 0.08)",
        "--surface-muted-strong": "rgba(148, 163, 184, 0.22)"
      }
    });

    addComponents({
      ".btn": {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        fontWeight: "600",
        fontSize: "0.95rem",
        lineHeight: "1.25rem",
        borderRadius: "var(--rounded-btn)",
        paddingLeft: "var(--btn-padding)",
        paddingRight: "var(--btn-padding)",
        minHeight: "var(--btn-height)",
        height: "var(--btn-height)",
        borderWidth: "1px",
        borderStyle: "solid",
        cursor: "pointer",
        transitionProperty: "transform, background-color, border-color, color, box-shadow",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
        textDecoration: "none",
        ...buttonVariant("primary"),
        "&:disabled": {
          opacity: "0.5",
          pointerEvents: "none",
          transform: "none",
          boxShadow: "none"
        }
      },
      ".btn-secondary": buttonVariant("secondary"),
      ".btn-accent": buttonVariant("accent"),
      ".btn-neutral": buttonVariant("neutral"),
      ".btn-info": buttonVariant("info"),
      ".btn-success": buttonVariant("success"),
      ".btn-warning": buttonVariant("warning"),
      ".btn-error": buttonVariant("error"),
      ".btn-outline": {
        backgroundColor: "transparent",
        borderColor: "var(--surface-border-strong)",
        color: "var(--color-neutral)",
        boxShadow: "none",
        "&:hover": {
          backgroundColor: "var(--surface-hover)",
          borderColor: "var(--color-primary)",
          color: "var(--color-primary)",
          transform: "translateY(-1px)"
        },
        "&:focus-visible": {
          outline: "2px solid var(--color-primary-ring)",
          outlineOffset: "2px"
        }
      },
      ".btn-ghost": {
        backgroundColor: "transparent",
        color: "var(--color-neutral)",
        borderColor: "transparent",
        boxShadow: "none",
        "&:hover": {
          backgroundColor: "var(--surface-hover)",
          color: "var(--color-primary)",
          transform: "translateY(-1px)"
        },
        "&:focus-visible": {
          outline: "2px solid var(--color-primary-ring)",
          outlineOffset: "2px"
        }
      },
      ".btn-link": {
        backgroundColor: "transparent",
        borderColor: "transparent",
        boxShadow: "none",
        color: "var(--color-primary)",
        paddingLeft: "0",
        paddingRight: "0",
        "&:hover": {
          textDecoration: "underline"
        }
      },
      ".btn-sm": {
        minHeight: "2.5rem",
        height: "2.5rem",
        paddingLeft: "1.125rem",
        paddingRight: "1.125rem",
        fontSize: "0.85rem"
      },
      ".btn-lg": {
        minHeight: "3.25rem",
        height: "3.25rem",
        paddingLeft: "1.75rem",
        paddingRight: "1.75rem",
        fontSize: "1rem"
      },
      ".btn-icon": {
        paddingLeft: "0",
        paddingRight: "0",
        width: "var(--btn-height)",
        minWidth: "var(--btn-height)",
        aspectRatio: "1 / 1"
      },
      ".btn-block": {
        width: "100%"
      },
      ".input": {
        width: "100%",
        display: "flex",
        alignItems: "center",
        borderRadius: "1rem",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--surface-border)",
        backgroundColor: "var(--surface-input)",
        color: "var(--text-primary)",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        minHeight: "2.75rem",
        lineHeight: "1.5rem",
        fontSize: "0.95rem",
        boxShadow: "var(--shadow-input)",
        transition: "box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease",
        "&:focus-visible": {
          outline: "2px solid var(--color-primary-ring)",
          outlineOffset: "2px",
          borderColor: "var(--color-primary)",
          boxShadow: "var(--shadow-input-focus)"
        },
        "&::placeholder": {
          color: "var(--text-muted)"
        },
        "&:disabled": {
          opacity: "0.6",
          cursor: "not-allowed"
        }
      },
      ".select": {
        width: "100%",
        borderRadius: "1rem",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--surface-border)",
        backgroundColor: "var(--surface-input)",
        color: "var(--text-primary)",
        paddingLeft: "1rem",
        paddingRight: "2.25rem",
        minHeight: "2.75rem",
        lineHeight: "1.5rem",
        fontSize: "0.95rem",
        boxShadow: "var(--shadow-input)",
        backgroundImage:
          "linear-gradient(45deg, transparent 50%, var(--text-muted) 50%), linear-gradient(135deg, var(--text-muted) 50%, transparent 50%)",
        backgroundPosition:
          "calc(100% - 1.15rem) calc(50% - 0.35rem), calc(100% - 0.75rem) calc(50% - 0.35rem)",
        backgroundSize: "0.5rem 0.5rem, 0.5rem 0.5rem",
        backgroundRepeat: "no-repeat",
        appearance: "none",
        transition: "box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease",
        "&:focus-visible": {
          outline: "2px solid var(--color-primary-ring)",
          outlineOffset: "2px",
          borderColor: "var(--color-primary)",
          boxShadow: "var(--shadow-input-focus)"
        },
        "&:disabled": {
          opacity: "0.6",
          cursor: "not-allowed"
        }
      },
      ".input-ghost": {
        backgroundColor: "transparent",
        boxShadow: "none"
      },
      ".input-bordered": {
        borderColor: "var(--surface-border-strong)"
      },
      ".card": {
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--rounded-box)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--surface-border)",
        backgroundColor: "var(--surface-card)",
        boxShadow: "var(--shadow-card)",
        transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
        overflow: "hidden"
      },
      ".card-hover": {
        borderColor: "var(--surface-border-strong)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "var(--shadow-card-hover)",
          borderColor: "var(--color-primary)",
          backgroundColor: "var(--surface-card-hover)"
        }
      },
      ".card-body": {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.75rem"
      },
      ".card-title": {
        fontSize: "1.125rem",
        lineHeight: "1.75rem",
        fontWeight: "600",
        color: "var(--text-primary)"
      },
      ".card-subtitle": {
        fontSize: "0.95rem",
        color: "var(--text-muted)"
      },
      ".card-actions": {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginTop: "1rem"
      },
      ".badge": {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        paddingLeft: "0.75rem",
        paddingRight: "0.75rem",
        paddingTop: "0.25rem",
        paddingBottom: "0.25rem",
        fontWeight: "600",
        fontSize: "0.75rem",
        lineHeight: "1rem",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "transparent",
        backgroundColor: "var(--surface-muted)",
        color: "var(--text-muted-strong)",
        whiteSpace: "nowrap"
      },
      ".badge-primary": {
        backgroundColor: "var(--color-primary)",
        borderColor: "var(--color-primary)",
        color: "var(--color-primary-content)"
      },
      ".badge-secondary": {
        backgroundColor: "var(--color-secondary)",
        borderColor: "var(--color-secondary)",
        color: "var(--color-secondary-content)"
      },
      ".badge-accent": {
        backgroundColor: "var(--color-accent)",
        borderColor: "var(--color-accent)",
        color: "var(--color-accent-content)"
      },
      ".badge-success": {
        backgroundColor: "var(--color-success)",
        borderColor: "var(--color-success)",
        color: "var(--color-success-content)"
      },
      ".badge-warning": {
        backgroundColor: "var(--color-warning)",
        borderColor: "var(--color-warning)",
        color: "var(--color-warning-content)"
      },
      ".badge-error": {
        backgroundColor: "var(--color-error)",
        borderColor: "var(--color-error)",
        color: "var(--color-error-content)"
      },
      ".badge-outline": {
        backgroundColor: "transparent",
        borderColor: "var(--surface-border-strong)",
        color: "var(--color-neutral)"
      },
      ".tabs": {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem",
        borderRadius: "9999px",
        backgroundColor: "var(--surface-muted)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--surface-border)"
      },
      ".tab": {
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.5rem 1rem",
        borderRadius: "9999px",
        fontSize: "0.9rem",
        fontWeight: "600",
        color: "var(--text-muted)",
        transition: "color 150ms ease, background-color 150ms ease",
        cursor: "pointer"
      },
      ".tab.tab-active": {
        backgroundColor: "var(--surface-card)",
        color: "var(--text-primary)",
        boxShadow: "0 10px 30px -20px rgba(15, 23, 42, 0.45)"
      },
      ".tab:focus-visible": {
        outline: "2px solid var(--color-primary-ring)",
        outlineOffset: "2px"
      },
      ".tabs-boxed": {
        borderRadius: "9999px"
      },
      ".progress": {
        width: "100%",
        height: "0.75rem",
        borderRadius: "9999px",
        overflow: "hidden",
        backgroundColor: "var(--surface-muted)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--surface-border)"
      }
    });

    addUtilities({
      ".progress-primary": {
        "&::-webkit-progress-value": {
          backgroundColor: "var(--color-primary)"
        },
        "&::-moz-progress-bar": {
          backgroundColor: "var(--color-primary)"
        },
        "&::progress-value": {
          backgroundColor: "var(--color-primary)"
        }
      },
      ".progress-secondary": {
        "&::-webkit-progress-value": {
          backgroundColor: "var(--color-secondary)"
        },
        "&::-moz-progress-bar": {
          backgroundColor: "var(--color-secondary)"
        },
        "&::progress-value": {
          backgroundColor: "var(--color-secondary)"
        }
      }
    });
  },
  {
    theme: {
      extend: {}
    }
  }
);
