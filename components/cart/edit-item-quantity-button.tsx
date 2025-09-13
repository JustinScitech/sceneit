'use client';

import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import { CartItem } from '@/lib/shopify/types';
import { useCart } from './cart-context';

function SubmitButton({ type }: { type: 'plus' | 'minus' }) {
  return (
    <button
      type="submit"
      aria-label={type === 'plus' ? 'Increase item quantity' : 'Reduce item quantity'}
      className={clsx(
        'ease flex h-full min-w-[36px] max-w-[36px] flex-none items-center justify-center rounded-full p-2 transition-all duration-200 hover:border-neutral-800 hover:opacity-80',
        {
          'ml-auto': type === 'minus',
        }
      )}
    >
      {type === 'plus' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </button>
  );
}

export function EditItemQuantityButton({ item, type }: { item: CartItem; type: 'plus' | 'minus' }) {
  const { updateItem } = useCart();
  const nextQuantity = type === 'plus' ? item.quantity + 1 : item.quantity - 1;

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        updateItem(item.id, item.merchandise.id, nextQuantity, type);
      }}
    >
      <SubmitButton type={type} />
    </form>
  );
}
