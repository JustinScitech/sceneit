import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Store, MapPin, Star, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { Vendor } from "@/lib/types/vendor"

// Mock vendor data - replace with real API calls
const mockVendors: (Vendor & { rating: number; productCount: number })[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@techgadgets.com",
    businessName: "Tech Gadgets Pro",
    description:
      "Premium electronics and gadgets for tech enthusiasts. We specialize in the latest smartphones, headphones, and smart home devices.",
    logo: "/tech-logo.jpg",
    website: "https://techgadgets.com",
    phone: "+1 (555) 123-4567",
    address: {
      street: "123 Tech Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      country: "United States",
    },
    isApproved: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    rating: 4.8,
    productCount: 25,
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@handmadecrafts.com",
    businessName: "Artisan Handmade Crafts",
    description:
      "Beautiful handcrafted items made with love. From pottery to jewelry, each piece is unique and made with sustainable materials.",
    logo: "/craft-logo.jpg",
    website: "https://handmadecrafts.com",
    phone: "+1 (555) 987-6543",
    address: {
      street: "456 Craft Lane",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      country: "United States",
    },
    isApproved: true,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
    rating: 4.9,
    productCount: 18,
  },
  {
    id: "3",
    name: "Mike Chen",
    email: "mike@outdoorgear.com",
    businessName: "Adventure Outdoor Gear",
    description:
      "High-quality outdoor equipment for adventurers. From hiking boots to camping gear, we have everything you need for your next adventure.",
    logo: "/outdoor-logo.jpg",
    website: "https://outdoorgear.com",
    phone: "+1 (555) 456-7890",
    address: {
      street: "789 Mountain View",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      country: "United States",
    },
    isApproved: true,
    createdAt: "2024-01-05T10:00:00Z",
    updatedAt: "2024-01-05T10:00:00Z",
    rating: 4.7,
    productCount: 32,
  },
]

export default function VendorsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-muted/50 to-background py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Meet Our Vendors</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover amazing products from trusted sellers around the world
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/vendor/register">
                <Store className="mr-2 h-5 w-5" />
                Become a Vendor
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/shop">Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockVendors.map((vendor) => (
            <Card key={vendor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start space-x-4">
                  <img
                    src={vendor.logo || "/placeholder.svg"}
                    alt={`${vendor.businessName} logo`}
                    className="w-16 h-16 rounded-lg object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-1">{vendor.businessName}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium ml-1">{vendor.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{vendor.productCount} products</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{vendor.description}</p>

                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {vendor.address.city}, {vendor.address.state}
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    View Products
                  </Button>
                  {vendor.website && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={vendor.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-muted/50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join our marketplace and reach thousands of customers worldwide
          </p>
          <Button asChild size="lg">
            <Link href="/vendor/register">
              <Store className="mr-2 h-5 w-5" />
              Apply to Become a Vendor
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
