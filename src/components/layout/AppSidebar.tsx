import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  Calendar,
  BarChart3,
  BarChart2,
  LogOut,
  Shield,
  Building2,
  PieChart,
  UsersRound,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  adminOnly?: boolean;
  bdUserOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Follow-ups', icon: CalendarCheck, path: '/follow-ups' },
  { label: 'My Contacts', icon: Users, path: '/contacts', bdUserOnly: true },
  { label: 'Add Contact', icon: UserPlus, path: '/contacts/new', bdUserOnly: true },
  { label: 'My Report', icon: BarChart2, path: '/my-report' },
  { label: 'Admin Dashboard', icon: PieChart, path: '/admin-dashboard', adminOnly: true },
  { label: 'All Contacts', icon: UsersRound, path: '/contacts', adminOnly: true },
  { label: 'Reports', icon: BarChart3, path: '/reports', adminOnly: true },
  { label: 'Admin', icon: Shield, path: '/admin', adminOnly: true },
];

interface SidebarContentProps {
  onNavigate: (path: string) => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  const mainItems = navItems.filter(
    (item) => !item.adminOnly && (role !== 'admin' || !item.bdUserOnly)
  );
  const adminItems = navItems.filter((item) => item.adminOnly && role === 'admin');

  const adminPersonalContacts =
    role === 'admin'
      ? [
        { label: 'My Contacts', icon: Users, path: `/contacts?marketer=${user?.id}` },
        { label: 'Add Contact', icon: UserPlus, path: '/contacts/new' },
      ]
      : [];

  const navBtn = (
    key: string,
    label: string,
    Icon: React.ElementType,
    path: string,
    isActive: boolean
  ) => (
    <button
      key={key}
      onClick={() => onNavigate(path)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-sidebar-accent-foreground">AtoZ Title</h1>
          <p className="text-xs text-sidebar-muted">BD CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {mainItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return navBtn(item.path, item.label, item.icon, item.path, isActive);
        })}

        {adminPersonalContacts.map((item) => {
          const isActive =
            location.pathname + location.search === item.path ||
            (item.label === 'My Contacts' &&
              location.pathname === '/contacts' &&
              location.search.includes(user?.id || '__'));
          return navBtn(item.label, item.label, item.icon, item.path, isActive);
        })}

        {adminItems.length > 0 && (
          <>
            <div className="my-3 border-t border-sidebar-border mx-3" />
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-muted">
              Management
            </p>
            {adminItems.map((item) => {
              const isActive =
                item.path === '/contacts'
                  ? location.pathname === '/contacts' && !location.search.includes('marketer=')
                  : location.pathname === item.path ||
                  (item.path !== '/admin-dashboard' &&
                    location.pathname.startsWith(item.path));
              return navBtn(item.path + '-admin', item.label, item.icon, item.path, isActive);
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {user?.email}
            </p>
            <p className="text-xs capitalize text-sidebar-muted">
              {role === 'admin' ? 'Administrator' : 'BD Member'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="rounded-md p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false); // auto-close on mobile after tap
  };

  return (
    <>
      {/* ── Desktop sidebar (lg+) ─────────────────────────────── */}
      <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col">
        <SidebarContent onNavigate={handleNavigate} />
      </aside>

      {/* ── Mobile hamburger button ───────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar shadow-md text-sidebar-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Mobile drawer overlay ─────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full flex flex-col shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent/80 text-sidebar-accent-foreground"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={handleNavigate} />
          </div>
        </div>
      )}
    </>
  );
}
