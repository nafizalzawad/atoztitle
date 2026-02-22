import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/crm/KPICard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, UserPlus, Flame, Target, Handshake, Star,
  CalendarCheck, AlertTriangle, Clock, Calendar, CheckCircle2,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isPast, isToday, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  leads: number;
  warmLeads: number;
  prospects: number;
  warmProspects: number;
  clients: number;
  activeClients: number;
  totalFollowUps: number;
  dueToday: number;
  overdue: number;
}

interface EnrichedFollowUp {
  id: string;
  follow_up_date: string;
  notes: string;
  status: string;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    company: string | null;
  } | null;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    leads: 0, warmLeads: 0, prospects: 0,
    warmProspects: 0, clients: 0, activeClients: 0,
    totalFollowUps: 0, dueToday: 0, overdue: 0,
  });
  const [followUps, setFollowUps] = useState<EnrichedFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch Contacts
    console.log('Fetching contacts...');
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company, stage')
      .eq('bd_user_id', user.id)
      .eq('is_deleted', false);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
    } else {
      console.log('Contacts fetched:', contacts?.length, contacts);
    }

    // Fetch Follow-ups with Contact details
    console.log('Fetching followups...');
    const { data: followUpsData, error: followUpsError } = await supabase
      .from('follow_ups')
      .select(`
        id,
        follow_up_date,
        is_completed,
        notes,
        contacts (
          id,
          first_name,
          last_name,
          company
        )
      `)
      .eq('bd_user_id', user.id)
      .eq('is_completed', false)
      .order('follow_up_date', { ascending: true });

    if (followUpsError) {
      console.error('Error fetching followups:', followUpsError);
    } else {
      console.log('Followups fetched:', followUpsData?.length, followUpsData);
    }

    if (contacts && followUpsData) {
      const pendingFollowUps = followUpsData.map((f: any) => ({
        id: f.id,
        follow_up_date: f.follow_up_date,
        notes: f.notes,
        status: f.is_completed ? 'Completed' : 'Pending',
        contact: f.contacts // Supabase returns single object for foreign key if 1:1 or N:1
      }));

      // Calculate Follow-up Stats
      let due = 0;
      let over = 0;

      pendingFollowUps.forEach(f => {
        if (f.follow_up_date < todayStr) over++;
        else if (f.follow_up_date === todayStr) due++;
      });

      setFollowUps(pendingFollowUps);

      const newStats = {
        leads: contacts.filter(c => c.stage === 'lead').length,
        warmLeads: contacts.filter(c => c.stage === 'warm_lead').length,
        prospects: contacts.filter(c => c.stage === 'prospect').length,
        warmProspects: contacts.filter(c => c.stage === 'warm_prospect').length,
        clients: contacts.filter(c => c.stage === 'client').length,
        activeClients: contacts.filter(c => c.stage === 'active_client').length,
        totalFollowUps: pendingFollowUps.length,
        dueToday: due,
        overdue: over,
      };

      console.log('Calculated Stats:', newStats);
      setStats(newStats);
    }
    setLoading(false);
  };

  const displayTitle = userName
    ? `${userName}'s Dashboard`
    : (role === 'admin' ? 'Admin Dashboard' : 'Dashboard');

  return (
    <AppLayout
      title={displayTitle}
      subtitle="Overview"
      actions={
        <Button onClick={() => navigate('/contacts/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      }
    >
      {/* SECTION 1: FOLLOW-UPS */}
      <section className="mb-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Follow-ups</h2>
          <Button variant="link" onClick={() => navigate('/follow-ups')}>View All</Button>
        </div>

        {/* At a glance stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="Total Pending"
            value={stats.totalFollowUps}
            icon={Calendar}
            variant="primary"
          />
          <KPICard
            label="Due Today"
            value={stats.dueToday}
            icon={Clock}
            variant={stats.dueToday > 0 ? "warning" : "success"}
          />
          <KPICard
            label="Overdue"
            value={stats.overdue}
            icon={AlertTriangle}
            variant={stats.overdue > 0 ? "warning" : "success"}
          />
        </div>

        {/* Detailed List */}
        <Card className="border-l-4 border-l-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Upcoming & Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No pending follow-ups. Good job!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followUps.slice(0, 5).map((f) => {
                      const isOverdue = f.follow_up_date < new Date().toISOString().split('T')[0];
                      const isToday = f.follow_up_date === new Date().toISOString().split('T')[0];

                      return (
                        <TableRow key={f.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">
                            {f.contact ? (
                              <span
                                className="hover:underline cursor-pointer text-primary"
                                onClick={() => navigate(`/contacts/${f.contact!.id}`)}
                              >
                                {f.contact.first_name} {f.contact.last_name}
                              </span>
                            ) : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{format(parseISO(f.follow_up_date), 'MMM d, yyyy')}</span>
                              {isOverdue && <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Overdue</Badge>}
                              {isToday && <Badge variant="secondary" className="bg-amber-100 text-amber-800 h-5 text-[10px] px-1.5">Today</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{f.status || 'Pending'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                            {f.notes || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/contacts/${f.contact?.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 2: CLIENT TOUCH POINTS */}
      <section className="mb-10 space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Client Touch Points</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard label="Lead" value={stats.leads} icon={UserPlus} variant="default" />
          <KPICard label="Warm Lead" value={stats.warmLeads} icon={Flame} variant="default" />
          <KPICard label="Prospect" value={stats.prospects} icon={Target} variant="default" />
          <KPICard label="Warm Prospect" value={stats.warmProspects} icon={Target} variant="default" />
          <KPICard label="Client" value={stats.clients} icon={Handshake} variant="primary" />
        </div>
      </section>

      {/* SECTION 3: STATUS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard
            label="Total Clients"
            value={stats.clients}
            icon={Handshake}
            variant="primary"
          />
          <KPICard
            label="Active Clients"
            value={stats.activeClients}
            icon={Star}
            variant="success"
          />
        </div>
      </section>
    </AppLayout>
  );
}
