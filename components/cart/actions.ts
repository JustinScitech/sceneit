'use server';

import { cookies } from 'next/headers';
import type { Cart, CartItem } from '@/lib/shopify/types';

// Local cart storage using cookies
async function getLocalCart(): Promise<Cart | null> {
  try {
    const cartData = (await cookies()).get('localCart')?.value;
    if (!cartData) return null;
    return JSON.parse(cartData);
  } catch (error) {
    console.error('Error getting local cart:', error);
    return null;
  }
}

async function saveLocalCart(cart: Cart): Promise<void> {
  try {
    (await cookies()).set('localCart', JSON.stringify(cart), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } catch (error) {
    console.error('Error saving local cart:', error);
  }
}

function createEmptyCart(): Cart {
  return {
    id: `local-cart-${Date.now()}`,
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

function calculateCartTotals(lines: CartItem[]): Pick<Cart, 'totalQuantity' | 'cost'> {
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

// Add item server action: returns local Cart
export async function addItem(variantId: string | undefined): Promise<Cart | null> {
  if (!variantId) return null;
  
  try {
    let cart = await getLocalCart();
    if (!cart) {
      cart = createEmptyCart();
    }

    // This will be handled by the cart context optimistically
    // Just return the current cart for now
    return cart;
  } catch (error) {
    console.error('Error adding item to local cart:', error);
    return null;
  }
}

// Update item server action (quantity 0 removes): returns local Cart
export async function updateItem({ lineId, quantity }: { lineId: string; quantity: number }): Promise<Cart | null> {
  try {
    let cart = await getLocalCart();
    if (!cart) return null;

    const updatedLines = cart.lines
      .map(item => {
        if (item.id !== lineId) return item;
        if (quantity <= 0) return null;

        const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity;
        const newTotalAmount = (singleItemAmount * quantity).toString();

        return {
          ...item,
          quantity,
          cost: {
            ...item.cost,
            totalAmount: {
              ...item.cost.totalAmount,
              amount: newTotalAmount,
            },
          },
        };
      })
      .filter(Boolean) as CartItem[];

    const updatedCart = {
      ...cart,
      ...calculateCartTotals(updatedLines),
      lines: updatedLines,
    };

    await saveLocalCart(updatedCart);
    return updatedCart;
  } catch (error) {
    console.error('Error updating item in local cart:', error);
    return null;
  }
}

export async function createCartAndSetCookie() {
  try {
    const newCart = createEmptyCart();
    await saveLocalCart(newCart);
    return newCart;
  } catch (error) {
    console.error('Error creating local cart:', error);
    return null;
  }
}

export async function getCart(): Promise<Cart | null> {
  return await getLocalCart();
}

// Helper function to save cart from context
export async function saveCart(cart: Cart): Promise<void> {
  await saveLocalCart(cart);
}
