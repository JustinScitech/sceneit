import type { VendorProduct } from '@/lib/types/vendor';

const PRODUCTS_STORAGE_KEY = 'sceneit_vendor_products';

export const productStorage = {
  // Get all products from localStorage
  getAllProducts: (): VendorProduct[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading products from localStorage:', error);
      return [];
    }
  },

  // Save a new product
  saveProduct: (product: Omit<VendorProduct, 'id' | 'createdAt' | 'updatedAt'>): VendorProduct => {
    if (typeof window === 'undefined') throw new Error('localStorage not available');

    const products = productStorage.getAllProducts();
    const now = new Date().toISOString();
    
    const newProduct: VendorProduct = {
      ...product,
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    const updatedProducts = [...products, newProduct];
    
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));
      
      // Also sync to server-side file storage
      fetch('/api/sync-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      }).catch(error => {
        console.warn('Failed to sync product to server:', error);
      });
      
      return newProduct;
    } catch (error) {
      console.error('Error saving product to localStorage:', error);
      
      // If quota exceeded, try to clean up and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded for products, attempting cleanup...');
        
        // Remove oldest 50% of products
        const sortedProducts = products.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const keepProducts = sortedProducts.slice(Math.floor(sortedProducts.length / 2));
        const cleanedProducts = [...keepProducts, newProduct];
        
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(cleanedProducts));
          console.log(`Cleaned up ${sortedProducts.length - keepProducts.length} old products`);
          return newProduct;
        } catch (retryError) {
          console.error('Even after cleanup, product storage failed:', retryError);
          throw new Error('Failed to save product: localStorage quota exceeded even after cleanup');
        }
      }
      
      throw new Error('Failed to save product');
    }
  },

  // Update an existing product
  updateProduct: (id: string, updates: Partial<VendorProduct>): VendorProduct | null => {
    if (typeof window === 'undefined') throw new Error('localStorage not available');

    const products = productStorage.getAllProducts();
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) return null;

    const updatedProduct: VendorProduct = {
      ...products[productIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    products[productIndex] = updatedProduct;
    
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product in localStorage:', error);
      throw new Error('Failed to update product');
    }
  },

  // Delete a product
  deleteProduct: (id: string): boolean => {
    if (typeof window === 'undefined') throw new Error('localStorage not available');

    const products = productStorage.getAllProducts();
    const filteredProducts = products.filter(p => p.id !== id);
    
    if (filteredProducts.length === products.length) return false; // Product not found

    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(filteredProducts));
      return true;
    } catch (error) {
      console.error('Error deleting product from localStorage:', error);
      throw new Error('Failed to delete product');
    }
  },

  // Get a single product by ID
  getProduct: (id: string): VendorProduct | null => {
    const products = productStorage.getAllProducts();
    return products.find(p => p.id === id) || null;
  },

  // Clear all products (for testing/development)
  clearAllProducts: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
  }
};