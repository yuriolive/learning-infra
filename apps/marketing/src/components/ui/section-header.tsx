"use client";

import { cn } from "@heroui/react";

interface SectionHeaderProperties {
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export const SectionHeader = ({
  title,
  description,
  align = "center",
  className = "mb-16",
  titleClassName = "",
  descriptionClassName = "",
}: SectionHeaderProperties) => {
  const alignmentClass =
    align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={cn("max-w-3xl", alignmentClass, className)}>
      <h2
        className={cn("text-4xl font-bold mb-4 tracking-tight", titleClassName)}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("text-xl text-default-500", descriptionClassName)}>
          {description}
        </p>
      )}
    </div>
  );
};
