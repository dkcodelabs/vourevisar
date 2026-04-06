import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, FileText, Trash2, Star, Plus, Zap, ChevronDown, ChevronUp, X, Scissors } from 'lucide-react';
import { toast } from "@/lib/toast";
import { Button } from '@/components/ui/button';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Topic } from '@/types';
import ConfirmDeleteModal from '@/components/topics/ConfirmDeleteModal';
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
  const { subjects, deleteTopic, isLoading } = useApp();
  const { originsMap, getOriginsForSubject, getOriginsForTopic, activeSubjectIdsSet, editaisData } = useEditalOriginsWithMerge();
  const { getUnifiedTopicName, getUnifiedSubjectName, isTopicMerged, revertTopicMerge, getTopicMergeInfo } = useMergeData();
  const [userCycle, setUserCycle] = useState<any>(null);

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
  useEffect(() => {
    const loadUserCycle = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        if (data?.[0]) setUserCycle(data[0]);
      } catch (error) {
        console.error('Erro ao carregar ciclo em Topics:', error);
      }
    };
    loadUserCycle();
  }, [user]);

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
    const visibleSubjects = applyUnificationMap(rawVisibleSubjects, userCycle?.unification_map);

    // Removida lógica local de origens pois agora usamos o hook useEditalOriginsWithMerge centralizado

    return visibleSubjects.flatMap(subject =>
      (subject.topics || [])
        .filter(topic => !topic.is_hidden) // NÃO MOSTRAR TÓPICOS OCULTOS (unificados secundários)
        .map(topic => {
          // Buscar editais de origem deste tópico via hook centralizado
          const topicOrigins = getOriginsForTopic(topic.id, subject.id).map(o => o.name);
          const unifiedTopicName = getUnifiedTopicName(topic.id, topic.name);
          const unifiedSubjectName = getUnifiedSubjectName(subject.id, subject.name);
          
          return {
            ...topic,
            name: unifiedTopicName,
            subjectId: subject.id,
            subjectName: unifiedSubjectName,
            topicOrigins: topicOrigins, // Array com nomes dos editais de origem
            edital_id: topic.edital_id || subject.edital_id,
          };
        })
    );
  }, [subjects, userCycle, activeSubjectIdsSet, editaisData, getOriginsForTopic, getUnifiedSubjectName, getUnifiedTopicName]);

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
        label: `${topic.reviewCount}/${topic.reviewCount + 1} - ${daysLate} dias atraso`,
        type: 'atrasado'
      };
    } else if (reviewDate.getTime() === today.getTime()) {
      return {
        label: `${topic.reviewCount}/${topic.reviewCount + 1} - Hoje`,
        type: 'hoje'
      };
    } else {
      const daysAhead = Math.floor((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        label: `${topic.reviewCount}/${topic.reviewCount + 1} - Em ${daysAhead} dias`,
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
    const validCount = Math.min(Math.max(count || 0, 0), 3); // Limitar a 3 estrelas como solicitado
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

  if (isLoading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  return (
    <div className="flex w-full">
      <div className="flex-1 flex flex-col relative w-full">
        <main className="flex-1 px-4 md:px-8 pb-8 pt-0">
          <div className="space-y-6">

            {allTopics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 my-8 w-full">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <span className="text-4xl">📝</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                  Nenhum tópico cadastrado
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed text-center">
                  Parece que você ainda não adicionou nenhum tópico às suas matérias. Volte à página de matérias para preencher o conteúdo, ou importe um edital pronto.
                </p>
                <button
                  onClick={() => navigate('/meus-editais')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Ir para Matérias
                </button>
              </div>
            ) : (
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

                {/* Topics Table */}
                {filteredTopics.length > 0 ? (
                  <div className="glow-card rounded-[24px] overflow-hidden border border-border shadow-sm bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/30">
                          <tr className="border-b border-border">
                            <th
                              className="px-6 py-4 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-left"
                              onClick={toggleTopicSort}
                            >
                              <div className="flex items-center gap-2">
                                TÓPICO / MATÉRIA
                                <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded leading-none uppercase">
                                  {sortBy === 'name' ? 'Nome' : 'Matéria'}
                                </span>
                              </div>
                            </th>
                            <th
                              className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-center w-[120px]"
                              onClick={cycleDifficultyFilter}
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <span>DIFICULDADE</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3].map((s) => (
                                    <Star key={s} size={10} className={s <= difficultyFilter ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'} />
                                  ))}
                                  {difficultyFilter === 0 && <span className="text-[8px] ml-1 text-zinc-400">TODAS</span>}
                                </div>
                              </div>
                            </th>
                            <th
                              className="px-4 py-4 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-center w-[140px]"
                              onClick={cycleStatusFilter}
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <span>STATUS</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded leading-none uppercase font-black transition-all ${statusFilter === 'Todos' ? 'bg-secondary text-content-muted' : 'bg-primary/10 text-primary'
                                  }`}>
                                  {statusFilter}
                                </span>
                              </div>
                            </th>
                            <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center w-[80px]">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredTopics.map((topic) => {
                            const statusInfo = getTopicStatusInfo(topic);

                            return (
                              <tr key={topic.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-content-main mb-0.5">{topic.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-zinc-500 font-medium">{topic.subjectName}</span>
                                      {isTopicMerged(topic.id) && (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const mergeInfo = getTopicMergeInfo(topic.id);
                                            if (mergeInfo && confirm(`Deseja desfazer a mesclagem "${mergeInfo.display_name}"?`)) {
                                              await revertTopicMerge(mergeInfo.id);
                                              toast.success('Mesclagem desfeita');
                                            }
                                          }}
                                          title="Desfazer Mesclagem"
                                          className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors text-orange-500"
                                        >
                                          <Scissors size={12} />
                                        </button>
                                      )}
                                      {getOriginsForSubject(topic.subjectId, topic.edital_id).map((origin) => (
                                        <span key={origin.name} className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-primary bg-primary/5 border-primary/10">
                                          {origin.name}
                                        </span>
                                      ))}
                                      {getOriginsForSubject(topic.subjectId, topic.edital_id).length === 0 && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500/30">
                                          Sem Edital
                                        </span>
                                      )}
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
                                  <div className="flex items-center justify-center gap-3">
                                    <button
                                      onClick={() => setNotesModal({
                                        isOpen: true,
                                        topicId: topic.id,
                                        topicName: topic.name,
                                        subjectName: topic.subjectName
                                      })}
                                      className="text-zinc-400 hover:text-primary transition-colors p-1"
                                      title="Anotações"
                                    >
                                      <FileText size={14} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteModal({
                                        isOpen: true,
                                        topicId: topic.id,
                                        subjectId: topic.subjectId,
                                        topicName: topic.name,
                                        subjectName: topic.subjectName
                                      })}
                                      className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                      title="Excluir Tópico"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 my-8 w-full">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6">
                      <Search size={32} className="text-content-muted" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Nenhum resultado encontrado</h3>
                    <p className="text-content-muted max-w-sm mx-auto text-center">
                      Não encontramos tópicos que correspondam aos seus filtros atuais.
                    </p>
                    <button
                      onClick={() => { setSearchQuery(''); setStatusFilter('Todos'); setDifficultyFilter(0); }}
                      className="px-5 py-2 mt-6 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-all"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </>
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
