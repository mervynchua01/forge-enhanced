import { createTheme } from "@mui/material";

// ---------------------------------------------------------------------------
// Forge brand constants
// ---------------------------------------------------------------------------
// The violet → fuchsia gradient is the signature of AI-driven actions
// (generate, confirm, primary CTAs). Gradients are not palette colors, so they
// live here and are imported where needed (e.g. gradient headline text).
export const FORGE_GRADIENT =
  "linear-gradient(135deg, #7c3aed 0%, #a855f7 55%, #d946ef 100%)";
export const FORGE_GRADIENT_HOVER =
  "linear-gradient(135deg, #6d28d9 0%, #9333ea 55%, #c026d3 100%)";

// sx helper to paint text with the brand gradient.
export const gradientTextSx = {
  background: FORGE_GRADIENT,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ---------------------------------------------------------------------------
// Semantic color tokens
// ---------------------------------------------------------------------------
// Status / priority / type chips read these via sx paths like
// "status.inProgressBg". Each token is defined per color scheme so components
// never need to branch on palette.mode — the CSS variables flip automatically.
const lightTokens = {
  status: {
    todoFg: "#475569",
    todoBg: "#f1f5f9",
    inProgressFg: "#1d4ed8",
    inProgressBg: "#dbeafe",
    inReviewFg: "#b45309",
    inReviewBg: "#fef3c7",
    doneFg: "#15803d",
    doneBg: "#dcfce7",
  },
  priority: {
    urgentFg: "#b91c1c",
    urgentBg: "#fee2e2",
    highFg: "#c2410c",
    highBg: "#ffedd5",
    mediumFg: "#a16207",
    mediumBg: "#fef9c3",
    lowFg: "#1d4ed8",
    lowBg: "#dbeafe",
    noneFg: "#64748b",
    noneBg: "#f1f5f9",
  },
  tasktype: {
    featureFg: "#7c3aed",
    featureBg: "#ede9fe",
    bugFg: "#b91c1c",
    bugBg: "#fee2e2",
    improvementFg: "#0f766e",
    improvementBg: "#ccfbf1",
  },
  forge: {
    glow: "rgba(124, 58, 237, 0.28)",
    glowSoft: "rgba(124, 58, 237, 0.12)",
    columnBg: "#f4f5f7",
    columnBgOver: "#ece9f6",
  },
};

const darkTokens = {
  status: {
    todoFg: "#94a3b8",
    todoBg: "rgba(148, 163, 184, 0.16)",
    inProgressFg: "#93c5fd",
    inProgressBg: "rgba(59, 130, 246, 0.18)",
    inReviewFg: "#fcd34d",
    inReviewBg: "rgba(245, 158, 11, 0.16)",
    doneFg: "#86efac",
    doneBg: "rgba(34, 197, 94, 0.16)",
  },
  priority: {
    urgentFg: "#fca5a5",
    urgentBg: "rgba(239, 68, 68, 0.18)",
    highFg: "#fdba74",
    highBg: "rgba(249, 115, 22, 0.18)",
    mediumFg: "#fde047",
    mediumBg: "rgba(234, 179, 8, 0.16)",
    lowFg: "#93c5fd",
    lowBg: "rgba(59, 130, 246, 0.16)",
    noneFg: "#94a3b8",
    noneBg: "rgba(148, 163, 184, 0.14)",
  },
  tasktype: {
    featureFg: "#c4b5fd",
    featureBg: "rgba(139, 92, 246, 0.18)",
    bugFg: "#fca5a5",
    bugBg: "rgba(239, 68, 68, 0.18)",
    improvementFg: "#5eead4",
    improvementBg: "rgba(20, 184, 166, 0.16)",
  },
  forge: {
    glow: "rgba(168, 85, 247, 0.40)",
    glowSoft: "rgba(168, 85, 247, 0.16)",
    columnBg: "rgba(30, 41, 59, 0.55)",
    columnBgOver: "rgba(168, 85, 247, 0.14)",
  },
};

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#7c3aed",
          dark: "#6d28d9",
          light: "#a855f7",
        },
        secondary: {
          main: "#d946ef",
        },
        background: {
          default: "#f8fafc",
          paper: "#ffffff",
        },
        divider: "#e2e8f0",
        ...lightTokens,
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#a855f7",
          dark: "#9333ea",
          light: "#c4b5fd",
        },
        secondary: {
          main: "#e879f9",
        },
        background: {
          default: "#0f172a",
          paper: "#1e293b",
        },
        divider: "rgba(148, 163, 184, 0.20)",
        text: {
          primary: "#f8fafc",
          secondary: "#94a3b8",
        },
        ...darkTokens,
      },
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "sans-serif",
    ].join(","),
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        containedPrimary: ({ theme }) => ({
          background: FORGE_GRADIENT,
          transition: "box-shadow 0.2s ease, transform 0.15s ease",
          "&:hover": {
            background: FORGE_GRADIENT_HOVER,
            boxShadow: `0 4px 18px ${theme.vars.palette.forge.glow}`,
          },
          "&:active": {
            transform: "translateY(1px)",
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: "none",
          border: `1px solid ${theme.vars.palette.divider}`,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 16,
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1,
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${theme.vars.palette.forge.glowSoft}`,
          },
        }),
      },
    },
  },
});
