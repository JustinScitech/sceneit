import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('file') as File
    const productTitle = formData.get('productTitle') as string
    
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }
    
    if (!productTitle) {
      return NextResponse.json({ error: 'No product title provided' }, { status: 400 })
    }
    
    console.log(`Processing 3D model generation for: ${productTitle}`)
    console.log(`Image file size: ${imageFile.size} bytes`)
    
    // Convert the File to a Buffer for the external API
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    
    // Create FormData for the external API call using Node.js compatible approach
    const apiFormData = new FormData()
    const blob = new Blob([imageBuffer], { type: imageFile.type || 'image/jpeg' })
    apiFormData.append('file', blob, imageFile.name || 'image.jpg')
    
    console.log('Calling external 3D conversion API...')
    
    // Add query parameters for the new API (using faster, lower resolution settings)
    const params = new URLSearchParams({
      compress: 'true',
      compression: 'zip',
      bake_texture: 'true',
      texture_resolution: '1024', // Reduced from 2048 for faster processing
      mc_resolution: '256'        // Reduced from 512 for faster processing
    })
    
    // Call the updated 3D conversion API with timeout
    const response = await fetch(`http://129.158.241.97:8000/convert?${params}`, {
      method: 'POST',
      body: apiFormData,
      // Add timeout to prevent hanging (increased for texture baking)
      signal: AbortSignal.timeout(1800000) // 30 minute timeout (1800 seconds like the script)
    })
    
    console.log(`External API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`External API error: ${response.status} ${response.statusText} - ${errorText}`)
      throw new Error(`External API returned ${response.status}: ${response.statusText}`)
    }
    
    // Get the ZIP file as a buffer
    const zipBuffer = await response.arrayBuffer()
    console.log(`Received ZIP file, size: ${zipBuffer.byteLength} bytes`)
    
    // Create directory name from product title
    const sanitizedTitle = productTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    
    // Create directories for the product
    const publicDir = path.join(process.cwd(), 'public', '3D')
    const productDir = path.join(publicDir, sanitizedTitle)
    
    // Ensure directories exist
    await mkdir(publicDir, { recursive: true })
    await mkdir(productDir, { recursive: true })
    
    console.log(`Extracting ZIP to: ${productDir}`)
    
    // Extract ZIP file using adm-zip
    const zip = new AdmZip(Buffer.from(zipBuffer))
    const zipEntries = zip.getEntries()
    
    let objFile = ''
    let mtlFile = ''
    let textureFile = ''
    
    // Extract each file from the ZIP
    for (const entry of zipEntries) {
      const entryPath = path.join(productDir, entry.entryName)
      const entryContent = entry.getData()
      
      console.log(`Extracting: ${entry.entryName} (${entryContent.length} bytes)`)
      await writeFile(entryPath, entryContent)
      
      // Keep track of important files
      if (entry.entryName.endsWith('.obj')) {
        objFile = entry.entryName
      } else if (entry.entryName.endsWith('.mtl')) {
        mtlFile = entry.entryName
      } else if (entry.entryName.endsWith('.png')) {
        textureFile = entry.entryName
      }
    }
    
    console.log(`Successfully extracted 3D model files to: ${sanitizedTitle}/`)
    console.log(`Files: OBJ=${objFile}, MTL=${mtlFile}, Texture=${textureFile}`)
    
    return NextResponse.json({ 
      success: true, 
      productDir: sanitizedTitle,
      files: {
        obj: objFile,
        mtl: mtlFile,
        texture: textureFile
      },
      path: `/3D/${sanitizedTitle}/`,
      message: `3D model extracted to ${sanitizedTitle}/` 
    })
    
  } catch (error) {
    console.error('Error generating 3D model:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate 3D model', details: errorMessage },
      { status: 500 }
    )
  }
}