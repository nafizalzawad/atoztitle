
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Events() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalEvents: 0, totalConnections: 0 });

    useEffect(() => {
        if (user) {
            loadEvents();
        }
    }, [user]);

    const loadEvents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: false });

        if (data) {
            setEvents(data);
            const totalConnections = data.reduce((acc: number, curr: any) => acc + (curr.connections_count || 0), 0);
            setStats({
                totalEvents: data.length,
                totalConnections
            });
        }
        setLoading(false);
    };

    return (
        <AppLayout
            title="Events"
            subtitle="Track your networking activities"
            actions={
                <Button onClick={() => navigate('/events/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                </Button>
            }
        >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Events Attended</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEvents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Connections Made</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalConnections}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Events List */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Event History</h2>
                {events.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
                        <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-3 text-sm font-medium text-muted-foreground">No events tracked yet</p>
                        <Button className="mt-4" size="sm" onClick={() => navigate('/events/new')}>
                            <Plus className="mr-2 h-4 w-4" /> Log your first event
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.map((event) => (
                            <div key={event.id} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">{event.name}</h3>
                                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(event.event_date), 'MMMM d, yyyy')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {event.connections_count} Connections
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {(event.summary || event.followup_details) && (
                                    <div className="mt-4 grid gap-4 md:grid-cols-2 border-t pt-4">
                                        {event.summary && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Summary</h4>
                                                <p className="text-sm text-foreground/90 whitespace-pre-line">{event.summary}</p>
                                            </div>
                                        )}
                                        {event.followup_details && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1 text-orange-600">Follow-up</h4>
                                                <p className="text-sm text-foreground/90 whitespace-pre-line">{event.followup_details}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
