import { heroui } from "@heroui/react";

const MINT_GREEN_PRIMARY = {
  DEFAULT: "#34D399", // Mint Green
  foreground: "#000000",
  50: "#ECFDF5",
  100: "#D1FAE5",
  200: "#A7F3D0",
  300: "#6EE7B7",
  400: "#34D399",
  500: "#10B981",
  600: "#059669",
  700: "#047857",
  800: "#065F46",
  900: "#064E3B",
};

const FOCUS_COLOR = "#34D399";

export default heroui({
  themes: {
    dark: {
      colors: {
        background: "#0A0A0A", // Deep Black
        foreground: "#FFFFFF",
        primary: MINT_GREEN_PRIMARY,
        focus: FOCUS_COLOR,
      },
      layout: {
        disabledOpacity: "0.3",
        radius: {
          small: "4px",
          medium: "6px",
          large: "8px",
        },
        borderWidth: {
          small: "1px",
          medium: "2px",
          large: "3px",
        },
      },
    },
    light: {
      colors: {
        primary: MINT_GREEN_PRIMARY,
        focus: FOCUS_COLOR,
      },
    },
  },
});
