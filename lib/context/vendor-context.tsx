"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { VendorAuthState, Vendor } from "@/lib/types/vendor"

interface VendorContextType extends VendorAuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (vendorData: Partial<Vendor> & { password: string }) => Promise<boolean>
}

const VendorContext = createContext<VendorContextType | undefined>(undefined)

export function VendorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VendorAuthState>({
    vendor: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    // Check for existing vendor session
    const vendorData = localStorage.getItem("vendor")
    if (vendorData) {
      try {
        const vendor = JSON.parse(vendorData)
        setState({
          vendor,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        localStorage.removeItem("vendor")
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      // Mock authentication - replace with real API call
      const mockVendor: Vendor = {
        id: "1",
        name: "John Doe",
        email,
        businessName: "Sample Business",
        isApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem("vendor", JSON.stringify(mockVendor))
      setState({
        vendor: mockVendor,
        isAuthenticated: true,
        isLoading: false,
      })
      return true
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }

  const register = async (vendorData: Partial<Vendor> & { password: string }): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      // Mock registration - replace with real API call
      const newVendor: Vendor = {
        id: Date.now().toString(),
        name: vendorData.name || "",
        email: vendorData.email || "",
        businessName: vendorData.businessName || "",
        description: vendorData.description,
        isApproved: false, // Requires admin approval
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem("vendor", JSON.stringify(newVendor))
      setState({
        vendor: newVendor,
        isAuthenticated: true,
        isLoading: false,
      })
      return true
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("vendor")
    setState({
      vendor: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  return <VendorContext.Provider value={{ ...state, login, logout, register }}>{children}</VendorContext.Provider>
}

export function useVendor() {
  const context = useContext(VendorContext)
  if (context === undefined) {
    throw new Error("useVendor must be used within a VendorProvider")
  }
  return context
}
