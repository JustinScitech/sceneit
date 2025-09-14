import { Footer } from './footer';
import { cn } from '@/lib/utils';

export const PageLayout = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
};
