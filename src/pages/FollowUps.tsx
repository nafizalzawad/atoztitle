import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function FollowUps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadFollowUps();
  }, [user]);

  const loadFollowUps = async () => {
    const { data } = await supabase
      .from('follow_ups')
      .select('*, contacts(first_name, last_name, company, stage)')
      .eq('is_completed', false)
      .order('follow_up_date', { ascending: true });
    setFollowUps(data || []);
    setLoading(false);
  };

  const markComplete = async (id: string) => {
    await supabase.from('follow_ups').update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    }).eq('id', id);

    // Award engagement point
    const followUp = followUps.find(f => f.id === id);
    if (followUp) {
      const { data } = await supabase
        .from('contacts')
        .select('engagement_points')
        .eq('id', followUp.contact_id)
        .single();
      if (data) {
        await supabase
          .from('contacts')
          .update({ engagement_points: (data.engagement_points || 0) + 1 })
          .eq('id', followUp.contact_id);
      }
    }

    loadFollowUps();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <AppLayout title="Follow-ups" subtitle="Stay on top of your outreach">
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading...</div>
      ) : followUps.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
          <CalendarCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No pending follow-ups</p>
          <p className="mt-1 text-xs text-muted-foreground/70">All caught up! Great job.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => {
            const isOverdue = fu.follow_up_date < today;
            const isToday = fu.follow_up_date === today;
            return (
              <div
                key={fu.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border bg-card p-4 shadow-card transition-colors',
                  isOverdue ? 'border-destructive/30 bg-destructive/5' : isToday ? 'border-warning/30 bg-warning/5' : 'border-border'
                )}
              >
                <div className="flex items-center gap-4">
                  {isOverdue ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CalendarCheck className={cn('h-5 w-5', isToday ? 'text-warning' : 'text-muted-foreground')} />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {fu.contacts?.first_name} {fu.contacts?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(fu.follow_up_date), 'MMM d, yyyy')}
                      {fu.follow_up_time && ` at ${fu.follow_up_time}`}
                      {fu.notes && ` — ${fu.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/contacts/${fu.contact_id}`)}>
                    View
                  </Button>
                  <Button size="sm" onClick={() => markComplete(fu.id)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
