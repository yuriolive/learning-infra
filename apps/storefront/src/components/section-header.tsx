"use client";

import { Button } from "@heroui/react";
import Link from "next/link";

interface SectionHeaderProperties {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
}

export function SectionHeader({
  title,
  subtitle,
  viewAllHref,
}: SectionHeaderProperties) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="space-y-1">
        <div className="h-1 w-12 rounded-full mb-2 bg-primary" />
        <h2 className="text-4xl font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="text-default-500 text-lg">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Button
          as={Link}
          href={viewAllHref}
          variant="light"
          color="primary"
          className="font-semibold"
        >
          View All →
        </Button>
      )}
    </div>
  );
}
