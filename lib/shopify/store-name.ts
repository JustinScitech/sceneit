import { parseShopifyDomain } from './parse-shopify-domain';

export function getStoreName(): string {
  // Parse the domain to handle different input formats
  const rawDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const domain = rawDomain ? parseShopifyDomain(rawDomain) : null;

  if (!domain) {
    return 'Shopify Template';
  }

  // Extract store name from domain (e.g., "my-awesome-store.myshopify.com" -> "My Awesome Store")
  const storeName = domain
    .replace('.myshopify.com', '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return storeName || 'Shopify Template';
}
