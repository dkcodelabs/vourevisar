import { createContext } from 'react';
import { User } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';
import type { SignupLegalAcceptance } from '@/features/billing/legal/billingLegalDocuments';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string, legalAcceptance?: SignupLegalAcceptance) => Promise<{ success: boolean; user?: User; error?: string; confirmationPending?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: (options?: { redirect?: boolean; skipAudit?: boolean }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profileData: Partial<Profile>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
