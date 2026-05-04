import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useStudyCycleData } from '@/hooks/useStudyCycleData';
import { differenceInDays, startOfDay } from 'date-fns';
import {
  MentorInsights,
  MentorAlert,
  MentorConsolidatedTopic,
  MentorTrendLabel,
  MentorStrategicInsight
} from '@/types/mentor';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { useUserSettings } from '@/hooks/useUserSettings';

// Helper function para derivar nota de importância baseada no volume de questões
const extractImportanceScore = (volume: number): 1 | 2 | 3 | 4 | 5 => {
  if (volume > 1000) return 5;
  if (volume > 500) return 4;
  if (volume > 200) return 3;
  if (volume > 50) return 2;
  return 1;
};

// Helper function para derivar a tendência baseada em estabilidade de memória
const getTrendLabel = (stability: number, reviewCount: number): MentorTrendLabel => {
  if (reviewCount === 0) return 'Sem histórico';
  if (stability < 0.4 && reviewCount >= 3) return 'Piorando';
  if (stability >= 0.7) return 'Melhorando';
  return 'Estável';
};

export const useMentorInsights = (): MentorInsights => {
  const { subjects, isDataLoaded } = useApp();
  const { userCycle } = useStudyCycleData();
  const { settings: userSettings } = useUserSettings();

  const [criticalAlerts, setCriticalAlerts] = useState<MentorAlert[]>([]);
  const [allCriticals, setAllCriticals] = useState<MentorAlert[]>([]);
  const [gargalos, setGargalos] = useState<MentorAlert[]>([]);
  const [allGargalos, setAllGargalos] = useState<MentorAlert[]>([]);
  const [strategicInsight, setStrategicInsight] = useState<MentorStrategicInsight | null>(null);
  const [consolidatedTopics, setConsolidatedTopics] = useState<MentorConsolidatedTopic[]>([]);

  // Lookup maps para O(1) matching nos componentes visuais (Fase 2)
  const criticalBySubject = useMemo(() => {
    const map = new Map<string, MentorAlert>();
    criticalAlerts.forEach(a => map.set(a.subjectId, a));
    return map;
  }, [criticalAlerts]);

  const criticalByTopic = useMemo(() => {
    const map = new Map<string, MentorAlert>();
    allCriticals.forEach(a => { if (a.topicId) map.set(a.topicId, a); });
    return map;
  }, [allCriticals]);

  const gargaloByTopic = useMemo(() => {
    const map = new Map<string, MentorAlert>();
    allGargalos.forEach(a => { if (a.topicId) map.set(a.topicId, a); });
    return map;
  }, [allGargalos]);

  const consolidatedTopicIds = useMemo(() => {
    const set = new Set<string>();
    consolidatedTopics.forEach(t => set.add(t.topicId));
    return set;
  }, [consolidatedTopics]);

  const [trendByTopic, setTrendByTopic] = useState<Map<string, MentorTrendLabel>>(new Map());

  useEffect(() => {
    if (!isDataLoaded || !subjects || !userCycle) return;
    
    const cycleSubjectIds = userCycle.ciclo_atual || [];
    if (cycleSubjectIds.length === 0) {
      setCriticalAlerts([]);
      setGargalos([]);
      setStrategicInsight(null);
      setConsolidatedTopics([]);
      return;
    }

    const today = startOfDay(new Date());
    
    // Configurações do perfil
    const profileKey = (userSettings?.review_profile || 'INTERMEDIATE') as keyof typeof REVIEW_PROFILES;
    const profileRules = REVIEW_PROFILES[profileKey] || REVIEW_PROFILES.INTERMEDIATE;
    const maxIntervalCap = profileRules.maxIntervalCap;

    const newCriticals: MentorAlert[] = [];
    const newGargalos: MentorAlert[] = [];
    const newConsolidated: MentorConsolidatedTopic[] = [];
    const newTrendByTopic = new Map<string, MentorTrendLabel>();
    let anyOverdueCount = 0;

    // Processamento Single-Pass sobre os dados em memória (sem bloquear thread e zero DB calls)
    subjects.forEach(subject => {
      // Ignorar matérias fora do radar do usuário (Focamos estritamente no ciclo atual)
      if (!cycleSubjectIds.includes(subject.id)) return;

      subject.topics.forEach(topic => {
        if (topic.is_active === false) return;
        if (topic.is_completed || topic.completed || topic.review_stage === 'Concluído') return;
        
        // --- FILTRO DE ENTRADA: Ignorar o que não foi iniciado ---
        const rawCount = topic.review_count || topic.reviewCount || 0;
        const isActuallyStarted = rawCount > 0;
        const hasStudyHistory = isActuallyStarted || !!topic.first_studied_at || !!topic.last_reviewed_at;
        const isNotStarted = topic.review_stage === 'Não Iniciado' || !topic.review_stage;

        if (!isActuallyStarted || isNotStarted) return;

        const volume = topic.total_volume || 0;
        const notaImportancia = extractImportanceScore(volume);
        
        let daysOverdue = 0;
        if (topic.next_review) {
          daysOverdue = Math.max(0, differenceInDays(today, startOfDay(new Date(topic.next_review))));
        }

        if (daysOverdue > 0) {
          anyOverdueCount++;
        }

        // --- NÍVEL 1: Risco Crítico ---
        // Alta prioridade que está sendo negligenciada
        if (notaImportancia >= 4 && daysOverdue > 0) {
          const priorityLabel = notaImportancia === 5 ? 'Extrema Importância' : 'Alta Importância';
          newCriticals.push({
            id: `crit-${topic.id}`,
            level: 'critical',
            subjectId: subject.id,
            subjectName: subject.name,
            topicId: topic.id,
            topicName: topic.name,
            message: `${priorityLabel}: ${daysOverdue} dias em atraso. Retome o foco.`,
            daysOverdue,
            notaImportancia: notaImportancia,
            totalVolume: volume,
          });
        }

        // --- NÍVEL 2: Gargalo de Desempenho ---
        const stability = topic.memory_stability || 0;
        const reviewCount = topic.review_count || 0;
        const trendLabel = getTrendLabel(stability, reviewCount);
        newTrendByTopic.set(topic.id, trendLabel);

        if (trendLabel === 'Piorando') {
          newGargalos.push({
            id: `garg-${topic.id}`,
            level: 'warning',
            subjectId: subject.id,
            subjectName: subject.name,
            topicId: topic.id,
            topicName: topic.name,
            message: `Atenção: O desempenho está caindo no tópico "${topic.name}". Recomendada revisão profunda.`,
            trendLabel
          });
        }

        // --- NÍVEL 4: Consolidação Silenciosa ---
        const interval = topic.current_interval || 0;
        if (interval >= maxIntervalCap && trendLabel !== 'Piorando') {
          newConsolidated.push({
            topicId: topic.id,
            topicName: topic.name,
            subjectId: subject.id,
            subjectName: subject.name,
            currentInterval: interval,
            maxIntervalCap
          });
        }
      });
    });

    // ──────────────────────────────────────────────
    // Rate Limiting e Priorização (Máximo 3 alertas)
    // ──────────────────────────────────────────────

    // Agrupa Nível 1 por matéria e pega apenas a pior situação para não poluir
    const groupedCriticals = new Map<string, MentorAlert>();
       newCriticals.forEach(alert => {
        const existing = groupedCriticals.get(alert.subjectId);
        if (!existing || (alert.totalVolume || 0) > (existing.totalVolume || 0)) {
          const priorityLabel = alert.notaImportancia === 5 ? 'Extrema Importância' : 'Alta Importância';
          groupedCriticals.set(alert.subjectId, {
            ...alert,
            message: `A matéria ${alert.subjectName} possui o tópico "${alert.topicName}" de ${priorityLabel} com ${alert.daysOverdue} dias de atraso.`
          });
        }
      });

    let topCriticals = Array.from(groupedCriticals.values())
       .sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0))
       .slice(0, 3);
    
    let remainingAlertSlots = 3 - topCriticals.length;

    // Se sobrou espaço, seleciona os piores gargalos (Nível 2)
    let topGargalos: MentorAlert[] = [];
    if (remainingAlertSlots > 0) {
      topGargalos = newGargalos.slice(0, remainingAlertSlots);
      remainingAlertSlots -= topGargalos.length;
    }

    // --- NÍVEL 3: Estratégico ---
    let newStrategicInsight: MentorStrategicInsight | null = null;
    
    if (remainingAlertSlots > 0) {
      // Como não temos acesso imediato global aos detalhes de edital sem query,
      // implementamos a lógica de Insight Contínuo como fallback (previsto no escopo).
      // Em V2 expandiremos para consumir o tempo restando via \`useEditalOriginsWithMerge\`.
    if (newCriticals.length > 0) {
      const overdueCount = new Set(newCriticals.map(c => c.topicId)).size;
      newStrategicInsight = {
        type: 'continuo',
        message: `Atenção: Você tem ${overdueCount} tópico${overdueCount > 1 ? 's' : ''} crítico${overdueCount > 1 ? 's' : ''} em atraso. Priorize-os agora.`
      };
    } else if (anyOverdueCount > 0) {
      newStrategicInsight = {
        type: 'continuo',
        message: `Tudo sob controle com o essencial, mas você tem ${anyOverdueCount} revisão${anyOverdueCount > 1 ? 'ões' : ''} secundária${anyOverdueCount > 1 ? 's' : ''} pendente${anyOverdueCount > 1 ? 's' : ''}.`
      };
    } else {
      newStrategicInsight = {
        type: 'continuo',
        message: 'Excelente ritmo! Você está 100% em dia com seu plano de estudos.'
      };
    }
    }

    setCriticalAlerts(topCriticals);
    setAllCriticals(newCriticals);
    setGargalos(topGargalos);
    setAllGargalos(newGargalos);
    setStrategicInsight(newStrategicInsight);
    setConsolidatedTopics(newConsolidated);
    setTrendByTopic(newTrendByTopic);

  }, [subjects, isDataLoaded, userCycle, userSettings]);

  const totalAlertCount = criticalAlerts.length + gargalos.length + (strategicInsight ? 1 : 0);

  return {
    criticalAlerts,
    gargalos,
    strategicInsight,
    consolidatedTopics,
    criticalBySubject,
    criticalByTopic,
    gargaloByTopic,
    allGargalos,
    consolidatedTopicIds,
    trendByTopic,
    hasAnyAlert: totalAlertCount > 0,
    totalAlertCount
  };
};
