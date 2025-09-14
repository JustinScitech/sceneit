import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar"
import { PageLayout } from "@/components/layout/page-layout"
import { LatestProductCard } from "@/components/products/latest-product-card"
import { Badge } from "@/components/ui/badge"
import { VendorProductsSection } from "@/components/vendor-products-section"
import { getCollectionProducts, getCollections, getProducts } from "@/lib/shopify"
import { getLabelPosition } from "../lib/utils"
import type { Product } from "../lib/shopify/types"

export default async function Home() {
  const collections = await getCollections()

  let featuredProducts: Product[] = []

  try {
    if (collections.length > 0) {
      featuredProducts = await getCollectionProducts({ collection: collections[0].handle })
    } else {
      const allProducts = await getProducts({})
      featuredProducts = allProducts.slice(0, 8)
    }
  } catch (error) {
    console.error("Error fetching featured products:", error)
    featuredProducts = []
  }

  const [lastProduct, ...restProducts] = featuredProducts

  return (
    <PageLayout>
      <div className="contents md:grid md:grid-cols-12 md:gap-sides">
        <HomeSidebar collections={collections} />
        <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
          <div className="fixed top-20 left-0 z-10 w-full pointer-events-none base-grid py-sides">
            <div className="col-span-8 col-start-5">
              <div className="hidden px-6 lg:block">
                <Badge variant="outline-secondary">latest drop</Badge>
              </div>
            </div>
          </div>
          {featuredProducts.length > 0 && (
            <>
              <LatestProductCard className="col-span-2" product={lastProduct} principal />

              {restProducts.map((product: any, index: number) => (
                <LatestProductCard
                  className="col-span-1"
                  key={product.id}
                  product={product}
                  labelPosition={getLabelPosition(index)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <VendorProductsSection limit={3} />
    </PageLayout>
  )
}
