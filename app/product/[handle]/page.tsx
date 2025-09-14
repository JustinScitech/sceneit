import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCollection, getProduct, getProducts } from '@/lib/shopify';
import { getAllLocalProductsAsShopify } from '@/lib/utils/server-product-utils';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { SidebarLinks } from '@/components/layout/sidebar/product-sidebar-links';
import { AddToCart, AddToCartButton } from '@/components/cart/add-to-cart';
import { storeCatalog } from '@/lib/shopify/constants';
import Prose from '@/components/prose';
import { formatPrice } from '@/lib/shopify/utils';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/layout/page-layout';
import { VariantSelectorSlots } from './components/variant-selector-slots';
import { Mobile3DViewer, Desktop3DViewer } from '@/components/product/3d-viewer';

// Generate static params for all products at build time
export async function generateStaticParams() {
  try {
    // Get both Shopify products and local products
    const [shopifyProducts, localProducts] = await Promise.all([
      getProducts({ limit: 100 }), // Get first 100 Shopify products
      getAllLocalProductsAsShopify() // Get all local products
    ]);

    // Combine handles from both sources
    const allHandles = [
      ...shopifyProducts.map(product => ({ handle: product.handle })),
      ...localProducts.map(product => ({ handle: product.handle }))
    ];

    return allHandles;
  } catch (error) {
    console.error('Error generating static params for products:', error);
    // Fallback to just Shopify products if local products fail
    try {
      const products = await getProducts({ limit: 100 });
      return products.map(product => ({ handle: product.handle }));
    } catch (fallbackError) {
      console.error('Error in fallback static params generation:', fallbackError);
      return [];
    }
  }
}

// Enable ISR with 1 minute revalidation
export const revalidate = 60;

export async function generateMetadata(props: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);

  return {
    title: product.seo.title || product.title,
    description: product.seo.description || product.description,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
      },
    },
    openGraph: url
      ? {
          images: [
            {
              url,
              width,
              height,
              alt,
            },
          ],
        }
      : null,
  };
}

export default async function ProductPage(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const collection = product.categoryId ? await getCollection(product.categoryId) : null;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.featuredImage.url,
    offers: {
      '@type': 'AggregateOffer',
      availability: product.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      priceCurrency: product.currencyCode,
      highPrice: product.priceRange.maxVariantPrice.amount,
      lowPrice: product.priceRange.minVariantPrice.amount,
    },
  };

  const [rootParentCategory] = collection?.parentCategoryTree.filter(
    (c: any) => c.id !== storeCatalog.rootCategoryId
  ) ?? [undefined];

  const hasVariants = product.variants.length > 1;
  const hasEvenOptions = product.options.length % 2 === 0;

  return (
    <PageLayout className="bg-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />

      <div className="flex flex-col md:grid md:grid-cols-12 md:gap-sides min-h-max">
        {/* Mobile 3D Viewer */}
        <div className="md:hidden col-span-full h-[60vh] min-h-[400px]">
          <Suspense fallback={null}>
            <Mobile3DViewer product={product} />
          </Suspense>
        </div>

        <div className="flex sticky top-0 flex-col col-span-5 2xl:col-span-4 max-md:col-span-full md:h-screen min-h-max max-md:p-sides md:pl-sides md:pt-top-spacing max-md:static">
          <div className="col-span-full">
            <Breadcrumb className="col-span-full mb-4 md:mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/shop" prefetch>
                      Shop
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {rootParentCategory && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href={`/shop/${rootParentCategory.id}`} prefetch>
                          {rootParentCategory.name}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-col col-span-full gap-4 md:mb-10 max-md:order-2">
              <div className="flex flex-col grid-cols-2 px-3 py-2 rounded-md bg-popover md:grid md:gap-x-4 md:gap-y-10 place-items-baseline">
                <h1 className="text-lg font-semibold lg:text-xl 2xl:text-2xl text-balance max-md:mb-4">
                  {product.title}
                </h1>
                <p className="text-sm font-medium">{product.description}</p>
                <p className="flex gap-3 items-center text-lg font-semibold lg:text-xl 2xl:text-2xl max-md:mt-8">
                  {formatPrice(
                    product.priceRange.minVariantPrice.amount,
                    product.priceRange.minVariantPrice.currencyCode
                  )}
                  {product.compareAtPrice && (
                    <span className="line-through opacity-30">
                      {formatPrice(product.compareAtPrice.amount, product.compareAtPrice.currencyCode)}
                    </span>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Suspense fallback={<div className="space-y-2"><div className="h-10 bg-muted rounded animate-pulse"></div></div>}>
                  <VariantSelectorSlots product={product} />
                </Suspense>

                <Suspense
                  fallback={
                    <AddToCartButton
                      className={cn('w-full', {
                        'col-span-full': !hasVariants || hasEvenOptions,
                      })}
                      product={product}
                      size="lg"
                    />
                  }
                >
                  <AddToCart
                    product={product}
                    size="lg"
                    className={cn('w-full', {
                      'col-span-full': !hasVariants || hasEvenOptions,
                    })}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          <Prose
            className="col-span-full mb-auto opacity-70 max-md:order-3 max-md:my-6"
            html={product.descriptionHtml}
          />

          <SidebarLinks className="flex-col-reverse max-md:hidden py-sides w-full max-w-[408px] pr-sides max-md:pr-0 max-md:py-0" />
        </div>

        {/* Desktop 3D Viewer */}
        <div className="hidden overflow-y-auto relative col-span-7 col-start-6 w-full md:block">
          <Suspense fallback={null}>
            <Desktop3DViewer product={product} />
          </Suspense>
        </div>
      </div>
    </PageLayout>
  );
}
