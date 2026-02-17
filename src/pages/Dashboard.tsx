import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/crm/KPICard';
import { StageBadge } from '@/components/crm/StageBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, UserPlus, Flame, Target, Handshake, Star,
  CalendarCheck, AlertTriangle, Search, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Stage = 'lead' | 'warm_lead' | 'prospect' | 'warm_prospect' | 'client' | 'active_client';

interface DashboardStats {
  totalContacts: number;
  leads: number;
  warmLeads: number;
  prospects: number;
  warmProspects: number;
  clients: number;
  activeClients: number;
  followUpsDue: number;
  overdueFollowUps: number;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0, leads: 0, warmLeads: 0, prospects: 0,
    warmProspects: 0, clients: 0, activeClients: 0,
    followUpsDue: 0, overdueFollowUps: 0,
  });
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!user) return;
    loadDashboard();
    loadUserName();
  }, [user]);

  const loadUserName = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .single();
    if (data) setUserName(data.full_name);
  };

  const loadDashboard = async () => {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_deleted', false);

    if (contacts) {
      setStats({
        totalContacts: contacts.length,
        leads: contacts.filter(c => c.stage === 'lead').length,
        warmLeads: contacts.filter(c => c.stage === 'warm_lead').length,
        prospects: contacts.filter(c => c.stage === 'prospect').length,
        warmProspects: contacts.filter(c => c.stage === 'warm_prospect').length,
        clients: contacts.filter(c => c.stage === 'client').length,
        activeClients: contacts.filter(c => c.stage === 'active_client').length,
        followUpsDue: 0,
        overdueFollowUps: 0,
      });
      setRecentContacts(contacts.slice(0, 5));
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: dueFollowUps } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('is_completed', false)
      .lte('follow_up_date', today);

    if (dueFollowUps) {
      const overdue = dueFollowUps.filter(f => f.follow_up_date < today);
      setStats(prev => ({
        ...prev,
        followUpsDue: dueFollowUps.length,
        overdueFollowUps: overdue.length,
      }));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_deleted', false);
    if (data) {
      const filtered = data.filter(c =>
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
      setSearchResults(filtered);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleStageClick = (stage: Stage) => {
    navigate(`/contacts?stage=${stage}`);
  };

  const kpiCards: { label: string; value: number; icon: any; variant: any; stage?: Stage }[] = [
    { label: 'Total Contacts', value: stats.totalContacts, icon: Users, variant: 'primary' },
    { label: 'Leads', value: stats.leads, icon: UserPlus, variant: 'default', stage: 'lead' },
    { label: 'Warm Leads', value: stats.warmLeads, icon: Flame, variant: 'default', stage: 'warm_lead' },
    { label: 'Prospects', value: stats.prospects, icon: Target, variant: 'default', stage: 'prospect' },
    { label: 'Warm Prospects', value: stats.warmProspects, icon: Target, variant: 'default', stage: 'warm_prospect' },
    { label: 'Clients', value: stats.clients, icon: Handshake, variant: 'success', stage: 'client' },
    { label: 'Active Clients', value: stats.activeClients, icon: Star, variant: 'success', stage: 'active_client' },
    { label: 'Follow-ups Due', value: stats.followUpsDue, icon: CalendarCheck, variant: 'secondary' },
    { label: 'Overdue', value: stats.overdueFollowUps, icon: AlertTriangle, variant: 'warning' },
  ];

  const displayTitle = userName
    ? `${userName}'s Dashboard`
    : (role === 'admin' ? 'Admin Dashboard' : 'Dashboard');

  return (
    <AppLayout
      title={displayTitle}
      subtitle="Welcome back — here's your pipeline overview"
      actions={
        <Button onClick={() => navigate('/contacts/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      }
    >
      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email, company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
              onKeyDown={handleSearchKeyDown}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="mb-8 rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-card-foreground">
              Search Results ({searchResults.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { setSearchResults(null); setSearchQuery(''); }}>
              Clear
            </Button>
          </div>
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No contacts match your search</div>
          ) : (
            <div className="divide-y divide-border">
              {searchResults.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {contact.first_name[0]}{contact.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{contact.company || contact.email || contact.phone}</p>
                    </div>
                  </div>
                  <StageBadge stage={contact.stage} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Grid - clickable stage cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(kpi.stage && 'cursor-pointer')}
            onClick={() => kpi.stage && handleStageClick(kpi.stage)}
          >
            <KPICard {...kpi} />
          </div>
        ))}
      </div>

      {/* Recent Contacts */}
      {searchResults === null && (
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Contacts</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
              View All
            </Button>
          </div>
          {recentContacts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No contacts yet</p>
              <Button className="mt-4" size="sm" onClick={() => navigate('/contacts/new')}>
                <Plus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {contact.first_name[0]}{contact.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{contact.company || contact.email}</p>
                    </div>
                  </div>
                  <StageBadge stage={contact.stage} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
