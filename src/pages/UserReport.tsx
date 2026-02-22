import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StageBadge } from '@/components/crm/StageBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
    ArrowLeft, Users, CalendarCheck, AlertTriangle, Handshake,
    TrendingUp, UserPlus, Flame, Star, Mail, Calendar, Clock, ArrowRight,
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, differenceInDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

type Stage = 'lead' | 'warm_lead' | 'prospect' | 'warm_prospect' | 'client' | 'active_client';

const stageLabels: Record<Stage, string> = {
    lead: 'Lead',
    warm_lead: 'Warm Lead',
    prospect: 'Prospect',
    warm_prospect: 'Warm Prospect',
    client: 'Client',
    active_client: 'Active Client',
};

const STAGE_COLORS: Record<string, string> = {
    Lead: '#6366f1',
    'Warm Lead': '#f59e0b',
    Prospect: '#3b82f6',
    'Warm Prospect': '#f97316',
    Client: '#10b981',
    'Active Client': '#059669',
};

const STAGE_BG: Record<string, string> = {
    lead: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    warm_lead: 'bg-amber-50 text-amber-700 border-amber-200',
    prospect: 'bg-blue-50 text-blue-700 border-blue-200',
    warm_prospect: 'bg-orange-50 text-orange-700 border-orange-200',
    client: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active_client: 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function UserReport() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<any>(null);
    const [contacts, setContacts] = useState<any[]>([]);
    const [followUps, setFollowUps] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const todayStr = new Date().toISOString().split('T')[0];
    const date30Ago = subDays(new Date(), 30).toISOString();

    useEffect(() => {
        if (!id) return;
        loadAll();
    }, [id]);

    const loadAll = async () => {
        setLoading(true);
        const [profileRes, contactsRes, followUpsRes, eventsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', id).single(),
            supabase.from('contacts').select('*').eq('bd_user_id', id).eq('is_deleted', false).order('created_at', { ascending: false }),
            supabase.from('follow_ups').select('*').eq('bd_user_id', id).eq('is_completed', false).order('follow_up_date', { ascending: true }),
            supabase.from('events').select('*').eq('user_id', id).order('event_date', { ascending: false }),
        ]);
        setProfile(profileRes.data);
        setContacts(contactsRes.data || []);
        setFollowUps(followUpsRes.data || []);
        setEvents(eventsRes.data || []);
        setLoading(false);
    };

    if (loading) {
        return (
            <AppLayout title="Loading...">
                <div className="flex items-center justify-center h-64 text-muted-foreground">Loading member report…</div>
            </AppLayout>
        );
    }

    if (!profile) {
        return (
            <AppLayout title="Not Found">
                <div className="p-12 text-center text-muted-foreground">Team member not found.</div>
            </AppLayout>
        );
    }

    // ── Derived metrics ──────────────────────────────────────────────────────────
    const stageCounts = {
        lead: contacts.filter(c => c.stage === 'lead').length,
        warm_lead: contacts.filter(c => c.stage === 'warm_lead').length,
        prospect: contacts.filter(c => c.stage === 'prospect').length,
        warm_prospect: contacts.filter(c => c.stage === 'warm_prospect').length,
        client: contacts.filter(c => c.stage === 'client').length,
        active_client: contacts.filter(c => c.stage === 'active_client').length,
    };

    const totalClients = stageCounts.client + stageCounts.active_client;
    const eventsLast30 = events.filter(e => e.event_date >= date30Ago).length;
    const overdueFollowUps = followUps.filter(f => f.follow_up_date < todayStr);
    const pendingFollowUps = followUps.filter(f => f.follow_up_date >= todayStr);

    const pieData = [
        { name: 'Lead', value: stageCounts.lead },
        { name: 'Warm Lead', value: stageCounts.warm_lead },
        { name: 'Prospect', value: stageCounts.prospect },
        { name: 'Warm Prospect', value: stageCounts.warm_prospect },
        { name: 'Client', value: stageCounts.client },
        { name: 'Active Client', value: stageCounts.active_client },
    ].filter(d => d.value > 0);

    const initials = profile.full_name
        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : '??';

    // ── KPI Card component ───────────────────────────────────────────────────────
    const KPI = ({ label, value, icon: Icon, color, sub }: {
        label: string; value: number | string; icon: any; color: string; sub?: string;
    }) => (
        <Card className="relative overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="mt-1.5 text-3xl font-bold">{value}</p>
                        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
                    </div>
                    <div className={`rounded-xl p-2.5 ${color}`}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout
            title={profile.full_name || 'Member Report'}
            subtitle={`Personalized performance report · ${profile.email}`}
            actions={
                <Button variant="outline" size="sm" onClick={() => navigate('/admin-dashboard')}>
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
                </Button>
            }
        >
            <div className="space-y-8">

                {/* ── Profile Banner ─────────────────────────────────────────────────── */}
                <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-5">
                            <Avatar className="h-16 w-16 ring-4 ring-white/30">
                                <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                                <div className="flex items-center gap-2 mt-1 text-indigo-100 text-sm">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{profile.email}</span>
                                </div>
                            </div>
                            <div className="hidden md:flex gap-6 text-center">
                                <div>
                                    <p className="text-3xl font-bold">{contacts.length}</p>
                                    <p className="text-xs text-indigo-200 mt-0.5">Total Contacts</p>
                                </div>
                                <div className="w-px bg-white/20" />
                                <div>
                                    <p className="text-3xl font-bold text-emerald-300">{totalClients}</p>
                                    <p className="text-xs text-indigo-200 mt-0.5">Clients</p>
                                </div>
                                <div className="w-px bg-white/20" />
                                <div>
                                    <p className={cn('text-3xl font-bold', overdueFollowUps.length > 0 ? 'text-red-300' : 'text-white')}>
                                        {overdueFollowUps.length}
                                    </p>
                                    <p className="text-xs text-indigo-200 mt-0.5">Overdue</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── KPI Grid ───────────────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Performance Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPI label="Total Contacts" value={contacts.length} icon={UserPlus} color="bg-indigo-500" sub="All pipeline contacts" />
                        <KPI label="Clients" value={totalClients} icon={Handshake} color="bg-emerald-500" sub={`${stageCounts.active_client} active`} />
                        <KPI label="Events (30d)" value={eventsLast30} icon={Calendar} color="bg-violet-500" sub="Last 30 days" />
                        <KPI label="Pending Follow-ups" value={pendingFollowUps.length} icon={CalendarCheck} color="bg-amber-500" sub="Upcoming" />
                        <KPI label="Leads" value={stageCounts.lead} icon={TrendingUp} color="bg-blue-500" />
                        <KPI label="Warm Leads" value={stageCounts.warm_lead} icon={Flame} color="bg-orange-400" />
                        <KPI label="Prospects" value={stageCounts.prospect} icon={Star} color="bg-cyan-500" />
                        <KPI label="Overdue Follow-ups" value={overdueFollowUps.length} icon={AlertTriangle} color={overdueFollowUps.length > 0 ? 'bg-red-500' : 'bg-slate-400'} sub={overdueFollowUps.length > 0 ? 'Needs attention' : 'All clear'} />
                    </div>
                </section>

                {/* ── Pipeline Chart + Stage Breakdown ───────────────────────────────── */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Pie chart */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Pipeline Distribution</CardTitle></CardHeader>
                        <CardContent>
                            {pieData.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-10">No contact data yet.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry) => (
                                                <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: any) => [`${v} contacts`, '']} />
                                        <Legend iconType="circle" iconSize={10} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stage breakdown table */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Stage Breakdown</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40">
                                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Count</th>
                                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">% of Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(Object.keys(stageLabels) as Stage[]).map((s) => {
                                        const count = stageCounts[s];
                                        const pct = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0;
                                        return (
                                            <tr key={s} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-5 py-3">
                                                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', STAGE_BG[s])}>
                                                        {stageLabels[s]}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right font-bold">{count}</td>
                                                <td className="px-5 py-3 text-right text-muted-foreground">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-primary"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs w-8 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </section>

                {/* ── Contacts List ──────────────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            All Contacts ({contacts.length})
                        </h2>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/contacts?marketer=${id}`)}>
                            Open in Contacts <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {contacts.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-sm">No contacts yet.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Days in Stage</th>
                                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {contacts.map((c) => {
                                                const days = differenceInDays(new Date(), new Date(c.updated_at));
                                                const isWarning = c.stage === 'warm_prospect' && days >= 90;
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        className={cn('hover:bg-muted/30 transition-colors cursor-pointer', isWarning && 'bg-red-50/50')}
                                                        onClick={() => navigate(`/contacts/${c.id}`)}
                                                    >
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                                    {c.first_name?.[0]}{c.last_name?.[0]}
                                                                </div>
                                                                <span className="font-medium">{c.first_name} {c.last_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-muted-foreground">{c.company || '—'}</td>
                                                        <td className="px-5 py-3.5"><StageBadge stage={c.stage} /></td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <span className={cn('text-sm font-medium', isWarning ? 'text-destructive font-bold' : 'text-muted-foreground')}>
                                                                {days}d {isWarning && '⚠️'}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center font-semibold">{c.engagement_points ?? 0}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* ── Follow-ups & Events row ─────────────────────────────────────────── */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Overdue + Upcoming Follow-ups */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <CalendarCheck className="h-4 w-4 text-amber-500" />
                                Follow-ups
                                {overdueFollowUps.length > 0 && (
                                    <Badge variant="destructive" className="ml-auto text-xs">{overdueFollowUps.length} overdue</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {followUps.length === 0 ? (
                                <p className="px-5 pb-5 text-sm text-muted-foreground">No pending follow-ups.</p>
                            ) : (
                                <div className="divide-y max-h-64 overflow-y-auto">
                                    {[...overdueFollowUps, ...pendingFollowUps].map((f) => {
                                        const isOverdue = f.follow_up_date < todayStr;
                                        return (
                                            <div key={f.id} className={cn(
                                                'flex items-start gap-3 px-5 py-3 text-sm',
                                                isOverdue && 'bg-red-50/60'
                                            )}>
                                                <Clock className={cn('h-4 w-4 mt-0.5 shrink-0', isOverdue ? 'text-destructive' : 'text-amber-500')} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('font-medium', isOverdue && 'text-destructive')}>
                                                        {format(new Date(f.follow_up_date), 'MMM d, yyyy')}
                                                        {f.follow_up_time && ` at ${f.follow_up_time}`}
                                                    </p>
                                                    {f.notes && <p className="text-xs text-muted-foreground truncate">{f.notes}</p>}
                                                </div>
                                                {isOverdue && (
                                                    <Badge variant="destructive" className="text-[10px] shrink-0">Overdue</Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Events */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-violet-500" />
                                Recent Events
                                <span className="ml-auto text-xs font-normal text-muted-foreground">{eventsLast30} in last 30d</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {events.length === 0 ? (
                                <p className="px-5 pb-5 text-sm text-muted-foreground">No events recorded.</p>
                            ) : (
                                <div className="divide-y max-h-64 overflow-y-auto">
                                    {events.slice(0, 10).map((ev) => {
                                        const isRecent = ev.event_date >= date30Ago;
                                        return (
                                            <div key={ev.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                                                <div className={cn(
                                                    'h-2 w-2 rounded-full mt-1.5 shrink-0',
                                                    isRecent ? 'bg-violet-500' : 'bg-muted-foreground/30'
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium">{ev.name || ev.title || 'Event'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(ev.event_date), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                                {isRecent && (
                                                    <span className="text-[10px] text-violet-600 font-medium shrink-0">Recent</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

            </div>
        </AppLayout>
    );
}
