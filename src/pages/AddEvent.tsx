
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export default function AddEvent() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [date, setDate] = useState<Date | undefined>(new Date());

    const [name, setName] = useState('');
    const [summary, setSummary] = useState('');
    const [followupDetails, setFollowupDetails] = useState('');
    const [connectionsCount, setConnectionsCount] = useState<number>(0);

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) {
            toast.error('Event name is required');
            return;
        }
        if (!date) {
            toast.error('Event date is required');
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase.from('events').insert({
                user_id: user.id,
                name: name,
                event_date: format(date, 'yyyy-MM-dd'),
                summary: summary || null,
                followup_details: followupDetails || null,
                connections_count: connectionsCount,
            });

            if (error) throw error;
            toast.success('Event added successfully!');
            navigate('/events');
        } catch (error: any) {
            toast.error('Failed to create event: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout title="Add New Event" subtitle="Log an event you attended">
            <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="space-y-6">

                    <div className="space-y-2">
                        <Label>Event Name *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Real Estate Networking Mixer"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Date of Event *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Summary</Label>
                        <Textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Short summary of the event..."
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Follow-up Details</Label>
                        <Textarea
                            value={followupDetails}
                            onChange={(e) => setFollowupDetails(e.target.value)}
                            placeholder="Any follow-up needed? Key takeaways?"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Connections Made</Label>
                        <Input
                            type="number"
                            min="0"
                            value={connectionsCount}
                            onChange={(e) => setConnectionsCount(parseInt(e.target.value) || 0)}
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">Number of new connections made at this event.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => navigate('/events')}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Event
                        </Button>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}
