"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Bell, Menu } from "lucide-react"

interface VendorHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  onMenuClick?: () => void
}

export function VendorHeader({ title, description, action, onMenuClick }: VendorHeaderProps) {
  return (
    <header className="bg-background border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {action}
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
