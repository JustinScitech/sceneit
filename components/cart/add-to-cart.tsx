'use client';

import { PlusCircleIcon } from 'lucide-react';
import { Product, ProductVariant } from '@/lib/shopify/types';
import { useMemo, useTransition } from 'react';
import { useCart } from './cart-context';
import { Button, ButtonProps } from '../ui/button';
import { useSelectedVariant } from '@/components/products/variant-selector';
import { useParams, useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from '../ui/loader';

interface AddToCartProps extends ButtonProps {
  product: Product;
  iconOnly?: boolean;
  icon?: ReactNode;
}

interface AddToCartButtonProps extends ButtonProps {
  product: Product;
  selectedVariant?: ProductVariant | null;
  iconOnly?: boolean;
  icon?: ReactNode;
  className?: string;
}

const getBaseProductVariant = (product: Product): ProductVariant => {
  return {
    id: product.id,
    title: product.title,
    availableForSale: product.availableForSale,
    selectedOptions: [],
    price: product.priceRange.minVariantPrice,
  };
};

export function AddToCartButton({
  product,
  selectedVariant,
  className,
  iconOnly = false,
  icon = <PlusCircleIcon />,
  ...buttonProps
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isLoading, startTransition] = useTransition();

  // Resolve variant locally only for variantless products (purely synchronous)
  const resolvedVariant = useMemo(() => {
    if (selectedVariant) return selectedVariant;
    if (product.variants.length === 0) return getBaseProductVariant(product);
    if (product.variants.length === 1) return product.variants[0];
    return undefined;
  }, [selectedVariant, product]);

  const getButtonText = () => {
    if (!product.availableForSale) return 'Out Of Stock';
    if (!resolvedVariant) return 'Select one';
    return 'Add To Cart';
  };

  const isDisabled = !product.availableForSale || !resolvedVariant || isLoading;

  const getLoaderSize = () => {
    const buttonSize = buttonProps.size;
    if (buttonSize === 'sm' || buttonSize === 'icon-sm' || buttonSize === 'icon') return 'sm';
    if (buttonSize === 'icon-lg') return 'default';
    if (buttonSize === 'lg') return 'lg';
    return 'default';
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();

        if (resolvedVariant) {
          startTransition(async () => {
            addItem(resolvedVariant, product);
          });
        }
      }}
      className={className}
    >
      <Button
        type="submit"
        aria-label={!resolvedVariant ? 'Select one' : 'Add to cart'}
        disabled={isDisabled}
        className={iconOnly ? undefined : 'flex relative justify-between items-center w-full'}
        {...buttonProps}
      >
        <AnimatePresence initial={false} mode="wait">
          {iconOnly ? (
            <motion.div
              key={isLoading ? 'loading' : 'icon'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center items-center"
            >
              {isLoading ? <Loader size={getLoaderSize()} /> : <span className="inline-block">{icon}</span>}
            </motion.div>
          ) : (
            <motion.div
              key={isLoading ? 'loading' : getButtonText()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex justify-center items-center w-full"
            >
              {isLoading ? (
                <Loader size={getLoaderSize()} />
              ) : (
                <div className="flex justify-between items-center w-full">
                  <span>{getButtonText()}</span>
                  <PlusCircleIcon />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </form>
  );
}

export function AddToCart({
  product,
  className,
  iconOnly = false,
  icon = <PlusCircleIcon />,
  ...buttonProps
}: AddToCartProps) {
  const { variants } = product;
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();

  const hasNoVariants = variants.length === 0;
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = selectedVariant?.id || defaultVariantId;
  const isTargetingProduct = pathname.handle === product.id || searchParams.get('pid') === product.id;

  const resolvedVariant = useMemo(() => {
    if (hasNoVariants) return getBaseProductVariant(product);
    if (!isTargetingProduct && !defaultVariantId) return undefined;
    return variants.find(variant => variant.id === selectedVariantId);
  }, [hasNoVariants, product, isTargetingProduct, defaultVariantId, variants, selectedVariantId]);

  return (
    <AddToCartButton
      product={product}
      selectedVariant={resolvedVariant}
      className={className}
      iconOnly={iconOnly}
      icon={icon}
      {...buttonProps}
    />
  );
}
