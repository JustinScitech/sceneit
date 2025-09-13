"use client"

import { VendorAuthGuard } from "@/components/vendor/vendor-auth-guard"
import { VendorHeader } from "@/components/vendor/vendor-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Eye, Package } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import type { VendorProduct } from "@/lib/types/vendor"

// Mock data - replace with real API calls
const mockProducts: VendorProduct[] = [
  {
    id: "1",
    vendorId: "1",
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
  },
  {
    id: "2",
    vendorId: "1",
    title: "Smart Fitness Watch",
    description: "Track your fitness goals with this advanced smartwatch",
    price: 199.99,
    images: ["/modern-smartwatch.png"],
    category: "Electronics",
    tags: ["fitness", "smartwatch", "health"],
    inventory: 15,
    sku: "SFW-002",
    isActive: false,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
  },
]

export default function VendorProducts() {
  const [products] = useState<VendorProduct[]>(mockProducts)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProducts = products.filter(
    (product) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <VendorAuthGuard requireApproval>
      <div className="space-y-6">
        <VendorHeader
          title="Products"
          description="Manage your product catalog"
          action={
            <Button asChild>
              <Link href="/vendor/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          }
        />

        <div className="px-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={product.images[0] || "/placeholder.svg"}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">${product.price}</span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-muted-foreground line-through">${product.compareAtPrice}</span>
                      )}
                    </div>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>SKU: {product.sku}</span>
                    <span>Stock: {product.inventory}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No products found</h3>
              <p className="mt-2 text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first product."}
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link href="/vendor/products/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </VendorAuthGuard>
  )
}
