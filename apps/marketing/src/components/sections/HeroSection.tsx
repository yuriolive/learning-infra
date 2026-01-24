"use client";

import { Button, Chip } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { MockDashboard } from "../ui/MockDashboard";

export const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-background">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16">
          <Chip
            variant="flat"
            color="primary"
            className="mb-6"
            size="sm"
          >
            Provision in &lt; 2 minutes
          </Chip>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-8">
            Launch Your Store in <br />
            <span className="text-primary">Seconds</span>, Not Weeks
          </h1>

          <p className="text-xl text-default-500 max-w-2xl mb-10">
            Create a fully isolated e-commerce store with dedicated database and compute.
            No technical expertise required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              size="lg"
              color="primary"
              className="font-semibold px-8"
              endContent={<ArrowRight size={18} />}
              onPress={() => router.push('/signup')}
            >
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="bordered"
              onPress={() => {
                const element = document.getElementById('features');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative mx-auto max-w-6xl transform transition-all hover:scale-[1.01] duration-500">
           {/* Glow Effect behind dashboard */}
           <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-2xl opacity-20 animate-pulse"></div>
           <MockDashboard />
        </div>
      </div>
    </section>
  );
};
