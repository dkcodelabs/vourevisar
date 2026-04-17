import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, FileText, Trash2, Star, Plus, Zap, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Topic } from '@/types';
import ConfirmDeleteModal from '@/components/topics/ConfirmDeleteModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import NotesModal from '@/components/reviews/NotesModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InlineTopicCreator } from '@/components/topics/InlineTopicCreator';
import { errorService } from '@/lib/errors/errorService';
import { useEditalOrigins } from '@/hooks/useEditalOrigins';
import { supabase } from '@/integrations/supabase/client';
import { applyUnificationMap } from '@/services/cycleMergeService';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { useMergeData } from '@/hooks/useMergeData';

const Topics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subjects, deleteTopic, refreshData, isLoading } = useApp();
  const { originsMap, getOriginsForSubject, getOriginsForTopic, activeSubjectIdsSet, editaisData } = useEditalOriginsWithMerge();
  const { getUnifiedTopicName, getUnifiedSubjectName, dynamicUnificationMap } = useMergeData();
  const [userCycle, setUserCycle] = useState<any>(null);
  const [isCycleLoading, setIsCycleLoading] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState(0);
  const [sortBy, setSortBy] = useState<'subject' | 'name'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isInlineCreatorOpen, setIsInlineCreatorOpen] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    topicId: string;
    subjectId: string;
    topicName?: string;
    subjectName?: string;
  }>({ isOpen: false, topicId: '', subjectId: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const [notesModal, setNotesModal] = useState<{
    isOpen: boolean;
    topicId: string;
    topicName: string;
    subjectName: string;
  }>({ isOpen: false, topicId: '', topicName: '', subjectName: '' });

  // Carregar ciclo do usuário (similar ao Subjects.tsx)
  const loadUserCycle = useCallback(async () => {
    if (!user) return;
    try {
      setIsCycleLoading(true);
      const { data } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);
      
      const cycleData = data?.[0] || null;
      setUserCycle(cycleData);
      
      if (cycleData) {
        console.log('🔄 USER CYCLE LOADED IN TOPICS:', {
          cycleLength: cycleData.ciclo_atual?.length || 0,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao carregar ciclo em Topics:', error);
    } finally {
      setIsCycleLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserCycle();

    const handleExternalUpdate = () => {
      console.log('🔔 EXTERNAL UPDATE DETECTED IN TOPICS - Refreshing cycle...');
      loadUserCycle();
    };

    window.addEventListener('mergeUpdated', handleExternalUpdate);
    window.addEventListener('subjectUpdated', handleExternalUpdate);
    window.addEventListener('cycleUpdated', handleExternalUpdate);

    return () => {
      window.removeEventListener('mergeUpdated', handleExternalUpdate);
      window.removeEventListener('subjectUpdated', handleExternalUpdate);
      window.removeEventListener('cycleUpdated', handleExternalUpdate);
    };
  }, [loadUserCycle]);

  const allTopics = useMemo(() => {
    // ── Obter IDs no ciclo para garantir alinhamento com Subjects.tsx ──────
    const subjectsInCycleSet = new Set(userCycle?.ciclo_atual || []);

    // Filtrar matérias visíveis baseadas no ciclo ativo e flag is_visible
    const rawVisibleSubjects = subjects.filter(subject => {
      // Se marcado como invisível no registro real (banco), oculta
      if (subject.is_visible === false) return false;
      
      const isInCycle = subjectsInCycleSet.has(subject.id);
      const isFromActiveEdital = activeSubjectIdsSet.has(subject.id);

      // Se está no ciclo (mesclado ou manual ativo) ou pertence a um edital carregado, mostra.
      if (isInCycle || isFromActiveEdital) return true;
      
      return false; // Filtra vazamentos (matérias de outros editais ou não carregadas)
    });

    // Aplicar mapa de unificação para agrupar matérias e tópicos
    const visibleSubjects = applyUnificationMap(rawVisibleSubjects, dynamicUnificationMap);

    // Removida lógica local de origens pois agora usamos o hook useEditalOriginsWithMerge centralizado

    const flattenedTopics = visibleSubjects.flatMap(subject =>
      (subject.topics || [])
        .filter(topic => !topic.is_hidden) // NÃO MOSTRAR TÓPICOS OCULTOS (unificados secundários)
        .map(topic => {
          // Buscar editais de origem deste tópico via hook centralizado
          const origins = getOriginsForTopic(topic.id, subject.id, topic.edital_id);
          const topicOrigins = origins;
          const unifiedTopicName = getUnifiedTopicName(topic.id, topic.name);
          const unifiedSubjectName = getUnifiedSubjectName(subject.id, subject.name);
          
          return {
            ...topic,
            name: unifiedTopicName,
            subjectName: unifiedSubjectName,
            subjectId: subject.id, // Restaurado ID da matéria
            topicOrigins: topicOrigins, // Agora contém objetos {name, organ, ...}
            edital_id: topic.edital_id || subject.edital_id,
            is_unificado: origins.length > 1
          };
        })
    );

    // Deduplicação ativa para prevenir erro de React keys duplicadas
    const uniqueTopicsMap = new Map<string, typeof flattenedTopics[0]>();
    flattenedTopics.forEach(topic => {
      if (uniqueTopicsMap.has(topic.id)) {
        console.warn(`[Topics] Detectado tópico duplicado (ID: ${topic.id}, Nome: ${topic.name}). Removendo da visualização para evitar erro de key.`);
      } else {
        uniqueTopicsMap.set(topic.id, topic);
      }
    });

    return Array.from(uniqueTopicsMap.values());
  }, [subjects, userCycle?.ciclo_atual, dynamicUnificationMap, activeSubjectIdsSet, getOriginsForTopic, getUnifiedSubjectName, getUnifiedTopicName]);

  const getTopicStatusInfo = (topic: Topic) => {
    if (topic.completed) {
      return { label: 'Concluído', type: 'concluido' };
    }
    if (!topic.nextReview) {
      return { label: 'Não agendado', type: 'futuro' };
    }

    const today = startOfDay(new Date());
    const reviewDate = startOfDay(new Date(topic.nextReview));

    if (reviewDate < today) {
      const daysLate = Math.floor((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        label: 'Atrasado',
        type: 'atrasado'
      };
    } else if (reviewDate.getTime() === today.getTime()) {
      return {
        label: 'Hoje',
        type: 'hoje'
      };
    } else {
      const daysAhead = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        label: `Em ${daysAhead} dias`,
        type: 'futuro'
      };
    }
  };

  const filteredTopics = useMemo(() => {
    return allTopics
      .filter(topic => {
        const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.subjectName.toLowerCase().includes(searchQuery.toLowerCase());

        const statusInfo = getTopicStatusInfo(topic);
        const matchesStatus = statusFilter === 'Todos' ||
          (statusFilter === 'Atrasado' && statusInfo.type === 'atrasado') ||
          (statusFilter === 'Futuro' && statusInfo.type === 'futuro') ||
          (statusFilter === 'Hoje' && statusInfo.type === 'hoje') ||
          (statusFilter === 'Concluído' && statusInfo.type === 'concluido');

        const matchesDifficulty = difficultyFilter === 0 || topic.difficulty_level === difficultyFilter;

        return matchesSearch && matchesStatus && matchesDifficulty;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
        else if (sortBy === 'subject') comparison = a.subjectName.localeCompare(b.subjectName);

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [allTopics, searchQuery, statusFilter, difficultyFilter, sortBy, sortOrder]);

  const cycleStatusFilter = () => {
    const filters = ['Todos', 'Atrasado', 'Hoje', 'Futuro', 'Concluído'];
    const currentIndex = filters.indexOf(statusFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setStatusFilter(filters[nextIndex]);
  };

  const cycleDifficultyFilter = () => {
    // Cycles from 0 -> 1 -> 2 -> 3 -> 0
    setDifficultyFilter((prev) => (prev + 1) % 4);
  };

  const toggleTopicSort = () => {
    if (sortBy === 'name') {
      setSortBy('subject');
      setSortOrder('asc');
    } else {
      setSortBy('name');
      setSortOrder('asc');
    }
  };

  const renderStars = (count: number) => {
    const validCount = Math.min(Math.max(count || 0, 0), 3); // Limitar a 3 estrelas
    return (
      <div className="flex items-center justify-center gap-0">
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            size={11}
            className={`${star <= validCount ? 'fill-secondary text-secondary' : 'text-content-muted/30'}`}
          />
        ))}
      </div>
    );
  };

  const confirmDelete = async () => {
    if (!deleteModal.topicId || !deleteModal.subjectId) return;
    setIsDeleting(true);

    try {
      await deleteTopic(deleteModal.subjectId, deleteModal.topicId);
      toast.success('Tópico excluído com sucesso!');
      setDeleteModal({ isOpen: false, topicId: '', subjectId: '' });
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Topics',
          action: 'confirmDelete',
          userMessage: 'Erro ao excluir tópico',
          severity: 'high',
          scope: 'core',
          userId: user?.id
        }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Loading State - Centralizado e silencioso para não quebrar o layout
  if (isLoading || isCycleLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex w-full">
      <div className="flex-1 flex flex-col relative w-full">
        <main className="flex-1 px-4 md:px-8 pb-8 pt-0">
          <div className="space-y-6">

            {allTopics.length > 0 ? (
              <>
                {/* Main Header / Search Area */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative z-20">
                  <div className="relative w-full sm:w-[320px] lg:w-[400px] flex items-center group transition-all duration-300">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-primary transition-colors" size={16} />
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 bg-card border border-border rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all text-foreground placeholder:text-content-muted/60 font-medium shadow-sm hover:border-border-hover"
                    />
                  </div>
                  
                  <Button
                    onClick={() => setIsInlineCreatorOpen(!isInlineCreatorOpen)}
                    size="sm"
                    className={`h-11 px-6 font-bold text-[11px] uppercase tracking-widest shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 rounded-xl shrink-0 border-none ${isInlineCreatorOpen
                      ? 'bg-[#f97316] hover:bg-[#ea580c] text-white shadow-[#f97316]/20' // Orange state
                      : 'bg-[#00c881] hover:bg-[#00b374] text-white shadow-[#00c881]/20' // Green state
                      }`}
                  >
                    {isInlineCreatorOpen ? (
                      <>
                        <X size={16} strokeWidth={2.5} />
                        Fechar Adição
                      </>
                    ) : (
                      <>
                        <Plus size={16} strokeWidth={2.5} />
                        Adicionar Tópico
                      </>
                    )}
                  </Button>
                </div>

                {/* Inline Creator Modal Boundary */}
                <InlineTopicCreator
                  isOpen={isInlineCreatorOpen}
                  onClose={() => setIsInlineCreatorOpen(false)}
                  onTopicCreated={() => { }}
                />

                {/* Instructions */}
                <div className={`flex items-center justify-center gap-2 text-zinc-500 font-bold uppercase tracking-widest transition-all ${isInlineCreatorOpen ? 'mt-4 mb-6' : 'mt-8 mb-6'}`}>
                  <Zap size={14} className="text-blue-500" />
                  <p className="text-[10px]">
                    Clique nos cabeçalhos para filtrar e ordenar
                  </p>
                </div>

                <div className="glow-card rounded-[24px] overflow-hidden border border-border shadow-sm bg-card mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead className="bg-muted/30">
                        <tr className="border-b border-border">
                          <th
                            className="px-6 py-5 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer group transition-colors text-left"
                            onClick={toggleTopicSort}
                          >
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] text-zinc-500 font-black tracking-[0.2em] group-hover:text-primary transition-colors">ORDENAR POR</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md leading-none uppercase tracking-tighter transition-all shadow-sm ${
                                  sortBy === 'name' ? 'bg-primary text-white scale-105' : 'bg-primary/10 text-primary hover:bg-primary/20'
                                }`}>
                                  TÓPICO
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700 font-light">/</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md leading-none uppercase tracking-tighter transition-all shadow-sm ${
                                  sortBy === 'subject' ? 'bg-primary text-white scale-105' : 'bg-primary/10 text-primary hover:bg-primary/20'
                                }`}>
                                  MATÉRIA
                                </span>
                              </div>
                            </div>
                          </th>
                          <th
                            className="px-4 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer group transition-colors text-center w-[130px]"
                            onClick={cycleDifficultyFilter}
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-[9px] text-zinc-500 font-black tracking-[0.2em] group-hover:text-primary transition-colors">DIFICULDADE</span>
                              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all shadow-sm ${
                                difficultyFilter === 0 ? 'bg-primary/10 text-primary' : 'bg-primary text-white scale-105'
                              }`}>
                                {difficultyFilter === 0 ? (
                                  <span className="text-[9px] font-black tracking-tight">TODAS</span>
                                ) : (
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3].map((s) => (
                                      <Star
                                        key={s}
                                        size={10}
                                        className={s <= difficultyFilter ? (difficultyFilter === 0 ? 'fill-primary text-primary' : 'fill-white text-white') : 'opacity-20'}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th
                            className="px-4 py-5 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer group transition-colors text-center w-[150px]"
                            onClick={cycleStatusFilter}
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-[9px] text-zinc-500 font-black tracking-[0.2em] group-hover:text-primary transition-colors">STATUS</span>
                              <span className={`text-[9px] px-2.5 py-0.5 rounded-md leading-none uppercase font-black tracking-tight transition-all shadow-sm ${
                                statusFilter === 'Todos' ? 'bg-primary/10 text-primary' : 'bg-primary text-white scale-105 shadow-primary/20'
                              }`}>
                                {statusFilter}
                              </span>
                            </div>
                          </th>
                          <th className="px-4 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center w-[100px]">
                            <span className="text-[9px] font-black tracking-[0.2em]">AÇÕES</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredTopics.length > 0 ? (
                          filteredTopics.map((topic) => {
                            const statusInfo = getTopicStatusInfo(topic);

                            return (
                              <tr key={topic.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-[13px] font-bold text-content-main mb-0.5 truncate" style={{ textTransform: 'capitalize' }}>
                                      {topic.name.charAt(0).toUpperCase() + topic.name.slice(1).toLowerCase()}
                                    </span>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">{topic.subjectName.toUpperCase()}</span>
                                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                        {topic.topicOrigins.map((origin) => {
                                          const displayName = (origin.organ || origin.name).toUpperCase();
                                          return (
                                            <span
                                              key={origin.name}
                                              title={origin.name}
                                              className="text-[8px] font-black px-1.5 py-0.5 rounded border text-primary/80 bg-primary/5 border-primary/10 uppercase tracking-tight whitespace-nowrap"
                                            >
                                              {displayName}
                                            </span>
                                          );
                                        })}
                                        {topic.topicOrigins.length === 0 && (
                                          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500/30 whitespace-nowrap">
                                            Sem Edital
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center align-middle">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {[1, 2, 3].map((star) => {
                                      const validCount = Math.min(Math.max(topic.difficulty_level || 0, 0), 3);
                                      return (
                                        <Star
                                          key={star}
                                          size={12}
                                          className={`${star <= validCount ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`}
                                        />
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center align-middle">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap inline-block ${statusInfo.type === 'atrasado' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
                                    statusInfo.type === 'hoje' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' :
                                      statusInfo.type === 'concluido' ? 'bg-emerald-50 text-[#00a86b] dark:bg-emerald-500/10 dark:text-emerald-400' :
                                        'bg-blue-50 text-blue-500 dark:bg-blue-500/10' // futuro / default
                                    }`}>
                                    {statusInfo.label}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center align-middle">
                                  <div className="grid grid-cols-3 items-center justify-items-center w-full max-w-[90px] mx-auto">
                                    {/* Action 1: Spacer (Reserved space for future/balance) */}
                                    <div className="w-8 h-8 flex items-center justify-center" />

                                    {/* Action 2: Notes (Always visible or high contrast) */}
                                    <button
                                      onClick={() => setNotesModal({
                                        isOpen: true,
                                        topicId: topic.id,
                                        topicName: topic.name,
                                        subjectName: topic.subjectName
                                      })}
                                      className="text-zinc-400 hover:text-primary transition-all p-1.5 rounded-lg hover:bg-primary/5 w-8 h-8 flex items-center justify-center"
                                      title="Anotações"
                                    >
                                      <FileText size={15} />
                                    </button>

                                    {/* Action 3: Delete (Hidden until hover on desktop) */}
                                    <button
                                      onClick={() => setDeleteModal({
                                        isOpen: true,
                                        topicId: topic.id,
                                        subjectId: topic.subjectId,
                                        topicName: topic.name,
                                        subjectName: topic.subjectName
                                      })}
                                      className="text-zinc-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-500/5 md:opacity-0 md:group-hover:opacity-100 w-8 h-8 flex items-center justify-center"
                                      title="Excluir Tópico"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-20 text-center">
                              <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 w-full">
                                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6">
                                  <Search size={32} className="text-content-muted" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">Nenhum resultado encontrado</h3>
                                <p className="text-content-muted max-w-sm mx-auto px-4">
                                  Não encontramos tópicos que correspondam aos seus filtros atuais.
                                </p>
                                <button
                                  onClick={() => { setSearchQuery(''); setStatusFilter('Todos'); setDifficultyFilter(0); }}
                                  className="px-5 py-2 mt-6 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-all"
                                >
                                  Limpar Filtros
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 my-8 w-full text-center">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 mx-auto">
                  <FileText size={40} className="text-content-muted" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Ciclo Vazio</h3>
                <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                  Você não possui matérias no seu ciclo de estudos. Adicione uma matéria manualmente ou carregue um edital para começar.
                </p>
                <button
                  onClick={() => navigate('/materias')}
                  className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-xl border border-border transition-all"
                >
                  Gerenciar Matérias
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Modais Antigos que devem persistir (Notes & Delete) */}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, topicId: '', subjectId: '' })}
        onConfirm={confirmDelete}
        topicName={deleteModal.topicName || ''}
        subjectName={deleteModal.subjectName || ''}
        isLoading={isDeleting}
      />

      {notesModal.isOpen && (
        <NotesModal
          isOpen={notesModal.isOpen}
          onClose={() => setNotesModal({ ...notesModal, isOpen: false })}
          topicId={notesModal.topicId}
          topicName={notesModal.topicName}
          subjectName={notesModal.subjectName}
        />
      )}
    </div>
  );
};

export default Topics;
