import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/StatsCard';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, ClipboardList, AlertCircle } from 'lucide-react';
import { UserRequest, Reseller } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalResellers: 0,
    activeResellers: 0,
    pendingRequests: 0,
    totalUsers: 0,
  });
  const [recentRequests, setRecentRequests] = useState<(UserRequest & { reseller: Reseller })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [resellersRes, pendingRes, usersRes] = await Promise.all([
        supabase.from('resellers').select('status'),
        supabase.from('user_requests').select('id').eq('status', 'pending'),
        supabase.from('users').select('id'),
      ]);

      const resellers = resellersRes.data || [];
      setStats({
        totalResellers: resellers.length,
        activeResellers: resellers.filter(r => r.status === 'active').length,
        pendingRequests: pendingRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
      });

      // Fetch recent pending requests
      const { data: requests } = await supabase
        .from('user_requests')
        .select('*, reseller:resellers(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentRequests((requests || []) as (UserRequest & { reseller: Reseller })[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestColumns = [
    {
      header: 'Username',
      cell: (item: UserRequest & { reseller: Reseller }) => (
        <span className="font-medium">{item.username}</span>
      ),
    },
    {
      header: 'Reseller',
      cell: (item: UserRequest & { reseller: Reseller }) => item.reseller?.name || '-',
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
        title="Dashboard" 
        description="Overview of your reseller management system"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Resellers"
          value={stats.totalResellers}
          icon={Users}
          description={`${stats.activeResellers} active`}
        />
        <StatsCard
          title="Active Resellers"
          value={stats.activeResellers}
          icon={Users}
        />
        <StatsCard
          title="Pending Requests"
          value={stats.pendingRequests}
          icon={ClipboardList}
          className={stats.pendingRequests > 0 ? 'border-warning/50' : ''}
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={UserPlus}
        />
      </div>

      {/* Recent Pending Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Pending User Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={requestColumns}
            data={recentRequests}
            isLoading={isLoading}
            emptyMessage="No pending requests at the moment"
          />
        </CardContent>
      </Card>
    </div>
  );
}
