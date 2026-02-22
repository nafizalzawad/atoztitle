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
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [marketerFilter, setMarketerFilter] = useState<string>(
    searchParams.get('marketer') || 'all'
  );
  const [stageFilter, setStageFilter] = useState<Stage | ''>(
    (searchParams.get('stage') as Stage) || ''
  );

  // loadData reads DIRECTLY from searchParams to avoid stale closure bugs
  const loadData = async (params?: URLSearchParams) => {
    const sp = params ?? searchParams;
    const currentMarketer = sp.get('marketer') || 'all';
    const currentStage = (sp.get('stage') as Stage) || '';

    setMarketerFilter(currentMarketer);
    if (currentStage && stageLabels[currentStage as Stage]) setStageFilter(currentStage as Stage);
    else if (!currentStage) setStageFilter('');

    setLoading(true);

    let profilesList: any[] = [];
    if (role === 'admin') {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      profilesList = profileData || [];
      setProfiles(profilesList);
    }

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (role !== 'admin') {
      query = query.eq('bd_user_id', user!.id);
    } else if (currentMarketer !== 'all') {
      query = query.eq('bd_user_id', currentMarketer);
    }

    const { data, error } = await query;
    if (error) console.error('Contacts loadData error:', error.message);

    const allProfiles = profilesList.length ? profilesList : profiles;
    const profileMap = new Map(allProfiles.map((p: any) => [p.id, p.full_name]));
    const enriched = (data || []).map((c: any) => ({
      ...c,
      profiles: { full_name: profileMap.get(c.bd_user_id) || null },
    }));

    setContacts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !role) return;
    loadData(searchParams);
  }, [user, role, searchParams]);

  const filtered = contacts.filter((c) => {
    if (stageFilter) {
      if (stageFilter === 'client') {
        if (c.stage !== 'client' && c.stage !== 'active_client') return false;
      } else if (c.stage !== stageFilter) {
        return false;
      }
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.first_name?.toLowerCase() || '').includes(q) ||
      (c.last_name?.toLowerCase() || '').includes(q) ||
      (c.email?.toLowerCase() || '').includes(q) ||
      (c.phone || '').includes(q) ||
      (c.company?.toLowerCase() || '').includes(q)
    );
  });

  const clearFilters = () => setSearchParams({});

  const handleMarketerChange = (val: string) => {
    const newParams: any = {};
    if (stageFilter) newParams.stage = stageFilter;
    if (val !== 'all') newParams.marketer = val;
    setSearchParams(newParams);
  };

  const marketerName = profiles.find(p => p.id === marketerFilter)?.full_name;
  const pageSubtitle = role === 'admin'
    ? marketerFilter !== 'all' && stageFilter === 'client'
      ? `Viewing clients for ${marketerName || 'selected marketer'} (${filtered.length})`
      : marketerFilter !== 'all'
        ? `${filtered.length} contact${filtered.length !== 1 ? 's' : ''} for ${marketerName || 'selected marketer'}`
        : `All ${contacts.length} organisation contacts`
    : `${contacts.length} contacts in your pipeline`;

  return (
    <AppLayout
      title="Contacts"
      subtitle={pageSubtitle}
      actions={
        <Button size="sm" onClick={() => navigate('/contacts/new')}>
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      }
    >
      {/* ── Filters ── */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {role === 'admin' && (
            <select
              value={marketerFilter}
              onChange={(e) => handleMarketerChange(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-52"
            >
              <option value="all">All Marketers</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Stage pills — scroll horizontally on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(Object.keys(stageLabels) as Stage[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (stageFilter === s) {
                  const p = { ...Object.fromEntries(searchParams.entries()) };
                  delete p.stage;
                  setSearchParams(p);
                } else {
                  setSearchParams({ ...Object.fromEntries(searchParams.entries()), stage: s });
                }
              }}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                stageFilter === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {stageLabels[s]}
            </button>
          ))}
          {(stageFilter || marketerFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="shrink-0 flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Contact list ── */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {searchQuery || stageFilter || marketerFilter !== 'all'
                ? 'No contacts match your filter'
                : 'No contacts yet'}
            </p>
            {!searchQuery && !stageFilter && marketerFilter === 'all' && (
              <Button className="mt-4" size="sm" onClick={() => navigate('/contacts/new')}>
                <Plus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((contact) => {
                const daysInStage = differenceInDays(new Date(), new Date(contact.updated_at));
                const isWarning = contact.stage === 'warm_prospect' && daysInStage >= 90;
                return (
                  <div
                    key={contact.id}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-muted/50 transition-colors',
                      isWarning && 'bg-warning/5'
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {contact.first_name?.[0] ?? '?'}{contact.last_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.company || '—'}
                        {role === 'admin' && contact.profiles?.full_name && ` · ${contact.profiles.full_name}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StageBadge stage={contact.stage} />
                      <span className={cn('text-[10px] font-medium', isWarning ? 'text-destructive' : 'text-muted-foreground')}>
                        {daysInStage}d{isWarning && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    {role === 'admin' && <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketer</th>}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((contact) => {
                    const daysInStage = differenceInDays(new Date(), new Date(contact.updated_at));
                    const isWarning = contact.stage === 'warm_prospect' && daysInStage >= 90;
                    return (
                      <tr
                        key={contact.id}
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                        className={cn('hover:bg-muted/30 transition-colors cursor-pointer', isWarning && 'bg-warning/5')}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {contact.first_name?.[0] ?? '?'}{contact.last_name?.[0] ?? '?'}
                            </div>
                            <span className="text-sm font-medium">{contact.first_name} {contact.last_name}</span>
                          </div>
                        </td>
                        {role === 'admin' && <td className="px-6 py-3.5 text-sm text-muted-foreground">{contact.profiles?.full_name || '—'}</td>}
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{contact.company || '—'}</td>
                        <td className="px-6 py-3.5"><StageBadge stage={contact.stage} /></td>
                        <td className="px-6 py-3.5 text-sm font-medium text-muted-foreground">{daysInStage}d{isWarning && ' ⚠️'}</td>
                        <td className="px-6 py-3.5 text-sm font-medium">{contact.engagement_points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
