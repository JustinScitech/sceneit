import type { VendorProduct } from '@/lib/types/vendor';
import type { Product } from '@/lib/shopify/types';

// Convert local vendor products to Shopify Product format for consistent display
export function convertVendorProductToShopifyProduct(vendorProduct: VendorProduct): Product {
  return {
    id: vendorProduct.id,
    handle: vendorProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    availableForSale: vendorProduct.isActive && vendorProduct.inventory > 0,
    title: vendorProduct.title,
    description: vendorProduct.description,
    descriptionHtml: `<p>${vendorProduct.description}</p>`,
    currencyCode: 'USD',
    options: [
      {
        id: `${vendorProduct.id}-color`,
        name: 'Color',
        values: [
          {
            id: 'default',
            name: 'Default'
          }
        ]
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: vendorProduct.price.toString(),
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: vendorProduct.price.toString(),
        currencyCode: 'USD'
      }
    },
    variants: [
      {
        id: `${vendorProduct.id}-variant-1`,
        title: 'Default',
        availableForSale: vendorProduct.isActive && vendorProduct.inventory > 0,
        selectedOptions: [
          {
            name: 'Color',
            value: 'Default'
          }
        ],
        price: {
          amount: vendorProduct.price.toString(),
          currencyCode: 'USD'
        }
      }
    ],
    featuredImage: vendorProduct.images.length > 0 ? {
      url: vendorProduct.images[0],
      altText: vendorProduct.title,
      width: 500,
      height: 500
    } : {
      url: '/placeholder.svg',
      altText: vendorProduct.title,
      width: 500,
      height: 500
    },
    images: vendorProduct.images.map((imageUrl, index) => ({
      url: imageUrl,
      altText: vendorProduct.title,
      width: 500,
      height: 500
    })),
    seo: {
      title: vendorProduct.title,
      description: vendorProduct.description.substring(0, 160)
    },
    tags: vendorProduct.tags
  };
}

// Convert multiple vendor products
export function convertVendorProductsToShopifyProducts(vendorProducts: VendorProduct[]): Product[] {
  return vendorProducts
    .filter(product => product.isActive) // Only show active products
    .map(convertVendorProductToShopifyProduct);
}