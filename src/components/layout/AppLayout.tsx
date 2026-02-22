import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Sticky header — extra left padding on mobile to clear the hamburger button */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-4 pl-16 lg:px-8 py-4 lg:py-5">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-xs lg:text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            )}
          </div>
        </header>

        {/* Page content — tighter padding on mobile */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
