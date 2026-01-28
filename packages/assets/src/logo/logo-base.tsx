import * as React from "react";

import type { LogoProperties } from "./types";

export interface LogoBaseProperties extends LogoProperties {
  children: React.ReactNode;
}

export const LogoBase = ({
  size = 32,
  className,
  children,
  ...properties
}: LogoBaseProperties) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...properties}
    >
      {children}
    </svg>
  );
};
