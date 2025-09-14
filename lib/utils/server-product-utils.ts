import fs from 'fs';
import path from 'path';
import type { VendorProduct } from '@/lib/types/vendor';
import type { Product } from '@/lib/shopify/types';
import { convertVendorProductToShopifyProduct } from './product-converter';

const PRODUCTS_FILE_PATH = path.join(process.cwd(), 'data', 'products.json');

// Ensure the directory exists
function ensureDirectoryExists() {
  const dir = path.dirname(PRODUCTS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read all local products from file system (server-side)
export function getAllLocalProducts(): VendorProduct[] {
  try {
    ensureDirectoryExists();
    
    if (!fs.existsSync(PRODUCTS_FILE_PATH)) {
      return [];
    }
    
    const data = fs.readFileSync(PRODUCTS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local products from file:', error);
    return [];
  }
}

// Save products to file system (server-side)
export function saveLocalProducts(products: VendorProduct[]): void {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error saving local products to file:', error);
    throw new Error('Failed to save local products');
  }
}

// Get a single local product by handle (server-side)
export function getLocalProductByHandle(handle: string): Product | null {
  try {
    const localProducts = getAllLocalProducts();
    
    // Find product by matching the generated handle (using same logic as product creation)
    const vendorProduct = localProducts.find(product => {
      const productHandle = product.handle || product.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return productHandle === handle;
    });
    
    if (!vendorProduct) {
      return null;
    }
    
    // Convert to Shopify format
    return convertVendorProductToShopifyProduct(vendorProduct);
  } catch (error) {
    console.error('Error getting local product by handle:', error);
    return null;
  }
}

// Get all local products converted to Shopify format (server-side)
export function getAllLocalProductsAsShopify(): Product[] {
  try {
    const localProducts = getAllLocalProducts();
    return localProducts
      .filter(product => product.isActive)
      .map(convertVendorProductToShopifyProduct);
  } catch (error) {
    console.error('Error converting local products:', error);
    return [];
  }
}

// Add a single product to the file system
export function addLocalProduct(product: VendorProduct): void {
  try {
    const products = getAllLocalProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Update existing product
      products[existingIndex] = product;
    } else {
      // Add new product
      products.push(product);
    }
    
    saveLocalProducts(products);
  } catch (error) {
    console.error('Error adding local product:', error);
    throw new Error('Failed to add local product');
  }
}