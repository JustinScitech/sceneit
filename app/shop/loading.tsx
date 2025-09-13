import { Suspense } from 'react';
import ResultsControls from './components/results-controls';
import { ProductGrid } from './components/product-grid';
import { ProductCardSkeleton } from './components/product-card-skeleton';

export default function ShopLoading() {
  return (
    <div>
      <Suspense>
        <ResultsControls collections={[]} products={[]} />
      </Suspense>
      <ProductGrid>
        {Array.from({ length: 12 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </ProductGrid>
    </div>
  );
}
