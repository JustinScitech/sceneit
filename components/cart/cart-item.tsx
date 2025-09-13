'use client';

import { CartItem } from '@/lib/shopify/types';
import { DEFAULT_OPTION } from '@/lib/constants';
import { createUrl, getColorHex } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { DeleteItemButton } from './delete-item-button';
import { EditItemQuantityButton } from './edit-item-quantity-button';
import { formatPrice } from '@/lib/shopify/utils';
import { ColorSwatch } from '@/components/ui/color-picker';
import { useProductImages } from '../products/variant-selector';

type MerchandiseSearchParams = {
  [key: string]: string;
};

interface CartItemProps {
  item: CartItem;
  onCloseCart: () => void;
}

export function CartItemCard({ item, onCloseCart }: CartItemProps) {
  const merchandiseSearchParams = {} as MerchandiseSearchParams;

  item.merchandise.selectedOptions.forEach(({ name, value }) => {
    if (value !== DEFAULT_OPTION) {
      merchandiseSearchParams[name.toLowerCase()] = value.toLowerCase();
    }
  });

  const merchandiseUrl = createUrl(
    `/product/${item.merchandise.product.handle}`,
    new URLSearchParams(merchandiseSearchParams)
  );

  // Find color option if it exists
  const colorOption = item.merchandise.selectedOptions.find(option => option.name.toLowerCase() === 'color');

  const imgs = useProductImages(item.merchandise.product, item.merchandise.selectedOptions);

  const [renderImage] = imgs;

  return (
    <div className="bg-popover rounded-lg p-2">
      <div className="flex flex-row gap-6">
        <div className="relative size-[120px] overflow-hidden rounded-sm shrink-0">
          <Image
            className="size-full object-cover"
            width={240}
            height={240}
            blurDataURL={renderImage.url}
            alt={renderImage.altText || item.merchandise.product.title}
            src={renderImage.url}
          />

          {/* Color pill overlay */}
          {colorOption && (
            <div className="flex absolute bottom-1 left-1">
              <ColorSwatch
                color={(() => {
                  const color = getColorHex(colorOption.value);
                  return Array.isArray(color)
                    ? [
                        { name: colorOption.value, value: color[0] },
                        { name: colorOption.value, value: color[1] },
                      ]
                    : { name: colorOption.value, value: color };
                })()}
                isSelected={false}
                onColorChange={() => {}} // No-op since this is just for display
                size="sm"
                atLeastOneColorSelected={false}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 2xl:gap-3 flex-1">
          <Link href={merchandiseUrl} onClick={onCloseCart} className="z-30 flex flex-col justify-center" prefetch>
            <span className="2xl:text-lg font-semibold">{item.merchandise.product.title}</span>
          </Link>
          <p className="2xl:text-lg font-semibold">
            {formatPrice(item.cost.totalAmount.amount, item.cost.totalAmount.currencyCode)}
          </p>
          <div className="flex justify-between items-end mt-auto">
            <div className="flex h-8 flex-row items-center rounded-md border border-neutral-200">
              <EditItemQuantityButton item={item} type="minus" />
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <EditItemQuantityButton item={item} type="plus" />
            </div>
            <DeleteItemButton item={item} />
          </div>
        </div>
      </div>
    </div>
  );
}
