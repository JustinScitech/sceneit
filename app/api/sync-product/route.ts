import { NextRequest, NextResponse } from 'next/server';
import { addLocalProduct } from '@/lib/utils/server-product-utils';
import type { VendorProduct } from '@/lib/types/vendor';

export async function POST(request: NextRequest) {
  try {
    const product: VendorProduct = await request.json();
    
    // Validate the product data
    if (!product.id || !product.title || !product.description) {
      return NextResponse.json(
        { error: 'Missing required product fields' },
        { status: 400 }
      );
    }
    
    // Save to file system for server-side access
    addLocalProduct(product);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing product:', error);
    return NextResponse.json(
      { error: 'Failed to sync product' },
      { status: 500 }
    );
  }
}