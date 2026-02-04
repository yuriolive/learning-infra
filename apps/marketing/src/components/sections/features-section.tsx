"use client";

import { Lock, Zap, TrendingDown, Globe, Wrench, Palette } from "lucide-react";

import { FeatureCard } from "../ui/feature-card";

const features = [
  {
    icon: Lock,
    title: "True Isolation",
    description:
      "Each store gets its own dedicated PostgreSQL database. No shared data, no security risks.",
  },
  {
    icon: Zap,
    title: "Instant Provisioning",
    description:
      "Automated infrastructure setup. From signup to live store in seconds.",
  },
  {
    icon: TrendingDown,
    title: "Scale-to-Zero Costs",
    description:
      "Infrastructure automatically scales to zero when idle. Save 60% on hosting costs.",
  },
  {
    icon: Globe,
    title: "Global Edge Network",
    description:
      "Storefronts served from Cloudflare's global edge network. < 1s load times worldwide.",
  },
  {
    icon: Wrench,
    title: "Autonomous AI Agents",
    description:
      "AI agents run your store operations 24/7 - from customer support to inventory management.",
  },
  {
    icon: Palette,
    title: "Custom Domains & SSL",
    description:
      "Automatic SSL certificate provisioning for custom domains. Setup in minutes.",
  },
];

import { SectionHeader } from "../ui/section-header";

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <SectionHeader
          title="Everything You Need to Scale"
          description="Enterprise-grade infrastructure, simplified for everyone."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
