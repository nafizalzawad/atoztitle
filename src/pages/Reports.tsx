import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, DollarSign, Users, TrendingUp,
  ChevronDown, CalendarDays, X, Filter, RefreshCw,
  Building2, User, FolderOpen, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  format, startOfMonth, endOfMonth, subMonths,
  isWithinInterval, parseISO, startOfDay, endOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  group_id: string | null;
}

interface Deal {
  id: string;
  bd_user_id: string;
  contact_id: string;
  deal_date: string;
  deal_value: number;
  settlement_fee: number;
  lenders_insurance: number;
  owners_title: number;
  lenders_title: number;
  order_status: string;
  source_of_business: string | null;
  notes: string | null;
  // joined
  contact_name?: string;
  marketer_name?: string;
  group_name?: string;
}

interface Filters {
  groupId: 'all' | string;
  marketerId: 'all' | string;
  sourceOfBusiness: 'all' | string;
  orderStatus: 'all' | string;
  dateRange: 'this_month' | 'last_month' | 'custom';
  dateFrom: string;
  dateTo: string;
}

interface SummaryStats {
  totalOrders: number;
  totalSettlementFees: number;
  totalLendersInsurance: number;
  totalOwnersTitle: number;
  totalLendersTitle: number;
  totalPolicyAmount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['open', 'closed', 'pending', 'cancelled'];
const SOURCES_OF_BUSINESS = [
  'agent', 'lender', 'attorney', 'builder', 'direct_client', 'referral', 'other',
];

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

// ─── Helper: date range from filter ──────────────────────────────────────────

function getDateRange(filters: Filters): { from: Date; to: Date } {
  const now = new Date();
  if (filters.dateRange === 'this_month') {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  if (filters.dateRange === 'last_month') {
    const last = subMonths(now, 1);
    return { from: startOfMonth(last), to: endOfMonth(last) };
  }
  return {
    from: filters.dateFrom ? startOfDay(parseISO(filters.dateFrom)) : startOfMonth(now),
    to: filters.dateTo ? endOfDay(parseISO(filters.dateTo)) : endOfMonth(now),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-5 shadow-elevated',
      'bg-card border border-border',
      'transition-all hover:shadow-xl hover:-translate-y-0.5 duration-200',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground leading-none">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <div className={cn('shrink-0 rounded-xl p-2.5', accent)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {/* subtle gradient bar at bottom */}
      <div className={cn('absolute bottom-0 left-0 right-0 h-0.5', accent)} />
    </div>
  );
}

function SelectDropdown({
  id, label, value, onChange, options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none rounded-lg border border-border bg-card',
            'px-3 py-2 pr-9 text-sm font-medium text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            'transition-colors cursor-pointer',
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reports() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    groupId: 'all',
    marketerId: 'all',
    sourceOfBusiness: 'all',
    orderStatus: 'all',
    dateRange: 'this_month',
    dateFrom: '',
    dateTo: '',
  });

  // ── Load data from Supabase ──────────────────────────────────────────────

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    setMigrationNeeded(false);
    try {
      // Load groups — if this fails, the migration hasn't been applied yet
      const groupsRes = await supabase.from('groups').select('*').order('name');
      if (groupsRes.error) {
        // Check if it's a schema/table-not-found error
        const msg = groupsRes.error.message ?? '';
        if (msg.includes("groups") || msg.includes("schema cache") || msg.includes("relation") || msg.includes("does not exist")) {
          setMigrationNeeded(true);
          setLoading(false);
          return;
        }
        throw groupsRes.error;
      }

      const [profilesRes, dealsRes, contactsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, group_id').order('full_name'),
        supabase.from('deals').select('*').order('deal_date', { ascending: false }),
        supabase.from('contacts').select('id, first_name, last_name, bd_user_id').eq('is_deleted', false),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      const contactMap = new Map(
        (contactsRes.data || []).map((c) => [c.id, `${c.first_name} ${c.last_name}`]),
      );
      const groupMap = new Map((groupsRes.data || []).map((g) => [g.id, g.name]));

      const enrichedDeals: Deal[] = (dealsRes.data || []).map((d) => {
        const profile = profileMap.get(d.bd_user_id);
        const groupId = profile?.group_id ?? null;
        return {
          ...d,
          settlement_fee: Number(d.settlement_fee ?? 0),
          lenders_insurance: Number(d.lenders_insurance ?? 0),
          owners_title: Number(d.owners_title ?? 0),
          lenders_title: Number(d.lenders_title ?? 0),
          deal_value: Number(d.deal_value ?? 0),
          contact_name: contactMap.get(d.contact_id) ?? 'Unknown',
          marketer_name: profile?.full_name ?? 'Unknown',
          group_name: groupId ? (groupMap.get(groupId) ?? '—') : '—',
        };
      });

      setGroups(groupsRes.data || []);
      setProfiles(profilesRes.data || []);
      setDeals(enrichedDeals);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ── Derived: marketer options filtered by chosen group ───────────────────

  const marketerOptions = useMemo(() => {
    const filtered = filters.groupId === 'all'
      ? profiles
      : profiles.filter((p) => p.group_id === filters.groupId);
    return [
      { value: 'all', label: 'All Marketers' },
      ...filtered.map((p) => ({ value: p.id, label: p.full_name })),
    ];
  }, [profiles, filters.groupId]);

  // ── Derived: filtered deals ───────────────────────────────────────────────

  const filteredDeals = useMemo(() => {
    const { from, to } = getDateRange(filters);

    // Resolve which user IDs are in scope
    let scopedUserIds: Set<string> | null = null;
    if (filters.groupId !== 'all') {
      const memberIds = profiles
        .filter((p) => p.group_id === filters.groupId)
        .map((p) => p.id);
      scopedUserIds = new Set(memberIds);
    }
    if (filters.marketerId !== 'all') {
      scopedUserIds = new Set([filters.marketerId]);
    }

    return deals.filter((d) => {
      // Date filter
      try {
        const dealDate = parseISO(d.deal_date);
        if (!isWithinInterval(dealDate, { start: from, end: to })) return false;
      } catch {
        return false;
      }

      // Group / marketer filter
      if (scopedUserIds && !scopedUserIds.has(d.bd_user_id)) return false;

      // Source of business filter
      if (filters.sourceOfBusiness !== 'all' &&
        d.source_of_business !== filters.sourceOfBusiness) return false;

      // Order status filter
      if (filters.orderStatus !== 'all' && d.order_status !== filters.orderStatus) return false;

      return true;
    });
  }, [deals, filters, profiles]);

  // ── Derived: summary stats ────────────────────────────────────────────────

  const summary = useMemo<SummaryStats>(() => {
    const totalOrders = filteredDeals.length;
    const totalSettlementFees = filteredDeals.reduce((s, d) => s + d.settlement_fee, 0);
    const totalLendersInsurance = filteredDeals.reduce((s, d) => s + d.lenders_insurance, 0);
    const totalOwnersTitle = filteredDeals.reduce((s, d) => s + d.owners_title, 0);
    const totalLendersTitle = filteredDeals.reduce((s, d) => s + d.lenders_title, 0);
    const totalPolicyAmount = totalLendersInsurance + totalOwnersTitle + totalLendersTitle;
    return { totalOrders, totalSettlementFees, totalLendersInsurance, totalOwnersTitle, totalLendersTitle, totalPolicyAmount };
  }, [filteredDeals]);

  // ── Date range label ──────────────────────────────────────────────────────

  const dateRangeLabel = useMemo(() => {
    const { from, to } = getDateRange(filters);
    return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
  }, [filters]);

  // ── Reset filters ─────────────────────────────────────────────────────────

  const resetFilters = () => {
    setFilters({
      groupId: 'all',
      marketerId: 'all',
      sourceOfBusiness: 'all',
      orderStatus: 'all',
      dateRange: 'this_month',
      dateFrom: '',
      dateTo: '',
    });
  };

  const activeFilterCount = [
    filters.groupId !== 'all',
    filters.marketerId !== 'all',
    filters.sourceOfBusiness !== 'all',
    filters.orderStatus !== 'all',
    filters.dateRange !== 'this_month',
  ].filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout
      title="Expense & Production Report"
      subtitle="Hierarchical financial reporting — filter by group, marketer, date, and more"
    >
      <div className="space-y-6">

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadAll} className="ml-auto text-destructive">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* ── Migration Needed State ───────────────────────────────────────── */}
        {migrationNeeded && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200 shadow-lg backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-500/20 p-3">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-500">Database Migration Required</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  The <span className="text-foreground font-semibold">Expense & Production</span> tables are missing from your database.
                  To fix this, you need to apply the migration SQL in your Supabase dashboard.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="https://supabase.com/dashboard/project/iwztqeibetcdsvnxvncu/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-600 transition-colors"
                  >
                    Go to Supabase SQL Editor
                  </a>
                  <Button variant="outline" size="sm" onClick={loadAll} className="bg-transparent border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Check Again
                  </Button>
                </div>
                <div className="mt-4 rounded-lg bg-black/40 p-3 font-mono text-xs text-amber-200/70 border border-amber-500/10 overflow-x-auto">
                  Path: supabase/migrations/20260222000000_expense_production_reporting.sql
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filter Panel ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground h-7 text-xs gap-1">
                <X className="h-3 w-3" /> Reset
              </Button>
            )}
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

