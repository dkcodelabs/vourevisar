import sys

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start_line = -1
    end_line = -1

    for i, line in enumerate(lines):
        if '{/* ── Modal: Gerenciar Ciclo (Carga e Conflito) ── */}' in line:
            start_line = i
        if i > start_line and 'export default Editais;' in line:
            # We want to find the last </AnimatePresence> before export
            for j in range(i-1, start_line, -1):
                if '</AnimatePresence>' in lines[j]:
                    end_line = j + 1
                    break
            break

    if start_line == -1 or end_line == -1:
        print(f"Could not find modal block. start={start_line}, end={end_line}")
        return

    new_modal_code = """            {/* ── Modal: Carregar Ciclo (Carga e Conflito) ── */}
            <AnimatePresence>
                {cycleConflict.isOpen && cycleConflict.edital && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null })}
                            className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-2xl bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[28px] shadow-2xl p-7 flex flex-col gap-6 max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cycleConflict.step === 'preview' ? 'bg-emerald-500/10' : 'bg-sky-500/10'}`}>
                                        {cycleConflict.step === 'preview' ? (
                                            <CheckCircle2 className="text-emerald-400" size={24} />
                                        ) : (
                                            <Database className="text-sky-400" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                                            {cycleConflict.existingIds.length === 0 
                                                ? 'Configurar Ciclo' 
                                                : (cycleConflict.step === 'select' ? 'Carregar Ciclo' : 'Confirmar Ação')}
                                        </h3>
                                        <p className="text-xs text-content-muted font-medium">
                                            {cycleConflict.existingIds.length === 0
                                                ? 'Prepare seu novo ciclo de estudos'
                                                : (cycleConflict.step === 'select' 
                                                    ? 'Escolha como carregar este edital' 
                                                    : `Revise como ficará seu ciclo ao ${cycleConflict.action === 'merge' ? 'mesclar' : 'substituir'}`)
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null })}
                                    className="p-2 hover:bg-secondary dark:hover:bg-white/5 rounded-xl transition-colors text-content-muted"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 overflow-y-auto pr-1 no-scrollbar flex-1">
                                {/* Seção: Passo 1 - Seleção de Ação */}
                                {cycleConflict.step === 'select' && (
                                    <div className="space-y-6">
                                        {/* Ciclo Atual */}
                                        {cycleConflict.existingIds.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">ATUALMENTE NO CICLO</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                                                        {cycleConflict.existingIds.length} matérias
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {cycleConflict.currentOrigins.map((origin, i) => {
                                                        const editalInfo = editais.find(e => e.name === origin);
                                                        const originSubjects = subjects.filter(s => 
                                                            cycleConflict.existingIds.includes(s.id) && 
                                                            (editalInfo ? editalInfo.subjectIds.includes(s.id) : true)
                                                        );

                                                        return (
                                                            <div key={i} className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-4">
                                                                <div className="flex items-center justify-between border-b border-sky-500/5 pb-2">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{origin}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] text-sky-500/70 font-bold uppercase tracking-wider">
                                                                                {editalInfo?.organ || 'ORIGEM'} {editalInfo?.year ? `• ${editalInfo.year}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-2 py-1 bg-sky-500/10 rounded-lg">
                                                                        <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">ATUAL</span>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {originSubjects.map(s => (
                                                                        <div key={s.id} className="group flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-sky-500/5 border border-sky-500/5">
                                                                                <div className="w-1 h-3 bg-sky-500/30 rounded-full" />
                                                                                <span className="text-[13px] font-bold text-foreground/80">{s.name}</span>
                                                                            </div>
                                                                            <div className="pl-4 space-y-0.5">
                                                                                {s.topics?.slice(0, 3).map(t => (
                                                                                    <div key={t.id} className="px-2 py-1 rounded-lg text-[11px] text-content-muted font-medium hover:bg-sky-500/5 hover:text-sky-500 transition-colors">
                                                                                        {t.name}
                                                                                    </div>
                                                                                ))}
                                                                                {s.topics && s.topics.length > 3 && (
                                                                                    <span className="pl-2 text-[9px] font-bold text-sky-500/40 uppercase tracking-widest italic">
                                                                                        + {s.topics.length - 3} tópicos...
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Novo Edital */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">NOVO EDITAL SELECIONADO</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                    {cycleConflict.edital.subjectIds.length} matérias
                                                </span>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                                                <div className="flex items-center justify-between border-b border-emerald-500/5 pb-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{cycleConflict.edital.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">
                                                                {cycleConflict.edital.organ || 'CONCURSO'} {cycleConflict.edital.year ? `• ${cycleConflict.edital.year}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="px-2 py-1 bg-emerald-500/10 rounded-lg">
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">NOVO</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {cycleConflict.edital.subjectIds.map(sid => {
                                                        const s = subjects.find(subj => subj.id === sid);
                                                        return s ? (
                                                            <div key={sid} className="group flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/5">
                                                                    <div className="w-1 h-3 bg-emerald-500/30 rounded-full" />
                                                                    <span className="text-[13px] font-bold text-foreground/80">{s.name}</span>
                                                                </div>
                                                                <div className="pl-4 space-y-0.5">
                                                                    {s.topics?.slice(0, 3).map(t => (
                                                                        <div key={t.id} className="px-2 py-1 rounded-lg text-[11px] text-content-muted font-medium hover:bg-emerald-500/5 hover:text-emerald-500 transition-colors">
                                                                            {t.name}
                                                                        </div>
                                                                    ))}
                                                                    {s.topics && s.topics.length > 3 && (
                                                                        <span className="pl-2 text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest italic">
                                                                            + {s.topics.length - 3} tópicos...
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Preview Step */}
                                {cycleConflict.step === 'preview' && (
                                    <div className="space-y-4 py-2">
                                        <div className="flex flex-col gap-1 px-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">
                                                    {cycleConflict.existingIds.length === 0 
                                                        ? 'CONFIGURAÇÃO DO NOVO CICLO' 
                                                        : (cycleConflict.action === 'merge' ? 'PREVIEW APÓS A MESCLA' : 'PREVIEW DO NOVO CICLO')}
                                                </span>
                                                <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                                                    {finalPreviewIds.length} matérias no total
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-content-muted italic">
                                                {cycleConflict.existingIds.length === 0
                                                    ? 'Carregando matérias do edital selecionado.'
                                                    : (cycleConflict.action === 'merge' 
                                                        ? 'Unindo as matérias atuais com as do novo edital.'
                                                        : 'Limpando o ciclo atual e carregando as matérias do novo edital.')}
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-secondary border border-border space-y-2">
                                            {subjects.filter(s => finalPreviewIds.includes(s.id)).map(s => {
                                                const isNew = cycleConflict.edital?.subjectIds.includes(s.id);
                                                const isCurrent = cycleConflict.existingIds.includes(s.id);
                                                
                                                let style = 'bg-secondary dark:bg-zinc-800/50 border-border dark:border-white/5 text-content-muted';
                                                
                                                if (cycleConflict.action === 'replace') {
                                                    if (isNew && !isCurrent) {
                                                        style = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                                    } else if (!isNew && isCurrent) {
                                                        style = 'bg-rose-500/10 border-rose-500/20 text-rose-400/80 line-through opacity-50';
                                                    } else if (isNew && isCurrent) {
                                                        style = 'bg-sky-500/5 border-sky-500/20 text-foreground/70';
                                                    }
                                                } else {
                                                    if (isNew && !isCurrent) {
                                                        style = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                                    } else if (isCurrent) {
                                                        style = 'bg-sky-500/5 border-sky-500/20 text-foreground/70';
                                                    }
                                                }

                                                return (
                                                    <div key={s.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all ${style}`}>
                                                        <span className="text-[12px] font-bold truncate">{s.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            {isNew && !isCurrent && <span className="text-[8px] font-black uppercase text-emerald-500 px-1.5 py-0.5 rounded bg-emerald-500/10">Novo</span>}
                                                            {!isNew && isCurrent && cycleConflict.action === 'replace' && <span className="text-[8px] font-black uppercase text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10">Removido</span>}
                                                            {isCurrent && !isNew && cycleConflict.action === 'merge' && <span className="text-[8px] font-black uppercase text-sky-500 px-1.5 py-0.5 rounded bg-sky-500/10">Mantido</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-4 mt-auto">
                                {cycleConflict.step === 'select' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'merge' }))}
                                            className="w-full flex items-center justify-between px-6 py-5 rounded-[22px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Merge size={20} />
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-black uppercase tracking-wider">Mesclar</span>
                                                    <span className="text-[10px] font-bold opacity-60">Manter ciclo atual + novo</span>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </button>

                                        <button
                                            onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'replace' }))}
                                            className="w-full flex items-center justify-between px-6 py-5 rounded-[22px] bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <RefreshCw size={20} />
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-black uppercase tracking-wider">Substituir</span>
                                                    <span className="text-[10px] font-bold opacity-60">Novo ciclo limpo</span>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleCycleConflictAction(cycleConflict.action!)}
                                            disabled={processingId === cycleConflict.edital.id}
                                            className="w-full flex items-center justify-center gap-3 py-5 rounded-[22px] bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                        >
                                            {processingId === cycleConflict.edital.id ? (
                                                <Loader2 size={20} className="animate-spin" />
                                            ) : (
                                                <CheckCircle2 size={20} />
                                            )}
                                            {cycleConflict.existingIds.length === 0 
                                                ? 'Iniciar Ciclo' 
                                                : (cycleConflict.action === 'merge' ? 'Confirmar Mesclagem' : 'Confirmar Substituição')}
                                        </button>
                                        
                                        {cycleConflict.existingIds.length > 0 && (
                                            <button
                                                onClick={() => setCycleConflict(prev => ({ ...prev, step: 'select', action: null }))}
                                                className="w-full py-2 text-[10px] font-black text-content-muted hover:text-foreground transition-colors uppercase tracking-[0.2em]"
                                            >
                                                Voltar e Alterar Escolha
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Progress Preservation Note */}
                                <div className="p-4 rounded-[22px] bg-secondary/50 border border-border/50 flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                                        <Info className="text-sky-400" size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-black text-foreground/90 uppercase tracking-tight">Dica de Especialista</p>
                                        <p className="text-[10px] text-content-muted leading-relaxed font-medium">
                                            Ao mesclar, as matérias em comum serão <span className="text-emerald-500 font-bold underline decoration-2 underline-offset-2">automaticamente unificadas</span>, preservando seu progresso e histórico de estudos individual.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>"""

    # Replace the block
    lines[start_line:end_line] = [new_modal_code + "\n"]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Success")

if __name__ == "__main__":
    fix_file(sys.argv[1])
