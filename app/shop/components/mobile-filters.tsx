'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collection } from '@/lib/shopify/types';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { CategoryFilter } from './category-filter';
import { ColorFilter } from './color-filter';
import { useFilterCount } from '../hooks/use-filter-count';
import { useProducts } from '../providers/products-provider';
import { ResultsCount } from './results-count';
import { SortDropdown } from './sort-dropdown';
import Link from 'next/link';

interface MobileFiltersProps {
  collections: Collection[];
  className?: string;
}

export function MobileFilters({ collections, className }: MobileFiltersProps) {
  const filterCount = useFilterCount();
  const { products, originalProducts } = useProducts();

  return (
    <div className="pt-top-spacing bg-background md:hidden overflow-x-clip">
      <Drawer>
        {/* 3 main items: Filters, Results count, Sort by */}
        <div className="grid grid-cols-3 items-center px-4 py-3">
          {/* Filters */}
          <DrawerTrigger asChild>
            <Button variant="ghost" size="sm" className="justify-self-start text-sm font-semibold text-foreground">
              Filters {filterCount > 0 && <span className="text-foreground/50">({filterCount})</span>}
            </Button>
          </DrawerTrigger>

          {/* Results count */}
          <ResultsCount count={products.length} />

          {/* Sort by */}
          <SortDropdown className="justify-self-end" />
        </div>

        {/* Drawer content */}
        <DrawerContent className={cn('h-[80vh]', className)}>
          <DrawerHeader className="flex justify-between items-center">
            <DrawerTitle>
              Filters {filterCount > 0 && <span className="text-muted-foreground">({filterCount})</span>}
            </DrawerTitle>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                'font-medium text-foreground/50 hover:text-foreground/60 transition-opacity',
                filterCount === 0 && 'opacity-0 pointer-events-none'
              )}
              disabled={filterCount === 0}
              asChild={filterCount > 0}
            >
              <Link href="/shop" prefetch>
                Clear
              </Link>
            </Button>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-6">
            <CategoryFilter collections={collections} />
            <ColorFilter products={originalProducts} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
