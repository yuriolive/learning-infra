"use client";

import { Card, CardHeader, CardBody, Chip } from "@heroui/react";

interface StepCardProps {
  number: number;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

export const StepCard: React.FC<StepCardProps> = ({
  number,
  icon,
  title,
  description,
  badge,
}) => {
  return (
    <Card className="flex-1 w-full min-w-[300px] border-default-200" shadow="sm">
      <CardHeader className="flex gap-3 px-6 pt-6 justify-between items-start">
        <div className="flex gap-4 items-center">
            <div className="w-12 h-12 text-2xl bg-default-100 rounded-lg flex items-center justify-center">
            {icon}
            </div>
            <div className="flex flex-col">
                <p className="text-small text-default-500 uppercase font-bold">Step {number}</p>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    {title}
                </h3>
            </div>
        </div>
        {badge && (
            <Chip size="sm" color="success" variant="flat">
            {badge}
            </Chip>
        )}
      </CardHeader>
      <CardBody className="px-6 pb-6">
        <p className="text-default-500">
          {description}
        </p>
      </CardBody>
    </Card>
  );
};
