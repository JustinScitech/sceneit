import { NextApiRequest, NextApiResponse } from 'next';
import WebSocket from 'ws';
import { getProduct } from '@/lib/shopify';

// Global WebSocket server instance - use global to persist across hot reloads
declare global {
  var __wsServer: any;
  var __connectedClients: Set<WebSocket>;
}

let wsServer: any = global.__wsServer;
const connectedClients: Set<WebSocket> = global.__connectedClients || new Set<WebSocket>();

// Initialize WebSocket server if not already running
function initWebSocketServer() {
  if (wsServer && wsServer.readyState !== 3) { // 3 = CLOSED
    return wsServer;
  }

  try {
    const WebSocketServer = require('ws').Server;
    
    // Create WebSocket server directly
    wsServer = new WebSocketServer({ port: 8081 });
    global.__wsServer = wsServer;
    global.__connectedClients = connectedClients;
    
    setupWebSocketHandlers();
    console.log('WebSocket server started on port 8081');
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.log('Port 8081 already in use, WebSocket server already running');
      // Don't try to create a new server, just return
      return wsServer;
    } else {
      console.error('Failed to start WebSocket server:', error);
    }
  }

  return wsServer;
}

function setupWebSocketHandlers() {
  if (!wsServer) return;

  wsServer.on('connection', (ws: WebSocket) => {
    console.log('WS-CLIENT-CONNECTED - Total clients:', connectedClients.size + 1);
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('WS-CLIENT-DISCONNECTED - Total clients:', connectedClients.size - 1);
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WS-CLIENT-ERROR:', error);
      connectedClients.delete(ws);
    });
  });

  console.log('WebSocket server started on port 8082');
}

// Broadcast message to all connected clients
function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  console.log('WEBSOCKET-BROADCAST:', { clientCount: connectedClients.size, message });
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      console.log('SENT-TO-CLIENT');
    } else {
      console.log('CLIENT-NOT-READY:', client.readyState);
    }
  });
}

// Handle function calls from VAPI
async function handleFunctionCall(functionCall: { name: string; parameters: any }) {
  const { name, parameters } = functionCall;
  
  switch (name) {
    case 'executeCameraMovement':
      return executeCameraMovement(parameters);
    case 'processPurchase':
      return await processPurchase(parameters);
    default:
      return { 
        success: false, 
        message: `Unknown function: ${name}` 
      };
  }
}

