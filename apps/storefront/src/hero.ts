import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    dark: {
      colors: {
        background: "#0A0A0A", // Deep Black matching marketing
        foreground: "#FFFFFF",
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
      layout: {
        radius: {
          small: "4px",
          medium: "6px",
          large: "8px",
        },
      },
    },
  },
});
