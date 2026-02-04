import { Inter } from "next/font/google";

import { Navbar } from "../components/sections/navbar";

import "./globals.css";
import { Providers } from "./providers";

import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vendin - The Shopify for the AI Era",
  description:
    "First full agentic e-commerce platform. Autonomous AI agents run your entire store.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
