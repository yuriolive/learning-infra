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

interface ProductGridProperties {
  products: Product[];
  onAddToCart?: (productId: string) => void;
  columns?: number;
}

export function ProductGrid({
  products,
  onAddToCart,
  columns = 4,
}: ProductGridProperties) {
  const gridCols: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols[columns] || "lg:grid-cols-4"} gap-6`}
    >
      {products.map((product) => (
        <ProductCard key={product.id} {...product} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
}
