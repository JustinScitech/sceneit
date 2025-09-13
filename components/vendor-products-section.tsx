"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart } from "lucide-react"
import Link from "next/link"
import type { VendorProduct } from "@/lib/types/vendor"

// Mock vendor products - replace with real API calls
const mockVendorProducts: (VendorProduct & { vendorName: string; rating: number })[] = [
  {
    id: "1",
    vendorId: "1",
    vendorName: "Tech Gadgets Pro",
    title: "Wireless Bluetooth Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 299.99,
    compareAtPrice: 399.99,
    images: ["/diverse-people-listening-headphones.png"],
    category: "Electronics",
    tags: ["wireless", "bluetooth", "headphones"],
    inventory: 25,
    sku: "WBH-001",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    rating: 4.8,
  },
  {
    id: "2",
    vendorId: "2",
    vendorName: "Artisan Handmade Crafts",
    title: "Handcrafted Ceramic Vase",
    description: "Beautiful handmade ceramic vase perfect for home decoration",
    price: 89.99,
    images: ["/ceramic-vase.jpg"],
    category: "Home & Garden",
    tags: ["handmade", "ceramic", "vase"],
    inventory: 8,
    sku: "HCV-002",
    isActive: true,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
    rating: 4.9,
  },
  {
    id: "3",
    vendorId: "3",
    vendorName: "Adventure Outdoor Gear",
    title: "Professional Hiking Backpack",
    description: "Durable 40L hiking backpack with multiple compartments",
    price: 159.99,
    compareAtPrice: 199.99,
    images: ["/hiking-backpack.jpg"],
    category: "Sports & Outdoors",
    tags: ["hiking", "backpack", "outdoor"],
    inventory: 15,
    sku: "PHB-003",
    isActive: true,
    createdAt: "2024-01-05T10:00:00Z",
    updatedAt: "2024-01-05T10:00:00Z",
    rating: 4.7,
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
  const products = limit ? mockVendorProducts.slice(0, limit) : mockVendorProducts

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
