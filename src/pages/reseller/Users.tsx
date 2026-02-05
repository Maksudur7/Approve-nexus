import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, ExternalLink } from 'lucide-react';
import { User } from '@/lib/types';
import { format } from 'date-fns';

export default function ResellerUsers() {
  const { reseller } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (reseller) {
      fetchUsers();
    }
  }, [reseller]);

  const fetchUsers = async () => {
    if (!reseller) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('reseller_id', reseller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as User[]);
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

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied', description: 'Subscription link copied to clipboard' });
  };

  const columns = [
    {
      header: 'Username',
      cell: (item: User) => <span className="font-medium">{item.username}</span>,
    },
    {
      header: 'Plan',
      accessorKey: 'plan' as const,
    },
    {
      header: 'Status',
      cell: (item: User) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Expiry Date',
      cell: (item: User) => {
        const isExpired = new Date(item.expiry_date) < new Date();
        return (
          <span className={isExpired ? 'text-destructive font-medium' : ''}>
            {format(new Date(item.expiry_date), 'MMM d, yyyy')}
          </span>
        );
      },
    },
    {
      header: 'Created',
      cell: (item: User) => format(new Date(item.created_at), 'MMM d, yyyy'),
    },
    {
      header: 'Subscription Link',
      cell: (item: User) => item.subscription_link ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => copyLink(item.subscription_link!)}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(item.subscription_link!, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="My Users" 
        description="View your approved users and subscription details"
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No users yet. Submit a request to get started!"
      />
    </div>
  );
}
