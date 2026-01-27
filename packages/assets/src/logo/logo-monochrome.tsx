import * as React from "react";

import { LogoBase } from "./logo-base";
import { LOGO_PETALS_PATH } from "./paths";

import type { LogoProperties } from "./types";

export const LogoMonochrome = (properties: LogoProperties) => {
  return (
    <LogoBase {...properties}>
      <circle cx="150" cy="150" r="150" fill="white" />
      <path id="petals" fill="black" d={LOGO_PETALS_PATH} />
    </LogoBase>
  );
};
