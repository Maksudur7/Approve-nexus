import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, CheckCircle } from 'lucide-react';

export default function Setup() {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkExistingAdmin();
  }, []);

  useEffect(() => {
    if (role === 'super_admin') {
      navigate('/admin');
    }
  }, [role, navigate]);

  const checkExistingAdmin = async () => {
    try {
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');
      
      setHasAdmin(count !== null && count > 0);
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const handleSetupAdmin = async () => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign up or sign in first.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.rpc('setup_super_admin', {
        admin_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'You are now the Super Admin. Redirecting...',
      });

      // Refresh the page to update auth state
      window.location.href = '/admin';
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup failed',
        description: error.message || 'Failed to set up admin account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || hasAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-success/10 p-3 w-fit mb-2">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <CardTitle>System Already Configured</CardTitle>
            <CardDescription>
              A Super Admin has already been set up for this system.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-xl bg-primary p-3 w-fit mb-2">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle>Initial Setup</CardTitle>
          <CardDescription>
            Set up the first Super Admin account for your reseller management system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Signed in as:</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <Button 
                className="w-full" 
                onClick={handleSetupAdmin}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Make Me Super Admin
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                First, create an account or sign in. Then you can set yourself as the Super Admin.
              </p>
              <Button className="w-full" onClick={() => navigate('/auth?tab=signup')}>
                Create Account
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
