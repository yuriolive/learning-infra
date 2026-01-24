"use client";

import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Divider } from "@heroui/react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface PricingCardProps {
  name: string;
  price: number;
  period: "month" | "year";
  features: string[];
  popular?: boolean;
  cta: string;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period,
  features,
  popular = false,
  cta,
}) => {
  const router = useRouter();

  return (
    <Card
      className={`h-full border-default-200 ${popular ? "border-primary border-2 shadow-lg" : "border"}`}
      shadow={popular ? "md" : "sm"}
    >
      <CardHeader className="flex-col items-start gap-2 pt-8 px-6 pb-0">
        <div className="flex justify-between w-full items-center">
            <h3 className="text-xl font-bold">{name}</h3>
            {popular && (
            <Chip color="primary" variant="solid" size="sm">
                Most Popular
            </Chip>
            )}
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-4xl font-bold">${price}</span>
          <span className="text-default-400">/{period}</span>
        </div>
        <p className="text-small text-default-500 mt-2">
            Perfect for {name === "Free" ? "starters" : name === "Starter" ? "growing businesses" : "large scale operations"}.
        </p>
      </CardHeader>

      <CardBody className="gap-4 py-8 px-6">
        <Divider className="mb-4" />
        <ul className="flex flex-col gap-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center text-success">
                 <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-sm text-default-600">{feature}</span>
            </li>
          ))}
        </ul>
      </CardBody>

      <CardFooter className="px-6 pb-8 pt-0">
        <Button
          fullWidth
          size="lg"
          color={popular ? "primary" : "default"}
          variant={popular ? "solid" : "bordered"}
          onPress={() => router.push(`/signup?plan=${name.toLowerCase()}`)}
        >
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
};
