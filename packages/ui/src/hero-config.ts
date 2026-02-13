export const MINT_GREEN_PRIMARY = {
  DEFAULT: "var(--primary-color, #34D399)",
  foreground: "var(--primary-color-foreground, #000000)",
  50: "var(--primary-color-50, #ECFDF5)",
  100: "var(--primary-color-100, #D1FAE5)",
  200: "var(--primary-color-200, #A7F3D0)",
  300: "var(--primary-color-300, #6EE7B7)",
  400: "var(--primary-color-400, #34D399)",
  500: "var(--primary-color-500, #10B981)",
  600: "var(--primary-color-600, #059669)",
  700: "var(--primary-color-700, #047857)",
  800: "var(--primary-color-800, #065F46)",
  900: "var(--primary-color-900, #064E3B)",
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
