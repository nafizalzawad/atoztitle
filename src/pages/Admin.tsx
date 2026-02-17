import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Users, Mail, Loader2 } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
    ]);
    setProfiles(profilesRes.data || []);
    const roleMap: Record<string, string> = {};
    (rolesRes.data || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);
    setLoading(false);
  };

  const changeRole = async (userId: string, newRole: 'admin' | 'bd_user') => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);
    if (error) toast.error(error.message);
    else {
      toast.success('Role updated');
      setRoles(prev => ({ ...prev, [userId]: newRole }));
    }
  };

  const sendWeeklyEmails = async () => {
    setSendingEmail(true);
    try {
      const res = await supabase.functions.invoke('send-weekly-report');
      if (res.error) throw res.error;
      toast.success('Weekly performance emails sent to all BD members');
    } catch (err: any) {
      toast.error('Failed to send emails: ' + (err.message || 'Unknown error'));
    }
    setSendingEmail(false);
  };

  return (
    <AppLayout title="Admin Panel" subtitle="Manage users, roles, and system settings">
      {/* Send Weekly Email */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Weekly Performance Email</h3>
              <p className="text-xs text-muted-foreground">Send pipeline summary to all BD members</p>
            </div>
          </div>
          <Button onClick={sendWeeklyEmails} disabled={sendingEmail}>
            {sendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send Now
          </Button>
        </div>
      </div>

      {/* User Management */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">User Management</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3.5 text-sm font-medium text-foreground">{p.full_name}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{p.email}</td>
                  <td className="px-6 py-3.5">
                    <Select value={roles[p.id] || 'bd_user'} onValueChange={(v) => changeRole(p.id, v as 'admin' | 'bd_user')}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="bd_user">BD User</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
