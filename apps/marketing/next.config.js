import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../../"),
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  // Ensure we can use lucide-react and other packages correctly if needed
  transpilePackages: [
    "@heroui/react",
    "@vendin/analytics",
    "@vendin/assets",
    "next-themes",
  ],
};

export default withNextIntl(nextConfig);
