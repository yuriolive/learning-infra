"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export const CTASection = () => {
  const router = useRouter();

  return (
    <section className="py-24 bg-gradient-to-br from-primary-600 to-secondary-600 text-white">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Launch Your Store?
        </h2>
        <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
          Join 1,000+ merchants selling with Vendin. No credit card required.
        </p>

        <Button
          size="lg"
          className="bg-white text-primary font-bold px-8 h-14"
          onPress={() => router.push('/signup')}
        >
          Start Free Trial
        </Button>

        <p className="text-sm text-white/60 mt-6">
          Free forever tier available • Cancel anytime
        </p>
      </div>
    </section>
  );
};
