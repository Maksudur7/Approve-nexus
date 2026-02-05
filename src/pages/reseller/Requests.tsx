import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, AlertCircle, Copy, CheckCircle2, Eye } from 'lucide-react';
import { UserRequest } from '@/lib/types';
import { format } from 'date-fns';

const PLANS = ['Basic', 'Standard', 'Premium', 'Enterprise'];
const DURATIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
];

export default function ResellerRequests() {
  const { reseller } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // States for Points, Links & Note Modal
  const [resellerPoints, setResellerPoints] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [showSuccessBox, setShowSuccessBox] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    plan: '',
    duration: '',
    notes: '',
  });

  useEffect(() => {
    if (reseller) {
      fetchRequests();
      fetchResellerPoints();
    }
  }, [reseller]);

  const fetchResellerPoints = async () => {
    if (!reseller) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', reseller.id)
      .single();
    if (!error && data) setResellerPoints(data.points || 0);
  };

  const fetchRequests = async () => {
    if (!reseller) return;
    try {
      const { data, error } = await supabase
        .from('user_requests')
        .select('*')
        .eq('reseller_id', reseller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as UserRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reseller) return;

    // 1 Point per request logic
    if (resellerPoints < 1) {
      toast({
        title: 'Insufficient Points',
        description: 'You need at least 1 point to submit a request.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const newLink = `https://myservice.com/config/${Math.random().toString(36).substring(7)}`;

      const { error: insertError } = await supabase.from('user_requests').insert({
        reseller_id: reseller.id,
        username: formData.username.trim(),
        plan: formData.plan,
        duration: parseInt(formData.duration),
        notes: formData.notes.trim() || null,
        subscription_link: newLink,
      });

      if (insertError) throw insertError;

      // Update points in DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: resellerPoints - 1 })
        .eq('id', reseller.id);

      if (updateError) throw updateError;

      setGeneratedLink(newLink);
      setShowSuccessBox(true);
      setResellerPoints(prev => prev - 1);
      
      toast({ title: 'Success!', description: '1 Point deducted and request submitted.' });
      setIsDialogOpen(false);
      setFormData({ username: '', plan: '', duration: '', notes: '' });
      fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const columns = [
    {
      header: 'Username',
      cell: (item: UserRequest) => <span className="font-medium">{item.username}</span>,
    },
    { header: 'Plan', accessorKey: 'plan' as const },
    { header: 'Duration', cell: (item: UserRequest) => `${item.duration} days` },
    { header: 'Status', cell: (item: UserRequest) => <StatusBadge status={item.status} /> },
    {
      header: 'Notes',
      cell: (item: UserRequest) => {
        const hasNote = item.admin_note || item.notes;
        return hasNote ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs flex gap-1 text-indigo-600 hover:text-indigo-800"
            onClick={() => {
              setSelectedNote(item.admin_note || item.notes || "");
              setIsNoteOpen(true);
            }}
          >
            <Eye className="h-3.5 w-3.5" /> View Note
          </Button>
        ) : <span className="text-muted-foreground">-</span>;
      },
    },
    { header: 'Date', cell: (item: UserRequest) => format(new Date(item.created_at), 'MMM d, yyyy') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="My Requests" 
        description={`Current Balance: ${resellerPoints} Points`}
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Submit User Request</DialogTitle>
                <DialogDescription>
                  This action will cost 1 point. Remaining: {resellerPoints}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })} required>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })} required>
                    <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving || resellerPoints < 1} className="w-full">
                  {isSaving ? <Loader2 className="animate-spin" /> : "Deduct 1 Point & Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* SUBSCRIPTION LINK BOX */}
      {showSuccessBox && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-indigo-700 font-bold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Link Generated Successfully!</span>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={generatedLink} className="bg-white border-indigo-300 font-mono text-xs" />
            <Button size="sm" variant="default" onClick={() => copyToClipboard(generatedLink)}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-[10px] text-indigo-500 italic">* This link is saved in your request details.</p>
        </div>
      )}

      <DataTable columns={columns} data={requests} isLoading={isLoading} emptyMessage="No requests found." />

      {/* NOTE DETAILS MODAL */}
      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-600" /> Note Details
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedNote}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsNoteOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}