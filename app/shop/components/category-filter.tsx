'use client';

import { Collection } from '@/lib/shopify/types';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useCategoryFilterCount } from '../hooks/use-filter-count';

interface CategoryFilterProps {
  collections: Collection[];
  className?: string;
}

export function CategoryFilter({ collections, className }: CategoryFilterProps) {
  const params = useParams<{ collection: string }>();
  const hasSelectedCategory = !!params.collection;
  const categoryCount = useCategoryFilterCount();

  return (
    <div className={cn('px-3 py-4 rounded-lg bg-muted', className)}>
      <h3 className="mb-4 font-semibold">
        Categories {categoryCount > 0 && <span className="text-foreground/50">({categoryCount})</span>}
      </h3>
      <ul className="flex flex-col gap-1">
        {collections.map((collection, index) => {
          const isSelected = params.collection === collection.handle;
          return (
            <li key={`${collection.handle}-${index}`}>
              <Link
                className={cn(
                  'flex w-full text-left transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80',
                  isSelected ? 'font-medium translate-x-1' : hasSelectedCategory ? 'opacity-50' : ''
                )}
                href={`/shop/${collection.handle}`}
                aria-pressed={isSelected}
                aria-label={`Filter by category: ${collection.title}`}
                prefetch
              >
                {collection.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
