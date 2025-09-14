'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/shopify/types';
import { productStorage } from '@/lib/utils/product-storage';
import { convertVendorProductsToShopifyProducts } from '@/lib/utils/product-converter';

interface LocalProductsLoaderProps {
  onProductsLoaded: (products: Product[]) => void;
  query?: string;
}

export function LocalProductsLoader({ onProductsLoaded, query }: LocalProductsLoaderProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;

    try {
      const vendorProducts = productStorage.getAllProducts();
      let localProducts = convertVendorProductsToShopifyProducts(vendorProducts);
      
      // Filter local products by query if provided
      if (query) {
        localProducts = localProducts.filter(product =>
          product.title.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase()) ||
          product.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
      }

      onProductsLoaded(localProducts);
      setLoaded(true);
    } catch (error) {
      console.warn('Could not load local products:', error);
      onProductsLoaded([]);
      setLoaded(true);
    }
  }, [onProductsLoaded, query, loaded]);

  return null; // This component doesn't render anything
}