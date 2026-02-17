import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StageBadge } from '@/components/crm/StageBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarPlus, Loader2, Star, Shield,
  Ban, Trash2, Phone, Mail, Building, Briefcase, Clock, DollarSign, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

type Stage = 'lead' | 'warm_lead' | 'prospect' | 'warm_prospect' | 'client' | 'active_client';

const stageOrder: Stage[] = ['lead', 'warm_lead', 'prospect', 'warm_prospect', 'client', 'active_client'];
const stageLabels: Record<Stage, string> = {
  lead: 'Lead', warm_lead: 'Warm Lead', prospect: 'Prospect',
  warm_prospect: 'Warm Prospect', client: 'Client', active_client: 'Active Client',
};

export default function ContactDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Follow-up form
  const [fuDate, setFuDate] = useState('');
  const [fuTime, setFuTime] = useState('');
  const [fuNotes, setFuNotes] = useState('');
  const [addingFU, setAddingFU] = useState(false);

  // Stage change (user)
  const [newStage, setNewStage] = useState<Stage | ''>('');

  // Points form
  const [pointsToAdd, setPointsToAdd] = useState('1');
  const [pointReason, setPointReason] = useState('');

  // Expense form
  const [expCategory, setExpCategory] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [addingExp, setAddingExp] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    loadContact();
    loadFollowUps();
    loadExpenses();
  }, [id, user]);

  const loadContact = async () => {
    const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
    setContact(data);
    setLoading(false);
  };

  const loadFollowUps = async () => {
    const { data } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('contact_id', id)
      .order('follow_up_date', { ascending: false });
    setFollowUps(data || []);
  };

  const loadExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('contact_id', id)
      .order('created_at', { ascending: false });
    setExpenses(data || []);
  };

  const addFollowUp = async () => {
    if (!fuDate || !user || !id) return;
    setAddingFU(true);
    const { error } = await supabase.from('follow_ups').insert({
      contact_id: id,
      bd_user_id: user.id,
      follow_up_date: fuDate,
      follow_up_time: fuTime || null,
      notes: fuNotes || null,
    });
    setAddingFU(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Follow-up scheduled');
      setFuDate(''); setFuTime(''); setFuNotes('');
      loadFollowUps();
    }
  };

  const handleStageChange = async () => {
    if (!newStage || !id) return;
    const oldStage = contact.stage;
    const { error } = await supabase.from('contacts').update({
      stage: newStage,
      ...(newStage === 'warm_prospect' ? { warm_prospect_started_at: new Date().toISOString() } : {}),
    }).eq('id', id);
    if (!error) {
      await supabase.from('audit_logs').insert({
        user_id: user!.id,
        action: 'stage_change',
        entity_type: 'contact',
        entity_id: id,
        old_value: { stage: oldStage },
        new_value: { stage: newStage },
      });
      toast.success(`Stage updated to ${stageLabels[newStage]}`);
      setNewStage('');
      loadContact();
    } else {
      toast.error(error.message);
    }
  };

  const handleAddPoints = async () => {
    const pts = parseInt(pointsToAdd);
    if (!pts || pts < 1 || !id) return;
    const newTotal = (contact.engagement_points || 0) + pts;
    const updates: any = { engagement_points: newTotal };
    // Auto-promote to warm_prospect at 3+ points
    if (newTotal >= 3 && (contact.stage === 'lead' || contact.stage === 'warm_lead' || contact.stage === 'prospect')) {
      updates.stage = 'warm_prospect';
      updates.warm_prospect_started_at = new Date().toISOString();
    }
    const { error } = await supabase.from('contacts').update(updates).eq('id', id);
    if (!error) {
      await supabase.from('audit_logs').insert({
        user_id: user!.id,
        action: 'add_points',
        entity_type: 'contact',
        entity_id: id,
        old_value: { points: contact.engagement_points },
        new_value: { points: newTotal, reason: pointReason },
      });
      toast.success(`Added ${pts} point(s). Total: ${newTotal}`);
      if (updates.stage === 'warm_prospect') toast.info('Auto-promoted to Warm Prospect (3+ points)');
      setPointsToAdd('1');
      setPointReason('');
      loadContact();
    }
  };

  const addExpense = async () => {
    if (!expCategory || !expAmount || !id) return;
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setAddingExp(true);
    const { error } = await supabase.from('expenses').insert({
      contact_id: id,
      category: expCategory,
      amount,
      notes: expNotes || null,
    });
    setAddingExp(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Expense recorded');
      setExpCategory(''); setExpAmount(''); setExpNotes('');
      loadExpenses();
    }
  };

  const markDNC = async () => {
    if (!confirm('Mark this contact as Do Not Contact?')) return;
    await supabase.from('contacts').update({ is_dnc: true }).eq('id', id);
    toast.success('Marked as DNC');
    loadContact();
  };

  const softDelete = async () => {
    if (!confirm('Delete this contact? This action can be undone by an admin.')) return;
    await supabase.from('contacts').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user!.id,
    }).eq('id', id);
    await supabase.from('audit_logs').insert({
      user_id: user!.id,
      action: 'soft_delete',
      entity_type: 'contact',
      entity_id: id,
    });
    toast.success('Contact deleted');
    navigate('/contacts');
  };

  if (loading) return <AppLayout title="Loading..."><div className="p-12 text-center text-muted-foreground">Loading contact...</div></AppLayout>;
  if (!contact) return <AppLayout title="Not Found"><div className="p-12 text-center text-muted-foreground">Contact not found</div></AppLayout>;

  const daysInStage = differenceInDays(new Date(), new Date(contact.updated_at));
  const daysTotal = differenceInDays(new Date(), new Date(contact.created_at));
  const isWarmProspectOverdue = contact.stage === 'warm_prospect' && contact.warm_prospect_started_at &&
    differenceInDays(new Date(), new Date(contact.warm_prospect_started_at)) >= 90;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <AppLayout
      title={`${contact.first_name} ${contact.last_name}`}
      subtitle={contact.company || undefined}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/contacts')}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
          </Button>
          {contact.is_dnc && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <Ban className="mr-1 h-3 w-3" /> DNC
            </span>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Contact Details</h3>
              <StageBadge stage={contact.stage} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="capitalize">{contact.profession || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {contact.phone || 'No phone'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {contact.email || 'No email'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4" />
                {contact.company || 'No company'}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Intent</p>
              <p className="text-sm text-foreground">{contact.intent}</p>
            </div>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="h-4 w-4 text-warning" />
                <span className="font-semibold">{contact.engagement_points}</span>
                <span className="text-muted-foreground">points</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{daysTotal}d since added</span>
              </div>
              <div className={cn('flex items-center gap-1.5 text-sm', isWarmProspectOverdue && 'text-destructive font-semibold')}>
                <Clock className="h-4 w-4" />
                <span>{daysInStage}d in current stage</span>
                {isWarmProspectOverdue && ' ⚠️ 90+ days'}
              </div>
            </div>
          </div>

          {/* 90-day warning */}
          {isWarmProspectOverdue && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="font-semibold">⚠️ This contact has been a Warm Prospect for over 90 days.</p>
              <p className="mt-1 text-xs">Please provide an update or admin will be notified.</p>
            </div>
          )}

          {/* Add Points */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Add Engagement Points</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Points</Label>
                <Select value={pointsToAdd} onValueChange={setPointsToAdd}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} point{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Reason</Label>
                <Input value={pointReason} onChange={(e) => setPointReason(e.target.value)} placeholder="e.g. Met at event, referral discussion..." />
              </div>
            </div>
            <Button className="mt-3" size="sm" onClick={handleAddPoints}>
              <Star className="mr-1 h-3.5 w-3.5" /> Add Points
            </Button>
          </div>

          {/* Stage Change (for all users) */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Change Stage</h3>
            <div className="flex gap-3">
              <Select value={newStage} onValueChange={(v) => setNewStage(v as Stage)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {stageOrder.map((s) => (
                    <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleStageChange} disabled={!newStage}>
                Apply
              </Button>
            </div>
          </div>

          {/* Follow-ups */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Follow-ups</h3>
            <div className="space-y-3 mb-6">
              {followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups scheduled yet</p>
              ) : (
                followUps.map((fu) => (
                  <div key={fu.id} className={cn(
                    'flex items-center justify-between rounded-lg border p-3 text-sm',
                    fu.is_completed ? 'border-success/20 bg-success/5' : 'border-border'
                  )}>
                    <div>
                      <p className="font-medium text-foreground">
                        {format(new Date(fu.follow_up_date), 'MMM d, yyyy')}
                        {fu.follow_up_time && ` at ${fu.follow_up_time}`}
                      </p>
                      {fu.notes && <p className="text-xs text-muted-foreground mt-0.5">{fu.notes}</p>}
                    </div>
                    {fu.is_completed ? (
                      <span className="text-xs text-success font-medium">Completed</span>
                    ) : (
                      <span className="text-xs text-warning font-medium">Pending</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Schedule Follow-up</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date *</Label>
                  <Input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Time</Label>
                  <Input type="time" value={fuTime} onChange={(e) => setFuTime(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input value={fuNotes} onChange={(e) => setFuNotes(e.target.value)} placeholder="Follow-up notes..." />
              </div>
              <Button className="mt-3" size="sm" onClick={addFollowUp} disabled={!fuDate || addingFU}>
                {addingFU ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="mr-1 h-3.5 w-3.5" />}
                Schedule
              </Button>
            </div>
          </div>

          {/* Expense Tracking (visible for warm_lead+) */}
          {contact.stage !== 'lead' && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Expenses</h3>
                </div>
                <span className="text-sm font-semibold text-foreground">${totalExpenses.toLocaleString()}</span>
              </div>
              <div className="space-y-2 mb-4">
                {expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses recorded</p>
                ) : (
                  expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground capitalize">{exp.category}</p>
                        {exp.notes && <p className="text-xs text-muted-foreground">{exp.notes}</p>}
                      </div>
                      <span className="font-semibold text-foreground">${Number(exp.amount).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Add Expense</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Category *</Label>
                    <Select value={expCategory} onValueChange={setExpCategory}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meal">Meal</SelectItem>
                        <SelectItem value="gift">Gift</SelectItem>
                        <SelectItem value="event_ticket">Event Ticket</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount ($) *</Label>
                    <Input type="number" min="0" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input value={expNotes} onChange={(e) => setExpNotes(e.target.value)} placeholder="Expense notes..." />
                </div>
                <Button className="mt-3" size="sm" onClick={addExpense} disabled={!expCategory || !expAmount || addingExp}>
                  {addingExp ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <DollarSign className="mr-1 h-3.5 w-3.5" />}
                  Add Expense
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Admin Controls */}
          {role === 'admin' && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Admin Controls</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Admin can override stage and points from the main section.</p>
            </div>
          )}

          {/* Actions */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Actions</h3>
            <div className="space-y-2">
              {!contact.is_dnc && (
                <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={markDNC}>
                  <Ban className="mr-2 h-3.5 w-3.5" /> Mark Do Not Contact
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={softDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Contact
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Timeline</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Created: {format(new Date(contact.created_at), 'MMM d, yyyy')} ({daysTotal}d ago)</p>
              <p>Updated: {format(new Date(contact.updated_at), 'MMM d, yyyy')}</p>
              <p>Days in current stage: <span className={cn('font-semibold', isWarmProspectOverdue && 'text-destructive')}>{daysInStage}d</span></p>
              {contact.warm_prospect_started_at && (
                <p>Warm Prospect since: {format(new Date(contact.warm_prospect_started_at), 'MMM d, yyyy')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
