import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StageBadge } from '@/components/crm/StageBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Search, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

type Stage = 'lead' | 'warm_lead' | 'prospect' | 'warm_prospect' | 'client' | 'active_client';

const stageLabels: Record<Stage, string> = {
  lead: 'Lead',
  warm_lead: 'Warm Lead',
  prospect: 'Prospect',
  warm_prospect: 'Warm Prospect',
  client: 'Client',
  active_client: 'Active Client',
};

export default function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<Stage | ''>(
    (searchParams.get('stage') as Stage) || ''
  );

  useEffect(() => {
    if (!user) return;
    loadContacts();
  }, [user]);

  useEffect(() => {
    const s = searchParams.get('stage') as Stage;
    if (s && stageLabels[s]) setStageFilter(s);
  }, [searchParams]);

  const loadContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  };

  const filtered = contacts.filter((c) => {
    if (stageFilter && c.stage !== stageFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  const clearFilter = () => {
    setStageFilter('');
    setSearchParams({});
  };

  return (
    <AppLayout
      title="Contacts"
      subtitle={`${contacts.length} total contacts in your pipeline`}
      actions={
        <Button onClick={() => navigate('/contacts/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      }
    >
      {/* Search + Stage filter chips */}
      <div className="mb-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(stageLabels) as Stage[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (stageFilter === s) clearFilter();
                else { setStageFilter(s); setSearchParams({ stage: s }); }
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                stageFilter === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {stageLabels[s]}
            </button>
          ))}
          {stageFilter && (
            <button onClick={clearFilter} className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {searchQuery || stageFilter ? 'No contacts match your filter' : 'No contacts yet'}
            </p>
            {!searchQuery && !stageFilter && (
              <Button className="mt-4" size="sm" onClick={() => navigate('/contacts/new')}>
                <Plus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Days in Stage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((contact) => {
                const daysInStage = differenceInDays(new Date(), new Date(contact.updated_at));
                const isWarning = contact.stage === 'warm_prospect' && daysInStage >= 90;
                return (
                  <tr
                    key={contact.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      isWarning && 'bg-warning/5'
                    )}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {contact.first_name[0]}{contact.last_name[0]}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-muted-foreground">{contact.company || '—'}</td>
                    <td className="px-6 py-3.5"><StageBadge stage={contact.stage} /></td>
                    <td className="px-6 py-3.5">
                      <span className={cn(
                        'text-sm font-medium',
                        isWarning ? 'text-destructive' : 'text-muted-foreground'
                      )}>
                        {daysInStage}d
                        {isWarning && ' ⚠️'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-medium text-foreground">{contact.engagement_points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
