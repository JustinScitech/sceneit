import { DesktopFilters } from './components/shop-filters';
import { Suspense } from 'react';
import { getCollections } from '@/lib/shopify';
import { PageLayout } from '@/components/layout/page-layout';
import { MobileFilters } from './components/mobile-filters';
import { ProductsProvider } from './providers/products-provider';

// Enable ISR with 1 minute revalidation for the layout
export const revalidate = 60;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const collections = await getCollections();

  return (
    <PageLayout>
      <ProductsProvider>
        <div className="flex flex-col md:grid grid-cols-12 md:gap-sides">
          <Suspense fallback={null}>
            <DesktopFilters collections={collections} className="col-span-3 max-md:hidden" />
          </Suspense>
          <Suspense fallback={null}>
            <MobileFilters collections={collections} />
          </Suspense>
          <div className="col-span-9 flex flex-col h-full md:pt-top-spacing">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </ProductsProvider>
    </PageLayout>
  );
}
