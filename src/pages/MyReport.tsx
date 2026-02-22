import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StageBadge } from '@/components/crm/StageBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    DollarSign, TrendingUp, TrendingDown, Users, Handshake,
    CalendarCheck, AlertTriangle, Target, Flame, Star,
    Clock, ArrowRight, BarChart2, Percent, Award, Activity,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend,
    PieChart, Pie, Cell,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const PIE_LABEL_COLORS: Record<string, string> = {
    lead: '#6366f1', warm_lead: '#f59e0b', prospect: '#3b82f6',
    warm_prospect: '#f97316', client: '#10b981', active_client: '#059669',
};

const STAGE_LABELS: Record<string, string> = {
    lead: 'Lead', warm_lead: 'Warm Lead', prospect: 'Prospect',
    warm_prospect: 'Warm Prospect', client: 'Client', active_client: 'Active Client',
};

const formatUSD = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ── Small KPI card ────────────────────────────────────────────────────────────
function KPI({
    label, value, sub, icon: Icon, accent, trend,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    accent: string;
    trend?: 'up' | 'down' | 'neutral';
}) {
    return (
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="mt-1.5 text-2xl font-extrabold tracking-tight truncate">{value}</p>
                        {sub && (
                            <p className={cn(
                                'text-[11px] mt-1 font-medium',
                                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                            )}>
                                {trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{sub}
                            </p>
                        )}
                    </div>
                    <div className={cn('rounded-xl p-2.5 shrink-0 ml-3', accent)}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyReport() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<any>(null);
    const [contacts, setContacts] = useState<any[]>([]);
    const [deals, setDeals] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [followUps, setFollowUps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        loadAll();
    }, [user]);

    const loadAll = async () => {
        setLoading(true);
        const [profileRes, contactsRes, dealsRes, fuRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user!.id).single(),
            supabase.from('contacts').select('*').eq('bd_user_id', user!.id).eq('is_deleted', false).order('created_at', { ascending: false }),
            supabase.from('deals').select('*').eq('bd_user_id', user!.id).order('deal_date', { ascending: false }),
            supabase.from('follow_ups').select('*').eq('bd_user_id', user!.id).order('follow_up_date', { ascending: true }),
        ]);

        // Fetch expenses for all contacts owned by this user
        const contactIds = (contactsRes.data || []).map((c: any) => c.id);
        let expData: any[] = [];
        if (contactIds.length > 0) {
            const { data } = await supabase
                .from('expenses')
                .select('*')
                .in('contact_id', contactIds)
                .order('created_at', { ascending: false });
            expData = data || [];
        }

        setProfile(profileRes.data);
        setContacts(contactsRes.data || []);
        setDeals(dealsRes.data || []);
        setExpenses(expData);
        setFollowUps(fuRes.data || []);
        setLoading(false);
    };

    if (loading) {
        return (
            <AppLayout title="My Report">
                <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
                    Loading your report…
                </div>
            </AppLayout>
        );
    }

    // ── Derived Metrics ─────────────────────────────────────────────────────────
    const todayStr = new Date().toISOString().split('T')[0];

    const totalIncome = deals.reduce((s, d) => s + Number(d.deal_value || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : null;

    const closedDeals = deals.filter(d => d.order_status === 'closed');
    const openDeals = deals.filter(d => d.order_status === 'open' || d.order_status === 'pending');
    const closedIncome = closedDeals.reduce((s, d) => s + Number(d.deal_value || 0), 0);

    const stageCounts = {
        lead: contacts.filter(c => c.stage === 'lead').length,
        warm_lead: contacts.filter(c => c.stage === 'warm_lead').length,
        prospect: contacts.filter(c => c.stage === 'prospect').length,
        warm_prospect: contacts.filter(c => c.stage === 'warm_prospect').length,
        client: contacts.filter(c => c.stage === 'client').length,
        active_client: contacts.filter(c => c.stage === 'active_client').length,
    };
    const totalClients = stageCounts.client + stageCounts.active_client;
    const conversionRate = contacts.length > 0 ? ((totalClients / contacts.length) * 100).toFixed(1) : '0.0';

    const overdueFU = followUps.filter(f => !f.is_completed && f.follow_up_date < todayStr);
    const upcomingFU = followUps.filter(f => !f.is_completed && f.follow_up_date >= todayStr);
    const completedFU = followUps.filter(f => f.is_completed);

    // Top 5 clients by deal value (contacts that have deals)
    const contactDealMap: Record<string, number> = {};
    deals.forEach(d => {
        contactDealMap[d.contact_id] = (contactDealMap[d.contact_id] || 0) + Number(d.deal_value || 0);
    });
    const topContacts = contacts
        .filter(c => contactDealMap[c.id])
        .map(c => ({ ...c, totalValue: contactDealMap[c.id] }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

    // Monthly income trend (last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        const label = format(d, 'MMM');
        const start = startOfMonth(d).toISOString();
        const end = endOfMonth(d).toISOString();
        const income = deals.filter(deal => deal.deal_date >= start.slice(0, 10) && deal.deal_date <= end.slice(0, 10))
            .reduce((s, deal) => s + Number(deal.deal_value || 0), 0);
        const expense = expenses
            .filter(exp => exp.created_at >= start && exp.created_at <= end)
            .reduce((s, exp) => s + Number(exp.amount || 0), 0);
        return { label, income, expense };
    });

    // Pipeline pie data
    const pieData = Object.entries(stageCounts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STAGE_LABELS[k], value: v, key: k }));

    // Expense by category
    const expByCategory: Record<string, number> = {};
    expenses.forEach(e => {
        expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount || 0);
    });
    const expCategoryData = Object.entries(expByCategory)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '), value }))
        .sort((a, b) => b.value - a.value);

    const initials = profile?.full_name
        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <AppLayout
            title="My Performance Report"
            subtitle={`Personal overview · ${format(new Date(), 'MMMM yyyy')}`}
        >
            <div className="space-y-8">

                {/* ── Hero Banner ───────────────────────────────────────────────────── */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold backdrop-blur-sm ring-2 ring-white/30">
                            {initials}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-extrabold tracking-tight">{profile?.full_name || 'My Report'}</h2>
                            <p className="text-indigo-200 text-sm mt-0.5">{profile?.email}</p>
                        </div>
                        {/* Quick stats in banner */}
                        <div className="flex gap-5 sm:gap-8 text-center shrink-0 w-full sm:w-auto">
                            <div>
                                <p className="text-2xl font-extrabold text-emerald-300">{formatUSD(closedIncome)}</p>
                                <p className="text-xs text-indigo-200 mt-0.5">Settled Income</p>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div>
                                <p className="text-2xl font-extrabold">{contacts.length}</p>
                                <p className="text-xs text-indigo-200 mt-0.5">Total Contacts</p>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div>
                                <p className={cn('text-2xl font-extrabold', overdueFU.length > 0 ? 'text-red-300' : 'text-white')}>
                                    {overdueFU.length}
                                </p>
                                <p className="text-xs text-indigo-200 mt-0.5">Overdue FU</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Financial KPIs ────────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5" /> Financial Overview
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPI
                            label="Total Income"
                            value={formatUSD(totalIncome)}
                            sub="All deals combined"
                            icon={TrendingUp}
                            accent="bg-emerald-500"
                            trend="neutral"
                        />
                        <KPI
                            label="Total Expenses"
                            value={formatUSD(totalExpenses)}
                            sub="Marketing & follow-up spend"
                            icon={TrendingDown}
                            accent="bg-rose-500"
                            trend="neutral"
                        />
                        <KPI
                            label="Net Profit"
                            value={formatUSD(netProfit)}
                            sub={netProfit >= 0 ? 'Positive margin' : 'Loss position'}
                            icon={BarChart2}
                            accent={netProfit >= 0 ? 'bg-indigo-500' : 'bg-orange-500'}
                            trend={netProfit >= 0 ? 'up' : 'down'}
                        />
                        <KPI
                            label="Expense Ratio"
                            value={expenseRatio !== null ? `${expenseRatio.toFixed(1)}%` : 'N/A'}
                            sub={expenseRatio === null
                                ? 'No income yet'
                                : expenseRatio <= 10 ? 'Excellent efficiency'
                                    : expenseRatio <= 20 ? 'Moderate spend'
                                        : 'High cost ratio'}
                            icon={Percent}
                            accent={expenseRatio === null ? 'bg-slate-400' : expenseRatio <= 10 ? 'bg-emerald-500' : expenseRatio <= 20 ? 'bg-amber-500' : 'bg-rose-500'}
                            trend={expenseRatio === null ? 'neutral' : expenseRatio <= 10 ? 'up' : 'down'}
                        />
                    </div>
                </section>

                {/* ── Pipeline / Activity KPIs ──────────────────────────────────────── */}
                <section>
                    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" /> Pipeline & Activity
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPI label="Total Contacts" value={contacts.length} sub="In your pipeline" icon={Users} accent="bg-indigo-500" />
                        <KPI label="Clients" value={totalClients} sub={`${stageCounts.active_client} active`} icon={Handshake} accent="bg-emerald-500" trend="up" />
                        <KPI label="Conversion Rate" value={`${conversionRate}%`} sub="Contacts → Clients" icon={Target} accent="bg-violet-500" />
                        <KPI label="Closed Deals" value={closedDeals.length} sub={`${openDeals.length} open/pending`} icon={Award} accent="bg-teal-500" />
                        <KPI label="Leads" value={stageCounts.lead} sub="Top of funnel" icon={Star} accent="bg-blue-500" />
                        <KPI label="Warm Leads" value={stageCounts.warm_lead} sub="Engaged contacts" icon={Flame} accent="bg-orange-400" />
                        <KPI label="Prospects" value={stageCounts.prospect + stageCounts.warm_prospect} sub="In consideration" icon={Target} accent="bg-cyan-500" />
                        <KPI
                            label="Overdue Follow-ups"
                            value={overdueFU.length}
                            sub={overdueFU.length > 0 ? 'Needs attention' : '✓ All clear'}
                            icon={AlertTriangle}
                            accent={overdueFU.length > 0 ? 'bg-rose-500' : 'bg-slate-400'}
                            trend={overdueFU.length > 0 ? 'down' : 'up'}
                        />
                    </div>
                </section>

                {/* ── Monthly Trend Chart + Pie Chart ──────────────────────────────── */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Income vs Expense Bar Chart */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <BarChart2 className="h-4 w-4 text-indigo-500" /> Income vs Expenses — Last 6 Months
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {monthlyData.every(m => m.income === 0 && m.expense === 0) ? (
                                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                                    No financial data yet.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={monthlyData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(v: any) => [formatUSD(v), '']} />
                                        <Legend iconType="circle" iconSize={10} />
                                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pipeline Pie */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-violet-500" /> Pipeline Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pieData.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                                    No contacts yet.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="46%"
                                            innerRadius={52}
                                            outerRadius={82}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry) => (
                                                <Cell key={entry.key} fill={PIE_LABEL_COLORS[entry.key] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: any, name: any) => [`${v} contacts`, name]} />
                                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* ── Expense Breakdown + Follow-up Health ─────────────────────────── */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Expense by Category */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-rose-500" /> Expense Breakdown by Category
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expCategoryData.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">No expenses recorded yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {expCategoryData.map((cat) => {
                                        const pct = totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0;
                                        return (
                                            <div key={cat.name}>
                                                <div className="flex items-center justify-between text-sm mb-1">
                                                    <span className="font-medium">{cat.name}</span>
                                                    <span className="text-muted-foreground font-semibold">{formatUSD(cat.value)}</span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-rose-400 transition-all duration-700"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{pct.toFixed(0)}% of total</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Follow-up Health */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <CalendarCheck className="h-4 w-4 text-amber-500" /> Follow-up Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Summary pills */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-center">
                                    <p className="text-xl font-extrabold text-rose-600">{overdueFU.length}</p>
                                    <p className="text-[10px] text-rose-500 font-medium mt-0.5">Overdue</p>
                                </div>
                                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                                    <p className="text-xl font-extrabold text-amber-600">{upcomingFU.length}</p>
                                    <p className="text-[10px] text-amber-500 font-medium mt-0.5">Upcoming</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                                    <p className="text-xl font-extrabold text-emerald-600">{completedFU.length}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Completed</p>
                                </div>
                            </div>

                            {/* Upcoming list */}
                            {upcomingFU.length === 0 && overdueFU.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-4">All caught up! 🎉</p>
                            ) : (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {[...overdueFU, ...upcomingFU].slice(0, 8).map((f) => {
                                        const isOverdue = f.follow_up_date < todayStr;
                                        return (
                                            <div
                                                key={f.id}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                                                    isOverdue ? 'border-rose-200 bg-rose-50' : 'border-border'
                                                )}
                                            >
                                                <Clock className={cn('h-3.5 w-3.5 shrink-0', isOverdue ? 'text-rose-500' : 'text-amber-500')} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('font-medium truncate', isOverdue && 'text-rose-700')}>
                                                        {format(parseISO(f.follow_up_date), 'MMM d, yyyy')}
                                                    </p>
                                                    {f.notes && <p className="text-[10px] text-muted-foreground truncate">{f.notes}</p>}
                                                </div>
                                                {isOverdue && (
                                                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 shrink-0">Overdue</Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <Button variant="link" size="sm" className="mt-2 px-0 text-xs" onClick={() => navigate('/follow-ups')}>
                                View all follow-ups <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </CardContent>
                    </Card>
                </section>

                {/* ── Top Clients by Revenue ────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Handshake className="h-3.5 w-3.5" /> Top Clients by Revenue
                        </h2>
                        <Button variant="outline" size="sm" onClick={() => navigate('/contacts')}>
                            All Contacts <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {topContacts.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">
                                    No deal revenue recorded yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Value</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">% of Income</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {topContacts.map((c, idx) => (
                                                <tr
                                                    key={c.id}
                                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/contacts/${c.id}`)}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-extrabold text-white shrink-0',
                                                                idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-primary/20'
                                                            )}>
                                                                {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `${idx + 1}`}
                                                            </div>
                                                            <span className="font-semibold">{c.first_name} {c.last_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-muted-foreground">{c.company || '—'}</td>
                                                    <td className="px-5 py-3.5"><StageBadge stage={c.stage} /></td>
                                                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{formatUSD(c.totalValue)}</td>
                                                    <td className="px-5 py-3.5 text-right text-muted-foreground">
                                                        {totalIncome > 0 ? `${((c.totalValue / totalIncome) * 100).toFixed(1)}%` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* ── Recent Deals ──────────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5" /> Recent Deals
                    </h2>
                    <Card>
                        <CardContent className="p-0">
                            {deals.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">No deals recorded yet.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Settlement</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {deals.slice(0, 10).map((d) => (
                                                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-5 py-3.5 font-medium">{format(parseISO(d.deal_date), 'MMM d, yyyy')}</td>
                                                    <td className="px-5 py-3.5 text-muted-foreground capitalize">{d.source_of_business || '—'}</td>
                                                    <td className="px-5 py-3.5">
                                                        <Badge variant="outline" className={cn(
                                                            'text-[10px] capitalize',
                                                            d.order_status === 'closed' ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                                                : d.order_status === 'open' ? 'border-blue-300 text-blue-700 bg-blue-50'
                                                                    : d.order_status === 'pending' ? 'border-amber-300 text-amber-700 bg-amber-50'
                                                                        : 'border-slate-300 text-slate-600'
                                                        )}>
                                                            {d.order_status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">{formatUSD(Number(d.settlement_fee || 0))}</td>
                                                    <td className="px-5 py-3.5 text-right font-bold">{formatUSD(Number(d.deal_value || 0))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

            </div>
        </AppLayout>
    );
}
