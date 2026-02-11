"use client";

import { Card, CardBody, Link } from "@heroui/react";
import NextImage from "next/image";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

interface CategoryGridProperties {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProperties) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?category=${category.slug}`}
          className="no-underline group"
        >
          <Card
            isPressable
            className="h-48 border-none bg-default-50 hover:bg-default-100 shadow-md hover:shadow-xl transition-all rounded-3xl overflow-hidden"
          >
            <CardBody className="p-0 relative h-full">
              {category.image && (
                <NextImage
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                <p className="font-bold text-lg text-white group-hover:translate-x-1 transition-transform">
                  {category.name}
                </p>
                {category.productCount && (
                  <p className="text-xs text-white/80">
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
