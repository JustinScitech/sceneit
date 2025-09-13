'use client';

import { useQueryState, parseAsArrayOf, parseAsString } from 'nuqs';
import { Product } from '@/lib/shopify/types';
import { Color } from '@/components/ui/color-picker';
import { COLOR_MAP } from '@/lib/constants';
import { useEffect, useMemo } from 'react';

const allColors: Color[] = [
  { name: 'Olive', value: COLOR_MAP['olive'] },
  { name: 'Beige', value: COLOR_MAP['beige'] },
  { name: 'White', value: COLOR_MAP['white'] },
  { name: 'Blue', value: COLOR_MAP['blue'] },
  { name: 'Brown', value: COLOR_MAP['brown'] },
  { name: 'Sand', value: COLOR_MAP['sand'] },
  { name: 'Green', value: COLOR_MAP['green'] },
  { name: 'Black', value: COLOR_MAP['black'] },
  { name: 'Orange', value: COLOR_MAP['orange'] },
  { name: 'Dark Brown', value: COLOR_MAP['dark-brown'] },
  { name: 'Pink', value: COLOR_MAP['pink'] },
  { name: 'Red', value: COLOR_MAP['red'] },
  { name: 'Yellow', value: COLOR_MAP['yellow'] },
  { name: 'Purple', value: COLOR_MAP['purple'] },
  { name: 'Gray', value: COLOR_MAP['gray'] },
  { name: 'Gold', value: COLOR_MAP['gold'] },
  { name: 'Silver', value: COLOR_MAP['silver'] },
  { name: 'Army Green', value: COLOR_MAP['army-green'] },
  { name: 'Navy Blue', value: COLOR_MAP['navy-blue'] },
  { name: 'Navy', value: COLOR_MAP['navy'] },
  { name: 'Navy Blue', value: COLOR_MAP['navy-blue'] },
  { name: 'Navy Blue', value: COLOR_MAP['navy-blue'] },
  { name: 'Coral', value: COLOR_MAP['coral'] },
  { name: 'Salmon', value: COLOR_MAP['salmon'] },
  { name: 'Khaki', value: COLOR_MAP['khaki'] },
  { name: 'Sand', value: COLOR_MAP['sand'] },
  { name: 'Plum', value: COLOR_MAP['plum'] },
  { name: 'Tan', value: COLOR_MAP['tan'] },
  { name: 'Crimson', value: COLOR_MAP['crimson'] },
  { name: 'Turquoise', value: COLOR_MAP['turquoise'] },
  { name: 'Lavender', value: COLOR_MAP['lavender'] },
  { name: 'Ivory', value: COLOR_MAP['ivory'] },
  { name: 'Mint', value: COLOR_MAP['mint'] },
  { name: 'Peach', value: COLOR_MAP['peach'] },
  { name: 'Pistachio', value: COLOR_MAP['pistachio'] },
  { name: 'Cream', value: COLOR_MAP['cream'] },
  { name: 'Wood', value: COLOR_MAP['wood'] },
];

const getColorName = (color: Color | [Color, Color]) => {
  if (Array.isArray(color)) {
    const [color1, color2] = color;
    return `${color1.name}/${color2.name}`;
  }
  return color.name;
};

export function useAvailableColors(products: Product[]) {
  const [color, setColor] = useQueryState('fcolor', parseAsArrayOf(parseAsString).withDefault([]));

  // Extract available colors from products using memoization
  const availableColorNames = useMemo(() => {
    const colorSet = new Set<string>();

    products.forEach(product => {
      const colorOption = product.options.find(option => option.name.toLowerCase() === 'color');

      if (colorOption) {
        colorOption.values.forEach((value: any) => {
          // Handle both formats: SFCC reshaped format {id, name} and raw Shopify format (string)
          let colorName: string;
          if (typeof value === 'string') {
            // Raw Shopify format
            colorName = value.toLowerCase();
          } else if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
            // SFCC reshaped format
            colorName = value.name.toLowerCase();
          } else {
            return; // Skip invalid values
          }

          const matchingColor = allColors.find(c => c.name.toLowerCase() === colorName);
          if (matchingColor) {
            colorSet.add(matchingColor.name);
          }
        });
      }
    });

    return colorSet;
  }, [products]);

  // Filter to only show available colors
  const availableColors = allColors.filter(c => availableColorNames.has(c.name));

  // Auto-remove unavailable color filters
  useEffect(() => {
    if (color.length > 0) {
      const validColors = color.filter(colorName => availableColorNames.has(colorName));

      if (validColors.length !== color.length) {
        setColor(validColors);
      }
    }
  }, [products, color, setColor, availableColorNames]);

  const toggleColor = (colorInput: Color | [Color, Color]) => {
    const colorName = getColorName(colorInput);
    setColor(color.includes(colorName) ? color.filter(c => c !== colorName) : [...color, colorName]);
  };

  const selectedColors = availableColors.filter(c => color.includes(c.name));

  return {
    availableColors,
    selectedColors,
    toggleColor,
    activeColorFilters: color,
  };
}
