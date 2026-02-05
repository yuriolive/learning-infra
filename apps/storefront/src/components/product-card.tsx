"use client";

import { Card, CardBody, Button, Badge } from "@heroui/react";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
  primaryColor?: string;
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({
  id,
  title,
  price,
  originalPrice,
  image,
  badge,
  primaryColor = "#000000",
  onAddToCart,
}: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      if (onAddToCart) {
        await onAddToCart(id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <Card shadow="sm" className="h-full hover:shadow-lg transition-shadow">
      <CardBody className="p-0 flex flex-col h-full">
        {/* Image Container */}
        <div className="relative aspect-square bg-default-100 flex items-center justify-center overflow-hidden">
          {badge && (
            <Badge
              content={badge}
              color="danger"
              shape="circle"
              className="absolute top-2 right-2 z-10"
            >
              <div />
            </Badge>
          )}
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
              -{discount}%
            </div>
          )}
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-default-300 text-center px-4">Product Image</span>
          )}
        </div>

        {/* Content Container */}
        <div className="p-4 flex flex-col flex-grow justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm line-clamp-2">{title}</h3>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg" style={{ color: primaryColor }}>
                ${price.toFixed(2)}
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-sm text-default-400 line-through">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button
            fullWidth
            size="sm"
            isLoading={isLoading}
            onClick={handleAddToCart}
            style={{ backgroundColor: primaryColor, color: "white" }}
            className="mt-4"
          >
            Add to Cart
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
