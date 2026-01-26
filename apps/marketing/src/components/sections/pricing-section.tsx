"use client";

import { Switch, Chip, cn } from "@heroui/react";
import { useState } from "react";

import { PricingCard } from "../ui/pricing-card";

export const PricingSection = () => {
  const [period, setPeriod] = useState<"month" | "year">("month");

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-default-500 mb-8">
            Start for free, scale as you grow.
          </p>

          <div className="flex items-center justify-center gap-4">
            <span
              className={cn(
                "text-sm font-medium",
                period === "month" ? "text-foreground" : "text-default-400",
              )}
            >
              Monthly
            </span>
            <Switch
              isSelected={period === "year"}
              onValueChange={(checked) => setPeriod(checked ? "year" : "month")}
              color="primary"
            />
            <span
              className={cn(
                "text-sm font-medium",
                period === "year" ? "text-foreground" : "text-default-400",
              )}
            >
              Yearly
            </span>
            <Chip size="sm" color="success" variant="flat" className="ml-2">
              Save 20%
            </Chip>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          <PricingCard
            name="Free"
            price={0}
            period={period}
            features={[
              "100 products",
              "1,000 orders/month",
              "Community support",
              "All core features",
              "Scale-to-zero infrastructure",
            ]}
            cta="Start Free"
            popular={true}
          />
          <PricingCard
            name="Starter"
            price={period === "year" ? 23 : 29}
            period={period}
            features={[
              "1,000 products",
              "Unlimited orders",
              "Email support",
              "Custom domain",
              "Advanced analytics",
            ]}
            cta="Start Trial"
          />
          <PricingCard
            name="Professional"
            price={period === "year" ? 79 : 99}
            period={period}
            features={[
              "Unlimited products",
              "Unlimited orders",
              "Priority support",
              "Dedicated infrastructure",
              "Multiple staff accounts",
              "API access",
            ]}
            cta="Contact Sales"
          />
        </div>
      </div>
    </section>
  );
};
