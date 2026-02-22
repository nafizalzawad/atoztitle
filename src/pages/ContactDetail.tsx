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
  Ban, Trash2, Phone, Mail, Building, Briefcase, Clock, DollarSign, TrendingUp,
  Users, Plus, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const [deals, setDeals] = useState<any[]>([]);
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

  // Deal (Order) form
  const [dealDate, setDealDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [settlementFee, setSettlementFee] = useState('');
  const [lendersInsurance, setLendersInsurance] = useState('');
  const [ownersTitle, setOwnersTitle] = useState('');
  const [lendersTitle, setLendersTitle] = useState('');
  const [orderStatus, setOrderStatus] = useState('open');
  const [sourceOfBusiness, setSourceOfBusiness] = useState('');
  const [dealNotes, setDealNotes] = useState('');
  const [addingDeal, setAddingDeal] = useState(false);

  useEffect(() => {
    if (!id || !user || !role) return;
    loadAll();
  }, [id, user, role]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadContact(),
        loadFollowUps(),
        loadExpenses(),
        loadDeals(),
      ]);
    } catch (err) {
      console.error('ContactDetail loadAll error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContact = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) console.error('ContactDetail loadContact error:', error.code, error.message, error.details);
    if (data) {
      // Fetch the owner's profile name separately (no direct FK contacts→public.profiles)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.bd_user_id)
        .single();
      setContact({ ...data, profiles: profileData ?? null });
    } else {
      setContact(null);
    }
  };

  const loadFollowUps = async () => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('contact_id', id)
      .order('follow_up_date', { ascending: false });
    if (error) console.error('ContactDetail loadFollowUps error:', error.message);
    setFollowUps(data || []);
  };

  const loadExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('contact_id', id)
      .order('created_at', { ascending: false });
    if (error) console.error('ContactDetail loadExpenses error:', error.message);
    setExpenses(data || []);
  };

  const loadDeals = async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', id)
      .order('deal_date', { ascending: false });
    if (error) console.error('ContactDetail loadDeals error:', error.message);
    setDeals(data || []);
  };

  const addFollowUp = async () => {
    if (!fuDate || !user || !id) return;
    setAddingFU(true);
    // Attribute to the contact's owner (not the admin who is adding it)
    const ownerId = contact?.bd_user_id ?? user.id;
    const { error } = await supabase.from('follow_ups').insert({
      contact_id: id,
      bd_user_id: ownerId,
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

  const addDeal = async () => {
    if (!id || !user) return;
    setAddingDeal(true);

    // Auto-set BD user ID to the contact's owner if admin is adding it? 
    // Or current user? The 'deals' table has bd_user_id.
    // If admin is adding a deal for a contact owned by someone else, 
    // maybe it should still be attributed to that marketer.
    const bdUserId = contact.bd_user_id;

    const { error } = await supabase.from('deals').insert({
      contact_id: id,
      bd_user_id: bdUserId,
      deal_date: dealDate,
      settlement_fee: parseFloat(settlementFee) || 0,
      lenders_insurance: parseFloat(lendersInsurance) || 0,
      owners_title: parseFloat(ownersTitle) || 0,
      lenders_title: parseFloat(lendersTitle) || 0,
      deal_value: (parseFloat(settlementFee) || 0) + (parseFloat(lendersInsurance) || 0) + (parseFloat(ownersTitle) || 0) + (parseFloat(lendersTitle) || 0),
      order_status: orderStatus,
      source_of_business: sourceOfBusiness || null,
      notes: dealNotes || null,
    });

    setAddingDeal(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Order details (deal) added');
      setSettlementFee(''); setLendersInsurance(''); setOwnersTitle(''); setLendersTitle(''); setDealNotes('');
      loadDeals();
      loadContact(); // Refresh level/points if connected
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
    navigate(-1);
  };

  if (loading) return <AppLayout title="Loading..."><div className="p-12 text-center text-muted-foreground">Loading contact...</div></AppLayout>;
  if (!contact) return <AppLayout title="Not Found"><div className="p-12 text-center text-muted-foreground">Contact not found</div></AppLayout>;

  const daysInStage = differenceInDays(new Date(), new Date(contact.updated_at));
  const daysTotal = differenceInDays(new Date(), new Date(contact.created_at));
  const isWarmProspectOverdue = contact.stage === 'warm_prospect' && contact.warm_prospect_started_at &&
    differenceInDays(new Date(), new Date(contact.warm_prospect_started_at)) >= 90;

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalDeals = deals.length;
  const pendingDealsCount = deals.filter(d => d.order_status === 'pending' || d.order_status === 'open').length;
  const lastDeal = deals[0]; // ordered by date desc

  const formatCurrency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <AppLayout
      title={`${contact.first_name} ${contact.last_name}`}
      subtitle={contact.company || undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1">Back</span>
          </Button>
          {contact.is_dnc && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <Ban className="mr-1 h-3 w-3" /> DNC
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* CEO Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Deals</p>
            <p className="mt-1 text-2xl font-bold">{totalDeals}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Life-time client value</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Orders</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{pendingDealsCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Currently in pipeline</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Marketing/Follow-up spend</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Order</p>
            <p className="mt-1 text-lg font-bold truncate">
              {lastDeal ? format(new Date(lastDeal.deal_date), 'MMM d, yyyy') : 'No deals'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Most recent activity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Details Card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Client Information</h3>
                <StageBadge stage={contact.stage} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                <div className="flex items-center gap-2 text-muted-foreground col-span-full">
                  <Users className="h-4 w-4" />
                  <span>Marketer: <span className="font-semibold text-foreground">{contact.profiles?.full_name || 'Unassigned'}</span></span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Intent / Notes</p>
                <p className="text-sm text-foreground">{contact.intent}</p>
              </div>
            </div>

            {/* Order Details (Deals) */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Order Details (Deals)</h3>
                </div>
                <Badge variant="outline">{deals.length} Recorded</Badge>
              </div>

              <div className="p-6">
                <div className="space-y-4 mb-8">
                  {deals.length === 0 ? (
                    <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No orders or deals recorded for this client.</p>
                    </div>
                  ) : (
                    deals.map((deal) => (
                      <div key={deal.id} className="rounded-lg border border-border p-4 text-sm bg-card hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-bold text-foreground">{format(new Date(deal.deal_date), 'MMM d, yyyy')}</span>
                            <span className="ml-2 text-xs text-muted-foreground">Source: {deal.source_of_business || 'Unknown'}</span>
                          </div>
                          <Badge className={cn(
                            deal.order_status === 'closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              deal.order_status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                          )} variant="outline">
                            {deal.order_status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-[9px] uppercase text-muted-foreground">Settlement</p>
                            <p className="font-semibold text-emerald-600">${Number(deal.settlement_fee).toLocaleString()}</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-[9px] uppercase text-muted-foreground">Lenders Ins.</p>
                            <p className="font-semibold">${Number(deal.lenders_insurance).toLocaleString()}</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-[9px] uppercase text-muted-foreground">Owners Title</p>
                            <p className="font-semibold">${Number(deal.owners_title).toLocaleString()}</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-[9px] uppercase text-muted-foreground">Lenders Title</p>
                            <p className="font-semibold">${Number(deal.lenders_title).toLocaleString()}</p>
                          </div>
                        </div>
                        {deal.notes && <p className="mt-3 text-xs text-muted-foreground italic">"{deal.notes}"</p>}
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-muted/30 rounded-xl p-5 border border-border">
                  <h4 className="text-sm font-bold text-foreground mb-4">Record New Order</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Order Date</Label>
                      <Input type="date" value={dealDate} onChange={(e) => setDealDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={orderStatus} onValueChange={setOrderStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="closed">Closed / Settled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Source</Label>
                      <Select value={sourceOfBusiness} onValueChange={setSourceOfBusiness}>
                        <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="lender">Lender</SelectItem>
                          <SelectItem value="attorney">Attorney</SelectItem>
                          <SelectItem value="builder">Builder</SelectItem>
                          <SelectItem value="direct_client">Direct Client</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Settlement Fee ($)</Label>
                      <Input type="number" value={settlementFee} onChange={(e) => setSettlementFee(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lenders Ins. ($)</Label>
                      <Input type="number" value={lendersInsurance} onChange={(e) => setLendersInsurance(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Owners Title ($)</Label>
                      <Input type="number" value={ownersTitle} onChange={(e) => setOwnersTitle(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lenders Title ($)</Label>
                      <Input type="number" value={lendersTitle} onChange={(e) => setLendersTitle(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label className="text-xs">Notes (File # / Address / Specifics)</Label>
                      <Input value={dealNotes} onChange={(e) => setDealNotes(e.target.value)} placeholder="File #12345, 123 Main St..." />
                    </div>
                  </div>
                  <Button className="mt-5 w-full sm:w-auto" onClick={addDeal} disabled={addingDeal}>
                    {addingDeal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Save Order Details
                  </Button>
                </div>
              </div>
            </div>

            {/* Follow-ups */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Follow-up History</h3>
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
                    <h3 className="text-lg font-semibold text-foreground">Marketing Expenses</h3>
                  </div>
                  <span className="text-sm font-semibold text-foreground">${totalExpenses.toLocaleString()}</span>
                </div>
                <div className="space-y-2 mb-4">
                  {expenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses recorded for this client.</p>
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
            {/* Pipeline Progress */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
                  <span>Current Stage</span>
                  <span className="text-foreground">{stageLabels[contact.stage]}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                  {stageOrder.map((s, idx) => (
                    <div
                      key={s}
                      className={cn(
                        "h-full flex-1 border-r border-background last:border-0",
                        stageOrder.indexOf(contact.stage) >= idx ? "bg-primary" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Select value={newStage} onValueChange={(v) => setNewStage(v as Stage)}>
                    <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Move to..." /></SelectTrigger>
                    <SelectContent>
                      {stageOrder.map((s) => (
                        <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 text-xs" onClick={handleStageChange} disabled={!newStage}>Update</Button>
                </div>
              </div>
            </div>

            {/* Engagement Score */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Engagement Points</h3>
              </div>
              <div className="text-center py-2">
                <span className="text-4xl font-bold text-foreground">{contact.engagement_points}</span>
                <p className="text-xs text-muted-foreground mt-1">Total Points Recorded</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    className="h-8"
                    value={pointsToAdd}
                    onChange={(e) => setPointsToAdd(e.target.value)}
                  />
                  <Button size="sm" className="h-8 text-[10px]" onClick={handleAddPoints}>Add Points</Button>
                </div>
                <Input
                  value={pointReason}
                  onChange={(e) => setPointReason(e.target.value)}
                  placeholder="Reason..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Admin Controls */}
            {role === 'admin' && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-indigo-900">Admin Overview</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  As an admin, you are viewing this profile. You can see all deal history, expenses, and follow-ups.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs border-indigo-200 hover:bg-indigo-100" onClick={() => navigate('/reports')}>
                    <ArrowRight className="mr-2 h-3.5 w-3.5" /> View Full Branch Reports
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Account Actions</h3>
              <div className="space-y-2">
                {!contact.is_dnc && (
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs text-destructive hover:text-destructive" onClick={markDNC}>
                    <Ban className="mr-2 h-3.5 w-3.5" /> Mark Do Not Contact
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start text-xs text-destructive hover:text-destructive" onClick={softDelete}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Contact
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Timeline</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Created: {format(new Date(contact.created_at), 'MMM d, yyyy')}</p>
                <p>Updated: {format(new Date(contact.updated_at), 'MMM d, yyyy')}</p>
                <p>Days in current stage: <span className={cn('font-semibold', isWarmProspectOverdue && 'text-destructive')}>{daysInStage}d</span></p>
                {contact.warm_prospect_started_at && (
                  <p>Warm Prospect since: {format(new Date(contact.warm_prospect_started_at), 'MMM d, yyyy')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
