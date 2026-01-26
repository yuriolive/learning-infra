"use client";

import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Chip,
  Divider,
} from "@heroui/react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface PricingCardProperties {
  name: string;
  price: number;
  period: "month" | "year";
  features: string[];
  popular?: boolean;
  cta: string;
}

export const PricingCard: React.FC<PricingCardProperties> = ({
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
      className={`h-full border-default-200 transition-all duration-300 hover:translate-y-[-4px] ${
        popular
          ? "border-primary-500 shadow-[0_20px_50px_rgba(0,111,238,0.15)] ring-1 ring-primary-500/50"
          : "hover:border-default-400"
      }`}
      shadow={popular ? "lg" : "sm"}
    >
      <CardHeader className="flex-col items-start gap-2 pt-10 px-8 pb-0">
        <div className="flex justify-between w-full items-center mb-2">
          <h3
            className={`text-2xl font-black tracking-tight ${popular ? "text-primary" : "text-default-700"}`}
          >
            {name}
          </h3>
          {popular && (
            <Chip
              color="primary"
              variant="shadow"
              size="sm"
              className="font-bold uppercase tracking-wider"
            >
              Most Popular
            </Chip>
          )}
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-5xl font-black tracking-tighter">${price}</span>
          <span className="text-default-400 font-medium">/{period}</span>
        </div>
        <p className="text-sm text-default-500 mt-4 leading-relaxed font-medium">
          Perfect for{" "}
          {name === "Free"
            ? "early testing and enthusiasts"
            : name === "Starter"
              ? "growing modern businesses"
              : "demanding large scale operations"}
          .
        </p>
      </CardHeader>

      <CardBody className="gap-4 pb-10 pt-8 px-8">
        <Divider className="mb-6 opacity-50" />
        <ul className="flex flex-col gap-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-4">
              <div
                className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${popular ? "bg-primary/10 text-primary" : "bg-default-100 text-default-600"}`}
              >
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-sm text-default-600 font-medium leading-tight">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>

      <CardFooter className="px-8 pb-10 pt-0">
        <Button
          fullWidth
          size="lg"
          color={popular ? "primary" : "default"}
          variant={popular ? "shadow" : "bordered"}
          className="font-bold h-14 text-base"
          onPress={() => router.push(`/signup?plan=${name.toLowerCase()}`)}
        >
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
};
