"use client";

import { CTASection } from "../components/sections/cta-section";
import { FAQSection } from "../components/sections/faq-section";
import { FeaturesSection } from "../components/sections/features-section";
import { Footer } from "../components/sections/footer";
import { HeroSection } from "../components/sections/hero-section";
import { HowItWorksSection } from "../components/sections/how-it-works-section";
import { PricingSection } from "../components/sections/pricing-section";
import { TechSpecsSection } from "../components/sections/tech-specs-section";
import { TestimonialsSection } from "../components/sections/testimonials-section";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <TechSpecsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
