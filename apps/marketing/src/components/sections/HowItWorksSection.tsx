"use client";

import { StepCard } from "../ui/StepCard";
import { ArrowRight } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-default-500 max-w-2xl mx-auto">
            Get your store running in three simple steps.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-start gap-8 relative">

          <StepCard
            number={1}
            icon="📝"
            title="Create Your Account"
            description="Enter your email and store name. Takes 30 seconds."
          />

          <div className="hidden md:flex pt-12 text-default-300">
            <ArrowRight size={32} />
          </div>

          <StepCard
            number={2}
            icon="⚙️"
            title="We Build Your Infrastructure"
            description="Dedicated database, compute instance, and admin dashboard automatically created."
            badge="< 2 minutes"
          />

          <div className="hidden md:flex pt-12 text-default-300">
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
