import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const AdminRoute = () => {
    const { isAdmin, loading } = useUserRole();

    if (loading) {
        return <LoadingSpinner size="large" fullPage />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
