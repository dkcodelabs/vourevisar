import React from 'react';
import { Shield, Server, Database, Activity, FileText, Lock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SystemManagement = () => {
    const navigate = useNavigate();

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Server className="w-6 h-6 text-slate-700" />
                    Sistema & Infraestrutura
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm">Monitoramento, logs e configurações técnicas do sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Status do Sistema */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        Status do Sistema
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="text-sm font-medium text-emerald-800">API Gateway</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">ONLINE</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="text-sm font-medium text-emerald-800">Database (Supabase)</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">ONLINE</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Versão do App</span>
                            <span className="text-sm text-slate-900 font-mono">v1.24.0</span>
                        </div>
                    </div>
                </div>

                {/* Backups */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        Backups
                    </h3>
                    <div className="space-y-4">
                        <div className="text-sm text-slate-500 mb-4">
                            Último backup realizado automaticamente há 2 horas.
                        </div>
                        <button className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-100">
                            Realizar Backup Manual
                        </button>
                        <button className="w-full py-2 bg-white text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm border border-slate-200">
                            Ver Histórico de Backups
                        </button>
                    </div>
                </div>

                {/* Área de Perigo / Diagnóstico */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Diagnóstico & Tools
                    </h3>
                    <div className="space-y-4">
                        <button className="w-full py-2 bg-white text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm border border-slate-200 flex items-center justify-center gap-2">
                            <FileText className="w-4 h-4" />
                            Ver Logs de Erro
                        </button>
                        <button className="w-full py-2 bg-amber-50 text-amber-700 font-medium rounded-lg hover:bg-amber-100 transition-colors text-sm border border-amber-100 flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            Resetar Cache de Permissões
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemManagement;
