"use client";

import { Card, CardBody, CardFooter, Avatar } from "@heroui/react";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  company: string;
  rating?: number;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  name,
  role,
  company,
  rating = 5,
}) => {
  return (
    <Card className="h-full p-6 backdrop-blur-sm bg-default-50/50 border border-default-200/50">
      <CardBody>
        <div className="flex gap-1 mb-4">
          {Array.from({ length: rating }).map((_, index) => (
            <Star key={index} size={16} className="fill-warning text-warning" />
          ))}
        </div>
        <blockquote className="text-lg leading-relaxed text-default-700">
          &quot;{quote}&quot;
        </blockquote>
      </CardBody>
      <CardFooter className="gap-4">
        <Avatar
          name={name}
          className="bg-gradient-to-br from-primary-100 to-secondary-100 text-primary-700"
        />
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-small text-default-500">
            {role} @ {company}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
