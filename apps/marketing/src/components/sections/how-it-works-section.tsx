"use client";

import { ArrowRight } from "lucide-react";

import { StepCard } from "../ui/step-card";

export const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-default-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-default-500 max-w-2xl mx-auto">
            Get your store running in three simple steps.
          </p>
        </div>

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
            icon="🚀"
            title="Start Selling"
            description="Access your admin dashboard, add products, and go live."
          />
        </div>
      </div>
    </section>
  );
};
