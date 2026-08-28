import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, CheckCircle2, Send, Loader2 } from 'lucide-react';

interface EditalSuggestionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    suggestConcurso: string;
    onSuggestConcursoChange: (value: string) => void;
    onSendSuggestion: () => Promise<void>;
    isSending: boolean;
    isSent: boolean;
}

export const EditalSuggestionDrawer: React.FC<EditalSuggestionDrawerProps> = ({
    isOpen,
    onClose,
    suggestConcurso,
    onSuggestConcursoChange,
    onSendSuggestion,
    isSending,
    isSent,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 rounded-3xl"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute inset-y-0 right-0 w-full max-w-sm bg-card dark:bg-zinc-900 border-l border-border dark:border-white/10 rounded-r-[32px] flex flex-col z-20 shadow-2xl"
                    >
                        <div className="px-6 pt-7 pb-5 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <MessageSquare size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Sugerir Edital</h3>
                                    <p className="text-[11px] text-content-muted mt-0.5">Vamos analisar e cadastrar em breve</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col justify-center px-6 pb-8">
                            {isSent ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                                        <CheckCircle2 className="text-emerald-400" size={32} />
                                    </div>
                                    <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Sugestão Enviada!</h4>
                                    <p className="text-sm text-content-muted mb-6 leading-relaxed">
                                        Recebemos sua sugestão para <span className="text-primary font-bold">{suggestConcurso}</span>. Iremos analisar e te notificaremos quando disponível.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-3 bg-secondary light:bg-slate-100 dark:bg-zinc-800 hover:bg-secondary-strong light:hover:bg-slate-200 dark:hover:bg-zinc-700 text-foreground light:text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all"
                                    >
                                        FECHAR
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em]">
                                            Nome do Concurso / Edital
                                        </label>
                                        <input
                                            type="text"
                                            value={suggestConcurso}
                                            onChange={e => onSuggestConcursoChange(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && suggestConcurso.trim() && onSendSuggestion()}
                                            placeholder="Ex: PCES, PMES, INSS, TRT..."
                                            autoFocus
                                            className="w-full h-12 bg-secondary dark:bg-zinc-950/80 border border-border dark:border-white/8 rounded-2xl px-5 text-sm font-medium text-content-main placeholder:text-content-muted/40 focus:outline-none focus:border-primary/40 transition-all"
                                        />
                                        <p className="text-[10px] text-content-muted pl-1">
                                            Informe o nome ou sigla do concurso que deseja ter disponível no catálogo.
                                        </p>
                                    </div>

                                    <button
                                        onClick={onSendSuggestion}
                                        disabled={!suggestConcurso.trim() || isSending}
                                        className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        {isSending ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={15} />
                                                ENVIAR SUGESTÃO
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
