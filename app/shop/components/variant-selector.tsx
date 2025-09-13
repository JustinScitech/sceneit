import { VariantOptionSelector } from '@/components/products/variant-selector';
import { Product } from '@/lib/shopify/types';

export const VariantSelector = ({ product }: { product: Product }) => {
  const { options } = product;

  const hasNoOptionsOrJustOneOption = !options.length || (options.length === 1 && options[0]?.values.length === 1);

  if (hasNoOptionsOrJustOneOption) {
    return null;
  }

  return (
    <>
      {options.map(option => (
        <VariantOptionSelector key={option.id} option={option} product={product} variant="condensed" />
      ))}
    </>
  );
};
