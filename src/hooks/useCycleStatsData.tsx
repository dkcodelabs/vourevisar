import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubjectCycleActivity {
  subjectId: string;
  subjectName: string;
  firstActivityAt: string;         // primeira atividade no ciclo atual
  lastActivityAt: string;          // última atividade nessa matéria
  topicsStudied: number;           // tópicos distintos tocados
  totalReviews: number;            // total de revisões feitas
  hardReviews: number;             // revisões com difficulty_numeric = 3
  isHardSubject: boolean;          // se >= 40% das revisões foram difíceis
}

export interface CycleStatsData {
  // Ciclo atual
  cycleNumber: number;             // ciclos_realizados + 1
  cycleStartDate: string | null;   // data_inicio_ciclo
  totalSubjects: number;           // todas as matérias do ciclo
  visitedSubjects: number;         // matérias com pelo menos 1 tópico no ciclo
  remainingSubjects: number;       // ainda não visitadas
  progressPercent: number;         // (visitedSubjects / totalSubjects) * 100

  // Sequência do ciclo (ordenada por first_activity)
  subjectSequence: SubjectCycleActivity[];

  // Última matéria estudada
  lastStudiedSubject: SubjectCycleActivity | null;

  // Alerta de dificuldade
  hardSubjects: SubjectCycleActivity[];

  // Histórico geral
  completedCycles: number;         // ciclos_realizados
  streakDays: number;              // streak_dias_consecutivos

  isLoading: boolean;
  error: string | null;
}

const EMPTY: CycleStatsData = {
  cycleNumber: 1,
  cycleStartDate: null,
  totalSubjects: 0,
  visitedSubjects: 0,
  remainingSubjects: 0,
  progressPercent: 0,
  subjectSequence: [],
  lastStudiedSubject: null,
  hardSubjects: [],
  completedCycles: 0,
  streakDays: 0,
  isLoading: true,
  error: null,
};

