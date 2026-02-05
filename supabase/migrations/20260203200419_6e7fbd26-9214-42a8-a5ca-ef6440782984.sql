-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'reseller');

-- Create status enums
CREATE TYPE public.reseller_status AS ENUM ('active', 'suspended');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'expired');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Resellers table
CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status reseller_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User requests table (submitted by resellers)
CREATE TABLE public.user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  plan TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in days
  notes TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table (created after approval)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.user_requests(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  plan TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  expiry_date TIMESTAMPTZ NOT NULL,
  subscription_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function: Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Helper function: Check if user is a reseller
CREATE OR REPLACE FUNCTION public.is_reseller(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'reseller'
  );
$$;

-- Helper function: Get reseller ID for a user
CREATE OR REPLACE FUNCTION public.get_reseller_id(_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.resellers WHERE user_id = _user_id LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin());

-- User roles policies (only super admin can manage)
CREATE POLICY "Super admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin());

-- Resellers policies
CREATE POLICY "Super admins can view all resellers" ON public.resellers
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Resellers can view own record" ON public.resellers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage resellers" ON public.resellers
  FOR ALL USING (public.is_super_admin());

-- User requests policies
CREATE POLICY "Super admins can view all requests" ON public.user_requests
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Resellers can view own requests" ON public.user_requests
  FOR SELECT USING (reseller_id = public.get_reseller_id());

CREATE POLICY "Resellers can create requests" ON public.user_requests
  FOR INSERT WITH CHECK (reseller_id = public.get_reseller_id());

CREATE POLICY "Super admins can manage requests" ON public.user_requests
  FOR ALL USING (public.is_super_admin());

-- Users policies
CREATE POLICY "Super admins can view all users" ON public.users
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Resellers can view own users" ON public.users
  FOR SELECT USING (reseller_id = public.get_reseller_id());

CREATE POLICY "Super admins can manage users" ON public.users
  FOR ALL USING (public.is_super_admin());

-- Audit log policies
CREATE POLICY "Super admins can view all logs" ON public.audit_log
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Users can view own actions" ON public.audit_log
  FOR SELECT USING (actor_id = auth.uid());

CREATE POLICY "Authenticated users can insert logs" ON public.audit_log
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_requests_updated_at
  BEFORE UPDATE ON public.user_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();