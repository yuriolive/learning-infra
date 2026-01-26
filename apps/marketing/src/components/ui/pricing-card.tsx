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
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className={popular ? "scale-105 z-10" : ""}
    >
      <Card
        className={`
          relative h-full
          ${
            popular
              ? "border-2 border-primary shadow-2xl shadow-primary-500/20"
              : "border border-default-200"
          }
          backdrop-blur-sm bg-background/95
          hover:shadow-xl transition-all duration-300
        `}
      >
        {/* Popular badge */}
        {popular && (
          <Chip
            color="primary"
            variant="solid"
            className="absolute -top-3 left-1/2 -translate-x-1/2 font-semibold z-20"
          >
            Most Popular
          </Chip>
        )}

        <CardHeader className="flex-col items-start gap-2 pt-8">
          <h3 className="text-2xl font-bold">{name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold">${price}</span>
            <span className="text-default-400">/{period}</span>
          </div>
        </CardHeader>

        <Divider />

        <CardBody className="gap-3 py-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Chip
                size="sm"
                variant="flat"
                color="success"
                className="min-w-0 h-6 px-0 justify-center"
              >
                ✓
              </Chip>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </CardBody>

        <CardFooter>
          <Button
            fullWidth
            size="lg"
            color={popular ? "primary" : "default"}
            variant={popular ? "solid" : "bordered"}
            className="font-semibold"
            onPress={() => router.push(`/signup?plan=${name.toLowerCase()}`)}
          >
            {cta}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
