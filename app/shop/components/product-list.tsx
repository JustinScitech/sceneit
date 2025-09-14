import { getCollectionProducts, getCollections, getProducts } from '@/lib/shopify';
import type { Product, ProductCollectionSortKey, ProductSortKey } from '@/lib/shopify/types';
import { ProductListContent } from './product-list-content';
import { mapSortKeys } from '@/lib/shopify/utils';
import { productStorage } from '@/lib/utils/product-storage';
import { convertVendorProductsToShopifyProducts } from '@/lib/utils/product-converter';

interface ProductListProps {
  collection: string;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ProductList({ collection, searchParams }: ProductListProps) {
  const query = typeof searchParams?.q === 'string' ? searchParams.q : undefined;
  const sort = typeof searchParams?.sort === 'string' ? searchParams.sort : undefined;
  const isRootCollection = collection === 'joyco-root' || !collection;

  const { sortKey, reverse } = isRootCollection ? mapSortKeys(sort, 'product') : mapSortKeys(sort, 'collection');

  let products: Product[] = [];

  try {
    // Fetch Shopify products
    let shopifyProducts: Product[] = [];
    if (isRootCollection) {
      shopifyProducts = await getProducts({
        sortKey: sortKey as ProductSortKey,
        query,
        reverse,
      });
    } else {
      shopifyProducts = await getCollectionProducts({
        collection,
        query,
        sortKey: sortKey as ProductCollectionSortKey,
        reverse,
      });
    }

    // Get local vendor products and convert them to Shopify format
    let localProducts: Product[] = [];
    try {
      const vendorProducts = productStorage.getAllProducts();
      localProducts = convertVendorProductsToShopifyProducts(vendorProducts);
      
      // Filter local products by query if provided
      if (query) {
        localProducts = localProducts.filter(product =>
          product.title.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase()) ||
          product.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
      }
    } catch (localError) {
      console.warn('Could not load local products (client-side only):', localError);
    }

    // Combine Shopify and local products
    products = [...localProducts, ...shopifyProducts];

  } catch (error) {
    console.error('Error fetching products:', error);
    products = [];
  }

  const collections = await getCollections();

  return <ProductListContent products={products} collections={collections} />;
}
