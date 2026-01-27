import * as React from "react";

import { LogoBase } from "./logo-base";
import { LOGO_PETALS_PATH } from "./paths";

import type { LogoProperties } from "./types";

export const LogoPrimary = (properties: LogoProperties) => {
  return (
    <LogoBase {...properties}>
      <circle
        cx="150"
        cy="150"
        r="150"
        fill="hsl(var(--heroui-primary, 158.11 64.37% 51.57%))"
      />
      <path fill="white" d={LOGO_PETALS_PATH} />
    </LogoBase>
  );
};

export { type LogoProperties } from "./types";
