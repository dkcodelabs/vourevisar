import React from 'react';
import { X, Brain, Calendar, Target, Sparkles, BookOpen, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpacedRepetitionInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    hasExamDate: boolean;
}

export const SpacedRepetitionInfoModal: React.FC<SpacedRepetitionInfoModalProps> = ({
    isOpen,
    onClose,
    hasExamDate
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Como funciona o agendamento?</h2>
                                    <p className="text-white/80 text-sm">Base científica da Repetição Espaçada</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] space-y-6">
                        {/* Seção 1: Curva do Esquecimento */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Curva do Esquecimento</h3>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                Estudos de <strong>Hermann Ebbinghaus (1885)</strong> comprovam que esquecemos ~70% do conteúdo em 24h
                                se não revisarmos. A repetição espaçada combate isso revisando no momento ideal — quando a memória
                                está prestes a enfraquecer, mas ainda é recuperável.
                            </p>
                        </div>

                        {/* Seção 2: Intervalos */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Intervalos Científicos</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-3 mt-4">
                                {[
                                    { label: '24h', desc: 'Consolida memória' },
                                    { label: '7d', desc: 'Fortalece conexões' },
                                    { label: '15d', desc: 'Médio prazo' },
                                    { label: '30d', desc: 'Longo prazo' }
                                ].map((item, i) => (
                                    <div key={i} className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                                        <span className="block text-lg font-bold text-indigo-600 dark:text-indigo-400">{item.label}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Seção 3: Modo com Data de Prova */}
                        {hasExamDate ? (
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                        <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                                        🎯 Modo Prova Ativado!
                                    </h3>
                                </div>
                                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="flex items-start gap-2">
                                        <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                        <p><strong>Ajuste por Dificuldade:</strong> Tópicos difíceis são revisados 1-2 dias antes; tópicos fáceis, 1-2 dias depois.</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                                        <p><strong>Semana Zero:</strong> Nenhuma revisão é agendada nos 7 dias antes da sua prova. Use esse tempo para revisão geral ou descanso.</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                        <p><strong>Compressão Automática:</strong> Se alguma revisão cairia depois da Semana Zero, ela é automaticamente antecipada.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-dashed border-slate-300 dark:border-slate-600">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                                        <Target className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    </div>
                                    <h3 className="font-semibold text-slate-600 dark:text-slate-400">
                                        Modo Padrão (sem data de prova)
                                    </h3>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Suas revisões seguem os intervalos padrão. Para ativar otimizações inteligentes,
                                    <strong> defina sua data de prova no Painel</strong>.
                                </p>
                            </div>
                        )}

                        {/* Referências */}
                        <div className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <strong>Referências:</strong> Ebbinghaus (1885), Cepeda et al. (2006), Wozniak - SuperMemo SM-2
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
