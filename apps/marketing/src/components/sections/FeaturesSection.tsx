"use client";

import { FeatureCard } from "../ui/FeatureCard";
import { Lock, Zap, TrendingDown, Globe, Wrench, Palette } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "True Isolation",
    description: "Each store gets its own dedicated PostgreSQL database. No shared data, no security risks.",
  },
  {
    icon: Zap,
    title: "Instant Provisioning",
    description: "Automated infrastructure setup. From signup to live store in seconds.",
  },
  {
    icon: TrendingDown,
    title: "Scale-to-Zero Costs",
    description: "Infrastructure automatically scales to zero when idle. Save 60% on hosting costs.",
  },
  {
    icon: Globe,
    title: "Global Edge Network",
    description: "Storefronts served from Cloudflare's global edge network. < 1s load times worldwide.",
  },
  {
    icon: Wrench,
    title: "Built on MedusaJS 2.0",
    description: "Full-featured store API with products, orders, customers, and payments out of the box.",
  },
  {
    icon: Palette,
    title: "Custom Domains & SSL",
    description: "Automatic SSL certificate provisioning for custom domains. Setup in minutes.",
  }
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Everything You Need to Scale</h2>
          <p className="text-xl text-default-500">
            Enterprise-grade infrastructure, simplified for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={i} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
