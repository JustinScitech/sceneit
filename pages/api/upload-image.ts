import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFiles = Array.isArray(files.images) ? files.images : [files.images].filter(Boolean);
    
    if (!uploadedFiles.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const savedImages = uploadedFiles.map((file: File) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const extension = path.extname(file.originalFilename || '');
      const newFilename = `img_${timestamp}_${randomId}${extension}`;
      const newPath = path.join(UPLOAD_DIR, newFilename);
      
      // Move file to final location
      fs.renameSync(file.filepath, newPath);
      
      return {
        id: `img_${timestamp}_${randomId}`,
        filename: newFilename,
        originalName: file.originalFilename,
        url: `/uploads/${newFilename}`,
        size: file.size,
        type: file.mimetype,
        createdAt: new Date().toISOString(),
      };
    });

    res.status(200).json({ 
      success: true, 
      images: savedImages 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
