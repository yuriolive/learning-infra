"use client";

import { ProductCard } from "./product-card";

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image?: string;
  badge?: string;
}

interface ProductGridProps {
  products: Product[];
  primaryColor?: string;
  onAddToCart?: (productId: string) => void;
  columns?: number;
}

export function ProductGrid({
  products,
  primaryColor = "#000000",
  onAddToCart,
  columns = 4,
}: ProductGridProps) {
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] || "grid-cols-4";

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:${gridColsClass} gap-6`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          primaryColor={primaryColor}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
