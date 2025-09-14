"use client"

import { VendorAuthGuard } from "@/components/vendor/vendor-auth-guard"
import { VendorHeader } from "@/components/vendor/vendor-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Eye, Package } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import type { VendorProduct } from "@/lib/types/vendor"
import { productStorage } from "@/lib/utils/product-storage"
import { toast } from "sonner"

export default function VendorProducts() {
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Load products from localStorage on component mount
  useEffect(() => {
    const loadProducts = () => {
      try {
        const savedProducts = productStorage.getAllProducts()
        
        // Show only saved products (removed mock products)
        const allProducts = savedProducts
        setProducts(allProducts)
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [])

  const handleDeleteProduct = (productId: string) => {
    try {
      const success = productStorage.deleteProduct(productId)
      if (success) {
        setProducts(prev => prev.filter(p => p.id !== productId))
        toast.success("Product deleted successfully")
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error("Failed to delete product")
    }
  }

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
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted"></div>
                  <CardHeader className="pb-3">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-muted rounded flex-1"></div>
                      <div className="h-8 bg-muted rounded flex-1"></div>
                      <div className="h-8 bg-muted rounded w-8"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
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
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                      <Link href={`/product/${product.handle || product.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive bg-transparent"
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={product.id.startsWith('mock-')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
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
