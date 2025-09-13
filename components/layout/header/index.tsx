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
    <header className="grid fixed top-0 left-0 z-50 grid-cols-3 items-start w-full p-sides md:grid-cols-12 md:gap-sides">
      <div className="block flex-none md:hidden">
        <MobileMenu collections={collections} />
      </div>
      <Link href="/" className="md:col-span-3 xl:col-span-2" prefetch>
        <LogoSvg className="w-auto h-6 max-md:place-self-center md:w-full md:h-auto max-w-96" />
      </Link>
      <nav className="flex gap-2 justify-end items-center md:col-span-9 xl:col-span-10">
        <ul className="items-center gap-5 py-0.5 px-3 bg-background/10 rounded-sm backdrop-blur-md hidden md:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "font-semibold text-base transition-colors duration-200 uppercase",
                  pathname === item.href ? "text-foreground" : "text-foreground/50",
                )}
                prefetch
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <CartModal />
      </nav>
    </header>
  )
}
