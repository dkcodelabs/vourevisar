import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getAIErrorLogs } from '@/hooks/useAIStatus';

export function AIErrorLogsSection() {
  const [errorLogs, setErrorLogs] = useState<Array<{ id: string; error_code: string; error_message: string; context: string | null; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getAIErrorLogs(20).then(setErrorLogs).catch(error => console.error('Erro ao carregar logs:', error)).finally(() => setIsLoading(false));
  }, []);

  const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return <div className="glow-card bg-card dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-3xl overflow-hidden shadow-sm relative mt-6">
    <div className="px-6 py-4 border-b border-border dark:border-white/5 flex items-center justify-between bg-muted/50 dark:bg-zinc-800/20"><h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-foreground/80"><AlertTriangle className="text-red-500 w-4 h-4" />Histórico de Erros</h2></div>
    <div className="p-6">
      {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : errorLogs.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-center"><CheckCircle2 className="w-12 h-12 text-green-500 mb-3" /><p className="text-sm font-bold text-foreground">Nenhum erro registrado</p><p className="text-xs text-muted-foreground">Os erros da API aparecerão aqui</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border dark:border-white/5"><th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data/Hora</th><th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th><th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Mensagem</th></tr></thead><tbody>{errorLogs.map(log => <tr key={log.id} className="border-b border-border dark:border-white/5 hover:bg-muted/30"><td className="py-3 px-2 font-mono text-xs">{formatDate(log.created_at)}</td><td className="py-3 px-2"><span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-bold">{log.error_code}</span></td><td className="py-3 px-2 text-muted-foreground text-xs max-w-xs truncate">{log.error_message}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
