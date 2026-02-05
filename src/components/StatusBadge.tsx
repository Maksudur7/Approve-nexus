import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RequestStatus, UserStatus, ResellerStatus } from '@/lib/types';

type Status = RequestStatus | UserStatus | ResellerStatus;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending' },
  approved: { label: 'Approved', className: 'status-approved' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
  active: { label: 'Active', className: 'status-active' },
  suspended: { label: 'Suspended', className: 'status-suspended' },
  expired: { label: 'Expired', className: 'status-expired' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium text-xs border',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
