"use client"

import type React from "react"

import { useVendor } from "@/lib/context/vendor-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface VendorAuthGuardProps {
  children: React.ReactNode
  requireApproval?: boolean
}

export function VendorAuthGuard({ children, requireApproval = false }: VendorAuthGuardProps) {
  const { isAuthenticated, isLoading, vendor } = useVendor()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/vendor/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requireApproval && vendor && !vendor.isApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Account Pending Approval</h2>
          <p className="text-muted-foreground">
            Your vendor account is pending approval. You'll be notified once it's approved.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
