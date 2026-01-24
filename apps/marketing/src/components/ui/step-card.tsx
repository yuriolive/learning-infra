"use client";

import { motion } from "framer-motion";

interface StepCardProperties {
  number: number;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

export const StepCard: React.FC<StepCardProperties> = ({
  number,
  icon,
  title,
  description,
  badge,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: number * 0.1 }}
      viewport={{ once: true }}
      className="flex flex-col items-center text-center relative max-w-sm mx-auto"
    >
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-3xl shadow-lg">
          {icon}
        </div>
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold border-4 border-background">
          {number}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-2 flex items-center gap-2 justify-center flex-wrap">
        {title}
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-success-100 text-success-700 text-xs font-semibold">
            {badge}
          </span>
        )}
      </h3>

      <p className="text-default-500">{description}</p>
    </motion.div>
  );
};
