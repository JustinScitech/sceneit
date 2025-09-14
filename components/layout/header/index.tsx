"use client"

import MobileMenu from "./mobile-menu"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LogoSvg } from "./logo-svg"
import CartModal from "@/components/cart/modal"
import type { NavItem } from "@/lib/types"
import type { Collection } from "@/lib/shopify/types"

export const navItems: NavItem[] = [
  {
    label: "home",
    href: "/",
  },
  {
    label: "featured",
    href: "/shop/frontpage",
  },
  {
    label: "shop all",
    href: "/shop",
  },
  {
    label: "sell with us",
    href: "/vendor/login",
  },
]

interface HeaderProps {
  collections: Collection[]
}

export function Header({ collections }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Mobile Menu */}
          <div className="block md:hidden">
            <MobileMenu collections={collections} />
          </div>
          
          {/* Logo */}
          <Link href="/" className="flex-shrink-0" prefetch>
            <LogoSvg className="h-8 w-auto" />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-medium text-sm transition-colors duration-200 uppercase tracking-wide hover:text-foreground",
                  pathname === item.href ? "text-foreground" : "text-foreground/70",
                )}
                prefetch
              >
                {item.label}
              </Link>
            ))}
          </nav>
          
          {/* Cart */}
          <div className="flex items-center">
            <CartModal />
          </div>
        </div>
      </div>
    </header>
  )
}
