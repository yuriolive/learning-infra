"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { motion } from "framer-motion";

import type { ElementType } from "react";

interface FeatureCardProperties {
  icon: ElementType;
  title: string;
  description: string;
  color?: "primary" | "secondary" | "success" | "warning";
}

const colorMap: Record<NonNullable<FeatureCardProperties["color"]>, string> = {
  primary: "from-primary-100 to-primary-50",
  secondary: "from-secondary-100 to-secondary-50",
  success: "from-success-100 to-success-50",
  warning: "from-warning-100 to-warning-50",
};

export const FeatureCard: React.FC<FeatureCardProperties> = ({
  icon: Icon,
  title,
  description,
  color = "primary",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="group"
    >
      <Card
        className="h-full backdrop-blur-sm bg-default-50/50 border border-default-200/50
                   hover:border-primary-200/50 hover:shadow-xl hover:shadow-primary-500/10
                   transition-all duration-300"
        isPressable
      >
        <CardBody className="gap-4 p-6">
          {/* Icon with gradient background */}
          <div
            className={`
            inline-flex p-3 rounded-xl
            bg-gradient-to-br ${
              // eslint-disable-next-line security/detect-object-injection
              colorMap[color]
            }
            group-hover:scale-110 transition-transform duration-300
          `}
          >
            <Icon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-default-500 text-sm leading-relaxed">
              {description}
            </p>
          </div>

          {/* Hover indicator */}
          <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Chip size="sm" variant="flat" color={color}>
              Learn more →
            </Chip>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};
