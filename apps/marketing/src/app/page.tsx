"use client";

import { HeroSection } from "../components/sections/HeroSection";
import { FeaturesSection } from "../components/sections/FeaturesSection";
import { HowItWorksSection } from "../components/sections/HowItWorksSection";
import { PricingSection } from "../components/sections/PricingSection";
import { TestimonialsSection } from "../components/sections/TestimonialsSection";
import { TechSpecsSection } from "../components/sections/TechSpecsSection";
import { FAQSection } from "../components/sections/FAQSection";
import { CTASection } from "../components/sections/CTASection";
import { Footer } from "../components/sections/Footer";

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
