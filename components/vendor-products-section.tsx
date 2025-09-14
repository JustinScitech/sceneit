"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import type { VendorProduct } from "@/lib/types/vendor"
import { productStorage } from "@/lib/utils/product-storage"

// Mock vendor products - replace with real API calls
const mockVendorProducts: (VendorProduct & { vendorName: string; rating: number })[] = [
  {
    id: "1",
    vendorId: "1",
    vendorName: "SceneIt Demo",
    title: "Voice AI Shopping Experience",
    description: "Experience the future of shopping! Our voice AI agent will guide you through this product in 3D, showing different angles and environments. Just say 'Show me more' to get started.",
    price: 0.00,
    images: ["/modern-smartwatch.png"],
    category: "Electronics",
    tags: ["voice-ai", "3d", "demo"],
    inventory: 999,
    sku: "VOICE-AI-001",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    rating: 5.0,
  },
  {
    id: "2",
    vendorId: "2",
    vendorName: "3D Marketplace",
    title: "Interactive Product Tour",
    description: "Talk to our AI agent and explore products like never before. Ask questions, request different views, and get personalized recommendations through voice interaction.",
    price: 0.00,
    images: ["/diverse-people-listening-headphones.png"],
    category: "Electronics", 
    tags: ["interactive", "voice", "3d-tour"],
    inventory: 999,
    sku: "VOICE-AI-002",
    isActive: true,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
    rating: 5.0,
  },
  {
    id: "3",
    vendorId: "3",
    vendorName: "AI Shopping Assistant",
    title: "Try Voice Commerce",
    description: "Step into the next generation of e-commerce. Our voice AI will showcase products with dynamic camera movements and help you make informed purchase decisions.",
    price: 0.00,
    images: ["/ceramic-vase.jpg"],
    category: "Home & Garden",
    tags: ["ai-assistant", "voice-commerce", "demo"],
    inventory: 999,
    sku: "VOICE-AI-003",
    isActive: true,
    createdAt: "2024-01-05T10:00:00Z",
    updatedAt: "2024-01-05T10:00:00Z",
    rating: 5.0,
  },
]

interface VendorProductsSectionProps {
  title?: string
  showVendorName?: boolean
  limit?: number
}

export function VendorProductsSection({
  title = "Featured Vendor Products",
  showVendorName = true,
  limit,
}: VendorProductsSectionProps) {
  const [products, setProducts] = useState<(VendorProduct & { vendorName: string; rating: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProducts = () => {
      try {
        // Get locally stored products
        const localProducts = productStorage.getAllProducts()
        
        // Convert local products to include vendor name and rating
        const localProductsWithMeta = localProducts
          .filter(product => product.isActive)
          .map(product => ({
            ...product,
            vendorName: "Local Creator", // Default vendor name for local products
            rating: Math.floor(4.5 + Math.random() * 0.5), // Random rating between 4.5-5.0
          }))

        // Combine with mock products
        const allProducts = [...localProductsWithMeta, ...mockVendorProducts]
        
        // Apply limit if specified
        const finalProducts = limit ? allProducts.slice(0, limit) : allProducts
        
        setProducts(finalProducts)
      } catch (error) {
        console.error('Error loading products:', error)
        // Fallback to mock products only
        const finalProducts = limit ? mockVendorProducts.slice(0, limit) : mockVendorProducts
        setProducts(finalProducts)
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [limit])

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">{title}</h2>
            <Button variant="outline" asChild>
              <Link href="/vendors">View All Vendors</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: limit || 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted"></div>
                <CardHeader className="pb-3">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-4 bg-muted rounded mb-4"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">{title}</h2>
          <Button variant="outline" asChild>
            <Link href="/vendors">View All Vendors</Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative">
                <img
                  src={product.images[0] || "/placeholder.svg"}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {product.compareAtPrice && (
                  <Badge className="absolute top-2 left-2 bg-red-500">
                    Save ${(product.compareAtPrice - product.price).toFixed(2)}
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-3">
                {showVendorName && <p className="text-sm text-muted-foreground">by {product.vendorName}</p>}
                <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium ml-1">{product.rating}</span>
                  </div>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{product.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">${product.price}</span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-muted-foreground line-through">${product.compareAtPrice}</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{product.inventory} in stock</span>
                </div>
                <Button className="w-full">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
