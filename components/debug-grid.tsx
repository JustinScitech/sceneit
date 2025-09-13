'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DebugGridProps {
  className?: string;
}

export function DebugGrid({ className }: DebugGridProps) {
  const [gridState, setGridState] = useState<'hidden' | 'padded' | 'unpadded'>('hidden');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        setGridState(prev => {
          if (prev === 'hidden') return 'padded';
          if (prev === 'padded') return 'unpadded';
          return 'hidden';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (gridState === 'hidden') return null;

  return (
    <div
      className={cn(
        'fixed inset-0 pointer-events-none z-50',
        gridState === 'padded' ? 'px-sides' : '',
        'base-grid',
        className
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-full bg-[tomato] opacity-20" />
      ))}
    </div>
  );
}
