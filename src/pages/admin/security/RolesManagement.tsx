/**
 * MODULE: RolesManagement (RBAC)
 * 
 * RESPONSIBILITY:
 * - Definition of granular permissions.
 * - Creation and editing of Roles.
 * - Assignment of permissions to Roles.
 * 
 * SCOPE STATUS: OPEN 🚧
 * - Currently under active development.
 * 
 * EXCLUSIONS (DO NOT ADD):
 * - Direct assignment of roles to users (Use UserManagement).
 * - Hardcoded permission checks (Use a permission hook/context).
 */
import React from 'react';
import { Shield, UserPlus, Lock } from 'lucide-react';

const RolesManagement = () => {
    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-slate-700" />
                    Gerenciamento de Roles (RBAC)
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm">Controle de permissões granulares e atribuições de cargos.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 text-amber-800">
                <div className="flex items-center gap-2 font-bold mb-2">
                    <Lock className="w-5 h-5" />
                    Área Restrita (Owner Only)
                </div>
                Esta área é sensível e permite conceder permissões administrativas. Todas as ações são logadas.
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center py-16">
                <p className="text-slate-500">Módulo de gestão de Roles em desenvolvimento.</p>
                <p className="text-slate-400 text-sm mt-2">Use o banco de dados diretamente ou a página antiga provisoriamente se necessário.</p>
            </div>
        </div>
    );
};

export default RolesManagement;
