import { Collection, Product } from '@/lib/shopify/types';
import { cn } from '@/lib/utils';
import { ShopBreadcrumb } from './shop-breadcrumb';
import { ResultsCount } from './results-count';
import { SortDropdown } from './sort-dropdown';

export default function ResultsControls({
  collections,
  products,
  className,
}: {
  collections: Pick<Collection, 'handle' | 'title'>[];
  products: Product[];
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-3 items-center mb-1 w-full pr-sides', className)}>
      {/* Breadcrumb */}
      <ShopBreadcrumb collections={collections} className="ml-1" />

      {/* Results count */}
      <ResultsCount count={products.length} />

      {/* Sort dropdown */}
      <SortDropdown />
    </div>
  );
}
