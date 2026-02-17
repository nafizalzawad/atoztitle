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
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
