import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    light: {
      colors: {
        primary: {
          DEFAULT: "#3b82f6", // blue-500
          foreground: "#ffffff",
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
        },
        secondary: {
          DEFAULT: "#a855f7", // purple-500
          foreground: "#ffffff",
          50: "#faf5ff",
          100: "#f3e8ff",
          500: "#a855f7",
          600: "#9333ea",
        },
      },
    },
  },
});
