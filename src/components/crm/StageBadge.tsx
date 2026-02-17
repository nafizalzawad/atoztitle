import { cn } from '@/lib/utils';

type Stage = 'lead' | 'warm_lead' | 'prospect' | 'warm_prospect' | 'client' | 'active_client';

const stageConfig: Record<Stage, { label: string; className: string }> = {
  lead: { label: 'Lead', className: 'bg-stage-lead/15 text-stage-lead border-stage-lead/30' },
  warm_lead: { label: 'Warm Lead', className: 'bg-stage-warm-lead/15 text-stage-warm-lead border-stage-warm-lead/30' },
  prospect: { label: 'Prospect', className: 'bg-stage-prospect/15 text-stage-prospect border-stage-prospect/30' },
  warm_prospect: { label: 'Warm Prospect', className: 'bg-stage-warm-prospect/15 text-stage-warm-prospect border-stage-warm-prospect/30' },
  client: { label: 'Client', className: 'bg-stage-client/15 text-stage-client border-stage-client/30' },
  active_client: { label: 'Active Client', className: 'bg-stage-active-client/15 text-stage-active-client border-stage-active-client/30' },
};

export function StageBadge({ stage }: { stage: Stage }) {
  const config = stageConfig[stage];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
