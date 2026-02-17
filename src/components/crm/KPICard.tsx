import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'default';
  trend?: string;
}

const variantClasses: Record<string, string> = {
  primary: 'gradient-primary text-primary-foreground',
  secondary: 'gradient-secondary text-secondary-foreground',
  success: 'gradient-success text-success-foreground',
  warning: 'gradient-warning text-warning-foreground',
  default: 'bg-card text-card-foreground border border-border',
};

const iconBgClasses: Record<string, string> = {
  primary: 'bg-primary-foreground/20',
  secondary: 'bg-secondary-foreground/20',
  success: 'bg-success-foreground/20',
  warning: 'bg-warning-foreground/20',
  default: 'bg-muted',
};

export function KPICard({ label, value, icon: Icon, variant = 'default', trend }: KPICardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-5 shadow-card transition-all hover:shadow-elevated animate-fade-in',
        variantClasses[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('text-sm font-medium', variant === 'default' ? 'text-muted-foreground' : 'opacity-80')}>
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', variant === 'default' ? 'text-muted-foreground' : 'opacity-70')}>
              {trend}
            </p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', iconBgClasses[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
