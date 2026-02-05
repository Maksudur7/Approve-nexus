import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, MoreHorizontal, UserCheck, UserX, Trash2, Loader2 } from 'lucide-react';
import { Reseller } from '@/lib/types';
import { format } from 'date-fns';

export default function AdminResellers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    try {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResellers((data || []) as Reseller[]);
    } catch (error) {
      console.error('Error fetching resellers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch resellers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Create auth user first (this would typically be done via an edge function for security)
      // For now, we'll use the admin API approach
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.name },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create reseller record
      const { error: resellerError } = await supabase
        .from('resellers')
        .insert({
          user_id: authData.user.id,
          name: formData.name,
          email: formData.email,
        });

      if (resellerError) throw resellerError;

      // Create role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'reseller',
        });

      if (roleError) throw roleError;

      // Log action
      await supabase.from('audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'CREATE_RESELLER',
        target_type: 'reseller',
        target_id: authData.user.id,
        details: { reseller_name: formData.name, reseller_email: formData.email },
      });

      toast({
        title: 'Reseller created',
        description: `${formData.name} has been added as a reseller.`,
      });

      setIsDialogOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchResellers();
    } catch (error: any) {
      console.error('Error creating reseller:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create reseller',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (reseller: Reseller, newStatus: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ status: newStatus })
        .eq('id', reseller.id);

      if (error) throw error;

      // Log action
      await supabase.from('audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: newStatus === 'suspended' ? 'SUSPEND_RESELLER' : 'ACTIVATE_RESELLER',
        target_type: 'reseller',
        target_id: reseller.id,
        details: { reseller_name: reseller.name },
      });

      toast({
        title: `Reseller ${newStatus}`,
        description: `${reseller.name} has been ${newStatus}.`,
      });

      fetchResellers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update reseller status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (reseller: Reseller) => {
    if (!confirm(`Are you sure you want to delete ${reseller.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resellers')
        .delete()
        .eq('id', reseller.id);

      if (error) throw error;

      // Log action
      await supabase.from('audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'DELETE_RESELLER',
        target_type: 'reseller',
        target_id: reseller.id,
        details: { reseller_name: reseller.name },
      });

      toast({
        title: 'Reseller deleted',
        description: `${reseller.name} has been removed.`,
      });

      fetchResellers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete reseller',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      header: 'Name',
      cell: (item: Reseller) => <span className="font-medium">{item.name}</span>,
    },
    {
      header: 'Email',
      accessorKey: 'email' as const,
    },
    {
      header: 'Status',
      cell: (item: Reseller) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Created',
      cell: (item: Reseller) => format(new Date(item.created_at), 'MMM d, yyyy'),
    },
    {
      header: '',
      className: 'w-[50px]',
      cell: (item: Reseller) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.status === 'active' ? (
              <DropdownMenuItem onClick={() => handleStatusChange(item, 'suspended')}>
                <UserX className="mr-2 h-4 w-4" />
                Suspend
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleStatusChange(item, 'active')}>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => handleDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Resellers" 
        description="Manage your reseller accounts"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Reseller
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateReseller}>
              <DialogHeader>
                <DialogTitle>Add New Reseller</DialogTitle>
                <DialogDescription>
                  Create a new reseller account. They will receive login credentials via email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Reseller name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="reseller@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Reseller
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable
        columns={columns}
        data={resellers}
        isLoading={isLoading}
        emptyMessage="No resellers found. Add your first reseller to get started."
      />
    </div>
  );
}
