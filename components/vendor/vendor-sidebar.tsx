"use client"

import { cn } from "@/lib/utils"
import { useVendor } from "@/lib/context/vendor-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Package, BarChart3, Settings, LogOut, Plus, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigation = [
  { name: "Dashboard", href: "/vendor/dashboard", icon: BarChart3 },
  { name: "Products", href: "/vendor/products", icon: Package },
  { name: "Add Product", href: "/vendor/products/new", icon: Plus },
  { name: "Orders", href: "/vendor/orders", icon: Users },
  { name: "Store Settings", href: "/vendor/settings", icon: Settings },
]

export function VendorSidebar() {
  const { vendor, logout } = useVendor()
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Vendor Profile */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={vendor?.logo || "/placeholder.svg"} />
            <AvatarFallback>{vendor?.businessName?.charAt(0) || vendor?.name?.charAt(0) || "V"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{vendor?.businessName || vendor?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{vendor?.email}</p>
          </div>
        </div>
        {!vendor?.isApproved && (
          <div className="mt-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Pending Approval</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={logout}>
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
