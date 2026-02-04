"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export const CTASection = () => {
  const router = useRouter();

  return (
    <section className="py-24 relative overflow-hidden bg-foreground text-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-50"></div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-none">
          Ready to scale your <br />
          commerce business?
        </h2>
        <p className="text-xl text-default-400 max-w-2xl mx-auto mb-12">
          Join the next generation of merchants running on autonomous
          infrastructure. AI-managed, human-owned.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Button
            size="lg"
            color="primary"
            variant="shadow"
            className="font-bold px-12 h-16 text-xl"
            onPress={() => {
              router.push("/signup");
            }}
          >
            Get Started Now
          </Button>
        </div>

        <p className="text-small text-default-400 mt-10 font-medium">
          Free forever tier available • 99.9% Uptime SLA • Instant setup
        </p>
      </div>
    </section>
  );
};
