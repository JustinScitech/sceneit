import { cn } from '@/lib/utils';

interface ResultsCountProps {
  count: number;
  className?: string;
}

export function ResultsCount({ count, className }: ResultsCountProps) {
  return <span className={cn('place-self-center text-sm text-foreground/50', className)}>{count} results</span>;
}
