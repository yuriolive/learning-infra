"use client";

import { Button, Card, CardBody } from "@heroui/react";
import Link from "next/link";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  primaryColor?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  backgroundImage?: string;
}

export function HeroSection({
  title,
  subtitle,
  primaryColor = "#000000",
  ctaText = "Shop Now",
  ctaHref = "/products",
  secondaryCtaText = "Learn More",
  secondaryCtaHref = "/about",
  backgroundImage,
}: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative flex flex-col md:flex-row items-center gap-8 py-16 px-4 sm:px-6 lg:px-8">
        {/* Text Content */}
        <div className="flex-1 space-y-6 z-10">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="block">{title}</span>
            </h1>
            <p className="text-xl text-default-500 max-w-lg leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              as={Link}
              href={ctaHref}
              size="lg"
              style={{ backgroundColor: primaryColor, color: "white" }}
              className="font-semibold"
            >
              {ctaText}
            </Button>
            <Button
              as={Link}
              href={secondaryCtaHref}
              size="lg"
              variant="bordered"
              className="font-semibold"
            >
              {secondaryCtaText}
            </Button>
          </div>
        </div>

        {/* Image/Visual Content */}
        <div className="flex-1 w-full">
          <Card className="border-none bg-default-100 shadow-lg">
            <CardBody className="p-0">
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-default-100 to-default-200 text-default-400 relative overflow-hidden">
                {backgroundImage ? (
                  <img
                    src={backgroundImage}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-6xl">🛍️</div>
                    <span className="text-lg font-medium">Featured Collection</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
