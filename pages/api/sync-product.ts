import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const PRODUCTS_FILE = path.join(process.cwd(), 'data', 'products.json');

// Ensure data directory exists
const dataDir = path.dirname(PRODUCTS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const product = req.body;
    
    if (!product || !product.id) {
      return res.status(400).json({ error: 'Invalid product data' });
    }

    // Read existing products
    let products = [];
    if (fs.existsSync(PRODUCTS_FILE)) {
      const fileContent = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      products = JSON.parse(fileContent);
    }

    // Add or update the product
    const existingIndex = products.findIndex((p: any) => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.push(product);
    }

    // Write back to file
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    
    res.status(200).json({ 
      success: true, 
      message: 'Product synced successfully' 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
