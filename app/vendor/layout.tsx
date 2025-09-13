import type React from "react"
import { VendorProvider } from "@/lib/context/vendor-context"

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <VendorProvider>
      <div className="min-h-screen bg-background">{children}</div>
    </VendorProvider>
  )
}
