import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Users, TrendingUp, DollarSign } from 'lucide-react';
import { KPICard } from '@/components/crm/KPICard';

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

  useEffect(() => {
    if (!user) return;
    loadStats();
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
    </AppLayout>
  );
}
