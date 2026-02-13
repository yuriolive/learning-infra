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
  backgroundImage = "https://images.unsplash.com/photo-1441986300917?q=80&w=1200&h=600&auto=format&fit=crop",
}: HeroSectionProperties) {
  return (
    <section className="relative w-full rounded-[2.5rem] overflow-hidden bg-background border border-default-100/50 shadow-2xl">
      <div className="relative flex flex-col md:flex-row items-center min-h-[600px] overflow-hidden">
        {/* Text Content */}
        <div className="flex-1 p-8 md:p-16 lg:p-24 z-20 space-y-10">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-foreground">
              <span className="block">{title}</span>
            </h1>
            <p className="text-xl md:text-2xl text-default-600 max-w-xl leading-relaxed font-medium">
              {subtitle}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 pt-4">
            <Button
              as={Link}
              href="/collections/jewelry"
              color="primary"
              size="lg"
              variant="shadow"
              className="font-bold text-lg px-8 py-6 h-auto"
            >
              Explore Collection
            </Button>
            <Button
              as={Link}
              href="/about"
              variant="bordered"
              size="lg"
              className="font-bold text-lg px-8 py-6 h-auto border-2"
            >
              Our Story
            </Button>
          </div>
        </div>

        {/* Image/Visual Content */}
        <div className="flex-1 w-full h-[400px] md:h-full relative overflow-hidden group">
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/60 to-transparent md:block hidden" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent md:hidden block" />

          <div className="w-full h-full p-0">
            <Image
              src={backgroundImage}
              alt={title}
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