            {/* Group */}
            <SelectDropdown
              id="filter-group"
              label="Group / Team"
              value={filters.groupId}
              onChange={(v) => {
                setFilter('groupId', v);
                setFilter('marketerId', 'all'); // reset marketer when group changes
              }}
              options={[
                { value: 'all', label: 'All Groups' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />

            {/* Marketer */}
            <SelectDropdown
              id="filter-marketer"
              label="Marketer"
              value={filters.marketerId}
              onChange={(v) => setFilter('marketerId', v)}
              options={marketerOptions}
            />

            {/* Source of Business */}
            <SelectDropdown
              id="filter-source"
              label="Source of Business"
              value={filters.sourceOfBusiness}
              onChange={(v) => setFilter('sourceOfBusiness', v)}
              options={[
                { value: 'all', label: 'All Sources' },
                ...SOURCES_OF_BUSINESS.map((s) => ({
                  value: s,
                  label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                })),
              ]}
            />

            {/* Order Status */}
            <SelectDropdown
              id="filter-status"
              label="Order Status"
              value={filters.orderStatus}
              onChange={(v) => setFilter('orderStatus', v)}
              options={[
                { value: 'all', label: 'All Statuses' },
                ...ORDER_STATUSES.map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                })),
              ]}
            />

            {/* Date Range Preset */}
            <SelectDropdown
              id="filter-date-range"
              label="Date Range"
              value={filters.dateRange}
              onChange={(v) => setFilter('dateRange', v as Filters['dateRange'])}
              options={[
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />

            {/* Custom date inputs */}
            {filters.dateRange === 'custom' ? (
              <div className="flex flex-col gap-1.5 xl:col-span-1 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Custom Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    id="filter-date-from"
                    value={filters.dateFrom}
                    onChange={(e) => setFilter('dateFrom', e.target.value)}
                    className={cn(
                      'flex-1 rounded-lg border border-border bg-card px-2.5 py-2',
                      'text-xs font-medium text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors',
                    )}
                  />
                  <input
                    type="date"
                    id="filter-date-to"
                    value={filters.dateTo}
                    onChange={(e) => setFilter('dateTo', e.target.value)}
                    className={cn(
                      'flex-1 rounded-lg border border-border bg-card px-2.5 py-2',
                      'text-xs font-medium text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors',
                    )}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Showing Period
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 h-[38px]">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground truncate">{dateRangeLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Active filter pills ──────────────────────────────────────────── */}
        {(filters.groupId !== 'all' || filters.marketerId !== 'all') && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Showing:</span>
            {filters.groupId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Building2 className="h-3 w-3" />
                {groups.find((g) => g.id === filters.groupId)?.name}
                <button onClick={() => setFilter('groupId', 'all')} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.marketerId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
                <User className="h-3 w-3" />
                {profiles.find((p) => p.id === filters.marketerId)?.full_name}
                <button onClick={() => setFilter('marketerId', 'all')} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SummaryCard
            label="Total Orders"
            value={summary.totalOrders.toString()}
            icon={FolderOpen}
            accent="bg-indigo-500"
            sub={loading ? 'Loading…' : dateRangeLabel}
          />
          <SummaryCard
            label="Settlement Fees"
            value={fmt(summary.totalSettlementFees)}
            icon={DollarSign}
            accent="bg-emerald-500"
          />
          <SummaryCard
            label="Lenders Insurance"
            value={fmt(summary.totalLendersInsurance)}
            icon={TrendingUp}
            accent="bg-blue-500"
          />
          <SummaryCard
            label="Owners Title"
            value={fmt(summary.totalOwnersTitle)}
            icon={FileText}
            accent="bg-violet-500"
          />
          <SummaryCard
            label="Total Policy Amt"
            value={fmt(summary.totalPolicyAmount)}
            icon={Users}
            accent="bg-orange-500"
            sub="Insurance + Owners + Lenders"
          />
        </div>

        {/* ── Data Table ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Order Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? 'Loading orders…' : `${filteredDeals.length} order${filteredDeals.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['#', 'Marketer', 'Group', 'Contact / File', 'Date', 'Settlement Fee',
                    'Lenders Ins.', 'Owners Title', 'Lenders Title', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-3.5 bg-muted rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-10 w-10 opacity-20" />
                        <div>
                          <p className="font-medium">No orders found</p>
                          <p className="text-xs mt-1">Try adjusting the filters or date range.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal, idx) => (
                    <tr
                      key={deal.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Row # */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </td>

                      {/* Marketer */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {(deal.marketer_name ?? '??').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground text-xs whitespace-nowrap">
                            {deal.marketer_name}
                          </span>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {deal.group_name}
                        </span>
                      </td>

                      {/* Contact / File */}
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <span className="text-xs font-medium text-foreground truncate block">
                          {deal.contact_name}
                        </span>
                        {deal.source_of_business && (
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {deal.source_of_business.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                        {format(parseISO(deal.deal_date), 'MMM d, yyyy')}
                      </td>

                      {/* Settlement Fee */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-semibold text-emerald-600">
                          {fmt(deal.settlement_fee)}
                        </span>
                      </td>

                      {/* Lenders Insurance */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-medium text-foreground">
                          {fmt(deal.lenders_insurance)}
                        </span>
                      </td>

                      {/* Owners Title */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-medium text-foreground">
                          {fmt(deal.owners_title)}
                        </span>
                      </td>

                      {/* Lenders Title */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-medium text-foreground">
                          {fmt(deal.lenders_title)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={deal.order_status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Totals Footer */}
              {!loading && filteredDeals.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td colSpan={5} className="px-4 py-3 text-xs font-bold text-foreground uppercase tracking-wider">
                      Totals ({filteredDeals.length} orders)
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">
                      {fmt(summary.totalSettlementFees)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                      {fmt(summary.totalLendersInsurance)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                      {fmt(summary.totalOwnersTitle)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                      {fmt(summary.totalLendersTitle)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  const cls = map[status] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
      cls,
    )}>
      {status}
    </span>
  );
}
