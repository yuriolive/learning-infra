"use client";

import { Card, CardBody, Link } from "@heroui/react";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

interface CategoryGridProps {
  categories: Category[];
  primaryColor?: string;
}

export function CategoryGrid({ categories, primaryColor = "#000000" }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?category=${category.slug}`}
          className="no-underline"
        >
          <Card
            isPressable
            className="h-32 hover:shadow-lg transition-shadow"
            style={{ borderColor: primaryColor, borderWidth: "1px" }}
          >
            <CardBody className="flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                {category.image && (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-12 h-12 mx-auto object-contain"
                  />
                )}
                <p className="font-semibold text-sm line-clamp-2">{category.name}</p>
                {category.productCount && (
                  <p className="text-xs text-default-400">
                    {category.productCount} products
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
