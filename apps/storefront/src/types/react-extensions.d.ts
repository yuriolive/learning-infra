import "react";

declare module "react" {
  interface CSSProperties {
    "--primary-color"?: string;
    "--heroui-primary"?: string;
    "--heroui-primary-500"?: string;
  }
}
