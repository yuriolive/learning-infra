"use client";

import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";

interface HeroSectionProperties {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  backgroundImage?: string;
}

export function HeroSection({
  title,
  subtitle,
  backgroundImage = "https://images.unsplash.com/photo-1494708001911-679f5d15a946?q=80&w=1200&h=600&auto=format&fit=crop",
}: HeroSectionProperties) {
  return (
    <section className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden bg-black/40">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage}
          alt="Hero Background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center text-white space-y-8">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight max-w-4xl">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-gray-200 max-w-2xl font-medium leading-relaxed">
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-6 pt-4">
          <Button
            as={Link}
            href="/collections/jewelry"
            color="primary"
            size="lg"
            variant="shadow"
            className="font-bold text-lg px-10 py-6 h-auto"
          >
            Explore Collection
          </Button>
          <Button
            as={Link}
            href="/about"
            variant="bordered"
            size="lg"
            className="font-bold text-lg px-10 py-6 h-auto border-2 text-white border-white hover:bg-white/10"
          >
            Our Story
          </Button>
        </div>
      </div>
    </section>
  );
}
