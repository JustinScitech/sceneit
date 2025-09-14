import { ShopLinks } from '../shop-links';
import { Collection } from '@/lib/shopify/types';

interface HomeSidebarProps {
  collections: Collection[];
}

export function HomeSidebar({ collections }: HomeSidebarProps) {
  return (
    <aside className="max-md:hidden col-span-4 h-screen sticky top-20 p-sides pt-8 flex flex-col justify-between">
      <div>
        <p className="italic tracking-tighter text-base">Seen it. Scene it. Sell it.</p>
        <div className="mt-5 text-base leading-tight">
          <p>Upload or scan a product → auto‑generate a 3D, voice‑navigable product page → purchase via Shopify or Solana in minutes.</p>
          <p>Your voice‑guided 3D marketplace where AI agents showcase products with dynamic camera angles and immersive environments.</p>
          <p>Experience the future of online shopping — speak, explore, buy.</p>
        </div>
      </div>
      <ShopLinks collections={collections} />
    </aside>
  );
}
