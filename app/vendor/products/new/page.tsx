"use client"

import type React from "react"

import { VendorAuthGuard } from "@/components/vendor/vendor-auth-guard"
import { VendorHeader } from "@/components/vendor/vendor-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { productStorage } from "@/lib/utils/product-storage"
import { fileImageStorage } from "@/lib/utils/file-image-storage"

const categories = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports & Outdoors",
  "Books",
  "Toys & Games",
  "Health & Beauty",
  "Automotive",
]

export default function NewProduct() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([]) // Store actual files
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    detailedDescription: "",
    price: "",
    category: "",
    inventory: "",
    sku: "",
    isActive: true,
  })

  const analyzeImage = async (imageFile: File) => {
    setIsAnalyzingImage(true)
    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData }),
        })

        if (response.ok) {
          const productData = await response.json()
          setFormData((prev) => ({ 
            ...prev, 
            title: productData.title || prev.title,
            description: productData.description || prev.description,
            detailedDescription: productData.detailedDescription || prev.detailedDescription,
            price: productData.price || prev.price,
            category: productData.category || prev.category,
            inventory: productData.inventory || prev.inventory,
            sku: productData.suggested_sku || prev.sku,
          }))
          toast.success("AI analysis complete! Product details generated.")
        } else {
          toast.error("Failed to analyze image. Please try again.")
        }
      }
      reader.readAsDataURL(imageFile)
    } catch (error) {
      console.error('Error analyzing image:', error)
      toast.error("Failed to analyze image. Please try again.")
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      
      // Create URLs for immediate display
      const newImageUrls = fileArray.map((file) => URL.createObjectURL(file))
      setImages((prev) => [...prev, ...newImageUrls].slice(0, 5)) // Max 5 images
      
      // Store the actual files for later processing
      setImageFiles((prev) => [...prev, ...fileArray].slice(0, 5))
      
      // If this is the first image and description is empty, analyze it
      if (images.length === 0 && !formData.description.trim()) {
        await analyzeImage(fileArray[0])
      }
    }
  }

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    if (images[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(images[index])
    }
    
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  const generateGLBModel = async (imageFile: File, productTitle: string) => {
    try {
      // Create FormData for the API call
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('productTitle', productTitle)
      
      // Call our internal API endpoint that handles the 3D conversion
      const response = await fetch('/api/generate-3d-model', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        console.error('API Error Response:', result)
        throw new Error(result.error || result.details || `API returned ${response.status}`)
      }
      
      toast.success(`3D model saved to public/3D/${result.filename}`)
      return true
    } catch (error) {
      console.error('Error generating 3D model:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to generate 3D model: ${errorMessage}. The product was still created successfully.`)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (images.length === 0) {
      toast.error("Please upload at least one product image.")
      return
    }
    
    if (!formData.title.trim()) {
      toast.error("Please enter a product title.")
      return
    }
    
    if (!formData.description.trim()) {
      toast.error("Please enter a product description.")
      return
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price.")
      return
    }
    
    if (!formData.category) {
      toast.error("Please select a category.")
      return
    }
    
    setIsLoading(true)

    try {
      // Store images using file system instead of localStorage
      const storedImages = await fileImageStorage.storeImagesWithMetadata(imageFiles)
      const imageUrls = storedImages.map(img => img.url)
      
      // Create product data structure
      const productData = {
        vendorId: "1", // Mock vendor ID - replace with actual vendor ID
        title: formData.title.trim(),
        description: formData.description.trim(),
        detailedDescription: formData.detailedDescription.trim(),
        price: parseFloat(formData.price),
        images: imageUrls, // Use the file URLs instead of base64 data
        category: formData.category,
        tags: tags,
        inventory: parseInt(formData.inventory) || 0,
        sku: formData.sku.trim() || `SKU-${Date.now()}`,
        isActive: formData.isActive,
      };

      // Save product to localStorage
      const savedProduct = productStorage.saveProduct(productData);
      
      toast.success(`Product "${savedProduct.title}" created successfully!`)
      
      // Generate 3D model from the first uploaded image
      if (imageFiles.length > 0) {
        toast.info("Generating 3D model... This may take a moment.")
        await generateGLBModel(imageFiles[0], savedProduct.title)
      }
      
      router.push("/vendor/products")
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error("Failed to create product. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <VendorAuthGuard requireApproval>
      <div className="space-y-6">
        <VendorHeader
          title="Add New Product"
          description="Create a new product for your store"
          action={
            <Button variant="outline" asChild>
              <Link href="/vendor/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
          }
        />

        <div className="px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Product Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Product Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter product title"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description">Short Description</Label>
                        <div className="flex items-center space-x-2">
                          {images.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Re-analyze the first image
                                const firstImage = images[0]
                                if (firstImage) {
                                  fetch(firstImage)
                                    .then(res => res.blob())
                                    .then(blob => {
                                      const file = new File([blob], "image.jpg", { type: blob.type })
                                      analyzeImage(file)
                                    })
                                }
                              }}
                              disabled={isAnalyzingImage}
                              className="text-xs"
                            >
                              🤖 Re-analyze Image
                            </Button>
                          )}
                          {isAnalyzingImage && (
                            <span className="text-sm text-blue-600 flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                              AI analyzing image...
                            </span>
                          )}
                        </div>
                      </div>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Short marketing tagline or summary sentence..."
                        rows={2}
                        disabled={isAnalyzingImage}
                        className={isAnalyzingImage ? "opacity-50" : ""}
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Brief tagline that appears in product summary areas.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="detailedDescription">Detailed Description</Label>
                      <Textarea
                        id="detailedDescription"
                        value={formData.detailedDescription}
                        onChange={(e) => setFormData((prev) => ({ ...prev, detailedDescription: e.target.value }))}
                        placeholder="Comprehensive product description with specifications. Use • for bullet points..."
                        rows={8}
                        disabled={isAnalyzingImage}
                        className={isAnalyzingImage ? "opacity-50" : ""}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Detailed product information with specifications. Use • symbols for bullet points.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-1">
                      <div>
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Product Images
                      <span className="text-sm font-normal text-red-500">*Required</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                        {images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image || "/placeholder.svg"}
                              alt={`Product ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {index === 0 && (
                              <Badge className="absolute bottom-2 left-2 bg-blue-600">
                                Main Image
                              </Badge>
                            )}
                          </div>
                        ))}
                        {images.length < 5 && (
                          <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="mt-2 text-sm text-muted-foreground">Upload Image</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Upload up to 5 images. First image will be the main product image.
                        </p>
                        <p className="text-sm text-blue-600">
                          📋 The first image will be automatically analyzed by AI to generate all product details (title, description, price, category, SKU).
                        </p>
                        <p className="text-sm text-green-600">
                          🎯 When you create the product, a 3D model (.glb file) will be automatically generated from the first image and saved to public/3D/.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                        placeholder="Product SKU"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="inventory">Inventory</Label>
                      <Input
                        id="inventory"
                        type="number"
                        value={formData.inventory}
                        onChange={(e) => setFormData((prev) => ({ ...prev, inventory: e.target.value }))}
                        placeholder="0"
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive">Active Product</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Creating Product & 3D Model..." : "Create Product"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </VendorAuthGuard>
  )
}
