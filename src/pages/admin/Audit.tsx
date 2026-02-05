import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AuditLog } from '@/lib/types';
import { format } from 'date-fns';

const actionColors: Record<string, string> = {
  CREATE_RESELLER: 'bg-success/15 text-success border-success/30',
  SUSPEND_RESELLER: 'bg-warning/15 text-warning border-warning/30',
  ACTIVATE_RESELLER: 'bg-info/15 text-info border-info/30',
  DELETE_RESELLER: 'bg-destructive/15 text-destructive border-destructive/30',
  APPROVE_REQUEST: 'bg-success/15 text-success border-success/30',
  REJECT_REQUEST: 'bg-destructive/15 text-destructive border-destructive/30',
  SUSPEND_USER: 'bg-warning/15 text-warning border-warning/30',
  ACTIVATE_USER: 'bg-info/15 text-info border-info/30',
  DELETE_USER: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function AdminAudit() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const columns = [
    {
      header: 'Timestamp',
      cell: (item: AuditLog) => (
        <span className="text-sm">
          {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
        </span>
      ),
    },
    {
      header: 'Actor',
      cell: (item: AuditLog) => (
        <span className="text-sm">{item.actor_email || 'System'}</span>
      ),
    },
    {
      header: 'Action',
      cell: (item: AuditLog) => (
        <Badge 
          variant="outline" 
          className={`text-xs ${actionColors[item.action] || 'bg-muted'}`}
        >
          {formatAction(item.action)}
        </Badge>
      ),
    },
    {
      header: 'Target',
      cell: (item: AuditLog) => (
        <span className="text-sm capitalize">{item.target_type.replace(/_/g, ' ')}</span>
      ),
    },
    {
      header: 'Details',
      cell: (item: AuditLog) => {
        if (!item.details) return '-';
        const details = item.details as Record<string, unknown>;
        const displayValue = details.username || details.reseller_name || details.reseller || '-';
        return <span className="text-sm text-muted-foreground">{String(displayValue)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Audit Log" 
        description="Track all actions performed in the system"
      />

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No audit logs found"
      />
    </div>
  );
}
