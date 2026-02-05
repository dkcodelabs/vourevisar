import React, { useState } from 'react';
import {
    Search, Filter, Plus, MoreVertical, Download,
    Users, UserPlus, Zap, Shield, Mail, Calendar, CheckCircle, XCircle
} from 'lucide-react';

const UserManagement = () => {
    // Mock data for UI development
    const metrics = [
        { title: 'Total de usuários', value: '1.240', change: '+40%', trend: 'up', icon: Users },
        { title: 'Novos usuários', value: '185', change: '+10%', trend: 'up', icon: UserPlus },
        { title: 'Usuários ativos', value: '650', change: '-5%', trend: 'down', icon: Zap },
    ];

    const [users] = useState([
        { id: 1, name: 'Florence Shaw', email: 'florence@untitledui.com', role: 'Admin', status: 'Active', lastActive: 'Mar 4, 2024', dateAdded: 'July 4, 2022', avatar: '' },
        { id: 2, name: 'Amélie Laurent', email: 'amelie@untitledui.com', role: 'Admin', status: 'Active', lastActive: 'Mar 4, 2024', dateAdded: 'July 4, 2022', avatar: '' },
        { id: 3, name: 'Ammar Foley', email: 'ammar@untitledui.com', role: 'User', status: 'Active', lastActive: 'Mar 2, 2024', dateAdded: 'July 4, 2022', avatar: '' },
        { id: 4, name: 'Caitlyn King', email: 'caitlyn@untitledui.com', role: 'User', status: 'Active', lastActive: 'Mar 6, 2024', dateAdded: 'July 4, 2022', avatar: '' },
        { id: 5, name: 'Sienna Hewitt', email: 'sienna@untitledui.com', role: 'User', status: 'Inactive', lastActive: 'Mar 8, 2024', dateAdded: 'July 4, 2022', avatar: '' },
    ]);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerenciamento de Usuários</h1>
                    <p className="text-slate-500 mt-1">Gerencie os membros do seu time e suas permissões de conta aqui.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm gap-2">
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionar usuário
                    </button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <metric.icon className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${metric.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {metric.change}
                                <span className="ml-1 text-slate-500 font-normal">vs last month</span>
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{metric.title}</p>
                            <h3 className="text-3xl font-bold text-slate-900">{metric.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-t-xl border border-slate-200 border-b-0 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar usuários..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 text-slate-700"
                    />
                </div>
                <button className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-b-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <th className="px-6 py-4 w-[40px]">
                                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Permissão</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Última Atividade</th>
                                <th className="px-6 py-4">Data de Cadastro</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium text-sm">
                                                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{user.name}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'Admin'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.status === 'Active'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                            {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.lastActive}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.dateAdded}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Mostrando <span className="font-medium text-slate-900">1</span> a <span className="font-medium text-slate-900">5</span> de <span className="font-medium text-slate-900">44</span> resultados
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                            Anterior
                        </button>
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                            Próxima
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
