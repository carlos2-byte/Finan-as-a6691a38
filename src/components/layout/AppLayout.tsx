import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen min-h-dvh w-full bg-background overflow-x-hidden">
      <div className="pb-28">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
