import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Users, ArrowRight, CheckCircle } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="rounded-2xl bg-primary p-4 shadow-lg shadow-primary/25">
                <Shield className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Reseller Management
              <span className="block text-primary">Made Simple</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              A powerful platform for managing resellers and user subscriptions.
              Streamline your approval workflow with our intuitive dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth?tab=signin">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-4">Two Powerful Panels</h2>
          <p className="text-muted-foreground">Everything you need to manage your reseller network</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Super Admin Card */}
          <div className="rounded-xl border bg-card p-8 hover-card">
            <div className="rounded-lg bg-primary/10 w-fit p-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Super Admin</h3>
            <p className="text-muted-foreground mb-4">
              Full control over your reseller network with powerful management tools.
            </p>
            <ul className="space-y-2">
              {[
                'Create and manage resellers',
                'Approve/reject user requests',
                'View audit logs',
                'Suspend or delete accounts',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Reseller Card */}
          <div className="rounded-xl border bg-card p-8 hover-card">
            <div className="rounded-lg bg-primary/10 w-fit p-3 mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Reseller Panel</h3>
            <p className="text-muted-foreground mb-4">
              Streamlined interface for resellers to manage their user requests.
            </p>
            <ul className="space-y-2">
              {[
                'Submit user requests easily',
                'Track approval status',
                'View approved users',
                'Copy subscription links',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">ResellerHub — Reseller Management System</p>
          <Link to="/setup" className="text-primary hover:underline text-xs">
            First time? Set up your admin account →
          </Link>
        </div>
      </footer>
    </div>
  );
}
