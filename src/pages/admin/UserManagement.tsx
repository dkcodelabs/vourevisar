import React, { useState } from 'react';
import {
    Search, Filter, Plus, MoreVertical,
    Users, UserPlus, Zap, Eye, Edit, Power, RefreshCw, Trash2
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
import { useAdminUsers } from '@/hooks/useAdminUsers';

const UserManagement = () => {
    const { users: dbUsers, loading, error } = useAdminUsers();
    const [userToDelete, setUserToDelete] = useState<string | null>(null); // ID is string (UUID)
    const [searchTerm, setSearchTerm] = useState('');

    // Filter users
    const filteredUsers = dbUsers.filter(user =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleDeleteUser = () => {
        console.log(`Deleting user ${userToDelete}`);
        // Implement real delete logic here
        setUserToDelete(null);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">

            {/* 1. Header (Title & Subtitle Only) */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">User management</h1>
                <p className="text-slate-500 mt-1.5 text-sm">Manage your team members and their account permissions here.</p>
            </div>

            {/* 2. Controls Toolbar (Matches Reference) */}
            {/* Left: All users count | Right: Search, Filters, Add */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">

                {/* Left: All users count */}
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-900">All users</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium border border-slate-200">
                        {filteredUsers.length}
                    </span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative group w-full sm:w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 text-sm shadow-sm"
                        />
                    </div>

                    {/* Filters Button */}
                    <button className="hidden sm:inline-flex items-center justify-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all gap-2 shadow-sm">
                        <Filter className="w-4 h-4 text-slate-500" />
                        Filters
                    </button>

                    {/* Add User Button (Dark) */}
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm gap-2">
                        <Plus className="w-4 h-4" />
                        Add user
                    </button>
                </div>
            </div>

            {/* 3. Table (Minimalist) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                        <span className="text-sm">Loading users...</span>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-rose-500 text-sm bg-rose-50">
                        <span className="font-semibold block mb-1">Error loading users</span>
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
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">User name</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Access</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Last active</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Date added</th>
                                    <th className="px-6 py-3 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-slate-50/60 transition-colors duration-150">
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
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {user.name}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        {user.email || 'No email'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${user.role === 'admin'
                                                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                                        : 'border-slate-200 text-slate-600 bg-slate-100'
                                                    }`}>
                                                    {user.role === 'admin' ? 'Admin' : 'User'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {/* Mock data for last active as it's often not in public profile */}
                                            Mar 4, 2024
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
                                                        <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                            View profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                                                            Edit permissions
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                        <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider font-medium flex flex-col gap-1 select-none pointer-events-none bg-slate-50/50 rounded-sm mx-1 mb-1">
                                                            <span className="flex items-center gap-1.5">Origin</span>
                                                            <span className="text-slate-600 font-semibold">System</span>
                                                        </div>

                                                        <DropdownMenuItem className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm">
                                                            <Power className="w-3.5 h-3.5 text-slate-400" />
                                                            Deactivate
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                        <DropdownMenuItem
                                                            onSelect={() => setUserToDelete(user.id)}
                                                            className="gap-2.5 cursor-pointer text-rose-600 text-xs py-2 px-3 focus:bg-rose-50 focus:text-rose-700 rounded-sm"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                                            Delete user
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
                                            No users found matching "{searchTerm}"
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
                        Page <span className="font-medium text-slate-900">1</span> of <span className="font-medium text-slate-900">1</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Previous
                        </button>
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete user?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The user will lose immediate access and their data will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-rose-600 hover:bg-rose-700 text-white border-transparent">
                            Yes, delete user
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default UserManagement;
