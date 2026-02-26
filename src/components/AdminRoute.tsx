import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const AdminRoute = () => {
    const { isAdmin, loading } = useUserRole();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <LoadingSpinner size="medium" />
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
