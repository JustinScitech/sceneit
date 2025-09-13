import * as React from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';

export interface Color {
  name: string;
  value: string;
}

interface ColorSwatchProps {
  color: Color | [Color, Color];
  isSelected: boolean;
  onColorChange: (color: Color | [Color, Color]) => void;
  size?: 'sm' | 'md' | 'lg';
  atLeastOneColorSelected: boolean;
}

export const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
};

export function ColorSwatch({
  color,
  isSelected,
  onColorChange,
  size = 'md',
  atLeastOneColorSelected,
}: ColorSwatchProps) {
  const isDualColor = Array.isArray(color);
  const displayName = isDualColor ? `${color[0].name} & ${color[1].name}` : color.name;

  return (
    <button
      className={cn(
        'rounded-full ring ring-accent cursor-pointer transition-[outline,box-shadow,opacity] relative overflow-hidden',
        sizeClasses[size],
        isSelected
          ? 'ring-2 opacity-100 ring-primary/80'
          : atLeastOneColorSelected
            ? 'opacity-40 hover:ring-primary/30 hover:opacity-70'
            : 'opacity-100'
      )}
      title={displayName}
      onClick={() => onColorChange(color)}
      aria-pressed={isSelected}
      aria-label={`Select color: ${displayName}`}
    >
      {isDualColor ? (
        <>
          {/* Left half */}
          <div className="absolute top-0 left-0 w-1/2 h-full" style={{ backgroundColor: color[0].value }} />
          {/* Right half */}
          <div className="absolute top-0 right-0 w-1/2 h-full" style={{ backgroundColor: color[1].value }} />
        </>
      ) : (
        <div className="w-full h-full" style={{ backgroundColor: color.value }} />
      )}
      <span className="sr-only">{displayName}</span>
    </button>
  );
}

interface ColorPickerProps {
  colors: (Color | [Color, Color])[];
  selectedColors: (Color | [Color, Color])[];
  onColorChange: (color: Color | [Color, Color]) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ColorPicker({ colors, selectedColors, onColorChange, size = 'md', className }: ColorPickerProps) {
  const atLeastOneColor = selectedColors.length > 0;

  // Helper function to compare colors for selection state
  const isColorSelected = (color: Color | [Color, Color]) => {
    return selectedColors.some(selectedColor => {
      if (Array.isArray(color) && Array.isArray(selectedColor)) {
        return color[0].value === selectedColor[0].value && color[1].value === selectedColor[1].value;
      } else if (!Array.isArray(color) && !Array.isArray(selectedColor)) {
        return color.value === selectedColor.value;
      }
      return false;
    });
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <AnimatePresence initial={false}>
        {colors.map((color, index) => (
          <motion.div
            key={Array.isArray(color) ? `${color[0].value}-${color[1].value}` : color.value}
            layout="position"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05,
              ease: 'easeOut',
            }}
            className={sizeClasses[size]}
          >
            <ColorSwatch
              color={color}
              isSelected={isColorSelected(color)}
              onColorChange={onColorChange}
              size={size}
              atLeastOneColorSelected={atLeastOneColor}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
