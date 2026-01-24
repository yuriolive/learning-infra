"use client";

import { Card, CardHeader, CardBody } from "@heroui/react";
import type { ElementType } from "react";

interface FeatureCardProps {
  icon: ElementType;
  title: string;
  description: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
}) => {
  return (
    <Card className="h-full border-none bg-default-50/50 backdrop-blur-sm hover:bg-default-100/50 transition-colors" shadow="sm" isPressable>
      <CardHeader className="flex gap-3 px-6 pt-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon size={24} />
        </div>
        <div className="flex flex-col">
          <p className="text-md font-bold">{title}</p>
        </div>
      </CardHeader>
      <CardBody className="px-6 pb-6 pt-2">
        <p className="text-default-500 text-sm leading-relaxed">
          {description}
        </p>
      </CardBody>
    </Card>
  );
};
