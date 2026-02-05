import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, UserCheck, UserX, Trash2, Copy } from 'lucide-react';
import { User, Reseller } from '@/lib/types';
import { format } from 'date-fns';

type UserWithReseller = User & { reseller: Reseller };

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithReseller[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, reseller:resellers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as UserWithReseller[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (userItem: UserWithReseller, newStatus: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userItem.id);

      if (error) throw error;

      await supabase.from('audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: newStatus === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
        target_type: 'user',
        target_id: userItem.id,
        details: { username: userItem.username },
      });

      toast({
        title: `User ${newStatus}`,
        description: `${userItem.username} has been ${newStatus}.`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (userItem: UserWithReseller) => {
    if (!confirm(`Are you sure you want to delete ${userItem.username}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userItem.id);

      if (error) throw error;

      await supabase.from('audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'DELETE_USER',
        target_type: 'user',
        target_id: userItem.id,
        details: { username: userItem.username },
      });

      toast({
        title: 'User deleted',
        description: `${userItem.username} has been removed.`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied', description: 'Subscription link copied to clipboard' });
  };

  const columns = [
    {
      header: 'Username',
      cell: (item: UserWithReseller) => <span className="font-medium">{item.username}</span>,
    },
    {
      header: 'Reseller',
      cell: (item: UserWithReseller) => item.reseller?.name || '-',
    },
    {
      header: 'Plan',
      accessorKey: 'plan' as const,
    },
    {
      header: 'Status',
      cell: (item: UserWithReseller) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Expiry',
      cell: (item: UserWithReseller) => {
        const isExpired = new Date(item.expiry_date) < new Date();
        return (
          <span className={isExpired ? 'text-destructive' : ''}>
            {format(new Date(item.expiry_date), 'MMM d, yyyy')}
          </span>
        );
      },
    },
    {
      header: 'Link',
      cell: (item: UserWithReseller) => item.subscription_link ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => copyLink(item.subscription_link!)}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      ) : '-',
    },
    {
      header: '',
      className: 'w-[50px]',
      cell: (item: UserWithReseller) => (
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
        title="All Users" 
        description="Manage all users created by resellers"
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users found"
      />
    </div>
  );
}
