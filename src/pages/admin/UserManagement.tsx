import React, { useState } from 'react';
import {
    Search, Filter, Plus, MoreVertical, Download,
    Users, UserPlus, Zap, Shield, Mail, Calendar, CheckCircle, XCircle,
    Eye, Edit, Power, RefreshCw, Trash2, Key, GripHorizontal
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const UserManagement = () => {
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    // Mock data tailored for the new requirements
    const metrics = [
        { title: 'Total de usuários', value: '1.240', change: '+40%', trend: 'up', icon: Users },
        { title: 'Novos usuários', value: '185', change: '+10%', trend: 'up', icon: UserPlus },
        { title: 'Usuários ativos', value: '650', change: '-5%', trend: 'down', icon: Zap },
    ];

    const [users] = useState([
        { id: 1, name: 'Florence Shaw', email: 'florence@untitledui.com', role: 'Admin', status: 'Active', lastActive: 'Mar 4, 2024', dateAdded: 'July 4, 2022', avatar: '', source: 'Cadastro' },
        { id: 2, name: 'Amélie Laurent', email: 'amelie@untitledui.com', role: 'Admin', status: 'Active', lastActive: 'Mar 4, 2024', dateAdded: 'July 4, 2022', avatar: '', source: 'SSO (Google)' },
        { id: 3, name: 'Ammar Foley', email: 'ammar@untitledui.com', role: 'User', status: 'Active', lastActive: 'Mar 2, 2024', dateAdded: 'July 4, 2022', avatar: '', source: 'Convite' },
        { id: 4, name: 'Caitlyn King', email: 'caitlyn@untitledui.com', role: 'User', status: 'Active', lastActive: 'Mar 6, 2024', dateAdded: 'July 4, 2022', avatar: '', source: 'Cadastro' },
        { id: 5, name: 'Sienna Hewitt', email: 'sienna@untitledui.com', role: 'User', status: 'Inactive', lastActive: 'Mar 8, 2024', dateAdded: 'July 4, 2022', avatar: '', source: 'Importado' },
    ]);

    const handleDeleteUser = () => {
        // Here logic to delete user
        console.log(`Deleting user ${userToDelete}`);
        setUserToDelete(null);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-fade-in font-sans text-slate-900 pointer-events-auto">
            {/* Header Premium - Mais arejado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciamento de Usuários</h1>
                    <p className="text-slate-500 mt-1.5 text-sm">Gerencie os membros do seu time e suas permissões.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm gap-2 hover:shadow">
                        <Download className="w-4 h-4 text-slate-500" />
                        Exportar
                    </button>
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md hover:ring-2 hover:ring-blue-100 gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionar usuário
                    </button>
                </div>
            </div>

            {/* Metrics Cards - Minimalist Redesign */}
            {/* "Card bom quase some. Número fica." */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl border border-slate-100/80 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                                {metric.title}
                            </span>
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${metric.trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                {metric.change}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{metric.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Search - Cleaner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                <div className="relative flex-1 max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 text-sm"
                    />
                </div>
                <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-50 rounded-lg transition-colors gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                </button>
            </div>

            {/* Premium Table - No Vertical Lines, Subtle Hover */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            {/* Cabeçalho mais leve e menor */}
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 w-[40px]">
                                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                </th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Permissão</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Última Atividade</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cadastro</th>
                                <th className="px-6 py-3 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Linhas Horizontais Sutis */}
                            {users.map((user) => (
                                <tr key={user.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                                    <td className="px-6 py-4">
                                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar sutil */}
                                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-medium text-xs">
                                                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer">
                                                    {user.name}
                                                </span>
                                                <span className="text-xs text-slate-500 font-normal">
                                                    {user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Badge Outline */}
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${user.role === 'Admin'
                                            ? 'border-purple-200 text-purple-700 bg-purple-50/30'
                                            : 'border-slate-200 text-slate-600 bg-slate-50/50'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Status Dot + Text */}
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                            <span className={`text-sm ${user.status === 'Active' ? 'text-slate-700' : 'text-slate-500'}`}>
                                                {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.lastActive}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {user.dateAdded}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {/* 3 Dots Menu - Silent & Premium */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 outline-none transition-colors data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600">
                                                    <MoreVertical className="w-4 h-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[180px] p-1 border-slate-100 shadow-lg/5">
                                                    {/* Ações Primárias (Topo) */}
                                                    <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                        Ver perfil
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                                                        Editar permissões
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                    {/* Informações Contextuais (Não Ação) */}
                                                    <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider font-medium flex flex-col gap-1 select-none pointer-events-none bg-slate-50/50 rounded-sm mx-1 mb-1">
                                                        <span className="flex items-center gap-1.5">
                                                            Origem de cadastro
                                                        </span>
                                                        <span className="text-slate-600 font-semibold">{user.source}</span>
                                                    </div>

                                                    {/* Ações de Estado */}
                                                    <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                        <Power className="w-3.5 h-3.5 text-slate-400" />
                                                        {user.status === 'Active' ? 'Desativar acesso' : 'Ativar acesso'}
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                                        Redefinir senha
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                    {/* Ação Destrutiva (Isolada) */}
                                                    <DropdownMenuItem
                                                        onSelect={() => setUserToDelete(user.id)}
                                                        className="gap-2.5 cursor-pointer text-rose-600 text-xs py-2 px-3 focus:bg-rose-50 focus:text-rose-700 rounded-sm"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                                        Remover usuário
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Minimalist */}
                <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Página <span className="font-medium text-slate-900">1</span> de <span className="font-medium text-slate-900">10</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            Anterior
                        </button>
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O usuário perderá acesso imediato à plataforma e todos os seus dados serão permanentemente excluídos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-rose-600 hover:bg-rose-700 text-white border-transparent">
                            Sim, remover usuário
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default UserManagement;