export function useCycleStatsData(open: boolean) {
  const { user } = useAuth();
  const [data, setData] = useState<CycleStatsData>(EMPTY);

  const load = useCallback(async () => {
    if (!user || !open) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Ciclo ativo do usuário
      const { data: cycle, error: cycleErr } = await supabase
        .from('user_cycles')
        .select('ciclos_realizados, data_inicio_ciclo, streak_dias_consecutivos, ciclo_atual')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (cycleErr) throw cycleErr;

      const cycleNumber = (cycle?.ciclos_realizados ?? 0) + 1;
      const completedCycles = cycle?.ciclos_realizados ?? 0;
      const cycleStartDate = cycle?.data_inicio_ciclo ?? null;
      const streakDays = cycle?.streak_dias_consecutivos ?? 0;

      // 2. Matérias do ciclo ativo (via ciclo_atual array de IDs de subjects)
      const cycloAtualIds: string[] = Array.isArray(cycle?.ciclo_atual)
        ? (cycle.ciclo_atual as string[])
        : [];

      // 3. Buscar nomes das matérias do ciclo
      let allSubjects: { id: string; name: string }[] = [];
      if (cycloAtualIds.length > 0) {
        const { data: subjectsData, error: subErr } = await supabase
          .from('subjects')
          .select('id, name')
          .in('id', cycloAtualIds);

        if (subErr) throw subErr;
        allSubjects = subjectsData ?? [];
      }

      // Fallback: se ciclo_atual vazio, buscar via topics com first_studied_at
      if (allSubjects.length === 0) {
        const { data: topicSubjects, error: tsErr } = await supabase
          .from('topics')
          .select('subject_id, subjects!inner(id, name)')
          .not('first_studied_at', 'is', null)
          .eq('subjects.is_visible' as any, true);

        if (!tsErr && topicSubjects) {
          const seen = new Set<string>();
          topicSubjects.forEach((row: any) => {
            if (row.subjects && !seen.has(row.subjects.id)) {
              seen.add(row.subjects.id);
              allSubjects.push({ id: row.subjects.id, name: row.subjects.name });
            }
          });
        }
      }

      const totalSubjects = allSubjects.length;

      // 4. Histórico de revisões desde o início do ciclo
      let reviewQuery = supabase
        .from('topic_review_history')
        .select(`
          reviewed_at,
          difficulty_numeric,
          topic_id,
          topics!inner(
            id,
            subject_id,
            subjects!inner(id, name)
          )
        `)
        .eq('user_id', user.id);

      if (cycleStartDate) {
        reviewQuery = reviewQuery.gte('reviewed_at', cycleStartDate);
      }

      const { data: reviews, error: revErr } = await reviewQuery.order('reviewed_at', { ascending: true });

      if (revErr) throw revErr;

      // 5. Agrupar por matéria
      const subjectMap = new Map<string, SubjectCycleActivity>();

      (reviews ?? []).forEach((rev: any) => {
        const subject = rev.topics?.subjects;
        if (!subject) return;

        const sid = subject.id;
        const existing = subjectMap.get(sid);
        const isHard = rev.difficulty_numeric === 3;

        if (existing) {
          existing.totalReviews += 1;
          if (isHard) existing.hardReviews += 1;
          if (rev.reviewed_at > existing.lastActivityAt) {
            existing.lastActivityAt = rev.reviewed_at;
          }
          // Contar tópicos distintos
          existing.topicsStudied = Math.max(existing.topicsStudied, 1); // será recalculado abaixo
        } else {
          subjectMap.set(sid, {
            subjectId: sid,
            subjectName: subject.name,
            firstActivityAt: rev.reviewed_at,
            lastActivityAt: rev.reviewed_at,
            topicsStudied: 1,
            totalReviews: 1,
            hardReviews: isHard ? 1 : 0,
            isHardSubject: false,
          });
        }
      });

      // 5b. Calcular tópicos distintos por matéria
      const topicsBySubject = new Map<string, Set<string>>();
      (reviews ?? []).forEach((rev: any) => {
        const sid = rev.topics?.subjects?.id;
        const tid = rev.topic_id;
        if (!sid || !tid) return;
        if (!topicsBySubject.has(sid)) topicsBySubject.set(sid, new Set());
        topicsBySubject.get(sid)!.add(tid);
      });

      // 5c. Atualizar topicsStudied e isHardSubject
      subjectMap.forEach((activity, sid) => {
        const topicSet = topicsBySubject.get(sid);
        if (topicSet) activity.topicsStudied = topicSet.size;
        activity.isHardSubject =
          activity.totalReviews > 0 &&
          (activity.hardReviews >= 2 || activity.hardReviews / activity.totalReviews >= 0.4);
      });

      // 6. Sequência ordenada por firstActivityAt
      const subjectSequence = Array.from(subjectMap.values()).sort(
        (a, b) => new Date(a.firstActivityAt).getTime() - new Date(b.firstActivityAt).getTime()
      );

      // 7. Matérias visitadas = que aparecem no histórico E estão no ciclo atual
      const visitedSubjectIds = new Set(subjectSequence.map(s => s.subjectId));
      
      // Completar a lista com matérias que ainda não foram visitadas
      const notVisited = allSubjects.filter(s => !visitedSubjectIds.has(s.id));

      const visitedSubjects = visitedSubjectIds.size;
      const remainingSubjects = totalSubjects > 0
        ? totalSubjects - visitedSubjects
        : notVisited.length;

      const progressPercent = totalSubjects > 0
        ? Math.round((visitedSubjects / totalSubjects) * 100)
        : 0;

      const lastStudiedSubject = subjectSequence.length > 0
        ? subjectSequence.reduce((latest, s) =>
            new Date(s.lastActivityAt) > new Date(latest.lastActivityAt) ? s : latest
          )
        : null;

      const hardSubjects = subjectSequence.filter(s => s.isHardSubject);

      setData({
        cycleNumber,
        cycleStartDate,
        totalSubjects: totalSubjects || (visitedSubjects + notVisited.length),
        visitedSubjects,
        remainingSubjects: Math.max(0, remainingSubjects),
        progressPercent,
        subjectSequence,
        lastStudiedSubject,
        hardSubjects,
        completedCycles,
        streakDays,
        isLoading: false,
        error: null,
      });

    } catch (err: any) {
      console.error('[useCycleStatsData]', err);
      setData(prev => ({ ...prev, isLoading: false, error: 'Erro ao carregar estatísticas.' }));
    }
  }, [user, open]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return { ...data, reload: load };
}
