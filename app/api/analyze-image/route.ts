import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  // Initialize Groq client inside the function to ensure env vars are loaded
  const apiKey = process.env.GROQ_API_KEY;
  console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('GROQ')));
  console.log('GROQ_API_KEY exists:', !!apiKey);
  console.log('GROQ_API_KEY length:', apiKey?.length);
  console.log('GROQ_API_KEY value (first 10 chars):', apiKey?.substring(0, 10));
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY environment variable not set' },
      { status: 500 }
    );
  }

  const groq = new Groq({
    apiKey: apiKey,
  });
  try {
    // Check if GROQ API key is available
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured. Image analysis is disabled.' },
        { status: 503 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this product image and return product information in JSON format. Include: title (concise product name), description (short marketing tagline or summary sentence), detailedDescription (comprehensive product description with 3-5 sentences telling the product story, followed by key buyer specifications formatted as bullet points with • symbols like "• Dimensions: X", "• Material: Y", etc.), price (estimated retail price in USD), category (from: Electronics, Clothing, Home & Garden, Sports & Outdoors, Books, Toys & Games, Health & Beauty, Automotive), inventory (estimated stock quantity between 10-100), and suggested_sku (alphanumeric code). Structure it like a premium product listing that helps buyers make informed decisions.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    
    try {
      const productData = JSON.parse(responseContent);
      return NextResponse.json(productData);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', responseContent);
      
      // Fallback response
      return NextResponse.json({
        title: 'Product Title',
        description: 'Premium product for discerning customers.',
        detailedDescription: responseContent,
        price: '0.00',
        category: 'Electronics',
        inventory: 50,
        suggested_sku: 'SKU-001'
      });
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
