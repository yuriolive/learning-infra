"use client";

import { TestimonialCard } from "../ui/testimonial-card";

const testimonials = [
  {
    quote:
      "Vendin saved us months of dev time. We launched our multi-vendor marketplace in weeks instead of months.",
    name: "Sarah Chen",
    role: "CTO",
    company: "FashionHub",
    rating: 5,
  },
  {
    quote:
      "The isolated infrastructure is a game changer. Our enterprise clients require strict data separation, and Vendin delivers.",
    name: "Marcus Rodriguez",
    role: "Lead Architect",
    company: "EnterpriseComm",
    rating: 5,
  },
  {
    quote:
      "Scale-to-zero pricing allows us to host hundreds of demo stores for pennies. Incredible value.",
    name: "Emily Watson",
    role: "Product Manager",
    company: "AgencyFlow",
    rating: 5,
  },
];

import { SectionHeader } from "../ui/section-header";

export const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-default-50">
      <div className="container mx-auto px-6">
        <SectionHeader
          title="Trusted by Developers"
          description="Join thousands of developers building the future of commerce."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
};
