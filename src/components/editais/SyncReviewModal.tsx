import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';

interface SyncReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (selectedAddedSubjects: Subject[], selectedAddedTopics: Record<string, string[]>, removedSubjectIds: string[], removedTopicIds: string[]) => Promise<void>;
    localSubjects: Subject[];
    sourceSubjects: Subject[];
    editalName: string;
    hasMetadataUpdate?: boolean;
}

export const SyncReviewModal: React.FC<SyncReviewModalProps> = ({
    isOpen,
    onClose,
    onApply,
    localSubjects,
    sourceSubjects,
    editalName,
    hasMetadataUpdate = false
}) => {
    const [isApplying, setIsApplying] = useState(false);

    // ── Lógica de Diferenciação: fonte vs local ──
    const diff = React.useMemo(() => {
        const additions: { subjects: Subject[], topics: Record<string, string[]> } = { subjects: [], topics: {} };
        const removals: { subjects: Subject[], topics: Record<string, Topic[]> } = { subjects: [], topics: {} };

        if (!sourceSubjects || !Array.isArray(sourceSubjects)) return { additions, removals };

        // 1. Inclusões: o que a fonte tem que o aluno não tem
        sourceSubjects.forEach(ss => {
            const ssName = (ss.name || '').trim().toUpperCase();
            if (!ssName) return;

            const inLocal = localSubjects.some(ls =>
                (ls.name || '').trim().toUpperCase() === ssName
            );

            if (!inLocal) {
                additions.subjects.push(ss);
            } else {
                // Matéria existe localmente, verificar tópicos novos na fonte
                const localSubj = localSubjects.find(ls =>
                    (ls.name || '').trim().toUpperCase() === ssName
                );
                if (!localSubj) return;

                // Contar frequência de cada tópico no local
                const localTopicCounts = new Map<string, number>();
                (localSubj.topics || []).forEach(t => {
                    const tName = (t.name || '').trim().toUpperCase();
                    if (tName) localTopicCounts.set(tName, (localTopicCounts.get(tName) || 0) + 1);
                });

                // Contar frequência de cada tópico na fonte
                const sourceTopicCounts = new Map<string, number>();
                (ss.topics || []).forEach((st: Topic | string) => {
                    const stName = (typeof st === 'string' ? st : st.name || '').trim().toUpperCase();
                    if (stName) sourceTopicCounts.set(stName, (sourceTopicCounts.get(stName) || 0) + 1);
                });

                // Calcular diferença: tópicos que existem a mais na fonte vs local
                const newTopics: string[] = [];
                sourceTopicCounts.forEach((srcCount, srcName) => {
                    const localCount = localTopicCounts.get(srcName) || 0;
                    const diff = srcCount - localCount;
                    for (let i = 0; i < diff; i++) {
                        // Encontrar o nome original do tópico na fonte
                        const originalTopic = (ss.topics || []).find((t: Topic | string) => {
                            const tName = (typeof t === 'string' ? t : t.name || '').trim().toUpperCase();
                            return tName === srcName;
                        });
                        newTopics.push(typeof originalTopic === 'string' ? originalTopic : (originalTopic as any)?.name || srcName);
                    }
                });

                if (newTopics.length > 0) {
                    additions.topics[localSubj.id] = newTopics;
                }
            }
        });

        // 2. Remoções: o que o aluno tem que a fonte não tem
        localSubjects.forEach(ls => {
            const lsName = (ls.name || '').trim().toUpperCase();
            if (!lsName) return;

            const inSource = sourceSubjects.some(ss =>
                (ss.name || '').trim().toUpperCase() === lsName
            );

            if (!inSource) {
                removals.subjects.push(ls);
            } else {
                // Matéria existe na fonte, verificar tópicos removidos
                const sourceSubj = sourceSubjects.find(ss =>
                    (ss.name || '').trim().toUpperCase() === lsName
                );
                if (!sourceSubj) return;

                // Contar frequência de cada tópico na fonte
                const sourceTopicCounts = new Map<string, number>();
                (sourceSubj.topics || []).forEach((st: Topic | string) => {
                    const stName = (typeof st === 'string' ? st : st.name || '').trim().toUpperCase();
                    if (stName) sourceTopicCounts.set(stName, (sourceTopicCounts.get(stName) || 0) + 1);
                });

                // Contar frequência de cada tópico no local
                const localTopicCounts = new Map<string, number>();
                (ls.topics || []).forEach(lt => {
                    const ltName = (lt.name || '').trim().toUpperCase();
                    if (ltName) localTopicCounts.set(ltName, (localTopicCounts.get(ltName) || 0) + 1);
                });

                // Calcular diferença: tópicos que existem a mais no local vs fonte
                const removedTopics: Topic[] = [];
                localTopicCounts.forEach((localCount, localName) => {
                    const srcCount = sourceTopicCounts.get(localName) || 0;
                    const diff = localCount - srcCount;
                    for (let i = 0; i < diff; i++) {
                        const originalTopic = (ls.topics || []).find(t => {
                            const tName = (t.name || '').trim().toUpperCase();
                            return tName === localName;
                        });
                        if (originalTopic) removedTopics.push(originalTopic);
                    }
                });

                if (removedTopics.length > 0) {
                    removals.topics[ls.id] = removedTopics;
                }
            }
        });

        console.log('[Sync Diff]', {
            sourceNames: sourceSubjects.map(s => s.name),
            localNames: localSubjects.map(s => s.name),
            additions: additions.subjects.map(s => s.name),
            removals: removals.subjects.map(s => s.name),
        });

        return { additions, removals };
    }, [localSubjects, sourceSubjects]);

    // ── Estados de Seleção ──
    const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(new Set());
    const [selectedRemovals, setSelectedRemovals] = useState<Set<string>>(new Set());

    // Inicializar seleções (Inclusões marcadas por padrão, remoções desmarcadas)
    React.useEffect(() => {
        if (isOpen) {
            const initialAdd = new Set<string>();
            diff.additions.subjects.forEach(s => {
                const sId = s.id || s.name;
                initialAdd.add(`subj-${sId}`);
                if (s.topics) {
                    s.topics.forEach((_, i) => initialAdd.add(`subj-${sId}-t-${i}`));
                }
            });
            Object.entries(diff.additions.topics).forEach(([sId, topics]) => {
                topics.forEach((t, i) => initialAdd.add(`top-${sId}-${i}`));
            });
            setSelectedAdditions(initialAdd);

            // Remoções: pré-selecionar tudo (matérias + tópicos)
            const initialRem = new Set<string>();
            diff.removals.subjects.forEach(s => {
                initialRem.add(`rem-subj-${s.id}`);
                (s.topics || []).forEach(t => initialRem.add(`rem-top-${s.id}-${t.id}`));
            });
            Object.entries(diff.removals.topics).forEach(([sId, topics]) => {
                topics.forEach(t => initialRem.add(`rem-top-${sId}-${t.id}`));
            });
            setSelectedRemovals(initialRem);
        }
    }, [isOpen, diff]);

    const handleToggleAddition = (id: string) => {
        setSelectedAdditions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleRemoval = (id: string) => {
        setSelectedRemovals(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSubjectWithTopics = (subjectKey: string, topicKeys: string[], isRemoval: boolean) => {
        const handler = isRemoval ? setSelectedRemovals : setSelectedAdditions;
        handler(prev => {
            const next = new Set(prev);
            const isCurrentlySelected = next.has(subjectKey);
            if (isCurrentlySelected) {
                next.delete(subjectKey);
                topicKeys.forEach(k => next.delete(k));
            } else {
                next.add(subjectKey);
                topicKeys.forEach(k => next.add(k));
            }
            return next;
        });
    };

    const handleToggleAll = (selectAll: boolean) => {
        if (selectAll) {
            const allAdditions = new Set<string>();
            diff.additions.subjects.forEach(s => {
                const sId = s.id || s.name;
                allAdditions.add(`subj-${sId}`);
                (s.topics || []).forEach((_, i) => allAdditions.add(`subj-${sId}-t-${i}`));
            });
            Object.entries(diff.additions.topics).forEach(([sId, topics]) => {
                topics.forEach((_, i) => allAdditions.add(`top-${sId}-${i}`));
            });
            setSelectedAdditions(allAdditions);

            const allRemovals = new Set<string>();
            diff.removals.subjects.forEach(s => {
                allRemovals.add(`rem-subj-${s.id}`);
                (s.topics || []).forEach(t => allRemovals.add(`rem-top-${s.id}-${t.id}`));
            });
            Object.entries(diff.removals.topics).forEach(([sId, topics]) => {
                topics.forEach(t => allRemovals.add(`rem-top-${sId}-${t.id}`));
            });
            setSelectedRemovals(allRemovals);
        } else {
            setSelectedAdditions(new Set());
            setSelectedRemovals(new Set());
        }
    };

    const handleConfirm = async () => {
        setIsApplying(true);
        try {
            // Preparar dados selecionados para o onApply
            const finalAddedSubjects = diff.additions.subjects
                .filter(s => selectedAdditions.has(`subj-${s.id || s.name}`))
                .map(s => {
                    const sId = s.id || s.name;
                    // Filtrar tópicos que puderem ter sido desmarcados individualmente
                    if (s.topics && s.topics.length > 0) {
                        return {
                            ...s,
                            topics: s.topics.filter((_, i) => selectedAdditions.has(`subj-${sId}-t-${i}`))
                        };
                    }
                    return s;
                });

            const finalAddedTopics: Record<string, string[]> = {};
            Object.entries(diff.additions.topics).forEach(([sId, topics]) => {
                const filtered = topics.filter((_, i) => selectedAdditions.has(`top-${sId}-${i}`));
                if (filtered.length > 0) finalAddedTopics[sId] = filtered;
            });

            const finalRemovedSubjIds = diff.removals.subjects.filter(s => selectedRemovals.has(`rem-subj-${s.id}`)).map(s => s.id);
            const finalRemovedTopIds: string[] = [];
            Object.entries(diff.removals.topics).forEach(([sId, topics]) => {
                topics.forEach((t, i) => {
                    if (selectedRemovals.has(`rem-top-${sId}-${t.id}`)) {
                        finalRemovedTopIds.push(t.id);
                    }
                });
            });

            await onApply(finalAddedSubjects, finalAddedTopics, finalRemovedSubjIds, finalRemovedTopIds);
            onClose();
            toast.success('Edital sincronizado com sucesso!');
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'sync-apply', userMessage: 'Erro ao aplicar atualizações.' });
        } finally {
            setIsApplying(false);
        }
    };

    if (!isOpen) return null;

    const hasChanges = diff.additions.subjects.length > 0 || 
                      Object.keys(diff.additions.topics).length > 0 ||
                      diff.removals.subjects.length > 0 ||
                      Object.keys(diff.removals.topics).length > 0;

    return (
        <AnimatePresence>
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-md"
                />

                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl"
                >

                    {/* Header with Glass Effect */}
                    <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                <RefreshCw className="text-primary animate-[spin_4s_linear_infinite]" size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground tracking-tight">Revisar Atualizações</h2>
                                <p className="text-[11px] text-content-muted font-medium uppercase tracking-wider opacity-70">{editalName}</p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-border"
                        >
                            <X size={20} className="text-content-muted hover:text-foreground transition-colors" />
                        </button>

                    </div>

                    {/* Content Area with Custom Scrollbar */}
                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-8 min-h-[300px]">
                        {!hasChanges && !hasMetadataUpdate ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16"
                            >
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                                    <Check className="text-emerald-500" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">Tudo em dia!</h3>
                                <p className="text-sm text-content-muted max-w-[240px] mx-auto leading-relaxed">Seu edital já está totalmente sincronizado conforme a última atualização oficial.</p>

                            </motion.div>
                        ) : !hasChanges && hasMetadataUpdate ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16"
                            >
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                                    <RefreshCw className="text-primary" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">Dados do edital atualizados</h3>
                                <p className="text-sm text-content-muted max-w-[260px] mx-auto leading-relaxed">As informações gerais do catálogo serão aplicadas ao seu edital.</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-12 pb-4">
                                {/* Toggle Marcar/Desmarcar Tudo */}
                                {(() => {
                                    const selAdd = [...selectedAdditions].filter(k => !k.includes('__topic_header__')).length;
                                    const selRem = [...selectedRemovals].filter(k => !k.includes('__topic_header__')).length;
                                    const selectedCount = selAdd + selRem;

                                    let totalCount = 0;
                                    diff.additions.subjects.forEach(s => {
                                        totalCount++;
                                        totalCount += (s.topics || []).length;
                                    });
                                    totalCount += Object.values(diff.additions.topics).flat().length;
                                    totalCount += diff.removals.subjects.length;
                                    diff.removals.subjects.forEach(s => {
                                        totalCount += (s.topics || []).length;
                                    });
                                    totalCount += Object.values(diff.removals.topics).flat().length;

                                    const allSelected = selectedCount >= totalCount;

                                    return (
                                        <button
                                            onClick={() => handleToggleAll(!allSelected)}
                                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/60 border border-border transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${
                                                    allSelected
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'border-white/10 text-transparent'
                                                }`}>
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                                <span className="text-xs font-black text-foreground uppercase tracking-wider">
                                                    {allSelected ? 'Desmarcar Tudo' : 'Marcar Tudo'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-content-muted font-bold">
                                                {selectedCount}/{totalCount} selecionados
                                            </span>
                                        </button>
                                    );
                                })()}

                                {/* Section: Inclusões */}
                                {(diff.additions.subjects.length > 0 || Object.keys(diff.additions.topics).length > 0) && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                Novas Inclusões (Adicionar ao Ciclo)
                                            </h3>
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                                                {diff.additions.subjects.length + Object.values(diff.additions.topics).flat().length} itens
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            {/* Novas Matérias */}
                                            {diff.additions.subjects.map((s, i) => {
                                                const sName = s.name;
                                                const isSelected = selectedAdditions.has(`subj-${s.id || s.name}`);
                                                return (
                                                    <motion.div 
                                                        key={`add-s-group-${i}`}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="space-y-2"
                                                    >
                                                        {/* Matéria Toggle Card - Unified Identity */}
                                                        <button
                                                            onClick={() => {
                                                                const topicKeys = (s.topics || []).map((_, idx) => `subj-${s.id || s.name}-t-${idx}`);
                                                                handleToggleSubjectWithTopics(`subj-${s.id || s.name}`, topicKeys, false);
                                                            }}
                                                            className={`w-full group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                                                                isSelected
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_4px_12px_rgba(16,185,129,0.1)]'
                                                                : 'bg-secondary/30 border-border hover:border-primary/20'
                                                            }`}
                                                        >
                                                            {/* Sidebar Indicator Integrated */}
                                                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full transition-all duration-300 ${isSelected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-border'}`} />


                                                            <div className={`ml-2 w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${
                                                                isSelected
                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                : 'border-white/10 text-transparent'
                                                            }`}>
                                                                <Check size={12} strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-black text-foreground uppercase tracking-tight truncate">{sName}</span>
                                                                    <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 shrink-0">Novo</span>
                                                                </div>
                                                                <span className="text-[10px] text-content-muted font-medium">Adicionar matéria e todos os tópicos</span>
                                                            </div>

                                                        </button>

                                                        {/* Tópicos aninhados */}
                                                        {s.topics && s.topics.length > 0 && (
                                                            <div className="ml-5 border-l border-white/10 pl-5 grid gap-2 py-1">
                                                                {s.topics.map((t, idx) => {
                                                                    const tSelected = selectedAdditions.has(`subj-${s.id || s.name}-t-${idx}`);
                                                                    return (
                                                                        <button
                                                                            key={`add-s-${i}-t-${idx}`}
                                                                            onClick={() => handleToggleAddition(`subj-${s.id || s.name}-t-${idx}`)}
                                                                            className={`relative flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-200 text-left ${
                                                                                tSelected
                                                                                ? 'bg-emerald-500/5 border-emerald-500/10'
                                                                                : 'bg-secondary/10 border-transparent hover:border-border'
                                                                            }`}
                                                                        >

                                                                            <div className="absolute -left-5 top-1/2 w-3 h-px bg-white/10" />
                                                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all duration-300 ${
                                                                                tSelected
                                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                                : 'border-white/10 text-transparent'
                                                                            }`}>
                                                                                <Check size={9} strokeWidth={4} />
                                                                            </div>
                                                                            <span className="text-[11px] font-medium text-foreground truncate flex-1">
                                                                                {typeof t === 'string' ? t : t.name}
                                                                            </span>

                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Novos Tópicos em Matérias Existentes */}
                                            {Object.entries(diff.additions.topics).map(([sId, topics], sIter) => {
                                                const subj = localSubjects.find(ls => ls.id === sId);
                                                return (
                                                    <div key={`add-t-group-${sId}`} className="space-y-2">
                                                        <button
                                                            onClick={() => {
                                                                const topicKeys = topics.map((_, i) => `top-${sId}-${i}`);
                                                                handleToggleSubjectWithTopics('__topic_header__', topicKeys, false);
                                                            }}
                                                            className="flex items-center gap-2 px-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                                                        >
                                                            <div className="w-0.5 h-3 bg-primary/50 rounded-full" />
                                                            <span className="text-[10px] font-black text-content-muted dark:text-white/60 uppercase tracking-widest">{subj?.name}</span>
                                                        </button>
                                                        <div className="ml-2 pl-3 grid gap-2">
                                                            {topics.map((t, i) => {
                                                                const isSelected = selectedAdditions.has(`top-${sId}-${i}`);
                                                                return (
                                                                    <button
                                                                        key={`add-t-${sId}-${i}`}
                                                                        onClick={() => handleToggleAddition(`top-${sId}-${i}`)}
                                                                        className={`relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 text-left ${
                                                                            isSelected
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                                                            : 'bg-secondary/30 dark:bg-zinc-800/30 border-border dark:border-white/5 hover:border-primary/20'

                                                                        }`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                                                                            isSelected
                                                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                                                            : 'border-white/10 text-transparent'
                                                                        }`}>
                                                                            <Check size={10} strokeWidth={4} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-xs font-bold text-foreground block truncate">{t}</span>
                                                                            <span className="text-[8px] text-emerald-400/80 font-bold uppercase tracking-widest">Adicionar Tópico</span>
                                                                        </div>

                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Section: Remoções */}
                                {(diff.removals.subjects.length > 0 || Object.keys(diff.removals.topics).length > 0) && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                                Removidos do Edital
                                            </h3>
                                            <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-bold">
                                                {diff.removals.subjects.length + Object.values(diff.removals.topics).flat().length} itens
                                            </span>
                                        </div>

                                        <div className="space-y-8">
                                            {/* Matérias Removidas */}
                                            {diff.removals.subjects.map((s, i) => {
                                                const sName = s.name;
                                                const isSelected = selectedRemovals.has(`rem-subj-${s.id}`);
                                                const hasProgress = s.topics.some(t => t.completed || t.review_count > 0);
                                                return (
                                                    <motion.div
                                                        key={`rem-s-group-${s.id}`}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="space-y-2"
                                                    >
                                                        {/* Matéria Toggle Card */}
                                                        <button
                                                            onClick={() => {
                                                                const topicKeys = (s.topics || []).map((t) => `rem-top-${s.id}-${t.id}`);
                                                                handleToggleSubjectWithTopics(`rem-subj-${s.id}`, topicKeys, true);
                                                            }}
                                                            className={`w-full group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                                                                isSelected
                                                                ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_4px_12px_rgba(244,63,94,0.1)]'
                                                                : 'bg-secondary/30 border-border hover:border-rose-500/20'
                                                            }`}
                                                        >
                                                            {/* Sidebar Indicator */}
                                                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full transition-all duration-300 ${isSelected ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-border'}`} />

                                                            <div className={`ml-2 w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${
                                                                isSelected
                                                                ? 'bg-rose-500 border-rose-500 text-white'
                                                                : 'border-white/10 text-transparent'
                                                            }`}>
                                                                <Check size={12} strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-black text-foreground uppercase tracking-tight truncate ${isSelected ? 'line-through decoration-rose-500/50' : ''}`}>{sName}</span>
                                                                    <span className="text-[8px] text-rose-400 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20 shrink-0">Remover</span>
                                                                </div>
                                                                <span className="text-[10px] text-content-muted font-medium">Remover matéria e todos os tópicos</span>

                                                                {hasProgress && (
                                                                    <div className="mt-2 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg w-fit">
                                                                        <AlertCircle size={10} className="text-amber-500 shrink-0" />
                                                                        <span className="text-[8px] text-amber-500 font-black uppercase tracking-wider">Histórico será mantido</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                        </button>

                                                        {/* Tópicos aninhados */}
                                                        {s.topics && s.topics.length > 0 && (
                                                            <div className="ml-5 border-l border-white/10 pl-5 grid gap-2 py-1">
                                                                {s.topics.map((t, idx) => {
                                                                    const tSelected = selectedRemovals.has(`rem-top-${s.id}-${t.id}`);
                                                                    const studied = t.completed || t.review_count > 0;
                                                                    return (
                                                                        <button
                                                                            key={`rem-s-${s.id}-t-${t.id}`}
                                                                            onClick={() => handleToggleRemoval(`rem-top-${s.id}-${t.id}`)}
                                                                            className={`relative flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-200 text-left ${
                                                                                tSelected
                                                                                ? 'bg-rose-500/5 border-rose-500/10'
                                                                                : 'bg-secondary/10 border-transparent hover:border-border'
                                                                            }`}
                                                                        >
                                                                            <div className="absolute -left-5 top-1/2 w-3 h-px bg-white/10" />
                                                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all duration-300 ${
                                                                                tSelected
                                                                                ? 'bg-rose-500 border-rose-500 text-white'
                                                                                : 'border-white/10 text-transparent'
                                                                            }`}>
                                                                                <Check size={9} strokeWidth={4} />
                                                                            </div>
                                                                            <span className={`text-[11px] font-medium text-foreground truncate flex-1 ${tSelected ? 'line-through decoration-rose-500/50' : ''}`}>
                                                                                {t.name}
                                                                            </span>
                                                                            {studied && (
                                                                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                                                                                    <AlertCircle size={9} className="text-amber-500" />
                                                                                    <span className="text-[7px] text-amber-500 font-black uppercase tracking-wider">Estudado</span>
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Tópicos Removidos de Matérias Existentes */}
                                            {Object.entries(diff.removals.topics).map(([sId, topics], sIter) => {
                                                const subj = localSubjects.find(ls => ls.id === sId);
                                                return (
                                                    <div key={`rem-t-group-${sId}`} className="space-y-2">
                                                        <div className="flex items-center gap-2 px-1 opacity-70">
                                                            <div className="w-0.5 h-3 bg-rose-500/50 rounded-full" />
                                                            <span className="text-[10px] font-black text-rose-400/60 uppercase tracking-widest">{subj?.name}</span>
                                                        </div>
                                                        <div className="ml-2 pl-3 grid gap-2">
                                                            {topics.map((t, i) => {
                                                                const isSelected = selectedRemovals.has(`rem-top-${sId}-${t.id}`);
                                                                const studied = t.completed || t.review_count > 0;
                                                                return (
                                                                    <button
                                                                        key={`rem-t-${sId}-${t.id}`}
                                                                        onClick={() => handleToggleRemoval(`rem-top-${sId}-${t.id}`)}
                                                                        className={`relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 text-left ${
                                                                            isSelected
                                                                            ? 'bg-rose-500/10 border-rose-500/30'
                                                                            : 'bg-secondary/30 dark:bg-zinc-800/30 border-border dark:border-white/5 hover:border-rose-500/20'
                                                                        }`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                                                                            isSelected
                                                                            ? 'bg-rose-500 border-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                                                            : 'border-white/10 text-transparent'
                                                                        }`}>
                                                                            <Check size={10} strokeWidth={4} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className={`text-xs font-bold text-foreground block truncate ${isSelected ? 'line-through decoration-rose-500/50' : ''}`}>{t.name}</span>
                                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                                <span className="text-[8px] text-rose-400/80 font-bold uppercase tracking-wider">Remover Tópico</span>
                                                                                {studied && (
                                                                                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                                                                                        <AlertCircle size={9} className="text-amber-500" />
                                                                                        <span className="text-[7px] text-amber-500 font-black uppercase tracking-wider">Estudado</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer with Glass Effect - Always visible */}
                    <div className="p-5 border-t border-border dark:border-white/5 bg-card/95 backdrop-blur-xl flex gap-3 shrink-0">

                        <button
                            onClick={onClose}
                            className="flex-1 h-12 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-black uppercase tracking-widest rounded-2xl transition-all border border-border"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleConfirm}
                            disabled={(!hasChanges && !hasMetadataUpdate) || isApplying}
                            className="flex-[2] h-12 relative overflow-hidden group bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3 active:scale-95"
                        >
                            {isApplying ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <Check size={18} strokeWidth={3} />
                                    <span>Aplicar Alterações</span>
                                </>
                            )}
                            {/* Hover Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        </button>
                    </div>
                </motion.div>

                {/* Inline CSS for necessary high-quality animations not in Tailwind */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: var(--border);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: var(--primary);
                    }

                ` }} />
            </div>
        </AnimatePresence>
    );
};
