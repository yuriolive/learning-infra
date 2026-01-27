import * as React from "react";

import { LOGO_PETALS_PATH } from "./paths";

import type { LogoProperties } from "./logo-primary";

export const LogoMonochrome = ({
  size = 32,
  className,
  ...properties
}: LogoProperties) => {
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
      <circle cx="150" cy="150" r="150" fill="white" />
      <path id="petals" fill="black" d={LOGO_PETALS_PATH} />
    </svg>
  );
};
