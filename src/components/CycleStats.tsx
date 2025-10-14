import React, { useState, useEffect } from 'react';
import { useCycleStatus } from '@/hooks/useCycleStatus';

export const CycleStats: React.FC = () => {
  const { getCycleStats } = useCycleStatus();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      const cycleStats = await getCycleStats();
      setStats(cycleStats);
    };
    
    loadStats();
    
    // Sistema controlado de eventos para evitar loops infinitos
    let lastStatsUpdateTime = 0;
    const STATS_DEBOUNCE_TIME = 1000; // 1 segundo
    
    const handleCycleUpdate = (event: any) => {
      const now = Date.now();
      const eventDetail = event?.detail;
      
      // Permitir eventos de revisão de tópicos sem debounce
      const isTopicReview = eventDetail?.source === 'topicReview' || eventDetail?.type === 'topicReview';
      
      // Debounce apenas para eventos normais (não revisões de tópicos)
      if (!isTopicReview && now - lastStatsUpdateTime < STATS_DEBOUNCE_TIME) {
        console.log('🚫 Evento cycleUpdated ignorado no CycleStats - debounce ativo');
        return;
      }
      
      lastStatsUpdateTime = now;
      console.log('🔄 CycleStats: Processando evento cycleUpdated', { isTopicReview, eventDetail });
      
      // Recarregar stats após um delay (menor para revisões de tópicos)
      setTimeout(() => {
        loadStats();
      }, isTopicReview ? 200 : 500);
    };
    
    window.addEventListener('cycleUpdated', handleCycleUpdate);
    
    // Polling removido - apenas eventos
    
    return () => {
      window.removeEventListener('cycleUpdated', handleCycleUpdate);
    };
  }, [getCycleStats]);

  if (!stats) {
    return (
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="font-semibold text-sm text-muted-foreground">Carregando estatísticas...</h3>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border">
      <h3 className="font-semibold text-sm text-muted-foreground mb-3">Estatísticas do Ciclo</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Ciclo:</span>
          <span className="ml-2 font-medium">#{(stats.cycleNumber || 0) + 1}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total no Ciclo:</span>
          <span className="ml-2 font-medium">{stats.totalSubjects} matérias</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ativas:</span>
          <span className="ml-2 font-medium text-blue-600">{stats.totalActiveSubjects}</span>
        </div>
        <div>
          <span className="text-muted-foreground">100% Concluídas:</span>
          <span className="ml-2 font-medium text-emerald-600">{stats.totalCompletedSubjects || 0}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Estudadas (Ciclo):</span>
          <span className="ml-2 font-medium text-green-600">{stats.studiedSubjects}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Restantes:</span>
          <span className="ml-2 font-medium text-orange-600">{stats.remainingSubjects}</span>
        </div>
      </div>
      
      {stats.studiedActiveSubjectIds && stats.studiedActiveSubjectIds.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">IDs Estudados no Ciclo Atual:</span>
          <div className="text-xs font-mono mt-1 text-green-600">
            {stats.studiedActiveSubjectIds.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};