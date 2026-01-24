"use client";

import {
  Button,
  Chip,
  AvatarGroup,
  Avatar,
  Card,
  CardBody,
} from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ElementType } from "react";

const Badge = () => (
  <div className="flex">
    <Chip
      variant="flat"
      color="primary"
      className="backdrop-blur-md bg-primary-50/50 pl-2"
    >
      <span className="mr-2">⚡</span> Provision in &lt; 2 minutes
    </Chip>
  </div>
);

const Headline = () => (
  <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
    Launch Your Store in{" "}
    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
      Seconds
    </span>
    , Not Weeks
  </h1>
);

const CTAs = ({
  onStart,
  onDemo,
}: {
  onStart: () => void;
  onDemo: () => void;
}) => (
  <div className="flex flex-wrap gap-4">
    <Button
      size="lg"
      color="primary"
      className="font-semibold px-8"
      endContent={<ArrowRight size={18} />}
      onPress={onStart}
    >
      Start Free Trial
    </Button>
    <Button
      size="lg"
      variant="bordered"
      startContent={<Play size={18} />}
      onPress={onDemo}
    >
      Watch Demo
    </Button>
  </div>
);

const SocialProof = () => (
  <div className="flex items-center gap-4 pt-4">
    <AvatarGroup max={3} size="sm">
      <Avatar name="Avatar 1" />
      <Avatar name="Avatar 2" />
      <Avatar name="Avatar 3" />
    </AvatarGroup>
    <div className="text-sm">
      <div className="font-semibold flex items-center gap-1">
        Trusted by 1,000+ merchants
      </div>
      <div className="text-default-400">Join successful stores</div>
    </div>
  </div>
);

const HeroContent = ({
  onStart,
  onDemo,
}: {
  onStart: () => void;
  onDemo: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6 }}
    className="flex flex-col gap-8"
  >
    <Badge />
    <Headline />
    <p className="text-xl text-default-500 max-w-2xl leading-relaxed">
      Create a fully isolated e-commerce store with dedicated database and
      compute. No technical expertise required.
    </p>
    <CTAs onStart={onStart} onDemo={onDemo} />
    <SocialProof />
  </motion.div>
);

const StatCard = ({
  label,
  value,
  color,
  icon: Icon,
  delay,
  extraClass,
}: {
  label: string;
  value: string;
  color?: "success" | "primary";
  icon?: ElementType;
  delay: number;
  extraClass: string;
}) => (
  <motion.div
    className={`absolute z-10 ${extraClass}`}
    animate={{ y: [0, label === "Uptime" ? 10 : -8, 0] }}
    transition={{
      duration: label === "Uptime" ? 4 : 5,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    <Card className="backdrop-blur-md shadow-xl border-default-200/50">
      <CardBody className="py-3 px-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <Chip color={color} size="sm" variant="flat" className="px-0">
              <Icon size={14} />
            </Chip>
          )}
          <div className="flex flex-col">
            <span className="text-xs text-default-400">{label}</span>
            <span
              className={`font-bold text-sm ${color === "primary" ? "text-primary" : ""}`}
            >
              {value}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  </motion.div>
);

const HeroVisual = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, delay: 0.2 }}
    className="relative hidden lg:block"
  >
    <div className="relative">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Card
          className="backdrop-blur-xl bg-default-100/50 border-default-200/50 shadow-2xl w-full aspect-video"
          isBlurred
        >
          <CardBody className="p-2">
            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center text-primary-300/50 text-6xl font-bold">
              Dashboard
            </div>
          </CardBody>
        </Card>
      </motion.div>

      <StatCard
        label="Uptime"
        value="99.9%"
        color="success"
        icon={Check}
        delay={1}
        extraClass="-bottom-6 -left-6"
      />

      <StatCard
        label="Deploy Time"
        value="< 2 min"
        color="primary"
        delay={0.5}
        extraClass="-top-6 -right-6"
      />
    </div>
  </motion.div>
);

export const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary-50 via-background to-secondary-50 -z-10"
        animate={{
          background: [
            "linear-gradient(to bottom right, rgb(240, 247, 255), rgb(219, 234, 254))",
            "linear-gradient(to bottom right, rgb(219, 234, 254), rgb(240, 247, 255))",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <HeroContent
            onStart={() => router.push("/signup")}
            onDemo={() => router.push("/signup")}
          />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
};
