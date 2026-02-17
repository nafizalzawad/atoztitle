import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Users, TrendingUp, DollarSign, Download, Calendar } from 'lucide-react';
import { KPICard } from '@/components/crm/KPICard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, subDays } from 'date-fns';

interface UserReport {
  userId: string;
  fullName: string;
  email: string;
  eventsLast30Days: number;
  leads: number;
  warmLeads: number;
  prospects: number;
  warmProspects: number;
  totalClients: number;
  dealsClosed: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBDMembers: 0,
    contactsThisWeek: 0,
    contactsThisMonth: 0,
    totalDeals: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadUserReports();
  }, [user]);

  const loadStats = async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [profilesRes, contactsRes, dealsRes] = await Promise.all([
      supabase.from('profiles').select('id'),
      supabase.from('contacts').select('*').eq('is_deleted', false),
      supabase.from('deals').select('*'),
    ]);

    const contacts = contactsRes.data || [];
    const deals = dealsRes.data || [];
    const totalRevenue = deals.reduce((sum, d) => sum + Number(d.deal_value), 0);
    const clients = contacts.filter(c => c.stage === 'client' || c.stage === 'active_client').length;

    setStats({
      totalBDMembers: profilesRes.data?.length || 0,
      contactsThisWeek: contacts.filter(c => c.created_at >= weekAgo).length,
      contactsThisMonth: contacts.filter(c => c.created_at >= monthAgo).length,
      totalDeals: deals.length,
      totalRevenue,
      conversionRate: contacts.length > 0 ? Math.round((clients / contacts.length) * 100) : 0,
    });
  };

  const loadUserReports = async () => {
    setLoading(true);
    const date30DaysAgo = subDays(new Date(), 30).toISOString();

    // We need to fetch everything and aggregate in memory or use complex joins.
    // Given the scale, fetching all is okay for now.
    const [profilesRes, contactsRes, eventsRes, dealsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('contacts').select('*').eq('is_deleted', false),
      supabase.from('events').select('*'),
      supabase.from('deals').select('*'),
    ]);

    const profiles = profilesRes.data || [];
    const contacts = contactsRes.data || [];
    const events = eventsRes.data || [];
    const deals = dealsRes.data || [];

    const reports: UserReport[] = profiles.map(profile => {
      const userContacts = contacts.filter(c => c.bd_user_id === profile.id);
      const userEvents = events.filter(e => e.user_id === profile.id && e.event_date >= date30DaysAgo);
      const userDeals = deals.filter(d => d.bd_user_id === profile.id);

      return {
        userId: profile.id,
        fullName: profile.full_name || 'Unknown',
        email: profile.email,
        eventsLast30Days: userEvents.length,
        leads: userContacts.filter(c => c.stage === 'lead').length,
        warmLeads: userContacts.filter(c => c.stage === 'warm_lead').length,
        prospects: userContacts.filter(c => c.stage === 'prospect').length,
        warmProspects: userContacts.filter(c => c.stage === 'warm_prospect').length,
        totalClients: userContacts.filter(c => c.stage === 'client' || c.stage === 'active_client').length,
        dealsClosed: userDeals.length,
      };
    });

    setUserReports(reports);
    setLoading(false);
  };

  const downloadReport = (report: UserReport) => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Name', report.fullName],
      ['Email', report.email],
      ['Events (Last 30 Days)', report.eventsLast30Days],
      ['Leads', report.leads],
      ['Warm Leads', report.warmLeads],
      ['Prospects', report.prospects],
      ['Warm Prospects', report.warmProspects],
      ['Clients', report.totalClients],
      ['Deals Closed', report.dealsClosed],
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.fullName.replace(/\s+/g, '_')}_report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Reports" subtitle="Global pipeline metrics and performance overview">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KPICard label="BD Members" value={stats.totalBDMembers} icon={Users} variant="primary" />
        <KPICard label="Contacts (This Week)" value={stats.contactsThisWeek} icon={TrendingUp} variant="secondary" />
        <KPICard label="Contacts (This Month)" value={stats.contactsThisMonth} icon={TrendingUp} variant="default" />
        <KPICard label="Total Deals" value={stats.totalDeals} icon={BarChart3} variant="success" />
        <KPICard label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
        <KPICard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={TrendingUp} variant="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Events (30d)</TableHead>
                  <TableHead className="text-center">Lead</TableHead>
                  <TableHead className="text-center">Warm Lead</TableHead>
                  <TableHead className="text-center">Prospect</TableHead>
                  <TableHead className="text-center">Warm Prospect</TableHead>
                  <TableHead className="text-center">Client</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      Loading team data...
                    </TableCell>
                  </TableRow>
                ) : userReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      No team members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  userReports.map((report) => (
                    <TableRow key={report.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {report.fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{report.fullName}</span>
                            <span className="text-xs text-muted-foreground">{report.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {report.eventsLast30Days}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{report.leads}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{report.warmLeads}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{report.prospects}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{report.warmProspects}</TableCell>
                      <TableCell className="text-center font-medium">{report.totalClients}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadReport(report)}
                          title="Download Report"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
