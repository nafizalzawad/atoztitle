import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users, TrendingUp, Handshake, CalendarCheck,
    AlertTriangle, Star, UserPlus, Flame, Target, BarChart3,
    ArrowRight, Calendar,
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { subDays, format } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    leads: number;
    warmLeads: number;
    prospects: number;
    warmProspects: number;
    clients: number;
    activeClients: number;
    totalContacts: number;
    eventsLast30: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
}

interface GlobalStats {
    totalMembers: number;
    totalContacts: number;
    totalClients: number;
    totalActiveClients: number;
    totalPendingFollowUps: number;
    totalOverdueFollowUps: number;
    totalEvents30d: number;
}

// ─── Colours ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
    Lead: '#6366f1',
    'Warm Lead': '#f59e0b',
    Prospect: '#3b82f6',
    'Warm Prospect': '#f97316',
    Client: '#10b981',
    'Active Client': '#059669',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [globalStats, setGlobalStats] = useState<GlobalStats>({
        totalMembers: 0, totalContacts: 0, totalClients: 0,
        totalActiveClients: 0, totalPendingFollowUps: 0,
        totalOverdueFollowUps: 0, totalEvents30d: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const date30Ago = subDays(new Date(), 30).toISOString();

        const [profilesRes, contactsRes, followUpsRes, eventsRes] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('contacts').select('id, bd_user_id, stage').eq('is_deleted', false),
            supabase.from('follow_ups').select('id, bd_user_id, is_completed, follow_up_date').eq('is_completed', false),
            supabase.from('events').select('id, user_id, event_date'),
        ]);

        const profiles = profilesRes.data || [];
        const contacts = contactsRes.data || [];
        const followUps = followUpsRes.data || [];
        const events = eventsRes.data || [];

        const members: TeamMember[] = profiles.map(p => {
            const uc = contacts.filter(c => c.bd_user_id === p.id);
            const uf = followUps.filter(f => f.bd_user_id === p.id);
            const ue = events.filter(e => e.user_id === p.id && e.event_date >= date30Ago);
            const overdue = uf.filter(f => f.follow_up_date < todayStr);

            return {
                id: p.id,
                full_name: p.full_name || 'Unknown',
                email: p.email,
                leads: uc.filter(c => c.stage === 'lead').length,
                warmLeads: uc.filter(c => c.stage === 'warm_lead').length,
                prospects: uc.filter(c => c.stage === 'prospect').length,
                warmProspects: uc.filter(c => c.stage === 'warm_prospect').length,
                clients: uc.filter(c => c.stage === 'client').length,
                activeClients: uc.filter(c => c.stage === 'active_client').length,
                totalContacts: uc.length,
                eventsLast30: ue.length,
                pendingFollowUps: uf.length,
                overdueFollowUps: overdue.length,
            };
        });

        setTeam(members);

        const allPending = followUps.length;
        const allOverdue = followUps.filter(f => f.follow_up_date < todayStr).length;
        const allEvents30 = events.filter(e => e.event_date >= date30Ago).length;

        setGlobalStats({
            totalMembers: profiles.length,
            totalContacts: contacts.length,
            totalClients: contacts.filter(c => c.stage === 'client').length,
            totalActiveClients: contacts.filter(c => c.stage === 'active_client').length,
            totalPendingFollowUps: allPending,
            totalOverdueFollowUps: allOverdue,
            totalEvents30d: allEvents30,
        });

        setLoading(false);
    };

    // ── Derived chart data ────────────────────────────────────────────────────

    const pipelinePieData = [
        { name: 'Lead', value: team.reduce((s, m) => s + m.leads, 0) },
        { name: 'Warm Lead', value: team.reduce((s, m) => s + m.warmLeads, 0) },
        { name: 'Prospect', value: team.reduce((s, m) => s + m.prospects, 0) },
        { name: 'Warm Prospect', value: team.reduce((s, m) => s + m.warmProspects, 0) },
        { name: 'Client', value: team.reduce((s, m) => s + m.clients, 0) },
        { name: 'Active Client', value: team.reduce((s, m) => s + m.activeClients, 0) },
    ].filter(d => d.value > 0);

    const memberBarData = team.map(m => ({
        name: m.full_name.split(' ')[0],
        Contacts: m.totalContacts,
        Clients: m.clients + m.activeClients,
        'Follow-ups': m.pendingFollowUps,
    }));

    // ── KPI card helper ───────────────────────────────────────────────────────

    const KPI = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
        <Card className="relative overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="mt-1.5 text-3xl font-bold">{value}</p>
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
            title="Admin Dashboard"
            subtitle="Full team overview — pipeline health, activity & performance"
        >
            {loading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Loading dashboard…
                </div>
            ) : (
                <div className="space-y-8">

                    {/* ── Global KPIs ─────────────────────────────────────────────── */}
                    <section>
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                            Organisation Overview
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <KPI label="BD Members" value={globalStats.totalMembers} icon={Users} color="bg-indigo-500" />
                            <KPI label="Total Contacts" value={globalStats.totalContacts} icon={UserPlus} color="bg-blue-500" />
                            <KPI label="Clients" value={globalStats.totalClients + globalStats.totalActiveClients} icon={Handshake} color="bg-emerald-500" />
                            <KPI label="Events (30d)" value={globalStats.totalEvents30d} icon={Calendar} color="bg-violet-500" />
                            <KPI label="Pending Follow-ups" value={globalStats.totalPendingFollowUps} icon={CalendarCheck} color="bg-amber-500" />
                            <KPI label="Overdue Follow-ups" value={globalStats.totalOverdueFollowUps} icon={AlertTriangle} color={globalStats.totalOverdueFollowUps > 0 ? 'bg-red-500' : 'bg-slate-400'} />
                            <KPI label="Active Clients" value={globalStats.totalActiveClients} icon={Star} color="bg-teal-500" />
                            <KPI label="Pipeline Contacts" value={globalStats.totalContacts - globalStats.totalClients - globalStats.totalActiveClients} icon={TrendingUp} color="bg-cyan-500" />
                        </div>
                    </section>

                    {/* ── Charts row ──────────────────────────────────────────────── */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Pie – pipeline distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Pipeline Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pipelinePieData.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-10">No contact data yet.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={pipelinePieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {pipelinePieData.map((entry) => (
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

                        {/* Bar – member comparison */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Member Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {memberBarData.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-10">No team data yet.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={memberBarData} barSize={14} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                            <Tooltip />
                                            <Legend iconType="circle" iconSize={10} />
                                            <Bar dataKey="Contacts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Clients" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Follow-ups" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* ── Team Performance Table ───────────────────────────────────── */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                                Team Performance
                            </h2>
                            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
                                Full Reports <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Member</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Contacts</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Lead</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Warm Lead</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Prospect</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Warm Prospect</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Client</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Events (30d)</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Follow-ups</th>
                                                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Overdue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {team.map(m => (
                                                <tr
                                                    key={m.id}
                                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/contacts?marketer=${m.id}`)}
                                                >
                                                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                                    {m.full_name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <button
                                                                    className="font-medium text-left hover:text-primary hover:underline underline-offset-2 transition-colors focus:outline-none"
                                                                    title={`View ${m.full_name}'s full report`}
                                                                    onClick={() => navigate(`/admin/user/${m.id}`)}
                                                                >
                                                                    {m.full_name}
                                                                </button>
                                                                <p className="text-xs text-muted-foreground">{m.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center font-semibold">{m.totalContacts}</td>
                                                    <td className="px-4 py-3.5 text-center text-muted-foreground">{m.leads}</td>
                                                    <td className="px-4 py-3.5 text-center text-muted-foreground">{m.warmLeads}</td>
                                                    <td className="px-4 py-3.5 text-center text-muted-foreground">{m.prospects}</td>
                                                    <td className="px-4 py-3.5 text-center text-muted-foreground">{m.warmProspects}</td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className="font-semibold text-emerald-600">{m.clients + m.activeClients}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">{m.eventsLast30}</td>
                                                    <td className="px-4 py-3.5 text-center">{m.pendingFollowUps}</td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        {m.overdueFollowUps > 0 ? (
                                                            <Badge variant="destructive" className="text-xs">{m.overdueFollowUps}</Badge>
                                                        ) : (
                                                            <span className="text-emerald-600 font-medium">0</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {team.length === 0 && (
                                                <tr>
                                                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                                                        No team members found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* ── Overdue Alerts ───────────────────────────────────────────── */}
                    {team.some(m => m.overdueFollowUps > 0) && (
                        <section>
                            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-red-500">
                                ⚠ Overdue Follow-up Alerts
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {team.filter(m => m.overdueFollowUps > 0).map(m => (
                                    <Card key={m.id} className="border-red-200 bg-red-50/50">
                                        <CardContent className="flex items-center gap-4 p-4">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-red-100 text-red-600 font-bold text-sm">
                                                    {m.full_name.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate">{m.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{m.overdueFollowUps} overdue follow-up{m.overdueFollowUps > 1 ? 's' : ''}</p>
                                            </div>
                                            <Badge variant="destructive">{m.overdueFollowUps}</Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            )}
        </AppLayout>
    );
}
