'use client';

import { CartItem } from '@/lib/shopify/types';
import { Button } from '../ui/button';
import { useCart } from './cart-context';

export function DeleteItemButton({ item }: { item: CartItem }) {
  const { updateItem } = useCart();
  const lineId = item.id;
  const merchandiseId = item.merchandise.id;

  return (
    <form
      className="-mr-1 -mb-1 opacity-70"
      onSubmit={e => {
        e.preventDefault();
        updateItem(lineId, merchandiseId, 0, 'delete');
      }}
    >
      <Button type="submit" size="sm" variant="ghost" aria-label="Remove item" className="px-2 text-sm">
        Remove
      </Button>
    </form>
  );
}
