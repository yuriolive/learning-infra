import * as React from "react";

import { LogoBase } from "./logo-base";
import { LOGO_PETALS_PATH } from "./paths";

import type { LogoProperties } from "./types";

export const LogoSymbol = (properties: LogoProperties) => {
  return (
    <LogoBase {...properties}>
      <path fill="currentColor" d={LOGO_PETALS_PATH} />
    </LogoBase>
  );
};
