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
    last_access_at?: string;
    status: string; // Active/Inactive/Archived
    source?: string; // Google, Email, etc.
    deleted_at?: string | null;
}

export function useAdminUsers() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch Profiles (including deleted ones)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, created_at, email, deleted_at, last_sign_in_at, last_access_at');

            if (profilesError) throw profilesError;

            // 2. Fetch Roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) console.error('Error fetching roles:', rolesError);

            // 3. Map Data
            const combinedUsers: AdminUser[] = (profiles || []).map((profile: any) => {
                const userRole = roles?.find((r: any) => r.user_id === profile.id)?.role || 'user';
                const isGoogle = profile.avatar_url?.includes('googleusercontent');
                const source = isGoogle ? 'Email, Google' : 'Email';

                let status = 'Active';
                if (profile.deleted_at) {
                    status = 'Archived';
                }

                return {
                    id: profile.id,
                    email: profile.email || 'No email (DB sync needed)',
                    name: profile.name || 'Unnamed User',
                    avatar_url: profile.avatar_url,
                    role: userRole,
                    created_at: profile.created_at || new Date().toISOString(),
                    status: status,
                    source: source,
                    deleted_at: profile.deleted_at,
                    last_sign_in_at: profile.last_sign_in_at,
                    last_access_at: profile.last_access_at || profile.last_sign_in_at
                };
            });

            setUsers(combinedUsers);
        } catch (err: any) {
            console.error('Error fetching admin users:', err);
            // Fallback for missing columns or other DB errors
            if (err.message?.includes('column "email" does not exist') || err.message?.includes('column "deleted_at" does not exist')) {
                setError('Esquema do banco de dados desatualizado. Execute as migrações.');
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
