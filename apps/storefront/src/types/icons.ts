import type React from "react";

export type IconComponent = (properties: {
  size?: number;
  className?: string;
  [key: string]: unknown;
}) => React.ReactNode;
