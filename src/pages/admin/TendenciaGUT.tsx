import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminOnly } from '@/components/ProtectedComponent';
import { CalculadoraImportancia } from '@/components/CalculadoraTendencia';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ImportanciaProvaAdmin() {
    const { isAdmin, loading } = useUserRole();

    if (loading) {
        return <LoadingSpinner size="large" showText fullPage />;
    }

    if (!isAdmin) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                    <strong>Acesso Negado!</strong> Você precisa ser administrador para acessar esta página.
                </div>
            </div>
        );
    }

    return (
        <AdminOnly>
            <div className="space-y-6">
                {/* Header */}
                <div className="px-4 md:px-8 pt-4 pb-4 bg-transparent rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
                        📈 Calculadora de Importância em Prova
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Analise o volume de questões de cada tópico para definir prioridades de estudo.
                    </p>
                </div>

                {/* Conteúdo */}
                <div className="px-2 md:px-4">
                    <CalculadoraImportancia />
                </div>
            </div>
        </AdminOnly>
    );
}
