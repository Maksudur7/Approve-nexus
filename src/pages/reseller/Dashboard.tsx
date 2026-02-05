import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/StatsCard';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Clock, CheckCircle, Plus } from 'lucide-react';
import { UserRequest, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export default function ResellerDashboard() {
  const { reseller } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalUsers: 0,
  });
  const [recentRequests, setRecentRequests] = useState<UserRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (reseller) {
      fetchDashboardData();
    }
  }, [reseller]);

  const fetchDashboardData = async () => {
    if (!reseller) return;

    try {
      const [requestsRes, usersRes] = await Promise.all([
        supabase.from('user_requests').select('status').eq('reseller_id', reseller.id),
        supabase.from('users').select('id').eq('reseller_id', reseller.id),
      ]);

      const requests = requestsRes.data || [];
      setStats({
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        approvedRequests: requests.filter(r => r.status === 'approved').length,
        totalUsers: usersRes.data?.length || 0,
      });

      // Fetch recent requests
      const { data: recentData } = await supabase
        .from('user_requests')
        .select('*')
        .eq('reseller_id', reseller.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentRequests((recentData || []) as UserRequest[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestColumns = [
    {
      header: 'Username',
      cell: (item: UserRequest) => <span className="font-medium">{item.username}</span>,
    },
    {
      header: 'Plan',
      accessorKey: 'plan' as const,
    },
    {
      header: 'Status',
      cell: (item: UserRequest) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Submitted',
      cell: (item: UserRequest) => formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader 
        title={`Welcome, ${reseller?.name || 'Reseller'}`}
        description="Manage your user requests and subscriptions"
      >
        <Button asChild>
          <Link to="/reseller/requests">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Requests"
          value={stats.totalRequests}
          icon={FileText}
        />
        <StatsCard
          title="Pending"
          value={stats.pendingRequests}
          icon={Clock}
          className={stats.pendingRequests > 0 ? 'border-warning/50' : ''}
        />
        <StatsCard
          title="Approved"
          value={stats.approvedRequests}
          icon={CheckCircle}
        />
        <StatsCard
          title="Active Users"
          value={stats.totalUsers}
          icon={Users}
        />
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/reseller/requests">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={requestColumns}
            data={recentRequests}
            isLoading={isLoading}
            emptyMessage="No requests yet. Submit your first user request!"
          />
        </CardContent>
      </Card>
    </div>
  );
}
