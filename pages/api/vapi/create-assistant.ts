import { NextApiRequest, NextApiResponse } from 'next';
import { VapiClient } from '@vapi-ai/server-sdk';

const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug API key
  const apiKey = process.env.VAPI_API_KEY;
  console.log('VAPI_API_KEY exists:', !!apiKey);
  console.log('VAPI_API_KEY length:', apiKey?.length);
  console.log('VAPI_API_KEY first 10 chars:', apiKey?.substring(0, 10));

  if (!apiKey) {
    return res.status(500).json({ error: 'VAPI_API_KEY environment variable not set' });
  }

  try {
    const { productContext } = req.body;
    
    // Debug: Log the product context to see what data we're receiving
    console.log('VAPI Assistant Creation - Product Context:', JSON.stringify(productContext, null, 2));

    // First, create the custom tools
    const cameraMovementTool = await vapi.tools.create({
      type: "function",
      function: {
        name: "executeCameraMovement",
        description: "REQUIRED: Move the camera to show a different view of the product. This function MUST be called whenever the user asks to see the product from any angle, view, or position. Examples: 'show me the front', 'can I see the back', 'rotate to the side', 'top view', etc.",
        parameters: {
          type: "object",
          properties: {
            positionName: {
              type: "string",
              description: "The camera position name (e.g., 'front', 'left side', 'top view', 'back')"
            }
          },
          required: ["positionName"]
        }
      },
      server: {
        url: "https://62b81d1df9ad.ngrok-free.app/api/vapi/webhook"
      }
    });

    const purchaseTool = await vapi.tools.create({
      type: "function",
      function: {
        name: "processPurchase",
        description: "Process a purchase request for the current product",
        parameters: {
          type: "object",
          properties: {
            productId: {
              type: "string",
              description: "The product ID to purchase"
            },
            quantity: {
              type: "number",
              description: "Quantity to purchase"
            }
          },
          required: ["productId"]
        }
      },
      server: {
        url: "https://62b81d1df9ad.ngrok-free.app/api/vapi/webhook"
      }
    });

    // Create the assistant with the tools
    const assistant = await vapi.assistants.create({
      name: "Product Assistant",
      firstMessage: "Hello! I'm here to help you explore this amazing product. Let me guide you through its features!",
      model: {
        provider: "groq",
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Role & Persona:
You are an expert product consultant who can guide customers through product features, benefits, and visual exploration. You have deep knowledge about the ${productContext?.name || 'current product'}.

PRODUCT INFORMATION:
===================
Product ID: ${productContext?.id || 'unknown-product'}
Name: ${productContext?.name || 'Product'}
Price: ${productContext?.price || 'Contact for pricing'}
Short Description: ${productContext?.description || 'Premium product'}

${productContext?.detailedDescription ? `DETAILED PRODUCT SPECIFICATIONS:
${productContext.detailedDescription}

IMPORTANT: You have access to detailed product specifications above. When users ask about dimensions, materials, specifications, or technical details, refer to this detailed information. Do NOT say you don't have access to this information.` : ''}

Your primary responsibilities:
1. **Product Expertise**: Answer detailed questions about materials, dimensions, care instructions, and styling using the detailed specifications provided above
2. **Visual Guidance**: Help customers explore the product from different angles using camera movements
3. **Sales Support**: Highlight key features, benefits, and help with purchase decisions
4. **Interactive Experience**: Use the camera movement tool to show specific product details when requested

CRITICAL FUNCTION CALLING RULES:
• You MUST call executeCameraMovement function for ANY camera movement request
• Do NOT say "I'm moving the camera" or "Let me show you" - CALL THE FUNCTION FIRST
• Examples that REQUIRE function calls: "show me the front", "can I see the back", "rotate", "different angle", "top view", etc.
• Call the function BEFORE speaking about the movement
• Only describe what you see AFTER the function has been called

PURCHASE FUNCTION RULES:
• When processing purchases, you MUST ALWAYS use this EXACT Product ID: ${productContext?.id || 'unknown-product'}
• NEVER use "BLKSNEAKER-001" or any other product ID
• NEVER make up product IDs or use generic IDs
• The processPurchase function MUST be called with productId: "${productContext?.id || 'unknown-product'}"
• This is CRITICAL: Use "${productContext?.id || 'unknown-product'}" as the productId parameter
• Example: processPurchase({"productId": "${productContext?.id || 'unknown-product'}", "quantity": 1})

IMPORTANT: When asked about product specifications, dimensions, materials, or technical details, always check the DETAILED PRODUCT SPECIFICATIONS section above first. You have this information available - use it!

Communication Style:
- Professional yet approachable
- Enthusiastic about the product's unique features
- Helpful and informative
- Concise but thorough responses

Camera Positions Available:
• Front: Front view of the product, camera at (0, 2.5, 5), target at (0, 0.5, 0)
• Back: Back view, camera at (0, 2.5, -5), target at (0, 0.5, 0)
• Left: Left side view, camera at (-5, 2.5, 0), target at (0, 0.5, 0)
• Right: Right side view, camera at (5, 2.5, 0), target at (0, 0.5, 0)
• Top: Top-down view, camera at (0, 7, 0), target at (0, 0.5, 0)
• Bottom: Bottom view of the product, camera at (0, -3, 0), target at (0, 0.5, 0)
• Front View: Same as front – camera at (0, 2.5, 5), target at (0, 0.5, 0)
• Side View: Same as right side – camera at (5, 2.5, 0), target at (0, 0.5, 0)
• Top View: Same as top – camera at (0, 7, 0), target at (0, 0.5, 0)
• Isometric: Angled view, camera at (3, 5, 3), target at (0, 0.5, 0)

When the user asks for a position by name, use these coordinates to execute the camera movement.`
          }
        ],
        toolIds: [cameraMovementTool.id, purchaseTool.id]
      },
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM"
      },
      server: {
        url: "https://62b81d1df9ad.ngrok-free.app/api/vapi/webhook"
      }
    });

    console.log('Created assistant:', assistant.id);

    res.json({ 
      assistantId: assistant.id
    });

  } catch (error: any) {
    console.error('Failed to create assistant:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error
    });
  }
}
