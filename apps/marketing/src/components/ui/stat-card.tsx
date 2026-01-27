"use client";

import { Card, CardBody } from "@heroui/react";

interface StatCardProperties {
  label: string;
  value: string;
  trend?: string;
  trendType?: "success" | "danger" | "default";
}

export const StatCard = ({
  label,
  value,
  trend,
  trendType = "success",
}: StatCardProperties) => {
  const trendColorClass =
    trendType === "success"
      ? "text-success"
      : trendType === "danger"
        ? "text-danger"
        : "text-default-400";

  return (
    <Card className="shadow-sm border border-default-200/50">
      <CardBody className="gap-2">
        <span className="text-default-500 text-xs font-semibold uppercase">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            <span className={`text-xs ${trendColorClass} font-medium`}>
              {trend}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
