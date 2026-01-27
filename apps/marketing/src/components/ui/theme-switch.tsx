"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const unsubscribe = () => {};
const subscribe = () => unsubscribe;
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const ThemeSwitch = () => {
  const isMounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { theme, setTheme } = useTheme();

  if (!isMounted) return <div className="p-2 w-10 h-10" />;

  return (
    <Button
      isIconOnly
      variant="light"
      onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-default-500 hover:text-primary transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </Button>
  );
};
