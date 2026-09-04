import { motion } from 'framer-motion';
import { FileText, Library, Plus, Sparkles } from 'lucide-react';

type EditaisEmptyStateProps = {
    hasEditais: boolean;
    filterCycle: boolean;
    pendingSuggestionsCount: number;
    onOpenImport: (tab: 'ready' | 'ia' | 'manual') => void;
    onClearFilters: () => void;
    onClearSuggestions: () => void;
};

export function EditaisEmptyState({
    hasEditais,
    filterCycle,
    pendingSuggestionsCount,
    onOpenImport,
    onClearFilters,
    onClearSuggestions,
}: EditaisEmptyStateProps) {
    if (!hasEditais) {
        return (
            <div className="max-w-6xl mx-auto w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold text-white tracking-tight">
                        Você ainda não possui nenhum Edital ativo
                    </h1>
                    <p className="text-content-muted text-base">
                        Escolha uma das opções abaixo para configurar sua preparação.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <motion.button whileHover={{ y: -4 }} onClick={() => onOpenImport('ready')} className="relative flex flex-col items-center text-center p-6 bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-cyan-500/50 rounded-2xl transition-all group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-4 right-4 bg-cyan-400 text-black text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider">RECOMENDADO</div>
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform"><Library size={32} /></div>
                        <h3 className="text-lg font-bold text-white mb-3">Catálogo Oficial</h3>
                        <p className="text-sm text-content-muted font-medium leading-relaxed">Acesse editais já mapeados e organizados pela nossa equipe.</p>
                    </motion.button>

                    <motion.button whileHover={{ y: -4 }} onClick={() => onOpenImport('ia')} className="relative flex flex-col items-center text-center p-6 bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-emerald-500/50 rounded-2xl transition-all group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform"><Sparkles size={32} /></div>
                        <h3 className="text-lg font-bold text-white mb-3">Importar Edital com IA</h3>
                        <p className="text-sm text-content-muted font-medium leading-relaxed">Suba o PDF do seu edital e deixe nossa IA organizar os tópicos para você automaticamente.</p>
                    </motion.button>

                    <motion.button whileHover={{ y: -4 }} onClick={() => onOpenImport('manual')} className="relative flex flex-col items-center text-center p-6 bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-amber-500/50 rounded-2xl transition-all group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                        <h3 className="text-lg font-bold text-white mb-3">Criar Manualmente</h3>
                        <p className="text-sm text-content-muted font-medium leading-relaxed">Para editais específicos ou personalizados. Tenha controle total sobre cada matéria e assunto.</p>
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-6 pt-12 text-center">
            <div className="w-20 h-20 bg-secondary rounded-[32px] flex items-center justify-center mx-auto mb-6"><FileText className="text-content-muted/30" size={32} /></div>
            <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">{filterCycle ? 'Nenhum edital no ciclo atual' : 'Sua biblioteca está vazia'}</h2>
                <p className="text-sm text-content-muted font-medium max-w-[280px] mx-auto leading-relaxed">{filterCycle ? 'Você está visualizando apenas editais carregados no seu ciclo. Desative o filtro de ciclo para ver todos.' : 'Adicione um edital pelo catálogo, pela IA ou manualmente para começar.'}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button onClick={onClearFilters} className="app-button-primary px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors">Limpar Todos os Filtros</button>
                {pendingSuggestionsCount > 0 && (
                    <button onClick={onClearSuggestions} className="app-button-warning px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors">Limpar Sugestões Antigas</button>
                )}
                {filterCycle && <button onClick={onClearFilters} className="app-button-secondary px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors">Ver Biblioteca Completa</button>}
            </div>
        </div>
    );
}
