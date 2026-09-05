import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const AdminRoute = () => {
    const { isAdmin, loading, error, refetch } = useUserRole();

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center px-6">
                <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
                    <h2 className="text-base font-semibold text-foreground">Não foi possível confirmar seu acesso</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
