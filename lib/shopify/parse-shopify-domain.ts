/**
 * Parses various Shopify URL formats and returns the correct store domain
 * Handles:
 * - your-store.myshopify.com (correct format)
 * - https://your-store.myshopify.com (with protocol)
 * - https://admin.shopify.com/store/store-id/ (admin URL)
 * - store-id (just the store identifier)
 */
export function parseShopifyDomain(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Clean up the input
  const cleanInput = input.trim();

  // Case 1: Admin URL format - https://admin.shopify.com/store/store-id/
  const adminUrlMatch = cleanInput.match(/admin\.shopify\.com\/store\/([^/]+)/i);
  if (adminUrlMatch) {
    const storeId = adminUrlMatch[1];
    return `${storeId}.myshopify.com`;
  }

  // Case 2: Full URL with protocol - https://your-store.myshopify.com
  const fullUrlMatch = cleanInput.match(/https?:\/\/([^/]+\.myshopify\.com)/i);
  if (fullUrlMatch) {
    return fullUrlMatch[1];
  }

  // Case 3: Already correct format - your-store.myshopify.com
  if (cleanInput.match(/^[a-zA-Z0-9-]+\.myshopify\.com$/i)) {
    return cleanInput.toLowerCase();
  }

  // Case 4: Just the store ID - store-id
  if (cleanInput.match(/^[a-zA-Z0-9-]+$/)) {
    return `${cleanInput}.myshopify.com`;
  }

  // If none of the patterns match, return null
  return null;
}
