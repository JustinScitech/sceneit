'use client';

import { Cart, CartItem, Product, ProductVariant } from '@/lib/shopify/types';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import * as CartActions from '@/components/cart/actions';

export type UpdateType = 'plus' | 'minus' | 'delete';

type CartAction =
  | {
      type: 'UPDATE_ITEM';
      payload: { merchandiseId: string; nextQuantity: number };
    }
  | {
      type: 'ADD_ITEM';
      payload: { variant: ProductVariant; product: Product; previousQuantity: number };
    };

type UseCartReturn = {
  isPending: boolean;
  cart: Cart | undefined;
  addItem: (variant: ProductVariant, product: Product) => Promise<void>;
  updateItem: (lineId: string, merchandiseId: string, nextQuantity: number, updateType: UpdateType) => Promise<void>;
};

type CartContextType = UseCartReturn | undefined;

const CartContext = createContext<CartContextType | undefined>(undefined);

function calculateItemCost(quantity: number, price: string): string {
  return (Number(price) * quantity).toString();
}

// removed old updateCartItem helper; logic in reducer now uses nextQuantity directly

// removed createOrUpdateCartItem helper in favor of explicit logic in reducer

function updateCartTotals(lines: CartItem[]): Pick<Cart, 'totalQuantity' | 'cost'> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = lines.reduce((sum, item) => sum + Number(item.cost.totalAmount.amount), 0);
  const currencyCode = lines[0]?.cost.totalAmount.currencyCode ?? 'USD';

  return {
    totalQuantity,
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
      totalTaxAmount: { amount: '0', currencyCode },
    },
  };
}

function createEmptyCart(): Cart {
  return {
    id: '',
    checkoutUrl: '',
    cost: {
      subtotalAmount: { amount: '0', currencyCode: 'USD' },
      totalAmount: { amount: '0', currencyCode: 'USD' },
      totalTaxAmount: { amount: '0', currencyCode: 'USD' },
    },
    totalQuantity: 0,
    lines: [],
  };
}

function cartReducer(state: Cart | undefined, action: CartAction): Cart {
  const currentCart = state || createEmptyCart();

  switch (action.type) {
    case 'UPDATE_ITEM': {
      const { merchandiseId, nextQuantity } = action.payload;
      const updatedLines = currentCart.lines
        .map(item => {
          if (item.merchandise.id !== merchandiseId) return item;
          if (nextQuantity <= 0) return null;

          const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity;
          const newTotalAmount = calculateItemCost(nextQuantity, singleItemAmount.toString());

          return {
            ...item,
            quantity: nextQuantity,
            cost: {
              ...item.cost,
              totalAmount: {
                ...item.cost.totalAmount,
                amount: newTotalAmount,
              },
            },
          } satisfies CartItem;
        })
        .filter(Boolean) as CartItem[];

      if (updatedLines.length === 0) {
        return {
          ...currentCart,
          lines: [],
          totalQuantity: 0,
          cost: {
            ...currentCart.cost,
            totalAmount: { ...currentCart.cost.totalAmount, amount: '0' },
          },
        };
      }

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    case 'ADD_ITEM': {
      const { variant, product, previousQuantity } = action.payload;
      const existingItem = currentCart.lines.find(item => item.merchandise.id === variant.id);
      const targetQuantity = previousQuantity + 1;

      const updatedLines = existingItem
        ? currentCart.lines.map(item => {
            if (item.merchandise.id !== variant.id) return item;

            const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity;
            const newTotalAmount = calculateItemCost(targetQuantity, singleItemAmount.toString());

            return {
              ...item,
              quantity: targetQuantity,
              cost: {
                ...item.cost,
                totalAmount: {
                  ...item.cost.totalAmount,
                  amount: newTotalAmount,
                },
              },
            } satisfies CartItem;
          })
        : [
            {
              id: `temp-${Date.now()}`,
              quantity: targetQuantity,
              cost: {
                totalAmount: {
                  amount: calculateItemCost(targetQuantity, variant.price.amount),
                  currencyCode: variant.price.currencyCode,
                },
              },
              merchandise: {
                id: variant.id,
                title: variant.title,
                selectedOptions: variant.selectedOptions,
                product: product,
              },
            } satisfies CartItem,
            ...currentCart.lines,
          ];

      return {
        ...currentCart,
        ...updateCartTotals(updatedLines),
        lines: updatedLines,
      };
    }
    default:
      return currentCart;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<Cart | undefined>(undefined);
  const [optimisticCart, updateOptimisticCart] = useOptimistic<Cart | undefined, CartAction>(cart, cartReducer);

  useEffect(() => {
    CartActions.getCart().then(cart => {
      if (cart) setCart(cart);
    });
  }, []);

  const update = useCallback(
    async (lineId: string, merchandiseId: string, nextQuantity: number) => {
      startTransition(() => {
        updateOptimisticCart({ type: 'UPDATE_ITEM', payload: { merchandiseId, nextQuantity } });
      });
      const fresh = await CartActions.updateItem({ lineId, quantity: nextQuantity });
      if (fresh) setCart(fresh);
    },
    [updateOptimisticCart]
  );

  const add = useCallback(
    async (variant: ProductVariant, product: Product) => {
      const previousQuantity = optimisticCart?.lines.find(l => l.merchandise.id === variant.id)?.quantity || 0;
      startTransition(() => {
        updateOptimisticCart({ type: 'ADD_ITEM', payload: { variant, product, previousQuantity } });
      });
      const fresh = await CartActions.addItem(variant.id);
      if (fresh) setCart(fresh);
    },
    [updateOptimisticCart, optimisticCart]
  );

  const value = useMemo<UseCartReturn>(
    () => ({ cart: optimisticCart, addItem: add, updateItem: update, isPending }),
    [optimisticCart, add, update, isPending]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): UseCartReturn {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
