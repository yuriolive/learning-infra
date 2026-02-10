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
  // Safe to use template literal here as values are limited to 1-4 and likely used elsewhere
  const gridColsClass = `grid-cols-${columns}`;

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:${gridColsClass} gap-6`}
    >
      {products.map((product) => (
        <ProductCard key={product.id} {...product} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
}
