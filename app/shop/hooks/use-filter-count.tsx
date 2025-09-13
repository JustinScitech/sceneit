'use client';

import { useQueryState, parseAsArrayOf, parseAsString } from 'nuqs';
import { useParams } from 'next/navigation';

export function useFilterCount() {
  const params = useParams<{ collection: string }>();
  const [color] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));

  // Count active filters
  let count = 0;

  // Count color filters
  if (color.length > 0) {
    count += color.length;
  }

  // Count collection filter (if not on "all" products)
  if (params.collection && params.collection !== undefined) {
    count += 1;
  }

  return count;
}

export function useCategoryFilterCount() {
  const params = useParams<{ collection: string }>();

  // Return 1 if a category is selected, 0 if not
  return params.collection && params.collection !== undefined ? 1 : 0;
}

export function useColorFilterCount() {
  const [color] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));

  // Return the number of selected color filters
  return color.length;
}
