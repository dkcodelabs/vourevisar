import React, { useState } from 'react';
import {
    Search, Filter, Plus, MoreVertical,
    Eye, Edit, Power, RefreshCw, Trash2, Mail, Calendar, Shield, Zap
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
import { toast } from '@/lib/toast';

const UserManagement = () => {
    const { users: dbUsers, loading, error } = useAdminUsers();

    // Local state for optimistic updates (like toggling status)
    const [users, setUsers] = useState<AdminUser[]>([]);

    // Sync db users to local state when loaded
    React.useEffect(() => {
        if (dbUsers.length > 0) {
            setUsers(dbUsers);
        }
    }, [dbUsers]);

    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter users
    const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDeleteUser = () => {
        // In a real app, you'd call an API here
        setUsers(users.filter(u => u.id !== userToDelete));
        toast.success(`Usuário removido com sucesso`);
        setUserToDelete(null);
    };

    const handleToggleStatus = (user: AdminUser) => {
        const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
        // Optimistic update
        setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));

        toast.success(`Usuário ${newStatus === 'Active' ? 'ativado' : 'desativado'} com sucesso`);
    };

    const handleResetPassword = (user: AdminUser) => {
        toast.success(`Email de redefinição de senha enviado para ${user.email}`);
    };

    const handleEditPermissions = (user: AdminUser) => {
        toast.info(`Editar permissões de ${user.name}`);
        // Open a modal or navigate to edit page
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">

            {/* 1. Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de usuários</h1>
                <p className="text-slate-500 mt-1.5 text-sm">Gerencie os membros da sua equipe e suas permissões de conta aqui.</p>
            </div>

            {/* 2. Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-900">Todos os usuários</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200">
                        {filteredUsers.length}
                    </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative group w-full sm:w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 text-sm shadow-sm"
                        />
                    </div>

                    <button className="hidden sm:inline-flex items-center justify-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all gap-2 shadow-sm">
                        <Filter className="w-4 h-4 text-slate-500" />
                        Filtros
                    </button>

                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionar usuário
                    </button>
                </div>
            </div>

            {/* 3. Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                        <span className="text-sm">Carregando usuários...</span>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-rose-500 text-sm bg-rose-50">
                        <span className="font-semibold block mb-1">Erro ao carregar usuários</span>
                        {error}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-3 w-[40px]">
                                        <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" />
                                    </th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Usuário</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Acesso</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Último acesso</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Data de adição</th>
                                    <th className="px-6 py-3 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`group hover:bg-slate-50/60 transition-colors duration-150 ${user.status === 'Inactive' ? 'opacity-60 grayscale bg-slate-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-medium text-xs overflow-hidden shrink-0">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.name ? user.name.charAt(0).toUpperCase() : 'U'
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-900">
                                                            {user.name}
                                                        </span>
                                                        {/* Role Badge next to name */}
                                                        {user.role === 'admin' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                                Admin
                                                            </span>
                                                        )}
                                                        {/* Visual Badge for Inactive */}
                                                        {user.status === 'Inactive' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                                Desativado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        {user.email || 'Sem email'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {/* Provider Badge */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${user.source === 'Google'
                                                        ? 'border-blue-200 text-blue-700 bg-blue-50'
                                                        : 'border-slate-200 text-slate-600 bg-slate-100'
                                                    }`}>
                                                    {user.source === 'Google' ? 'Social (Google)' : 'Email'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            4 mar, 2024
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 outline-none transition-colors data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[180px] p-1 border-slate-100 shadow-lg/5">
                                                        <DropdownMenuItem
                                                            onClick={() => setSelectedUser(user)}
                                                            className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                            Ver perfil
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={() => handleEditPermissions(user)}
                                                            className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                        >
                                                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                                                            Editar permissões
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                        <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider font-medium flex flex-col gap-1 select-none pointer-events-none bg-slate-50/50 rounded-sm mx-1 mb-1">
                                                            <span className="flex items-center gap-1.5">Origem</span>
                                                            <span className="text-slate-600 font-semibold">{user.source || 'Desconhecido'}</span>
                                                        </div>

                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(user)}
                                                            className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                        >
                                                            <Power className="w-3.5 h-3.5 text-slate-400" />
                                                            {user.status === 'Active' ? 'Desativar acesso' : 'Ativar acesso'}
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={() => handleResetPassword(user)}
                                                            className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                                            Redefinir senha
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator className="bg-slate-50 my-1" />

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

                                {!loading && filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                                            Nenhum usuário encontrado para "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination - Minimalist */}
                <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Página <span className="font-medium text-slate-900">1</span> de <span className="font-medium text-slate-900">1</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Anterior
                        </button>
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O usuário perderá o acesso imediato e seus dados serão excluídos permanentemente.
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

            {/* View Profile Sheet */}
            <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Perfil do Usuário</SheetTitle>
                        <SheetDescription>
                            Informações detalhadas sobre este usuário.
                        </SheetDescription>
                    </SheetHeader>

                    {selectedUser && (
                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-xl font-medium shadow-sm overflow-hidden">
                                    {selectedUser.avatar_url ? (
                                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{selectedUser.name}</h3>
                                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${selectedUser.role === 'admin'
                                                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                                : 'border-slate-200 text-slate-600 bg-slate-100'
                                            }`}>
                                            {selectedUser.role === 'admin' ? 'Admin' : 'Usuário'}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${selectedUser.source === 'Google'
                                                ? 'border-blue-200 text-blue-700 bg-blue-50'
                                                : 'border-slate-200 text-slate-600 bg-slate-100'
                                            }`}>
                                            {selectedUser.source === 'Google' ? 'Social (Google)' : 'Email'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Detalhes da Conta</h4>
                                <div className="grid gap-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
                                        <span className="text-sm font-medium text-slate-900">{selectedUser.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Data de adição</span>
                                        <span className="text-sm font-medium text-slate-900">{formatDate(selectedUser.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Nível de Permissão</span>
                                        <span className="text-sm font-medium text-slate-900 capitalize">{selectedUser.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Zap className="w-4 h-4" /> Status da Assinatura</span>
                                        <span className={`text-sm font-medium ${selectedUser.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {selectedUser.status === 'Active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Section Placeholder */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Atividade Recente</h4>
                                <div className="text-sm text-slate-500 italic">Nenhuma atividade recente registrada.</div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default UserManagement;
