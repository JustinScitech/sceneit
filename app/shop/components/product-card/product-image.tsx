'use client';

import { useProductImages, useSelectedVariant } from '@/components/products/variant-selector';
import { Product } from '@/lib/shopify/types';
import Image from 'next/image';

export const ProductImage = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);

  const [variantImage] = useProductImages(product, selectedVariant?.selectedOptions);

  return (
    <Image
      src={variantImage.url}
      alt={variantImage.altText || product.title}
      width={variantImage.width}
      height={variantImage.height}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover size-full"
      quality={100}
      placeholder={variantImage?.thumbhash ? 'blur' : undefined}
      blurDataURL={variantImage?.thumbhash}
    />
  );
};
