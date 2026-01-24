"use client";

import { Card, CardHeader, CardBody, User } from "@heroui/react";
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
    <Card className="h-full border-default-200" shadow="sm">
      <CardHeader className="justify-between items-start px-6 pt-6 pb-0">
         <User
            name={name}
            description={`${role} @ ${company}`}
            avatarProps={{
                name: name,
                className: "bg-primary/10 text-primary"
            }}
         />
         <div className="flex gap-1">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} size={14} className="fill-warning text-warning" />
          ))}
        </div>
      </CardHeader>
      <CardBody className="px-6 py-6">
        <blockquote className="text-default-500 italic">
          &quot;{quote}&quot;
        </blockquote>
      </CardBody>
    </Card>
  );
};
