"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
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
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[100%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[100%] bg-primary/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        </div>

        {/* Text Content */}
        <div className="flex-1 p-8 md:p-16 lg:p-24 z-20 space-y-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-foreground">
              <span className="block">{title}</span>
            </h1>
            <p className="text-xl md:text-2xl text-default-600 max-w-xl leading-relaxed font-medium">
              {subtitle}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 pt-4"
          >
            <Button
              as={Link}
              href="/collections/jewelry"
              color="primary"
              size="lg"
              variant="shadow"
              className="font-bold text-lg px-8 py-6 h-auto hover:translate-y-[-2px] transition-all"
            >
              Explore Collection
            </Button>
            <Button
              as={Link}
              href="/about"
              variant="bordered"
              size="lg"
              className="font-bold text-lg px-8 py-6 h-auto border-2 hover:bg-foreground/5 transition-all"
            >
              Our Story
            </Button>
          </motion.div>
        </div>

        {/* Image/Visual Content */}
        <div className="flex-1 w-full h-[400px] md:h-full relative overflow-hidden group">
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/60 to-transparent md:block hidden" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent md:hidden block" />

          <motion.div
            animate={{
              y: [0, -15, 0],
              rotate: [0, 1, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-full h-full"
          >
            <Image
              src={backgroundImage}
              alt={title}
              fill
              priority
              className="object-cover scale-110 group-hover:scale-115 transition-transform duration-1000 ease-out"
            />
          </motion.div>

          {/* Accent Glow */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/30 blur-[100px] opacity-50 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
