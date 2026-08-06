import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { invokeAdminRpc } from '@/services/adminRpcService';

type ProfileRow = Tables<'profiles'>;
type RoleRow = Tables<'user_roles'>;

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
    is_active?: boolean; // New field
    source?: string; // Google, Email, etc.
    has_password: boolean;
    auth_methods: string[];
    deleted_at?: string | null;
    email_confirmed?: boolean;
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
                .select('id, name, avatar_url, created_at, email, deleted_at, last_sign_in_at, last_access_at, is_active');

            if (profilesError) throw profilesError;

            const authStatuses = await invokeAdminRpc<Array<{
                id: string;
                email_confirmed_at: string | null;
                confirmed_at: string | null;
                has_password: boolean;
                auth_methods: string[];
            }>>('get_auth_user_statuses');
            const authStatusById = new Map(authStatuses.map((authUser) => [authUser.id, authUser]));

            // 2. Fetch Roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) console.error('Error fetching roles:', rolesError);

            // 3. Map Data
            const combinedUsers: AdminUser[] = (profiles || []).map((profile: ProfileRow) => {
                const userRole = roles?.find((role: RoleRow) => role.user_id === profile.id)?.role || 'user';
                const authStatus = authStatusById.get(profile.id);
                const authMethods = authStatus?.auth_methods ?? [];
                const source = [
                    authStatus?.has_password ? 'Email' : null,
                    authMethods.includes('google') ? 'Google' : null,
                ].filter(Boolean).join(', ') || 'Não identificado';
                const emailConfirmed = authStatus
                    ? Boolean(authStatus.email_confirmed_at || authStatus.confirmed_at)
                    : undefined;

                let status = 'Active';
                if (profile.deleted_at) {
                    status = 'Archived';
                } else if (profile.is_active === false) {
                    status = 'Inactive';
                }

                return {
                    id: profile.id,
                    email: profile.email || 'No email (DB sync needed)',
                    name: profile.name || 'Unnamed User',
                    avatar_url: profile.avatar_url,
                    role: userRole,
                    created_at: profile.created_at || new Date().toISOString(),
                    status: status,
                    is_active: profile.is_active,
                    source: source,
                    has_password: authStatus?.has_password === true,
                    auth_methods: authMethods,
                    deleted_at: profile.deleted_at,
                    last_sign_in_at: profile.last_sign_in_at,
                    // Auth confirmation can update Supabase's last_sign_in_at even
                    // before the user enters the app. Last access must be app usage.
                    last_access_at: profile.last_access_at,
                    email_confirmed: emailConfirmed
                };
            });

            setUsers(combinedUsers);
        } catch (err: unknown) {
            console.error('Error fetching admin users:', err);
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            // Fallback for missing columns or other DB errors
            if (message.includes('column "email" does not exist') || message.includes('column "deleted_at" does not exist')) {
                setError('Esquema do banco de dados desatualizado. Execute as migrações.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchUsers();

        const refresh = () => {
            if (!document.hidden) void fetchUsers();
        };

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [fetchUsers]);

    return { users, loading, error, refetch: fetchUsers };
}
