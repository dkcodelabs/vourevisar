/**
 * MODULE: SecurityAudit
 * 
 * RESPONSIBILITY:
 * - Visualization of active user sessions.
 * - System-wide audit logs visibility.
 * - Overview of Role hierarchy (Read-only visualization).
 * 
 * SCOPE STATUS: OPEN 🚧
 * - Currently relies on MOCK DATA. Needs integration with real backend logs.
 * 
 * EXCLUSIONS (DO NOT ADD):
 * - User editing capabilities (Use UserManagement).
 * - Implementation of RBAC logic (Use RolesManagement).
 */
import React, { useState } from 'react';
import {
    Shield, Key, Eye, Lock, Globe, Smartphone,
    History, UserCog, CheckCircle, AlertTriangle,
    XCircle, Filter, Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { errorService } from '@/lib/errors/errorService';

// --- MOCK DATA ---
const MOCK_SESSIONS = [
    { id: '1', device: 'Chrome no MacOS', location: 'São Paulo, BR', ip: '201.10.12.44', lastActive: 'Agora', current: true, type: 'desktop' },
    { id: '2', device: 'Safari no iPhone 14', location: 'Rio de Janeiro, BR', ip: '189.32.11.09', lastActive: 'Há 2 horas', current: false, type: 'mobile' },
    { id: '3', device: 'Firefox no Windows', location: 'Curitiba, BR', ip: '177.12.33.21', lastActive: 'Há 1 dia', current: false, type: 'desktop' }
];

const MOCK_ROLES = [
    {
        id: 'owner',
        name: 'Proprietário (Owner)',
        color: 'purple',
        description: 'Acesso total e irrestrito a todo o sistema, incluindo configurações críticas, banco de dados, backups e gestão financeira.',
        permissions: ['Gerenciar Roles', 'Acesso ao Banco de Dados', 'Ver Financeiro Completo', 'Configurações de Sistema']
    },
    {
        id: 'admin',
        name: 'Administrador',
        color: 'indigo',
        description: 'Gestão operacional do sistema. Pode gerenciar usuários, conteúdo e ver relatórios, mas não acessa configurações críticas.',
        permissions: ['Gerenciar Usuários', 'Importar Conteúdo', 'Ver Relatórios', 'Editar Matérias']
    },
    {
        id: 'user',
        name: 'Usuário (Aluno)',
        color: 'slate',
        description: 'Acesso padrão para estudantes. Pode estudar, criar revisões e ver suas próprias estatísticas.',
        permissions: ['Acesso ao Estudo', 'Criar Revisões', 'Ver Meu Perfil']
    }
];

const MOCK_LOGS = [
    { id: 1, action: 'Login Success', actor: 'admin@vourevisar.com', target: 'System', date: 'Hoje, 10:42', status: 'success' },
    { id: 2, action: 'Role Update', actor: 'darcilio@gmail.com', target: 'user_123 (João)', date: 'Hoje, 09:15', status: 'success' },
    { id: 3, action: 'Login Failed', actor: 'unknown@ip.addr', target: 'System', date: 'Ontem, 23:30', status: 'failed' },
    { id: 4, action: 'Content Import', actor: 'admin@vourevisar.com', target: 'Questions PDF', date: 'Ontem, 16:20', status: 'success' },
    { id: 5, action: 'Subscription Updated', actor: 'System', target: 'user_456 (Maria)', date: 'Ontem, 14:00', status: 'success' },
];

const SecurityAudit = () => {
    const [sessions, setSessions] = useState(MOCK_SESSIONS);
    const [logFilter, setLogFilter] = useState('');

    const handleRevokeSession = async (id: string) => {
        try {
            toast.info("Revogando sessão...");
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            // throw new Error("Simulated Failure"); // Uncomment to test error

            setSessions(prev => prev.filter(s => s.id !== id));
            toast.success("Sessão revogada com sucesso.");
        } catch (err) {
            await errorService.report(err, {
                module: 'security',
                action: 'revoke_session',
                severity: 'high', // Security action failure is high
                metadata: { sessionId: id }
            });
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-slate-800" />
                    Segurança e Acesso
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm">Controle de sessões, hierarquia de papéis e auditoria do sistema.</p>
            </div>

            <Tabs defaultValue="sessions" className="space-y-6">
                <TabsList className="bg-slate-100/50 p-1 border border-slate-200 rounded-lg">
                    <TabsTrigger value="sessions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Key className="w-4 h-4 mr-2" /> Sessões Ativas
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <UserCog className="w-4 h-4 mr-2" /> Papéis e Permissões
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Eye className="w-4 h-4 mr-2" /> Audit Log
                    </TabsTrigger>
                </TabsList>

                {/* --- ABA SESSÕES --- */}
                <TabsContent value="sessions" className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-600" />
                                Dispositivos Conectados
                            </CardTitle>
                            <CardDescription>
                                Gerencie os dispositivos que têm acesso à sua conta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {sessions.map(session => (
                                <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 transition-all hover:bg-slate-50/80">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.current ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                            {session.type === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                {session.device}
                                                {session.current && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] h-5">Atual</Badge>}
                                            </div>
                                            <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                                <span>{session.location}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>IP: {session.ip}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>{session.lastActive}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!session.current && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRevokeSession(session.id)}
                                        >
                                            Revogar
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    Nenhuma sessão ativa encontrada.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ABA ROLES --- */}
                <TabsContent value="roles" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {MOCK_ROLES.map(role => (
                            <Card key={role.id} className={`border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${role.id === 'owner' ? 'border-purple-200 bg-purple-50/10' : ''}`}>
                                <div className={`absolute top-0 left-0 w-1 h-full ${role.color === 'purple' ? 'bg-purple-500' :
                                    role.color === 'indigo' ? 'bg-indigo-500' : 'bg-slate-400'
                                    }`}></div>
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className={`
                                            ${role.color === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                role.color === 'indigo' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700'}
                                        `}>
                                            {role.id.toUpperCase()}
                                        </Badge>
                                        {role.id === 'owner' && <Lock className="w-4 h-4 text-purple-400" />}
                                    </div>
                                    <CardTitle className="text-base font-bold text-slate-800">{role.name}</CardTitle>
                                    <CardDescription className="line-clamp-3 min-h-[60px]">
                                        {role.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissões Principais</span>
                                        <ul className="space-y-1.5">
                                            {role.permissions.map((perm, i) => (
                                                <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    {perm}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
                        <UserCog className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <strong>Informação sobre Papéis</strong>
                            <p className="mt-1 opacity-90">
                                A estrutura de papéis define o nível de acesso em todo o sistema. Permissões granulares podem ser configuradas via banco de dados.
                                Esta visualização é um resumo da hierarquia atual.
                            </p>
                        </div>
                    </div>
                </TabsContent>

                {/* --- ABA AUDITORIA --- */}
                <TabsContent value="audit" className="space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <History className="w-5 h-5 text-slate-600" />
                                        Log de Eventos
                                    </CardTitle>
                                    <CardDescription>
                                        Rastreamento de atividades críticas e segurança.
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Filtrar eventos..."
                                            className="pl-9 w-[200px] h-9 text-sm"
                                            value={logFilter}
                                            onChange={(e) => setLogFilter(e.target.value)}
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" className="h-9 gap-2">
                                        <Filter className="w-3.5 h-3.5" /> Filtros
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-9 gap-2">
                                        <Download className="w-3.5 h-3.5" /> Exportar
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Evento</th>
                                            <th className="px-4 py-3">Ator</th>
                                            <th className="px-4 py-3">Alvo</th>
                                            <th className="px-4 py-3">Data/Hora</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {MOCK_LOGS.filter(log =>
                                            log.action.toLowerCase().includes(logFilter.toLowerCase()) ||
                                            log.actor.toLowerCase().includes(logFilter.toLowerCase())
                                        ).map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-700">{log.action}</td>
                                                <td className="px-4 py-3 text-slate-600">{log.actor}</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{log.target}</td>
                                                <td className="px-4 py-3 text-slate-500">{log.date}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.status === 'success'
                                                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                                        : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                        }`}>
                                                        {log.status === 'success' ? 'Sucesso' : 'Falha'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Missing Search icon import fix
import { Search } from 'lucide-react';

export default SecurityAudit;
