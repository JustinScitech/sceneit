'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQueryState, parseAsString } from 'nuqs';
import { cn } from '@/lib/utils';
import { sortOptions } from '@/lib/shopify/constants';

interface SortDropdownProps {
  className?: string;
}

export function SortDropdown({ className }: SortDropdownProps) {
  const [sort, setSort] = useQueryState('sort', parseAsString.withOptions({ shallow: false }));

  return (
    <Select value={sort ?? undefined} onValueChange={setSort}>
      <SelectTrigger
        size="sm"
        className={cn(
          'justify-self-end -mr-3 font-medium bg-transparent border-none shadow-none md:w-32 hover:bg-muted/50',
          className
        )}
      >
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <div className="flex justify-between items-center pr-1">
            <SelectLabel className="text-xs">Sort</SelectLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-1 h-5 text-xs text-muted-foreground"
              onClick={() => setSort(null)}
            >
              Clear
            </Button>
          </div>
          <SelectSeparator />
          {sortOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
