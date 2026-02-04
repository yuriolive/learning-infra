"use client";

import { ArrowRight } from "lucide-react";

import { SectionHeader } from "../ui/section-header";
import { StepCard } from "../ui/step-card";

export const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-default-50">
      <div className="container mx-auto px-6">
        <SectionHeader
          title="How It Works"
          description="Get your store running in three simple steps."
        />

        <div className="flex flex-col lg:flex-row justify-center items-center gap-8 relative">
          <StepCard
            number={1}
            icon="📝"
            title="Create Account"
            description="Enter your email and store name. Takes 30 seconds."
          />

          <div className="hidden lg:flex text-default-300">
            <ArrowRight size={32} />
          </div>

          <StepCard
            number={2}
            icon="⚙️"
            title="We Provision"
            description="Dedicated database, compute, and dashboard created."
            badge="< 2 min"
          />

          <div className="hidden lg:flex text-default-300">
            <ArrowRight size={32} />
          </div>

          <StepCard
            number={3}
            icon="🤖"
            title="Agents Take Over"
            description="Your AI workforce starts managing products, orders, and customer support instantly."
          />
        </div>
      </div>
    </section>
  );
};
