"use client";

import { Badge, Button, Card, CardBody } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart as LucideShoppingCart,
  Heart as LucideHeart,
  Eye as LucideEye,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// Cast Lucide icons to a generic functional component type to avoid monorepo type mismatches while satisfying ESLint
type IconComponent = (properties: {
  size?: number;
  className?: string;
  [key: string]: unknown;
}) => React.ReactNode;
const ShoppingCart = LucideShoppingCart as unknown as IconComponent;
const Heart = LucideHeart as unknown as IconComponent;
const Eye = LucideEye as unknown as IconComponent;

interface ProductCardProperties {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
  onAddToCart?: (productId: string) => void;
  isLoading?: boolean;
}

export function ProductCard({
  id,
  title,
  price,
  originalPrice,
  image,
  badge,
  onAddToCart,
  isLoading = false,
}: ProductCardProperties) {
  const [isHovered, setIsHovered] = useState(false);
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    onAddToCart?.(id);
  };

  return (
    <Card
      shadow="none"
      className="h-full border border-default-100 hover:border-primary/30 hover:shadow-2xl transition-all duration-500 bg-background rounded-[2rem] overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardBody className="p-0 flex flex-col h-full overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[4/5] bg-default-50 flex items-center justify-center overflow-hidden">
          {badge && (
            <div className="absolute top-4 right-4 z-20">
              <Badge
                content={badge}
                color="danger"
                variant="shadow"
                className="font-bold border-none"
              >
                <div />
              </Badge>
            </div>
          )}
          {discount > 0 && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black z-20 shadow-xl shadow-red-500/20">
              -{discount}%
            </div>
          )}

          <div className="relative w-full h-full">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full text-default-300 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl opacity-20">📦</span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                  No preview
                </span>
              </div>
            )}
          </div>

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />

          {/* Quick Actions Overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute inset-x-0 bottom-4 px-4 z-30 flex justify-center gap-2"
              >
                <Button
                  isIconOnly
                  radius="full"
                  variant="flat"
                  className="bg-white/90 dark:bg-black/90 shadow-lg backdrop-blur-md"
                >
                  <Eye size={18} />
                </Button>
                <Button
                  isIconOnly
                  radius="full"
                  variant="flat"
                  className="bg-white/90 dark:bg-black/90 shadow-lg backdrop-blur-md"
                >
                  <Heart size={18} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Container */}
        <div className="p-6 flex flex-col flex-grow space-y-3">
          <div className="space-y-1.5">
            <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors duration-300">
              {title}
            </h3>
            <div className="flex items-baseline gap-2.5">
              <span className="font-black text-2xl text-primary tracking-tighter">
                ${price.toFixed(2)}
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-sm text-default-400 line-through font-medium">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              fullWidth
              size="lg"
              color="primary"
              variant="flat"
              isLoading={isLoading}
              onPress={handleAddToCart}
              className="font-black h-14 rounded-2xl bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              startContent={<ShoppingCart size={18} />}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
