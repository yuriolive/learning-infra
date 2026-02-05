"use client";

import Link from "next/link";
import { Button } from "@heroui/react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  primaryColor?: string;
}

export function SectionHeader({
  title,
  subtitle,
  viewAllHref,
  primaryColor = "#000000",
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-default-500">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Button
          as={Link}
          href={viewAllHref}
          variant="light"
          style={{ color: primaryColor }}
          className="font-semibold"
        >
          View All →
        </Button>
      )}
    </div>
  );
}
