// Application types

export type AppRole = 'super_admin' | 'reseller';
export type ResellerStatus = 'active' | 'suspended';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type UserStatus = 'active' | 'suspended' | 'expired';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  points: number; 
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Reseller {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: ResellerStatus;
  created_at: string;
  updated_at: string;
}

export interface UserRequest {
  id: string;
  reseller_id: string;
  username: string;
  plan: string;
  duration: number;
  notes: string | null;
  status: RequestStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  reseller?: Reseller;
}

export interface User {
  id: string;
  reseller_id: string;
  request_id: string | null;
  username: string;
  plan: string;
  status: UserStatus;
  expiry_date: string;
  subscription_link: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  reseller?: Reseller;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  session: import('@supabase/supabase-js').Session | null;
  profile: Profile | null;
  role: AppRole | null;
  reseller: Reseller | null;
  isLoading: boolean;
}


