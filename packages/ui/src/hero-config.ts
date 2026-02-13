export const MINT_GREEN_PRIMARY = {
  DEFAULT: "var(--primary-color)",
  foreground: "var(--primary-color-foreground)",
  50: "var(--primary-color-50)",
  100: "var(--primary-color-100)",
  200: "var(--primary-color-200)",
  300: "var(--primary-color-300)",
  400: "var(--primary-color-400)",
  500: "var(--primary-color-500)",
  600: "var(--primary-color-600)",
  700: "var(--primary-color-700)",
  800: "var(--primary-color-800)",
  900: "var(--primary-color-900)",
};

export const FOCUS_COLOR = "#34D399";

export const sharedHeroUIConfig = {
  themes: {
    dark: {
      colors: {
        background: "#0A0A0A", // Deep Black matching marketing
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
      layout: {
        radius: {
          small: "4px",
          medium: "6px",
          large: "8px",
        },
      },
    },
  },
};
