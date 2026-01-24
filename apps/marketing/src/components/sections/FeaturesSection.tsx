"use client";

import { FeatureCard } from "../ui/FeatureCard";
import { motion } from "framer-motion";

const features = [
  {
    icon: "🔒",
    title: "True Isolation",
    description: "Each store gets its own dedicated PostgreSQL database. No shared data, no security risks.",
    color: "primary" as const
  },
  {
    icon: "⚡",
    title: "Instant Provisioning",
    description: "Automated infrastructure setup. From signup to live store in seconds.",
    color: "secondary" as const
  },
  {
    icon: "💰",
    title: "Scale-to-Zero Costs",
    description: "Infrastructure automatically scales to zero when idle. Save 60% on hosting costs.",
    color: "success" as const
  },
  {
    icon: "🌍",
    title: "Global Edge Network",
    description: "Storefronts served from Cloudflare's global edge network. < 1s load times worldwide.",
    color: "warning" as const
  },
  {
    icon: "🔧",
    title: "Built on MedusaJS 2.0",
    description: "Full-featured store API with products, orders, customers, and payments out of the box.",
    color: "primary" as const
  },
  {
    icon: "🎨",
    title: "Custom Domains & SSL",
    description: "Automatic SSL certificate provisioning for custom domains. Setup in minutes.",
    color: "secondary" as const
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 bg-default-50/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Everything You Need to Scale</h2>
          <p className="text-xl text-default-500">
            Enterprise-grade infrastructure, simplified for everyone.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
              }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
