import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2 } from 'lucide-react';
import { UserRequest, Reseller, RequestStatus } from '@/lib/types';
import { format, addDays } from 'date-fns';

type RequestWithReseller = UserRequest & { reseller: Reseller };

export default function AdminRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithReseller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithReseller | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<RequestStatus | 'all'>('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('user_requests')
        .select('*, reseller:resellers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as RequestWithReseller[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (request: RequestWithReseller, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNote('');
  };

  const processAction = async () => {
    if (!selectedRequest || !actionType) return;

    setIsProcessing(true);

    try {
      if (actionType === 'approve') {
        // Create the user
        const expiryDate = addDays(new Date(), selectedRequest.duration);
        const subscriptionLink = `https://app.example.com/subscribe/${crypto.randomUUID()}`;

        const { error: userError } = await supabase.from('users').insert({
          reseller_id: selectedRequest.reseller_id,
          request_id: selectedRequest.id,
          username: selectedRequest.username,
          plan: selectedRequest.plan,
          expiry_date: expiryDate.toISOString(),
          subscription_link: subscriptionLink,
        });

        if (userError) throw userError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('user_requests')
        .update({
          status: actionType === 'approve' ? 'approved' : 'rejected',
          admin_note: adminNote || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Log action
      await supabase.from('audit_log').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: actionType === 'approve' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST',
        target_type: 'user_request',
        target_id: selectedRequest.id,
        details: {
          username: selectedRequest.username,
          reseller: selectedRequest.reseller?.name,
          admin_note: adminNote,
        },
      });

      toast({
        title: `Request ${actionType}d`,
        description: `The user request has been ${actionType}d successfully.`,
      });

      setSelectedRequest(null);
      setActionType(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = activeTab === 'all' 
    ? requests 
    : requests.filter(r => r.status === activeTab);

  const columns = [
    {
      header: 'Username',
      cell: (item: RequestWithReseller) => <span className="font-medium">{item.username}</span>,
    },
    {
      header: 'Reseller',
      cell: (item: RequestWithReseller) => item.reseller?.name || '-',
    },
    {
      header: 'Plan',
      accessorKey: 'plan' as const,
    },
    {
      header: 'Duration',
      cell: (item: RequestWithReseller) => `${item.duration} days`,
    },
    {
      header: 'Status',
      cell: (item: RequestWithReseller) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Submitted',
      cell: (item: RequestWithReseller) => format(new Date(item.created_at), 'MMM d, yyyy'),
    },
    {
      header: 'Actions',
      className: 'w-[120px]',
      cell: (item: RequestWithReseller) => (
        item.status === 'pending' ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
              onClick={() => handleAction(item, 'approve')}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleAction(item, 'reject')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {item.reviewed_at && format(new Date(item.reviewed_at), 'MMM d')}
          </span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="User Requests" 
        description="Review and approve user creation requests from resellers"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({requests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <DataTable
            columns={columns}
            data={filteredRequests}
            isLoading={isLoading}
            emptyMessage={`No ${activeTab === 'all' ? '' : activeTab} requests found`}
          />
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `This will create a new user account for "${selectedRequest?.username}".`
                : `This will reject the request for "${selectedRequest?.username}".`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Username:</span>
                <p className="font-medium">{selectedRequest?.username}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plan:</span>
                <p className="font-medium">{selectedRequest?.plan}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="font-medium">{selectedRequest?.duration} days</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reseller:</span>
                <p className="font-medium">{selectedRequest?.reseller?.name}</p>
              </div>
            </div>
            {selectedRequest?.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Reseller notes:</span>
                <p className="text-sm bg-muted p-2 rounded mt-1">{selectedRequest.notes}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-note">
                Admin Note {actionType === 'reject' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Optional note...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button 
              onClick={processAction} 
              disabled={isProcessing || (actionType === 'reject' && !adminNote.trim())}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'approve' ? 'Approve & Create User' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
