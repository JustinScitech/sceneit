import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
    apiFormData.append('image', blob, imageFile.name || 'image.jpg')
    
    console.log('Calling TripoSG + MV-Adapter GLB generation API...')
    
    // Call the new GLB generation API (no query parameters needed)
    const response = await fetch(`http://129.158.241.97:8000/generate-glb`, {
      method: 'POST',
      body: apiFormData,
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(1800000) // 30 minute timeout
    })
    
    console.log(`External API response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`External API error: ${response.status} ${response.statusText} - ${errorText}`)
      throw new Error(`External API returned ${response.status}: ${response.statusText}`)
    }
    
    // Get the GLB file as a buffer
    const glbBuffer = await response.arrayBuffer()
    console.log(`Received GLB file, size: ${glbBuffer.byteLength} bytes`)
    
    // Create filename from product title
    const sanitizedTitle = productTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const filename = `${sanitizedTitle}.glb`
    
    // Save to public/3D directory
    const publicDir = path.join(process.cwd(), 'public', '3D')
    const filePath = path.join(publicDir, filename)
    
    // Ensure directory exists
    await mkdir(publicDir, { recursive: true })
    
    console.log(`Saving GLB file to: ${filePath}`)
    
    // Write the GLB file
    await writeFile(filePath, Buffer.from(glbBuffer))
    
    console.log(`Successfully saved 3D model: ${filename}`)
    
    return NextResponse.json({ 
      success: true, 
      filename,
      path: `/3D/${filename}`,
      message: `3D model saved as ${filename}` 
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