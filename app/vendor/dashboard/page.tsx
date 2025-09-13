"use client"

import { VendorAuthGuard } from "@/components/vendor/vendor-auth-guard"
import { VendorHeader } from "@/components/vendor/vendor-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, ShoppingCart, TrendingUp } from "lucide-react"

const stats = [
  {
    title: "Total Products",
    value: "12",
    change: "+2 from last month",
    icon: Package,
  },
  {
    title: "Total Revenue",
    value: "$3,456",
    change: "+12% from last month",
    icon: DollarSign,
  },
  {
    title: "Orders",
    value: "23",
    change: "+5 from last week",
    icon: ShoppingCart,
  },
  {
    title: "Conversion Rate",
    value: "3.2%",
    change: "+0.5% from last month",
    icon: TrendingUp,
  },
]

export default function VendorDashboard() {
  return (
    <VendorAuthGuard requireApproval>
      <div className="space-y-6">
        <VendorHeader title="Dashboard" description="Overview of your store performance" />

        <div className="px-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #1234</p>
                      <p className="text-sm text-muted-foreground">2 items</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$89.99</p>
                      <p className="text-sm text-green-600">Completed</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #1235</p>
                      <p className="text-sm text-muted-foreground">1 item</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$45.50</p>
                      <p className="text-sm text-yellow-600">Processing</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Wireless Headphones</p>
                      <p className="text-sm text-muted-foreground">15 sold</p>
                    </div>
                    <p className="font-medium">$299.99</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Smart Watch</p>
                      <p className="text-sm text-muted-foreground">8 sold</p>
                    </div>
                    <p className="font-medium">$199.99</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </VendorAuthGuard>
  )
}
