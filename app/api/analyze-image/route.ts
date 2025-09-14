import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
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
              text: 'Analyze this product image and return product information in JSON format. Include: title (concise product name), description (marketing-friendly detailed minimum 300 words maximum 1000 words, with key parts of the object described separately), price (estimated retail price in USD), category (from: Electronics, Clothing, Home & Garden, Sports & Outdoors, Books, Toys & Games, Health & Beauty, Automotive), and suggested_sku (alphanumeric code). Be specific and accurate based on what you see in the image.',
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
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback to simple description if JSON parsing fails
      return NextResponse.json({ 
        description: responseContent,
        title: 'Product Title',
        price: '0.00',
        category: 'Electronics',
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
