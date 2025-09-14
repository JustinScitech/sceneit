export interface Vendor {
  id: string
  name: string
  email: string
  businessName: string
  description?: string
  logo?: string
  website?: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  isApproved: boolean
  createdAt: string
  updatedAt: string
}

export interface VendorProduct {
  id: string
  vendorId: string
  title: string
  description: string
  detailedDescription?: string
  price: number
  compareAtPrice?: number
  images: string[]
  category: string
  tags: string[]
  inventory: number
  sku: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface VendorAuthState {
  vendor: Vendor | null
  isAuthenticated: boolean
  isLoading: boolean
}
