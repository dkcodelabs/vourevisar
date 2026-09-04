import { useCallback } from 'react';
import type { Json } from '@/integrations/supabase/types';
import type { CycleUnificationMap, HybridMergeResult } from '@/types/cycleMergeTypes';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import { invokeUserRpc } from '@/services/userRpcService';
import { mergeService } from '@/services/mergeService';
import { resetEditalStudyProgress } from '@/services/editalStudyProgressResetService';
import { clearUserExamDateMeta, fetchCycleId } from '@/services/editaisPageService';
import { performHybridMerge, applyTopicMergeToMap, persistPhysicalSoftMerge, saveUnificationMap } from '@/services/cycleMergeService';
import { buildIndividualCycleMap } from '@/components/editais/cycleMergeComparisonModel';
import { formatCycleSourceName, getJsonRecord, sanitizeExamDate, type CycleConflictState, type UserEdital } from '@/utils/editaisPagePresentation';

// The handler is intentionally isolated behind a dependency bag while the
// cycle conflict state is being decomposed into smaller domain hooks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Deps = Record<string, any>;
export const useCycleConflictAction = (deps: Deps) => {
  const { canRunCycleStructuralOperation, cycleConflict, user, setProcessingId, setIsCycleFinalizationLocked, setIsMerging, setMergePhase, setProcessingProgress, editais, subjects, setEditais, discardPendingMerge, fetchEditais, refreshData, cycleMergeSources, cycleNameCandidates, defaultCycleExamDate, setCycleConflict, setCycleNameDraft, setCycleExamDateDraft } = deps;

  const handleCycleConflictAction = useCallback(async (
        action: 'replace' | 'merge' | 'hybrid',
        organizationMode: 'individual' | 'unified' = 'unified',
    ) => {
        if (!canRunCycleStructuralOperation()) return;
        if (!cycleConflict.edital || !user) return;
        const edital = cycleConflict.edital;
        setProcessingId(edital.id);
        setIsCycleFinalizationLocked(true);

        const individualSubjectIds = [...new Set([...cycleConflict.existingIds, ...edital.subjectIds])];
        let currentUnificationMap: CycleUnificationMap | undefined = organizationMode === 'individual'
            ? buildIndividualCycleMap(
                cycleConflict.existingIds,
                edital.subjectIds,
                [
                    ...cycleConflict.currentOrigins.flatMap(origin => ('id' in origin ? [origin.id] : [])),
                    edital.id,
                ],
            )
            : cycleConflict.unificationMap;

        if (organizationMode === 'unified' && cycleConflict.topicMergeResult && cycleConflict.unificationMap) {
            currentUnificationMap = applyTopicMergeToMap(cycleConflict.unificationMap, cycleConflict.topicMergeResult);
        }

        setIsMerging(true);
        setMergePhase('finalizing');
        setProcessingProgress({
            message: organizationMode === 'individual' ? 'Adicionando itens ao ciclo...' : 'Preparando unificação...',
            percentage: 5,
        });

        try {
            let finalIdsToLoad: string[] = [];
            let oldEditalIds: string[] = [];

            if (action === 'replace') {
                if (cycleConflict.progressSummary?.hasProgress && !cycleConflict.progressMode) {
                    setCycleConflict(prev => ({ ...prev, action: 'replace', step: prev.existingIds.length > 0 ? 'preview' : 'select' }));
                    toast.warning('Escolha se deseja continuar o progresso anterior ou reiniciar este edital antes de trocar o ciclo.');
                    return;
                }

                // Identificar editais que serão removidos do ciclo
                const oldMerged = editais.filter(e => e.mergedIntoCycle && e.id !== edital.id);
                oldEditalIds = oldMerged.map(e => e.id);
                finalIdsToLoad = edital.subjectIds;

                if (cycleConflict.progressMode === 'reset') {
                    setProcessingProgress({ message: 'Reiniciando progresso deste edital...', percentage: 12 });
                    await resetEditalStudyProgress({
                        editalId: edital.id,
                        userId: user.id,
                    });
                }

                // Limpar data da prova ao substituir ciclo
                await clearUserExamDateMeta(user.id);

                setProcessingProgress({ message: 'Preparando substituição do ciclo...', percentage: 20 });
            } else {
                // Se já temos o mapa calculado da prévia, usamos (agora já atualizado pelos tópicos logo acima). Senão (fallback), calculamos.
                let unificationMap = currentUnificationMap || cycleConflict.hybridResult?.unificationMap;
                let finalSubjectIdsFromMap = organizationMode === 'individual'
                    ? individualSubjectIds
                    : cycleConflict.finalSubjectIds || cycleConflict.hybridResult?.finalSubjectIds;
                let result: HybridMergeResult | null = cycleConflict.hybridResult || null;

                if (!unificationMap || !finalSubjectIdsFromMap) {
                    const existingSubs = subjects.filter(s => cycleConflict.existingIds.includes(s.id));
                    const newSubs = subjects.filter(s => edital.subjectIds.includes(s.id));
                    const existingEditalIds = editais
                        .filter(e => e.mergedIntoCycle && e.id !== edital.id)
                        .map(e => e.id);

                    setProcessingProgress({ message: 'Comparando nomes e estrutura das matérias...', percentage: 10 });
                    setIsMerging(true);
                    setMergePhase('exact');

                    const resultData = await performHybridMerge(
                        existingSubs,
                        newSubs,
                        existingEditalIds,
                        edital.id,
                        [],
                        setMergePhase,
                        (prog) => setProcessingProgress(prog)
                    );
                    unificationMap = resultData.unificationMap;
                    finalSubjectIdsFromMap = resultData.finalSubjectIds;
                    result = resultData;
                }

                // 1. Aplicar unificação física (Soft Merge) no banco de dados
                setProcessingProgress({ message: 'Salvando organização do ciclo...', percentage: 30 });
                await persistPhysicalSoftMerge(unificationMap);

                // 2. Persistir o mapa de unificação no registro do ciclo (para UI)
                setProcessingProgress({ message: 'Salvando informações do ciclo...', percentage: 60 });
                await saveUnificationMap(user.id, unificationMap);

                // 3. Salvar mesclagens nas tabelas dedicated (subject_merges e topic_merges)
                try {
                    const cycleId = await fetchCycleId(user.id);
                    if (cycleId && unificationMap) {
                        setProcessingProgress({ message: 'Cruzando históricos entre editais...', percentage: 80 });
                        await mergeService.saveMergeFromUnificationMap(user.id, cycleId, unificationMap);
                        window.dispatchEvent(new CustomEvent('mergeUpdated'));
                    }
                } catch (mergeErr) {
                    console.error('[Editais] Erro ao salvar nas tabelas de merge:', mergeErr);
                }

                finalIdsToLoad = finalSubjectIdsFromMap!;
            }

            finalIdsToLoad = [...new Set(finalIdsToLoad.filter(Boolean))];
            if (finalIdsToLoad.length === 0) {
                throw new Error('Nao foi possivel carregar o ciclo: o edital nao possui materias ativas para estudo.');
            }

            // ATOMIC LOAD: Garantir que o ciclo e o status do edital mudem juntos
            setProcessingProgress({ message: 'Salvando informações do ciclo...', percentage: 90 });
            const defaultCycleName = action === 'replace'
                ? edital.name
                : cycleNameCandidates[0] || cycleMergeSources.map(source => formatCycleSourceName(source.name)).join(' + ') || edital.name || 'Ciclo de estudos';
            const defaultRpcExamDate = action === 'replace'
                ? sanitizeExamDate(edital.examDate)
                : defaultCycleExamDate;
            const shouldResetCycleState = action === 'replace';

            const rpcData = await invokeUserRpc('atomic_cycle_load', {
                p_user_id: user.id,
                p_new_edital_id: edital.id,
                p_new_subject_ids: finalIdsToLoad,
                p_old_edital_ids: oldEditalIds,
                p_mode: action === 'replace' ? 'replace' : 'merge',
                p_cycle_name: defaultCycleName.slice(0, 160),
                p_exam_date: defaultRpcExamDate,
                p_reset_cycle_state: shouldResetCycleState,
            });

            const rpcResult = getJsonRecord(rpcData as Json);
            if (rpcResult?.ok === false) throw new Error(typeof rpcResult.error === 'string' ? rpcResult.error : 'Falha ao carregar ciclo.');
            const resumedReviewCount = Number(rpcResult?.resumed_reviews || 0);

            // Sincronizar estado local de editais para evitar disparidade na UI
            setEditais(prev => prev.map(e => {
                if (e.id === edital.id) return { ...e, mergedIntoCycle: true, activeSubjectIds: finalIdsToLoad };
                if (oldEditalIds.includes(e.id)) return { ...e, mergedIntoCycle: false, activeSubjectIds: [] };
                return e;
            }));

            // Notificações e Transição de Tela
            if (action === 'replace') {
                const isReplacingExisting = cycleConflict.existingIds.length > 0;
                toast.success(
                    isReplacingExisting
                        ? (resumedReviewCount > 0
                            ? `Ciclo substituído por "${edital.name}". A agenda de revisão foi retomada em ${resumedReviewCount} ${resumedReviewCount === 1 ? 'tópico' : 'tópicos'} após a pausa.`
                            : `Ciclo substituído com sucesso por "${edital.name}".`)
                        : (resumedReviewCount > 0
                            ? `Ciclo carregado com "${edital.name}". A agenda de revisão foi retomada em ${resumedReviewCount} ${resumedReviewCount === 1 ? 'tópico' : 'tópicos'}.`
                            : `Ciclo carregado com sucesso com "${edital.name}".`),
                );
            } else {
                const currentStats = cycleConflict.hybridResult?.stats;
                const totalNew = currentStats ? (currentStats.totalSubjectsInCycle - cycleConflict.existingIds.length) : 0;
                const resumedMessage = resumedReviewCount > 0
                    ? ` A agenda de revisão foi retomada em ${resumedReviewCount} ${resumedReviewCount === 1 ? 'tópico' : 'tópicos'} após a pausa.`
                    : '';
                toast.success(organizationMode === 'individual'
                    ? `Edital adicionado ao ciclo com matérias e tópicos individuais.${resumedMessage}`
                    : `Mesclagem concluída! ${totalNew > 0 ? `${totalNew} nova(s) matéria(s) adicionadas.` : 'Estrutura atualizada.'}${resumedMessage}`);
            }

            // Se a ação foi concluída com sucesso, descartar persistência
            // Como o ciclo mudou, invalidamos TODOS os rascunhos para garantir integridade
            await discardPendingMerge('all');

            // Envia evento de atualização
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'merge_completed' } }));

            if (action === 'replace') {
                setCycleConflict(prev => ({ ...prev, step: 'success', action: 'replace', wasTopicMerged: false }));
                setCycleNameDraft(defaultCycleName);
                setCycleExamDateDraft(defaultRpcExamDate || '');
                setIsMerging(false);
                setProcessingProgress(null);
                setIsCycleFinalizationLocked(false);
                return;
            }

            // Atualizar dados em background antes do passo final apenas quando existe mesclagem.
            await fetchEditais();
            await refreshData();

            // Mesclagem de editais: aqui sim o aluno escolhe o nome do ciclo composto.
            setCycleConflict(prev => ({ ...prev, step: 'success', wasTopicMerged: organizationMode === 'unified' }));
            setIsMerging(false);
            setProcessingProgress(null);
            setIsCycleFinalizationLocked(false);
        } catch (err) {
            setIsCycleFinalizationLocked(false);
            errorService.report(err, { module: 'cycle', action: 'conflict_resolution', userMessage: 'Erro ao processar ação no ciclo.' });
        } finally {
            setProcessingId(null);
            setIsMerging(false);
            setProcessingProgress(null);
        }
  }, [canRunCycleStructuralOperation, cycleConflict, cycleMergeSources, cycleNameCandidates, defaultCycleExamDate, discardPendingMerge, editais, fetchEditais, refreshData, setCycleConflict, setCycleExamDateDraft, setCycleNameDraft, setEditais, setIsCycleFinalizationLocked, setIsMerging, setMergePhase, setProcessingId, setProcessingProgress, subjects, user]);


  return { handleCycleConflictAction };
};
