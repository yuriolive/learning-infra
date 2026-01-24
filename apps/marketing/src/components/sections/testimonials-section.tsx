"use client";

import { motion } from "framer-motion";

import { TestimonialCard } from "../ui/testimonial-card";

const testimonials = [
  {
    quote:
      "We launched our store in under an hour. The dedicated infrastructure gives us peace of mind about security and performance.",
    name: "Sarah Chen",
    role: "Founder",
    company: "ModernGoods",
    rating: 5,
  },
  {
    quote:
      "Scale-to-zero has cut our hosting costs by 70%. We only pay for what we actually use, not idle resources.",
    name: "Marcus Rodriguez",
    role: "CTO",
    company: "EcoMarket",
    rating: 5,
  },
  {
    quote:
      "The provisioning speed is incredible. Our merchants can go from signup to first sale in the same day.",
    name: "Emily Watson",
    role: "Operations",
    company: "StoreBuilder",
    rating: 5,
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Trusted by Merchants</h2>
          <p className="text-xl text-default-500">
            Join thousands of successful stores running on Vendin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <TestimonialCard {...t} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
