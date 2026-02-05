import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ResellerSidebar } from './ResellerSidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export function ResellerLayout() {
  const { user, role, reseller, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== 'reseller') {
    if (role === 'super_admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  if (reseller?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="rounded-full bg-destructive/10 p-4 w-fit mx-auto mb-4">
            <StatusBadge status="suspended" />
          </div>
          <h1 className="text-xl font-bold mb-2">Account Suspended</h1>
          <p className="text-muted-foreground mb-4">
            Your reseller account has been suspended. Please contact the administrator for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ResellerSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
