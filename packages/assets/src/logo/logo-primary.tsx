import * as React from "react";

import { LOGO_PETALS_PATH } from "./paths";

export interface LogoProperties extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const LogoPrimary = ({
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
      <circle
        cx="150"
        cy="150"
        r="150"
        fill="hsl(var(--heroui-primary, 158.11 64.37% 51.57%))"
      />
      <path fill="white" d={LOGO_PETALS_PATH} />
    </svg>
  );
};