// Predefined camera positions
const cameraPositions: Record<string, { x: number; y: number; z: number; target: { x: number; y: number; z: number } }> = {
  front: { x: 0, y: 2.5, z: 5, target: { x: 0, y: 0.5, z: 0 } },
  back: { x: 0, y: 2.5, z: -5, target: { x: 0, y: 0.5, z: 0 } },
  left: { x: -5, y: 2.5, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  right: { x: 5, y: 2.5, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  top: { x: 0, y: 7, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  bottom: { x: 0, y: -3, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  front_view: { x: 0, y: 2.5, z: 5, target: { x: 0, y: 0.5, z: 0 } },
  side_view: { x: 5, y: 2.5, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  top_view: { x: 0, y: 7, z: 0, target: { x: 0, y: 0.5, z: 0 } },
  isometric: { x: 3, y: 5, z: 3, target: { x: 0, y: 0.5, z: 0 } }
};

function moveToNamedPosition(positionName: string) {
  const normalizedName = positionName.toLowerCase().replace(/\s+/g, '_');
  
  // Try exact match first
  if (cameraPositions[normalizedName]) {
    return cameraPositions[normalizedName];
  }
  
  // Try partial matches
  for (const [key, position] of Object.entries(cameraPositions)) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return position;
    }
  }
  
  // Try word matches in the position name
  const words = normalizedName.split(/[\s_-]+/);
  for (const word of words) {
    for (const [key, position] of Object.entries(cameraPositions)) {
      if (key.includes(word) || word.includes(key)) {
        return position;
      }
    }
  }
  
  return null;
}

function executeCameraMovement(params: any) {
  console.log('CAMERA-MOVEMENT:', JSON.stringify(params, null, 2));
  
  // First check for named position (prioritize this over coordinates)
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      const namedPosition = moveToNamedPosition(value);
      if (namedPosition) {
        const { x, y, z, target } = namedPosition;
        console.log('BROADCAST-NAMED:', { position: value, coords: { x, y, z, target } });
        console.log('CLIENT-COUNT:', connectedClients.size);
        
        // Add a small delay to ensure clients are ready
        setTimeout(() => {
          broadcastToClients({
            type: 'cameraCommand',
            action: 'moveTo',
            params: { x, y, z, target }
          });
        }, 100);
        
        return { 
          success: true, 
          message: `Camera moved to ${value} view` 
        };
      }
    }
  }
  
  // Only use direct coordinates if no named position found
  if (typeof params.x === 'number' && typeof params.y === 'number' && typeof params.z === 'number') {
    console.log('BROADCAST-COORDS:', { x: params.x, y: params.y, z: params.z, target: params.target });
    console.log('CLIENT-COUNT:', connectedClients.size);
    
    setTimeout(() => {
      broadcastToClients({
        type: 'cameraCommand',
        action: 'moveTo',
        params: { x: params.x, y: params.y, z: params.z, target: params.target }
      });
    }, 100);
    
    return { 
      success: true, 
      message: `Camera moved to position ${params.x}, ${params.y}, ${params.z}` 
    };
  }
  
  return { 
    success: false, 
    message: `Invalid camera position. Available positions: ${Object.keys(cameraPositions).join(', ')}` 
  };
}

// Track processed purchases to prevent duplicates
const processedPurchases = new Set<string>();

async function processPurchase(productIdParam: string | any, quantity: number = 1) {
  try {
    // Handle case where productId is passed as an object
    let productId: string;
    if (typeof productIdParam === 'object' && productIdParam.productId) {
      productId = productIdParam.productId;
      quantity = productIdParam.quantity || quantity;
    } else {
      productId = productIdParam;
    }
    
    console.log('Processing purchase:', { productId, quantity });
    
    if (!productId) {
      return {
        success: false,
        message: 'Product ID is required for purchase'
      };
    }

    // Create unique purchase ID to prevent duplicates
    const purchaseKey = `${productId}-${quantity}-${Date.now()}`;
    
    // Check for recent duplicate purchases (within 5 seconds)
    const recentPurchases = Array.from(processedPurchases).filter(key => {
      const timestamp = parseInt(key.split('-').pop() || '0');
      return Date.now() - timestamp < 5000; // 5 second window
    });
    
    const isDuplicate = recentPurchases.some(key => 
      key.startsWith(`${productId}-${quantity}`)
    );
    
    if (isDuplicate) {
      console.log('Duplicate purchase request ignored:', purchaseKey);
      return {
        success: true,
        message: 'Purchase already processed'
      };
    }
    
    // Add to processed purchases and clean up old entries
    processedPurchases.add(purchaseKey);
    setTimeout(() => {
      processedPurchases.delete(purchaseKey);
    }, 10000); // Clean up after 10 seconds

    // Try to fetch product dynamically from local storage first
    let actualProductData = null;
    
    try {
      console.log('Attempting to fetch product dynamically:', productId);
      
      // For local products, try to get from localStorage/file system
      if (productId.startsWith('product_')) {
        // Import the product storage utilities
        const { getAllLocalProducts } = await import('@/lib/utils/server-product-utils');
        const { convertVendorProductToShopifyProduct } = await import('@/lib/utils/product-converter');
        
        const localProducts = getAllLocalProducts();
        const vendorProduct = localProducts.find(p => p.id === productId);
        
        if (vendorProduct) {
          console.log('Found local product:', vendorProduct.title);
          const shopifyProduct = convertVendorProductToShopifyProduct(vendorProduct);
          
          actualProductData = {
            id: shopifyProduct.id,
            title: shopifyProduct.title,
            handle: shopifyProduct.handle,
            description: shopifyProduct.description,
            price: shopifyProduct.priceRange.minVariantPrice.amount,
            image: shopifyProduct.featuredImage?.url || '/placeholder-product.jpg',
            variantId: shopifyProduct.variants[0]?.id || `${productId}-variant-1`
          };
        }
      } else {
        // For Shopify products, use getProduct with handle
        const product = await getProduct(productId);
        
        if (product) {
          console.log('Found Shopify product:', product.title);
          actualProductData = {
            id: product.id,
            title: product.title,
            handle: product.handle,
            description: product.description,
            price: product.priceRange.minVariantPrice.amount,
            image: product.featuredImage?.url || '/placeholder-product.jpg',
            variantId: product.variants[0]?.id || `${productId}-variant-1`
          };
        }
      }
      
      // If we found product data, use it; otherwise fall back to generic data
      if (actualProductData) {
        console.log('Using actual product data for:', actualProductData.title);
        
        // Use the local variant ID from product data
        const variantId = actualProductData.variantId;
        
        // Create a cart item structure for the local cart
        const globalPurchaseId = `purchase-${productId}-${quantity}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const cartItem = {
          id: `temp-${Date.now()}`,
          quantity: quantity,
          cost: {
            totalAmount: {
              amount: actualProductData.price,
              currencyCode: 'USD',
            },
          },
          merchandise: {
            id: variantId,
            title: actualProductData.title,
            selectedOptions: [],
            product: {
              id: actualProductData.id,
              title: actualProductData.title,
              handle: actualProductData.handle,
              categoryId: undefined,
              description: actualProductData.description,
              descriptionHtml: actualProductData.description,
              featuredImage: { 
                url: actualProductData.image, 
                altText: actualProductData.title, 
                height: 400, 
                width: 400 
              },
              currencyCode: 'USD',
              priceRange: {
                maxVariantPrice: { amount: actualProductData.price, currencyCode: 'USD' },
                minVariantPrice: { amount: actualProductData.price, currencyCode: 'USD' },
              },
            },
          },
        };
        
        // Broadcast cart update to connected clients so they can add to local cart
        broadcastToClients({
          type: 'addToCart',
          action: 'addItem',
          productId: actualProductData.id,
          variantId: variantId,
          quantity: quantity,
          cartItem: cartItem,
          globalPurchaseId: globalPurchaseId
        });
        
        return {
          success: true,
          message: `Added ${quantity} item(s) to cart successfully!`
        };
      } else {
        console.log('No product data found, using fallback');
      }
    } catch (error) {
      console.log('Failed to fetch product dynamically:', error);
    }
    
    // Fallback to hardcoded products if dynamic fetch fails
    const productMap: Record<string, any> = {
      'gid://shopify/Product/8007099007164': {
        id: 'gid://shopify/Product/8007099007164',
        title: 'Black Leather Sneaker',
        handle: 'black-leather-sneaker',
        description: 'Elevate your style with this sleek black leather sneaker, perfect for casual wear.',
        price: '120.00',
        image: '/black-leather-sneaker.jpg',
        variantId: 'gid://shopify/ProductVariant/44007099007164'
      },
      'gid://shopify/Product/9066579820795': {
        id: 'gid://shopify/Product/9066579820795',
        title: 'Verde Leather Lounge Chair',
        handle: 'verde-leather-lounge-chair',
        description: 'A luxurious leather lounge chair in verde green',
        price: '499.00',
        image: 'https://cdn-images.article.com/products/SKU24063/2890x1500/image151777.jpg?fit=max&w=1200&q=100',
        variantId: 'gid://shopify/ProductVariant/49066579820795'
      },
      'product_verde_leather_lounge_chair': {
        id: 'product_verde_leather_lounge_chair',
        title: 'Verde Leather Lounge Chair',
        handle: 'verde-leather-lounge-chair',
        description: 'A luxurious leather lounge chair in verde green',
        price: '1299.00',
        image: '/verde-chair.jpg',
        variantId: 'product_verde_leather_lounge_chair-variant-1'
      }
    };

    // Map product names to IDs (for when VAPI sends product names instead of IDs)
    const productNameToIdMap: Record<string, string> = {
      'Black Leather Sneaker': 'gid://shopify/Product/8007099007164',
      'black-leather-sneaker': 'gid://shopify/Product/8007099007164'
    };
    
    // First, try to normalize the productId if it's a product name
    let normalizedProductId = productId;
    if (productNameToIdMap[productId]) {
      normalizedProductId = productNameToIdMap[productId];
      console.log(`Mapped product name "${productId}" to ID "${normalizedProductId}"`);
    }
    
    actualProductData = productMap[normalizedProductId];
    
    // Final fallback: create dynamic product data
    if (!actualProductData) {
      console.log('Creating fallback dynamic product:', productId);
      
      // Ensure productId is a string
      const productIdString = String(productId);
      
      actualProductData = {
        id: productIdString,
        title: productIdString.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        handle: productIdString.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: `Custom product: ${productIdString}`,
        price: '99.99',
        image: '/placeholder-product.jpg',
        variantId: `${productIdString}-variant-1`
      };
      
      console.log('Generated fallback product:', actualProductData);
    }
    
    // Use the local variant ID from product data
    const variantId = actualProductData.variantId;
    
    // Create a cart item structure for the local cart
    const globalPurchaseId = `purchase-${productId}-${quantity}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const cartItem = {
      id: `temp-${Date.now()}`,
      quantity: quantity,
      cost: {
        totalAmount: {
          amount: actualProductData.price,
          currencyCode: 'USD',
        },
      },
      merchandise: {
        id: variantId,
        title: actualProductData.title,
        selectedOptions: [],
        product: {
          id: actualProductData.id,
          title: actualProductData.title,
          handle: actualProductData.handle,
          categoryId: undefined,
          description: actualProductData.description,
          descriptionHtml: actualProductData.description,
          featuredImage: { 
            url: actualProductData.image, 
            altText: actualProductData.title, 
            height: 400, 
            width: 400 
          },
          currencyCode: 'USD',
          priceRange: {
            maxVariantPrice: { amount: actualProductData.price, currencyCode: 'USD' },
            minVariantPrice: { amount: actualProductData.price, currencyCode: 'USD' },
          },
        },
      },
    };
    
    // Broadcast cart update to connected clients so they can add to local cart
    broadcastToClients({
      type: 'addToCart',
      action: 'addItem',
      productId: actualProductData.id,
      variantId: variantId,
      quantity: quantity,
      cartItem: cartItem,
      globalPurchaseId: globalPurchaseId
    });
    
    return {
      success: true,
      message: `Added ${quantity} item(s) to cart successfully!`
    };
  } catch (error) {
    console.error('Error processing purchase:', error);
    return {
      success: false,
      message: 'An error occurred while processing the purchase'
    };
  }
}

// Initialize WebSocket server immediately when module loads
initWebSocketServer();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (message?.type === 'tool-calls' && message?.toolCallList) {
      console.log('TOOL-CALLS:', JSON.stringify(message.toolCallList, null, 2));
      
      const results = [];
      
      // Process each tool call in the list
      for (const toolCall of message.toolCallList) {
        // VAPI sends tool calls with nested structure: toolCall.function.name and toolCall.function.arguments
        const functionName = toolCall.function?.name || toolCall.name;
        const functionArgs = toolCall.function?.arguments || toolCall.arguments;
        
        if (!functionName) {
          continue;
        }
        
        const result = await handleFunctionCall({
          name: functionName,
          parameters: functionArgs
        });
        
        results.push({
          toolCallId: toolCall.id,
          result: result
        });
      }
      
      res.json({ results });
    } else {
      res.json({ received: true });
    }
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Request headers:', JSON.stringify(req.headers, null, 2));
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('====================');
    res.status(500).json({ error: error.message });
  }
}
