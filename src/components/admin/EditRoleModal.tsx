import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, AlertTriangle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';
import { AdminUser } from '@/hooks/useAdminUsers';

interface EditRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AdminUser | null;
    onRoleUpdated: () => void;
}

export function EditRoleModal({ isOpen, onClose, user, onRoleUpdated }: EditRoleModalProps) {
    const [selectedRole, setSelectedRole] = useState<string>('user');
    const [isLoading, setIsLoading] = useState(false);
    const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);

    useEffect(() => {
        if (user) {
            setSelectedRole(user.role || 'user');
            setShowOwnerConfirm(false);
        }
    }, [user, isOpen]);

    if (!user) return null;

    const hasChanges = selectedRole !== user.role;
    const isDowngradingOwner = user.role === 'owner' && selectedRole !== 'owner';
    const isProtectedUser = ['vourevisar@gmail.com', 'darciliok@gmail.com'].includes(user.email || '');

    const handleSave = async () => {
        if (isProtectedUser) {
            toast.error("Este usuário é protegido e seu papel não pode ser alterado.");
            return;
        }

        if (isDowngradingOwner && !showOwnerConfirm) {
            setShowOwnerConfirm(true);
            return;
        }

        setIsLoading(true);
        try {
            // 1. Audit Log Stub
            const auditPayload = {
                action: "user.role_updated",
                actor_id: (await supabase.auth.getUser()).data.user?.id,
                target_id: user.id,
                metadata: { from: user.role, to: selectedRole },
                created_at: new Date().toISOString()
            };
            console.log('[AUDIT LOG]', auditPayload);

            // 2. Perform Update via RPC
            // Using 'set_user_role' security definer function to handle RLS and ensure atomic update
            const { error: rpcError } = await supabase.rpc('set_user_role', {
                _target_user_id: user.id,
                _role: selectedRole as "admin" | "moderator" | "owner" | "user"
            });

            if (rpcError) throw rpcError;

            toast.success(`Permissão atualizada para ${selectedRole}`);
            onRoleUpdated();
            onClose();

        } catch (error: any) {
            console.error('Error updating role:', error);
            toast.error('Falha ao atualizar permissão: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
            setShowOwnerConfirm(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                {showOwnerConfirm ? (
                    // Sub-modal for Owner Confirmation
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-amber-600">
                                <AlertTriangle className="h-5 w-5" />
                                Confirmar alteração de proprietário
                            </DialogTitle>
                            <DialogDescription>
                                Este usuário possui acesso total ao sistema. Tem certeza que deseja alterar seu papel?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 text-sm text-slate-600">
                            {/* Empty or additional info could go here, but user text covers it */}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowOwnerConfirm(false)}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleSave} disabled={isLoading}>
                                {isLoading ? 'Salvando...' : 'Confirmar alteração'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    // Main Modal
                    <>
                        <DialogHeader>
                            <DialogTitle>Permissões do usuário</DialogTitle>
                            <DialogDescription>
                                Defina o papel deste usuário no sistema.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-6">
                            {/* User User Block */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar_url || undefined} />
                                    <AvatarFallback><User className="h-5 w-5 text-slate-400" /></AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-900">{user.name || 'Sem nome'}</span>
                                    <span className="text-xs text-slate-500">{user.email || 'Sem email'}</span>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Papel (Role)</label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione um papel" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[100]">
                                        <SelectItem value="owner">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-purple-600" />
                                                <span>Proprietário (Owner)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-blue-600" />
                                                <span>Administrador (Admin)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="user">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-600" />
                                                <span>Usuário (User)</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    O papel define o nível de acesso em todo o sistema. As permissões detalhadas são definidas em Segurança e Acesso.
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose} disabled={isLoading}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={!hasChanges || isLoading || isProtectedUser}>
                                {isLoading ? (
                                    <>
                                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar alterações'
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
