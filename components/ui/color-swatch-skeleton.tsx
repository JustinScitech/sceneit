import { cn } from '@/lib/utils';
import { sizeClasses } from './color-picker';

interface ColorSwatchSkeletonProps {
  count?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ColorSwatchSkeleton({ count = 6, className, size = 'md' }: ColorSwatchSkeletonProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'rounded-full ring ring-foreground/5 relative overflow-hidden bg-foreground/15 animate-pulse',
            sizeClasses[size]
          )}
        />
      ))}
    </div>
  );
}
