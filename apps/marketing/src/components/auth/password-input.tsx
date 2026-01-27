"use client";

import { Input } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProperties {
  label?: string;
  placeholder?: string;
}

export const PasswordInput = ({
  label = "Password",
  placeholder = "Enter your password",
}: PasswordInputProperties) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Input
      label={label}
      placeholder={placeholder}
      type={isVisible ? "text" : "password"}
      variant="bordered"
      endContent={
        <button
          className="focus:outline-none"
          type="button"
          onClick={toggleVisibility}
        >
          {isVisible ? (
            <EyeOff
              className="text-default-400 pointer-events-none"
              size={24}
            />
          ) : (
            <Eye className="text-default-400 pointer-events-none" size={24} />
          )}
        </button>
      }
    />
  );
};
