-- Create a function to set up the first super admin
-- This should be called once during initial setup
CREATE OR REPLACE FUNCTION public.setup_super_admin(admin_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admin already exists
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    RAISE EXCEPTION 'A super admin already exists';
  END IF;
  
  -- Add the super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Allow any authenticated user to call this function (only works once)
GRANT EXECUTE ON FUNCTION public.setup_super_admin TO authenticated;

-- Also create an RLS policy to allow profile creation for new users
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);