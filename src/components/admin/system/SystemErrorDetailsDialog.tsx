import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ErrorLogRecord, ErrorStatus } from '@/lib/errors/types';
import type { ReactNode } from 'react';
import { CheckCircle2, Clock, Search, XCircle } from 'lucide-react';

type Playbook = { title: string; steps: string[]; color: string };

type Props = {
    error: ErrorLogRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    formatDate: (value: string) => string;
    severityColor: (value: ErrorLogRecord['severity']) => string;
    statusBadge: (value: ErrorStatus) => ReactNode;
    scopeClassName: (value: string) => string;
    getPlaybook: (value: ErrorLogRecord) => Playbook;
    onClassificationFeedback: (correct: boolean) => void;
    onStatusChange: (status: ErrorStatus) => void;
};

export function SystemErrorDetailsDialog({
    error,
    open,
    onOpenChange,
    formatDate,
    severityColor,
    statusBadge,
    scopeClassName,
    getPlaybook,
    onClassificationFeedback,
    onStatusChange,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        Detalhes do Erro
                        <Badge variant={error?.status === 'resolved' ? 'default' : 'destructive'} className="ml-2">
                            {error?.status === 'new' ? 'NOVO' : error?.status === 'investigating' ? 'INVESTIGANDO' : error?.status === 'resolved' ? 'RESOLVIDO' : 'IGNORADO'}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        <Clock size={12} />
                        Ocorrido em {error ? formatDate(error.created_at) : '-'}
                        {error?.environment && <Badge variant="outline" className="ml-2 text-[10px]">{error.environment.toUpperCase()}</Badge>}
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-xs grid grid-cols-2 gap-4">
                            <Detail label="ID do Erro" value={error.error_id} copyable />
                            <Detail label="Request / Session" value={error.session_id || '-'} />
                            <Detail label="Ator (User ID)" value={error.actor_user_id || '-'} copyable />
                            <Detail label="Email" value={error.actor_email || '-'} />
                            <div className="col-span-2 border-t border-slate-700 pt-2 mt-2"><Detail label="Rota / Origem" value={error.route_path || 'N/A'} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Info label="Módulo" value={error.module} />
                            <div><label className="text-xs font-semibold text-slate-500 uppercase">Escopo</label><div><Badge variant="outline" className={scopeClassName(error.scope || 'admin')}>{error.scope || 'admin'}</Badge></div></div>
                            <Info label="Ação" value={error.action} />
                            <div><label className="text-xs font-semibold text-slate-500 uppercase">Severidade</label><div><Badge className={`${severityColor(error.severity)} text-white`}>{error.severity}</Badge></div></div>
                            <div><label className="text-xs font-semibold text-slate-500 uppercase">Status Atual</label><div className="flex gap-2">{statusBadge(error.status)}</div></div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Classificação Automática Correta?</span>
                            <div className="flex gap-2">
                                <Button variant={error.classification_feedback === true ? 'default' : 'outline'} size="sm" className={`h-7 px-2 ${error.classification_feedback === true ? 'bg-green-600 text-white' : 'text-green-600 border-green-200 hover:bg-green-50'}`} onClick={() => onClassificationFeedback(true)}><CheckCircle2 size={12} className="mr-1" /> Sim</Button>
                                <Button variant={error.classification_feedback === false ? 'default' : 'outline'} size="sm" className={`h-7 px-2 ${error.classification_feedback === false ? 'bg-red-600 text-white' : 'text-red-600 border-red-200 hover:bg-red-50'}`} onClick={() => onClassificationFeedback(false)}><XCircle size={12} className="mr-1" /> Não</Button>
                            </div>
                        </div>
                        {(() => { const playbook = getPlaybook(error); return <div className={`p-4 rounded-md border ${playbook.color}`}><div className="flex items-center gap-2 mb-2"><CheckCircle2 size={16} /><h4 className="font-semibold text-sm uppercase tracking-wide">Guia de Resolução: {playbook.title}</h4></div><ul className="list-disc list-inside text-sm space-y-1 ml-1">{playbook.steps.map((step, index) => <li key={index}>{step}</li>)}</ul></div>; })()}
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800"><label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Mensagem Técnica</label><code className="text-xs text-red-600 dark:text-red-400 break-words whitespace-pre-wrap font-mono">{error.technical_message}</code></div>
                        {error.metadata && Object.keys(error.metadata).length > 0 && <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Metadata</label><pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs overflow-auto max-h-[200px]">{JSON.stringify(error.metadata, null, 2)}</pre></div>}
                        <div className="pt-4 border-t flex justify-end gap-2">
                            {error.status !== 'resolved' && <Button onClick={() => onStatusChange('resolved')} className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 size={16} className="mr-2" />Marcar como Resolvido</Button>}
                            {error.status !== 'investigating' && error.status !== 'resolved' && <Button variant="secondary" onClick={() => onStatusChange('investigating')}><Search size={16} className="mr-2" />Investigar</Button>}
                            {error.status !== 'ignored' && <Button variant="ghost" onClick={() => onStatusChange('ignored')}>Ignorar</Button>}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Detail({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
    return <div><p className="text-slate-400 uppercase text-[10px] mb-1">{label}</p><p className={copyable ? 'select-all' : ''}>{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
    return <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">{label}</label><p className="text-sm font-medium">{value}</p></div>;
}
