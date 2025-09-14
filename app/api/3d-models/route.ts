import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // Get the path to the public/3D directory
    const modelsDirectory = path.join(process.cwd(), 'public', '3D')
    
    // Read all files in the directory
    const files = await readdir(modelsDirectory)
    
    // Filter to only include GLB files
    const glbFiles = files.filter(file => file.toLowerCase().endsWith('.glb'))
    
    // Sort alphabetically for consistent ordering
    glbFiles.sort()
    
    console.log(`Found ${glbFiles.length} GLB files in public/3D/: ${glbFiles.join(', ')}`)
    
    return NextResponse.json(glbFiles)
    
  } catch (error) {
    console.error('Error reading 3D models directory:', error)
    
    // Return fallback models if directory read fails
    const fallbackModels = ['lamp.glb', 'chair.glb', 'shoe.glb']
    
    return NextResponse.json(fallbackModels, { 
      status: 200,
      headers: {
        'X-Fallback': 'true'
      }
    })
  }
}