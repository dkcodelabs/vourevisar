import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
    id: string;
    email?: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
    last_sign_in_at?: string;
    status?: string; // Active/Inactive based on subscription or last seen
    source?: string; // Google, Email, etc.
}

export function useAdminUsers() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Profiles
            // Trying to get email from profiles if exists, otherwise we might miss it
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, created_at, email'); // Optimistically asking for email

            if (profilesError) throw profilesError;

            // 2. Fetch Roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) console.error('Error fetching roles:', rolesError);

            // 3. Map Data
            const combinedUsers: AdminUser[] = (profiles || []).map((profile: any) => {
                const userRole = roles?.find((r: any) => r.user_id === profile.id)?.role || 'user';

                // Deduction logic for Source
                const isGoogle = profile.avatar_url?.includes('googleusercontent');
                // Heuristic: If they have a Google avatar, they likely have both or used Social login which provides email.
                // User requested "Email, Google" to be shown.
                const source = isGoogle ? 'Email, Google' : 'Email';

                return {
                    id: profile.id,
                    email: profile.email || 'No email (DB sync needed)', // Fallback
                    name: profile.name || 'Unnamed User',
                    avatar_url: profile.avatar_url,
                    role: userRole,
                    created_at: profile.created_at || new Date().toISOString(),
                    status: 'Active',
                    source: source,
                };
            });

            setUsers(combinedUsers);
        } catch (err: any) {
            console.error('Error fetching admin users:', err);
            // Fallback mock data if DB fails (so UI shows something during dev)
            if (err.message?.includes('column "email" does not exist')) {
                setError('Colunas de email ausentes no perfil. Necessário ajustar schema.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return { users, loading, error, refetch: fetchUsers };
}
