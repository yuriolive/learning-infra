"use client";

import { Card, CardBody } from "@heroui/react";
import {
  Check,
  Zap,
  Database,
  Cloud,
  Globe,
  Plug,
  Save,
  Lock,
} from "lucide-react";

const specs = [
  {
    icon: Check,
    title: "99.9% Uptime SLA",
    description: "Guaranteed availability",
  },
  {
    icon: Zap,
    title: "< 2s Cold Start",
    description: "Instant wake from idle",
  },
  {
    icon: Database,
    title: "Neon Serverless PostgreSQL",
    description: "Auto-scaling database",
  },
  {
    icon: Cloud,
    title: "Google Cloud Run",
    description: "Container-based compute",
  },
  { icon: Globe, title: "Cloudflare Edge", description: "Global CDN network" },
  { icon: Plug, title: "REST & GraphQL APIs", description: "Full API access" },
  { icon: Save, title: "Automatic Backups", description: "Daily snapshots" },
  { icon: Lock, title: "GDPR Ready", description: "EU data compliance" },
];

export const TechSpecsSection = () => {
  return (
    <section className="py-24 bg-default-50/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Built for Scale</h2>
          <p className="text-xl text-default-500">
            Technical specifications for the modern developer.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {specs.map((spec, index) => (
            <Card
              key={index}
              className="border-none shadow-sm hover:shadow-md transition-shadow bg-background/60"
            >
              <CardBody className="gap-3 p-6 items-center text-center">
                <spec.icon className="text-primary w-8 h-8" />
                <div>
                  <h3 className="font-bold text-sm">{spec.title}</h3>
                  <p className="text-tiny text-default-500">
                    {spec.description}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
