import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit, ChevronDown, Check, X, CheckSquare, Square, Search, GripVertical, FileText, Settings, Merge, Database, FolderUp, Loader2, Sparkles, AlertCircle, Copy, CheckCircle2, Circle, GraduationCap, Clock, RefreshCw, BarChart2, Zap, ArrowRight, Bookmark, MoveUp, Shield, Layers, FileDown, ScanText, Files, Filter, Play, Wand2, BookOpen, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate'; // Added
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { Subject, Topic, Status, UserEdital } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { useAuth } from '@/contexts/AuthContext';
import TopicsModal from '@/components/topics/TopicsModal';
import ContentUploadModal from '@/components/ContentUploadModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { SmartMergeModal } from '@/components/subjects/SmartMergeModal';
import { MergeModal } from '@/components/subjects/MergeModal';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import { CreateTopicModal } from '@/components/topics/CreateTopicModal';
import { useCycleViewManagement } from '@/hooks/useCycleViewManagement';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { useStudySessionTracking } from '@/hooks/useStudySessionTracking';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { errorService } from '@/lib/errors/errorService';
import { useEditalOrigins } from '@/hooks/useEditalOrigins';
import { suggestMerges, MergeSuggestion } from '@/utils/subjectSimilarity';
import { suggestContentBasedMerges } from '@/edutrack-review-manager/services/geminiService';
import { Suggestion as SmartMergeSuggestion } from '@/components/subjects/SmartMergeModal';
import { useAIStatus } from '@/hooks/useAIStatus';

const calculateSubjectStatus = (subject: Subject): Status => {
  if (subject.topics.length === 0) {
    return 'Nova';
  }

  // Verificar se todos os tópicos estão concluídos
  const allTopicsCompleted = subject.topics.every(topic =>
    topic.completed || topic.reviewStage === 'Concluído'
  );

  if (allTopicsCompleted) {
    return 'Concluída';
  }

  // Verificar se algum tópico foi iniciado
  const hasStartedTopics = subject.topics.some(topic =>
    (topic.reviewCount > 0 || topic.review_count > 0) ||
    (topic.reviewStage && topic.reviewStage !== '') ||
    (topic.review_stage && topic.review_stage !== '') ||
    (topic.nextReview !== undefined && topic.nextReview !== null) ||
    (topic.next_review !== undefined && topic.next_review !== null) ||
    topic.completed === true ||
    (topic.lastReviewedAt !== null && topic.lastReviewedAt !== undefined) ||
    (topic.last_reviewed_at !== null && topic.last_reviewed_at !== undefined) ||
    (topic.firstStudiedAt !== null && topic.firstStudiedAt !== undefined) ||
    (topic.first_studied_at !== null && topic.first_studied_at !== undefined)
  );

  if (hasStartedTopics) {
    return 'Em Estudo';
  }

  return 'Nova';
};

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Nova': return 'bg-secondary text-content-muted border-border';
    case 'Em Estudo': return 'bg-primary/10 text-primary border-primary/20';
    case 'Concluída': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    default: return 'bg-secondary text-content-muted border-border';
  }
};

const getStatusBorderColor = (status: Status) => {
  switch (status) {
    case 'Nova': return 'border-l-slate-300';
    case 'Em Estudo': return 'border-l-blue-500';
    case 'Concluída': return 'border-l-green-500';
    default: return 'border-l-slate-300';
  }
};

const Subjects = () => {
  const { user } = useAuth();
  const { originsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, getOriginsForSubject, refresh } = useEditalOrigins();
  const navigate = useNavigate();
  // Estado local simples - sem contextos
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Novos modais V2 states
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const ITEMS_PER_PAGE = 25;
  const [selectedSubjectsToMerge, setSelectedSubjectsToMerge] = useState<string[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSmartMergeModalOpen, setIsSmartMergeModalOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isImportEditalModalOpen, setIsImportEditalModalOpen] = useState(false);
  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'ready' | 'ia' | 'manual'>('ready');
  const [smartMergeSuggestions, setSmartMergeSuggestions] = useState<SmartMergeSuggestion[]>([]);

  const location = useLocation();

  // ── Efeito para abrir modal baseado no estado de navegação ──
  useEffect(() => {
    const state = location.state as { openImportModal?: boolean; importTab?: 'ready' | 'ia' | 'manual' } | null;
    if (state?.openImportModal) {
      setIsImportEditalModalOpen(true);
      if (state?.importTab) {
        setModalInitialTab(state.importTab);
      }
      // Limpa o estado para evitar que reabra ao atualizar a página
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Helper para gerenciar a tabela de editais (não inclusa nos types automáticos)
  const getOrCreateUserEdital = async (name: string, isImported: boolean = false) => {
    if (!user) return null;
    const sanitizedName = name.trim();
    
    // 1. Tentar buscar edital existente
    const { data: existing, error: fetchError } = await supabase
      .from('user_editais')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', sanitizedName)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao buscar edital:', fetchError);
      return null;
    }

    if (existing) return existing;

    // 2. Criar novo se não existir
    const { data: created, error: createError } = await supabase
      .from('user_editais')
      .insert({
        user_id: user.id,
        name: sanitizedName,
        is_imported: isImported,
        merged_into_cycle: false,
        subject_ids: []
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar edital:', createError);
      return null;
    }

    return created;
  };

  // ── Funções de banco para subject_relations ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  
  const saveMergeRelationToDb = async (mainSubjectId: string, mergedSubjectIds: string[]) => {
    if (!user) return false;
    try {
      // Primeiro, tenta deletar se existir
      await db
        .from('subject_relations')
        .delete()
        .eq('user_id', user.id)
        .eq('main_subject_id', mainSubjectId);
      
      // Depois, insere o novo registro
      const { error } = await db
        .from('subject_relations')
        .insert({
          user_id: user.id,
          main_subject_id: mainSubjectId,
          merged_subject_ids: mergedSubjectIds
        });
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erro ao salvar relação de mesclagem:', err);
      return false;
    }
  };

  const loadMergeRelationsFromDb = async (): Promise<Record<string, string[]>> => {
    if (!user) return {};
    try {
      const { data, error } = await db
        .from('subject_relations')
        .select('main_subject_id, merged_subject_ids')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const map: Record<string, string[]> = {};
      data?.forEach((row: { main_subject_id: string; merged_subject_ids: string[] }) => {
        map[row.main_subject_id] = row.merged_subject_ids;
      });
      return map;
    } catch (err) {
      console.error('Erro ao carregar relações de mesclagem:', err);
      return {};
    }
  };

  const removeMergeRelationFromDb = async (mainSubjectId: string) => {
    if (!user) return false;
    try {
      const { error } = await db
        .from('subject_relations')
        .delete()
        .eq('user_id', user.id)
        .eq('main_subject_id', mainSubjectId);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erro ao remover relação de mesclagem:', err);
      return false;
    }
  };

  // ── Função para buscar editais de uma matéria mesclada ──
  const getEditaisForMergedSubject = async (subjectId: string) => {
    if (!user) return [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_editais')
      .select('id, name, subject_ids, is_imported, source_id')
      .eq('user_id', user.id)
      .contains('subject_ids', [subjectId]);
    
    if (error) {
      console.error('Erro ao buscar editais:', error);
      return [];
    }
    return data || [];
  };

  // ── Função Excluir Definitivo ──
  const handleDeletePermanent = async (subjectId: string, editalIdToRemove?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // 1. Se especificado edital, remover só desse edital
      if (editalIdToRemove) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: edital } = await (supabase as any)
          .from('user_editais')
          .select('subject_ids')
          .eq('id', editalIdToRemove)
          .single();
        
        if (edital) {
          const newIds = (edital.subject_ids || []).filter((id: string) => id !== subjectId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('user_editais')
            .update({ subject_ids: newIds })
            .eq('id', editalIdToRemove);
        }
      } else {
        // 2. Se não especificado, remover de TODOS os editais
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: editais } = await (supabase as any)
          .from('user_editais')
          .select('id, subject_ids')
          .eq('user_id', user.id);
        
        if (editais) {
          for (const edital of editais) {
            if ((edital.subject_ids || []).includes(subjectId)) {
              const newIds = (edital.subject_ids || []).filter((id: string) => id !== subjectId);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from('user_editais')
                .update({ subject_ids: newIds })
                .eq('id', edital.id);
            }
          }
        }
      }

      // 3. Deletar tópicos da matéria
      await supabase
        .from('topics')
        .delete()
        .eq('subject_id', subjectId);

      // 4. Deletar a matéria
      await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      // 5. Remover relação de mesclagem se existir
      await removeMergeRelationFromDb(subjectId);

      // 6. Atualizar estado local
      setLocalSubjects(prev => prev.filter(s => s.id !== subjectId));
      
      const newMap = { ...mergedSubjectsMap };
      delete newMap[subjectId];
      setMergedSubjectsMap(newMap);
      
      refresh();
      toast.success('Matéria excluída do edital!');
    } catch (err) {
      console.error('Erro ao excluir do edital:', err);
      toastGate.notifyError('Erro ao excluir matéria. Tente novamente.', 'DEL-ERR-01', { severity: 'high' });
      errorService.report(err, { module: 'Subjects', action: 'deletePermanent', userMessage: 'Erro ao excluir matéria.' });
    } finally {
      setIsLoading(false);
      setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, isMerged: false, editais: [] });
    }
  };

  // Estado para confirmar exclusão definitiva
  const [deletePermanentConfirm, setDeletePermanentConfirm] = useState<{
    isOpen: boolean;
    subjectId: string | null;
    subjectName: string | null;
    isMerged: boolean;
    editais: Array<{ id: string; name: string; is_imported: boolean; source_id: string | null }>;
  }>({ isOpen: false, subjectId: null, subjectName: null, isMerged: false, editais: [] });

  const { aiStatus, checkAIStatus } = useAIStatus();

  const handleSuggestMerges = async () => {
    // Verificar se IA está disponível
    if (aiStatus.status === 'error' || aiStatus.status === 'inactive') {
      toastGate.notifyError(
        'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.',
        'AI_UNAVAILABLE',
        { severity: 'medium' }
      );
      return;
    }

    setIsSuggesting(true);
    try {
      // 1. Tentar primeiro com Gemini (Conteúdo + Nome)
      console.log('🤖 Chamando Gemini para sugestões de mescla...');
      const aiSuggestions = await suggestContentBasedMerges(subjects);
      
      let finalSuggestions: SmartMergeSuggestion[] = [];

      if (aiSuggestions && aiSuggestions.length > 0) {
        finalSuggestions = aiSuggestions.map((s) => ({
          ...s,
          approved: true
        })) as SmartMergeSuggestion[];
      } else {
        // 2. Fallback para similaridade de nome se Gemini não retornar nada
        console.log('⚠️ Gemini não retornou sugestões, usando fallback de similaridade...');
        finalSuggestions = suggestMerges(subjects) as SmartMergeSuggestion[];
      }

      setSmartMergeSuggestions(finalSuggestions);
      
      if (finalSuggestions.length === 0) {
        toast.info('Nenhuma sugestão de mescla encontrada no momento.');
      } else {
        setIsSmartMergeModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao sugerir mesclas:', error);
      // Fallback final
      const fallback = suggestMerges(subjects) as SmartMergeSuggestion[];
      setSmartMergeSuggestions(fallback);
      if (fallback.length > 0) setIsSmartMergeModalOpen(true);
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleSelectionForMerge = (subjectId: string) => {
    setSelectedSubjectsToMerge(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleMergeClick = () => {
    if (selectedSubjectsToMerge.length < 2) {
      toastGate.notifyError('Selecione pelo menos duas matérias para unir!', 'MERGE-ERR-01', { severity: 'low' });
      return;
    }
    setIsMergeModalOpen(true);
  };

  // Função para separar matérias mescladas
  const handleSeparate = async (subjectId: string) => {
    if (!user) return;
    
    const mergedIds = mergedSubjectsMap[subjectId];
    if (!mergedIds || mergedIds.length === 0) return;

    // Adicionar as matérias de volta ao state se não existirem
    const currentIds = new Set(localSubjects.map(s => s.id));
    const newSubjects: Subject[] = [];
    
    for (const id of mergedIds) {
      if (!currentIds.has(id)) {
        const subject = localSubjects.find(s => s.id === id);
        if (subject) {
          newSubjects.push(subject);
        }
      }
    }
    
    if (newSubjects.length > 0) {
      setLocalSubjects([...localSubjects, ...newSubjects]);
    }

    // Remover a relação de mesclagem
    const newMap = { ...mergedSubjectsMap };
    delete newMap[subjectId];
    setMergedSubjectsMap(newMap);
    
    // Salvar no banco de dados
    await removeMergeRelationFromDb(subjectId);
    
    toast.success('Matérias separadas com sucesso!');
    setConfirmHideSubjectId(null);
  };

  // Cache simples no localStorage
  const loadSubjects = useCallback(async (ignoreCache: boolean = false) => {
    console.log('📥 LOAD SUBJECTS CALLED:', {
      user: !!user,
      userId: user?.id,
      ignoreCache,
      timestamp: new Date().toISOString()
    });

    if (!user) return;

    const cacheKey = `subjects_${user.id}`;
    
    if (ignoreCache) {
      localStorage.removeItem(cacheKey);
    } else {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 300000) { // 5 minutos
            console.log('💾 USING CACHE:', { subjectsCount: data.subjects.length });
            setSubjects(data.subjects);
            return;
          }
        } catch (e) {
          console.warn('Erro ao ler cache de matérias:', e);
        }
      }
    }

    console.log('🔄 LOADING FROM DATABASE');
    if (!dataLoaded) {
      setIsLoading(true);
    }
    try {
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics(*, difficulty_level)`)
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('created_at', { foreignTable: 'topics', ascending: true });

      const transformedSubjects = transformSubjectsData(data || []);
      console.log('🔄 SETTING SUBJECTS:', {
        rawCount: data?.length || 0,
        transformedCount: transformedSubjects.length
      });
      setSubjects(transformedSubjects);

      localStorage.setItem(cacheKey, JSON.stringify({
        subjects: transformedSubjects,
        timestamp: Date.now()
      }));

      console.log('✅ DATA LOADED:', { subjectsCount: transformedSubjects.length });
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'loadSubjects',
          userMessage: 'Erro ao carregar matérias.',
          severity: 'high',
          scope: 'core',
          userId: user.id
        }
      );
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
    }
  }, [user, dataLoaded]);

  const handleApplySmartMerge = async (approvedSuggestions: SmartMergeSuggestion[]) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      for (const suggestion of approvedSuggestions) {
        const [targetId, ...sourceIds] = suggestion.subjectIds;
        
        // 1. Atualizar nome da matéria alvo
        await supabase
          .from('subjects')
          .update({ name: suggestion.suggestedName.toUpperCase() })
          .eq('id', targetId);
          
        // 2. Mover todos os tópicos das matérias fontes para a alvo
        for (const sourceId of sourceIds) {
          const { error: moveError } = await supabase
            .from('topics')
            .update({ subject_id: targetId })
            .eq('subject_id', sourceId);
            
          if (moveError) throw moveError;
          
          // 3. Deletar a matéria original
          await supabase
            .from('subjects')
            .delete()
            .eq('id', sourceId);
            
          // 4. Atualizar referências em user_editais (Essencial para manter Origem/Concurso)
          const { data: editaisWithSubject } = await supabase
            .from('user_editais')
            .select('id, subject_ids')
            .contains('subject_ids', [sourceId]);
            
          if (editaisWithSubject) {
            for (const edital of editaisWithSubject) {
              const currentIds = (edital.subject_ids as string[]) || [];
              // Substituir o ID antigo pelo novo na lista desse edital
              const updatedIds = currentIds.map(id => 
                id === sourceId ? targetId : id
              );
              // Remover duplicatas caso o targetId já estivesse nesse mesmo edital
              const uniqueIds = [...new Set(updatedIds)];
              
              const { error: editalUpdateError } = await supabase
                .from('user_editais')
                .update({ subject_ids: uniqueIds })
                .eq('id', edital.id);

              if (editalUpdateError) {
                console.error(`Erro ao atualizar edital ${edital.id}:`, editalUpdateError);
              }
            }
          }
        }
      }
      
      await refreshData();
      toast.success(`${approvedSuggestions.length} mesclas realizadas com sucesso!`);
      setIsSmartMergeModalOpen(false);
    } catch (error) {
      errorService.report(error, { 
        module: 'Subjects', 
        action: 'handleApplySmartMerge', 
        userMessage: 'Erro ao aplicar mesclas inteligentes.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    if (user) {
      localStorage.removeItem(`subjects_${user.id}`);
      localStorage.removeItem(`subjects_${user.id} `); // limpa chave antiga com espaço por segurança
      await loadSubjects();
      refresh(); // Atualiza origens do hook
      window.dispatchEvent(new CustomEvent('subjectUpdated'));
    }
  }, [user, loadSubjects, refresh]);

  const handleUnloadCycle = async (editalId: string, editalName: string, subjectIds: string[]) => {
    if (!user) return;
    setUnloadingEditalId(editalId);
    try {
      const { data: existingCycle } = await supabase
        .from('user_cycles')
        .select('id, ciclo_atual')
        .eq('user_id', user.id)
        .single();

      if (existingCycle) {
        const currentIds = (existingCycle.ciclo_atual as string[]) || [];
        const newIds = currentIds.filter(id => !subjectIds.includes(id));

        const { error } = await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: newIds,
            atualizado_em: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      const { error: editalErr } = await (supabase as any)
        .from('user_editais')
        .update({ merged_into_cycle: false, active_subject_ids: [] })
        .eq('id', editalId);

      if (editalErr) throw editalErr;

      toast.success(`"${editalName}" removido do seu ciclo.`);
      window.dispatchEvent(new CustomEvent('subjectUpdated'));
      await refreshData();
    } catch (error) {
      errorService.report(error, { module: 'Subjects', action: 'unloadCycle', userMessage: 'Erro ao remover edital do ciclo.' });
    } finally {
      setUnloadingEditalId(null);
    }
  };

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSource, setNewSubjectSource] = useState('');
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  // IDs de subjects ocultos localmente (otimismo para handleDelete)
  const [hiddenSubjectIds, setHiddenSubjectIds] = useState<Set<string>>(new Set());
  // Estado de loading por edital (para botão Remover do Ciclo)
  const [unloadingEditalId, setUnloadingEditalId] = useState<string | null>(null);
  const [unloadConfirm, setUnloadConfirm] = useState<{ 
    isOpen: boolean; 
    editalId: string | null; 
    editalName: string | null; 
    subjectIds: string[] 
  }>({
    isOpen: false,
    editalId: null,
    editalName: null,
    subjectIds: []
  });
  // Confirmação inline de exclusão de matéria
  const [confirmHideSubjectId, setConfirmHideSubjectId] = useState<string | null>(null);

  // Relações de matérias mescladas: { "materiaPrincipalId": ["materia1Id", "materia2Id"] }
  const [mergedSubjectsMap, setMergedSubjectsMap] = useState<Record<string, string[]>>({});

  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  const [expandedBeforeSearch, setExpandedBeforeSearch] = useState<string[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // Estados para edição inline
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Filter Tabs State
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Estado para o modal de tópicos
  const [topicsModal, setTopicsModal] = useState<{
    isOpen: boolean;
    subject: Subject | null;
  }>({ isOpen: false, subject: null });

  // Estado para o modal de upload de conteúdo
  const [contentUploadModal, setContentUploadModal] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Estado para o modal de anotações de matéria
  const [subjectNotesModal, setSubjectNotesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });
  const [topicToDelete, setTopicToDelete] = useState<{ id: string; name: string; subjectName: string } | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);

  // Estados para edição inline de tópicos
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [newTopicTexts, setNewTopicTexts] = useState<Record<string, string>>({});

  const handleSaveNewTopic = async (subjectId: string) => {
    const text = newTopicTexts[subjectId]?.trim();
    if (!text) return;

    try {
      // Encontrar a matéria para calcular prioridade
      const subject = localSubjects.find(s => s.id === subjectId);
      const currentTopicsCount = subject?.topics?.length || 0;

      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectId,
          name: text,
          completed: false,
          review_count: 0,
          review_stage: null,
          next_review: null,
          first_studied_at: null,
          last_reviewed_at: null,
          notes: null
        });

      if (error) throw error;

      await refreshData();

      // Limpar input
      setNewTopicTexts(prev => ({ ...prev, [subjectId]: '' }));
      toast.success('Tópico adicionado!');

      // Scroll para o novo tópico após um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        const subjectCard = document.querySelector(`[data - subject - id= "${subjectId}"]`);
        if (subjectCard) {
          const topicItems = subjectCard.querySelectorAll('[data-topic-item]');
          const lastTopic = topicItems[topicItems.length - 1];
          if (lastTopic) {
            lastTopic.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 300);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleSaveNewTopic',
          userMessage: 'Erro ao adicionar tópico',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  };

  // Hook para gerenciar visualizações duplicadas no ciclo
  const { addSubjectView, removeSubjectView, getSubjectViewCount } = useCycleViewManagement();

  // Hook para gerenciar status do ciclo de estudos
  const { isSubjectStudied, getNextSuggestedSubject, markSubjectAsStudied, isNextSuggested } = useCycleStatus();

  // Hook para tracking de sessões de estudo
  const { recordStudySession } = useStudySessionTracking();

  // Estado para armazenar o ciclo atual e contar visualizações
  const [userCycle, setUserCycle] = useState<any>(null);

  // expandedSubjectList agora é um useMemo (definido mais abaixo)

  // Carregar dados apenas uma vez por usuário
  useEffect(() => {
    if (user) {
      // Limpar chaves de cache antigas (tinham espaço extra no final - bug corrigido)
      localStorage.removeItem(`subjects_${user.id} `);
      localStorage.removeItem(`user_cycle_cache_${user.id} `);

      loadSubjects().finally(() => {
        setLoading(false);
      });

      // Listener para atualizar quando houver mudanças externas (ex: exclusão de edital)
      const handleExternalUpdate = () => {
        console.log('🔔 EXTERNAL UPDATE DETECTED - Refreshing subjects...');
        loadSubjects(true); // Força bypass do cache
      };

      window.addEventListener('subjectUpdated', handleExternalUpdate);
      return () => window.removeEventListener('subjectUpdated', handleExternalUpdate);
    } else {
      setLoading(false);
    }
  }, [user, loadSubjects]);

  // Sincronizar localSubjects quando subjects mudar
  useEffect(() => {
    if (subjects.length > 0) {
      setLocalSubjects(subjects);
    } else if (dataLoaded) {
      // Se carregou dados e está vazio, garante que o estado local também fique vazio
      setLocalSubjects([]);
    }
  }, [subjects, dataLoaded]);

  // Carregar relações de mesclagem do banco
  useEffect(() => {
    const loadMergedRelations = async () => {
      if (!user) return;
      const relations = await loadMergeRelationsFromDb();
      if (Object.keys(relations).length > 0) {
        setMergedSubjectsMap(relations);
      }
    };
    loadMergedRelations();
  }, [user]);

  // Carregar ciclo do usuário
  useEffect(() => {
    const loadUserCycle = async () => {
      if (!user) return;

      const cacheKey = `user_cycle_cache_${user.id}`;

      // 1. Tentar ler do cache primeiro para evitar flicker
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUserCycle(parsed);
        } catch (e) {
          console.error('Invalid cache', e);
        }
      }

      try {
        const { data } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        const cycleData = data?.[0] || null;

        if (cycleData) {
          setUserCycle(cycleData);
          // 2. Atualizar cache com dados frescos
          localStorage.setItem(cacheKey, JSON.stringify(cycleData));

          console.log('🔄 USER CYCLE LOADED:', {
            cycleLength: cycleData.ciclo_atual?.length || 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Erro ao carregar ciclo:', error);
      }
    };

    loadUserCycle();
  }, [user]);

  // Função auxiliar para obter a posição no ciclo
  const getCyclePosition = (itemId: string) => {
    if (!userCycle?.ciclo_atual) return null;
    // Extrair o índice do ciclo do itemId (formato: subjectId-cycleIndex)
    const cycleIndex = parseInt(itemId.split('-').pop() || '0');
    return cycleIndex + 1; // +1 porque queremos posição 1-based
  };

  // Criar lista expandida de matérias com visualizações usando useMemo
  const expandedSubjectList = useMemo(() => {
    // ── Obter IDs no ciclo para garantir visibilidade ─────────────────────
    const subjectsInCycleSet = new Set(userCycle?.ciclo_atual || []);

    // ── Filtrar: só exibir subjects "liberados" ──────────────────────────
    // Um subject é visível se:
    //   (a) não pertence a nenhum edital (adicionado diretamente na página), OU
    //   (b) está em active_subject_ids de algum edital carregado no ciclo, OU
    //   (c) já está presente no ciclo atual (garante alinhamento)
    // ── Filtrar: só exibir subjects "liberados" ──────────────────────────
    // Um subject é visível se:
    //   (a) não pertence a nenhum edital (adicionado diretamente na página), OU
    //   (b) está em active_subject_ids de algum edital carregado no ciclo, OU
    //   (c) já está presente no ciclo atual (garante alinhamento)
    const visibleSubjects = localSubjects.filter(subject => {
      // Se marcado como invisível no registro real (banco), oculta
      if (subject.is_visible === false) return false;
      if (hiddenSubjectIds.has(subject.id)) return false;   // oculto otimisticamente
      
      const isInCycle = subjectsInCycleSet.has(subject.id);
      const isFromActiveEdital = activeSubjectIdsSet.has(subject.id);

      // NOVO: Verificar se a matéria é "órfã" (não pertence a nenhum edital cadastrado)
      // Matérias legadas ou adicionadas manualmente sem vínculo devem aparecer para gestão
      const editalSubjectIds = new Set(editaisData.flatMap(e => e.subject_ids || []));
      const isOrphaned = !editalSubjectIds.has(subject.id);

      // Se está no ciclo (mesclado ou manual ativo) ou pertence a um edital carregado, ou é avulsa, mostra.
      if (isInCycle || isFromActiveEdital || isOrphaned) return true;
      
      return false; // Filtra vazamentos (matérias de outros editais não carregados)
    });

    if (!userCycle?.ciclo_atual || !visibleSubjects.length) {
      return visibleSubjects.map(subject => ({
        id: `${subject.id}-0`,
        subject,
        viewIndex: 0,
        isView: false
      }));
    }

    const expanded: Array<{
      id: string;
      subject: Subject;
      viewIndex: number;
      isView: boolean;
    }> = [];

    // Primeiro, adicionar todas as matérias do ciclo com suas visualizações
    userCycle.ciclo_atual.forEach((subjectId: string, cycleIndex: number) => {
      const subject = visibleSubjects.find(s => s.id === subjectId);
      if (!subject) return;

      // Contar quantas vezes esta matéria já apareceu antes neste ciclo
      const viewIndex = userCycle.ciclo_atual
        .slice(0, cycleIndex)
        .filter((id: string) => id === subjectId).length;

      expanded.push({
        id: `${subject.id} -${cycleIndex} `,
        subject,
        viewIndex,
        isView: viewIndex > 0
      });
    });

    // Depois, adicionar matérias visíveis que não estão no ciclo (novas matérias sem edital)
    const subjectsInCycle = new Set(userCycle.ciclo_atual);
    visibleSubjects.forEach(subject => {
      if (!subjectsInCycle.has(subject.id)) {
        expanded.push({
          id: `${subject.id} -0`,
          subject,
          viewIndex: 0,
          isView: false
        });
      }
    });

    return expanded;
  }, [userCycle?.ciclo_atual, localSubjects, activeSubjectIdsSet, hiddenSubjectIds, editaisData]);

  useEffect(() => {
    console.log('📋 SET LOCAL SUBJECTS useEffect TRIGGERED:', {
      subjectsCount: subjects.length,
      timestamp: new Date().toISOString()
    });
    setLocalSubjects(subjects);

    // Se o modal estiver aberto, atualizar também o objeto subject dentro dele
    if (topicsModal.isOpen && topicsModal.subject) {
      const updatedSubject = subjects.find(s => s.id === topicsModal.subject?.id);
      if (updatedSubject) {
        setTopicsModal(prev => ({ ...prev, subject: updatedSubject }));
      }
    }
  }, [subjects, topicsModal.isOpen, topicsModal.subject]);

  // Focar o input quando necessário
  useLayoutEffect(() => {
    if (!loading && !isAddingSubject && newSubjectName === '' && inputRef.current) {
      const timeoutId = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, newSubjectName, isAddingSubject]);

  // Efeito para manter foco após operações
  useEffect(() => {
    if (!isAddingSubject && newSubjectName === '' && inputRef.current) {
      const timeoutId = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isAddingSubject, newSubjectName]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );



  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) {
      // Não mostrar toast, apenas focar o input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    if (isImportEditalModalOpen && !newSubjectSource.trim()) {
      toastGate.notifyError('O campo Concurso / Origem é obrigatório.', 'VAL-01', { severity: 'low' });
      return;
    }

    setIsAddingSubject(true);

    try {
      // 1. Criar ou Vincular ao Edital (Origem/Concurso)
      const currentOrigin = newSubjectSource.trim() || 'MEUS ESTUDOS';
      const edital = await getOrCreateUserEdital(currentOrigin, false); // Manual (is_imported = false)

      // 2. Adicionar nova matéria
      const maxPriority = localSubjects.length > 0 ? Math.max(...localSubjects.map(s => s.priority || 0)) : 0;

      const { data: savedSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: newSubjectName.trim().toUpperCase(),
          status: 'Nova',
          color: '#3B82F6',
          priority: maxPriority + 1
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // 3. Vincular matéria ao edital no banco (Persistente)
      if (edital && savedSubject) {
        const updatedIds = [...((edital as UserEdital).subject_ids || []), savedSubject.id];
        await supabase
          .from('user_editais')
          .update({ subject_ids: updatedIds })
          .eq('id', edital.id);
      }

      await refreshData();
      refresh(); // Atualizar hook de origens

      toast.success("Matéria adicionada com sucesso!");

      // Limpar o input imediatamente
      setNewSubjectName('');
      setNewSubjectSource('');

    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      errorService.report(error as Error, { module: 'subjects', action: 'add', userMessage: "Erro ao salvar matéria. Tente novamente." });
    } finally {
      setIsAddingSubject(false);

      // Garantir que o foco seja restaurado imediatamente
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  // Funções para edição inline
  const handleStartEdit = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setEditingName(subject.name);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      return;
    }

    if (editingSubjectId && editingName.trim() !== '') {
      try {
        await supabase
          .from('subjects')
          .update({ name: editingName.trim().toUpperCase() })
          .eq('id', editingSubjectId)
          .eq('user_id', user.id);

        await refreshData();
        setEditingSubjectId(null);
        setEditingName('');
      } catch (error) {
        await errorService.report(
          error,
          {
            module: 'Subjects',
            action: 'handleSaveEdit',
            userMessage: 'Erro ao atualizar matéria. Tente novamente.',
            severity: 'medium',
            scope: 'core',
            userId: user.id
          }
        );
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingSubjectId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string) => {
    // Otimismo: oculta imediatamente da view local
    setHiddenSubjectIds(prev => new Set([...prev, id]));
    setConfirmHideSubjectId(null);
    try {
      // 1. Persistir ocultação na tabela subjects (Manual ou Edital)
      await (supabase as any)
        .from('subjects')
        .update({ is_visible: false })
        .eq('id', id);

      // 2. Se pertencer a editais, remover de active_subject_ids
      const { data: relatedEditais } = await (supabase as any)
        .from('user_editais')
        .select('id, active_subject_ids')
        .contains('active_subject_ids', [id]);

      if (relatedEditais && relatedEditais.length > 0) {
        for (const edital of relatedEditais) {
          const newActiveIds = (edital.active_subject_ids as string[]).filter(sid => sid !== id);
          await (supabase as any)
            .from('user_editais')
            .update({ active_subject_ids: newActiveIds })
            .eq('id', edital.id);
        }
      }

      refresh(); // atualiza activeSubjectIdsSet no hook
      window.dispatchEvent(new CustomEvent('subjectUpdated'));
      toast.success('Matéria ocultada da lista. Ela continua salva no edital.');
    } catch (error) {
      // Reverte otimismo
      setHiddenSubjectIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleDelete',
          userMessage: 'Erro ao ocultar matéria. Tente novamente.',
          severity: 'high',
          scope: 'core',
          userId: user.id
        }
      );
    }
  };

  const handleDeleteTopic = (topic: Topic, subjectName: string) => {
    setTopicToDelete({ id: topic.id, name: topic.name, subjectName });
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    setIsDeletingTopic(true);

    try {
      // 1. Deletar histórico primeiro
      const { error: historyError } = await supabase
        .from('topic_review_history')
        .delete()
        .eq('topic_id', topicToDelete.id);

      if (historyError) {
        console.error('⚠️ ConfirmDeleteTopic - Error deleting history (continuing anyway):', historyError);
      }

      // 2. Deletar tópico
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicToDelete.id);

      if (error) throw error;

      await refreshData();
      toast.success('Tópico excluído', { duration: 2000 });
      setTopicToDelete(null);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'confirmDeleteTopic',
          userMessage: 'Erro ao excluir tópico',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    } finally {
      setIsDeletingTopic(false);
    }
  };

  const handleStartTopicEdit = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditingTopicName(topic.name);
  };

  const handleSaveTopicEdit = async () => {
    if (!editingTopicName.trim()) {
      toastGate.notifyError('O nome do tópico não pode estar vazio', 'SUB-VAL-01', { severity: 'low' });
      return;
    }

    if (editingTopicId) {
      try {
        const { error } = await supabase
          .from('topics')
          .update({ name: editingTopicName.trim() })
          .eq('id', editingTopicId);

        if (error) throw error;

        await refreshData();
        setEditingTopicId(null);
        setEditingTopicName('');
        toast.success('Tópico atualizado', { duration: 1500 });
      } catch (error: any) {
        errorService.report(error, { module: 'subjects', action: 'update_topic', userMessage: "Erro ao atualizar tópico" });
      }
    }
  };

  const handleCancelTopicEdit = () => {
    setEditingTopicId(null);
    setEditingTopicName('');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = expandedSubjectList.findIndex((item) => item.id === active.id);
    const newIndex = expandedSubjectList.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(expandedSubjectList, oldIndex, newIndex);

    // Optimistic Update: Atualizar visualmente agora
    const newCicloAtual = reordered.map(item => item.subject.id);
    const previousUserCycle = userCycle; // Backup for rollback

    if (userCycle) {
      const newUserCycle = {
        ...userCycle,
        ciclo_atual: newCicloAtual,
        atualizado_em: new Date().toISOString()
      };

      // Update State
      setUserCycle(newUserCycle);

      // Update Cache Immediately
      if (user) {
        localStorage.setItem(`user_cycle_cache_${user.id} `, JSON.stringify(newUserCycle));
      }
    }

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: newCicloAtual,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success("Ordem do ciclo atualizada!");

      // Opcional: Recarregar para garantir sincronia (pode ser removido se o optimistic for suficiente)
      // Mas manter para garantir dados frescos do servidor
      /* 
      const { data } = await supabase
        .from('user_cycles')
        .select('ciclo_atual')
        .eq('user_id', user!.id)
        .limit(1);

      const cycleData = data?.[0] || null;

      if (cycleData) {
        setUserCycle(cycleData);
      }
      */
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleDragEnd',
          userMessage: 'Erro ao atualizar ordem do ciclo',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
      // Rollback em caso de erro
      setUserCycle(previousUserCycle);
      if (user && previousUserCycle) {
        localStorage.setItem(`user_cycle_cache_${user.id} `, JSON.stringify(previousUserCycle));
      }
    }
  };

  // Helper para determinar a cor do ícone do tópico
  const getTopicIconClass = (topic: Topic) => {
    // 1. Concluído (Verde)
    if (topic.completed || topic.reviewStage === 'Concluído') {
      return 'text-green-500';
    }

    // 2. Sem data de revisão (Cinza)
    if (!topic.nextReview) {
      return 'text-slate-300 group-hover/topic:text-indigo-400';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(topic.nextReview);
    reviewDate.setHours(0, 0, 0, 0);

    // 3. Atrasado (Vermelho)
    if (reviewDate < today) {
      return 'text-red-500';
    }

    // 4. Hoje (Laranja/Amarelo)
    if (reviewDate.getTime() === today.getTime()) {
      return 'text-orange-500';
    }

    // 5. Futuro (Azul)
    return 'text-blue-500';
  };

  // Função corrigida para calcular a Cobertura (progresso real de contato inicial)
  const getSubjectProgress = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;

    // Contar tópicos que já foram estudados
    const studiedTopics = subject.topics.filter(topic =>
      Boolean(topic.first_studied_at) || topic.reviewCount > 0 || topic.completed || topic.reviewStage === 'Concluído'
    ).length;

    return Math.round((studiedTopics / subject.topics.length) * 100);
  };

  const handleViewTopics = (subject: Subject) => {
    navigate(`/ materias / ${subject.id}/topicos`);
  };

  const toggleExpand = (itemId: string) => {
    setExpandedSubjectIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleOpenTopicsModal = (subject: Subject) => {
    setTopicsModal({ isOpen: true, subject });
  };

  const handleCloseTopicsModal = () => {
    setTopicsModal({ isOpen: false, subject: null });
    // Refresh data para atualizar a contagem de tópicos e ordem
    setTimeout(() => {
      refreshData();
    }, 200);
  };

  const handleAddSubjectView = async (subject: Subject) => {
    try {
      const success = await addSubjectView(subject.id, subject.name);
      if (success) {
        // Registrar sessão de estudo
        await recordStudySession({
          subjectId: subject.id,
          subjectName: subject.name,
          topicsStudied: subject.topics?.map(t => t.id) || [],
          topicsCount: subject.topics?.length || 0
        });

        // Recarregar ciclo para atualizar contadores
        const { data } = await supabase
          .from('user_cycles')
          .select('ciclo_atual')
          .eq('user_id', user!.id)
          .limit(1);

        const cycleData = data?.[0] || null;

        if (cycleData) {
          setUserCycle(cycleData);
        }
      }
    } catch (error: any) {
      // Erro genérico
      console.error('Erro ao adicionar visualização:', error);
      errorService.report(error, { module: 'subjects', action: 'add_topic_view', userMessage: "Erro ao adicionar visualização da matéria" });
    }
  };

  const handleRemoveSubjectView = async (subjectId: string, viewIndex: number, subjectName: string) => {
    const success = await removeSubjectView(subjectId, viewIndex, subjectName);
    if (success) {
      // Recarregar ciclo
      const { data } = await supabase
        .from('user_cycles')
        .select('ciclo_atual')
        .eq('user_id', user!.id)
        .limit(1);

      const cycleData = data?.[0] || null;

      if (cycleData) {
        setUserCycle(cycleData);
      }
      // Refresh será feito automaticamente pelo recarregamento do ciclo
    }
  };
  // Lista filtrada baseada no status selecionado
  const filteredList = useMemo(() => {
    let list = expandedSubjectList;

    // Filtragem de busca
    if (newSubjectName.trim() && !isImportEditalModalOpen) {
      const normalizeText = (text: string) =>
        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const normalizedQuery = normalizeText(newSubjectName);

      list = list.filter(item => {
        const matchesSubject = normalizeText(item.subject.name).includes(normalizedQuery);
        const hasMatchingTopic = item.subject.topics?.some(topic =>
          normalizeText(topic.name).includes(normalizedQuery)
        );
        return matchesSubject || hasMatchingTopic;
      });
    }

    if (activeTab === 'in_progress') {
      list = list.filter(item => calculateSubjectStatus(item.subject) === 'Em Estudo');
    } else if (activeTab === 'completed') {
      list = list.filter(item => calculateSubjectStatus(item.subject) === 'Concluída');
    }

    return list;
  }, [expandedSubjectList, activeTab, newSubjectName, isImportEditalModalOpen]);

  // Lista para renderizar (com paginação - Lazy Loading)
  const displayList = useMemo(() => {
    return filteredList.slice(0, visibleCount);
  }, [filteredList, visibleCount]);

  const hasMore = filteredList.length > visibleCount;

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (isLoading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const mainSubjectUI = (
    <div className="space-y-6 w-full"> {/* Changed space-y-4 to 6 to match Topics */}

      {/* Unified Header Card - Visible when there are subjects or when inside the Modal */}
      {/* Refined Header - Final Polished Layout */}
      {(localSubjects.length > 0 || isImportEditalModalOpen) && (
        <div className="flex flex-col gap-4 mb-8 relative z-20">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left Zone: search + tabs + cycle info */}
            <div className="flex flex-col gap-3 flex-1 w-full max-w-full lg:max-w-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {/* Search Input - Slightly Wider */}
                <div className="relative w-full sm:w-64 lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={isImportEditalModalOpen ? "Matéria..." : "Buscar..."}
                    value={newSubjectName}
                    onChange={(e) => {
                      const query = e.target.value;
                      const previousName = newSubjectName;
                      setNewSubjectName(query);

                      if (isImportEditalModalOpen) return;

                      if (!previousName && query.trim()) {
                        setExpandedBeforeSearch([...expandedSubjectIds]);
                      }

                      if (query.trim()) {
                        const normalizeText = (text: string) =>
                          text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

                        const normalizedQuery = normalizeText(query);
                        const newExpanded: string[] = [];

                        expandedSubjectList.forEach(item => {
                          const matchesSubject = normalizeText(item.subject.name).includes(normalizedQuery);
                          const hasMatchingTopic = item.subject.topics?.some(topic =>
                            normalizeText(topic.name).includes(normalizedQuery)
                          );
                          if (matchesSubject || hasMatchingTopic) {
                            newExpanded.push(item.id);
                          }
                        });

                        setExpandedSubjectIds(newExpanded);
                      } else {
                        setExpandedSubjectIds(expandedBeforeSearch);
                        setExpandedBeforeSearch([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (isImportEditalModalOpen) {
                          const originInput = document.getElementById('new-subject-source');
                          originInput?.focus();
                        } else {
                          handleSaveSubject();
                        }
                      }
                    }}
                    className="w-full h-10 bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-content-muted/50 shadow-sm"
                  />
                </div>

                {/* Tabs - Next to search */}
                {!isImportEditalModalOpen && (
                  <div className="flex items-center gap-1 bg-secondary/30 dark:bg-black/20 p-1 rounded-xl border border-border/50 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0">
                    {(['all', 'in_progress', 'completed'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab
                          ? 'bg-card dark:bg-zinc-800 text-foreground shadow-sm'
                          : 'text-content-muted hover:text-foreground'
                          }`}
                      >
                        {tab === 'all' ? 'Todas' : tab === 'in_progress' ? 'Em Estudo' : 'Concluídas'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Cycle Chips - Below search/tabs (Font slightly larger) */}
              {(() => {
                const activeEditais = editaisNoCiclo.filter(e =>
                  e.subject_ids.some(sid => localSubjects.find(s => s.id === sid))
                );
                if (activeEditais.length === 0 || isImportEditalModalOpen) return null;
                
                return (
                  <div className="flex flex-wrap items-center gap-2 px-1 animate-in fade-in duration-500">
                    <div className="flex items-center gap-1.5 mr-1 text-content-muted">
                      <Database size={11} className="text-primary" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Ciclo:</span>
                    </div>
                    {activeEditais.map(edital => {
                      const activeCount = edital.subject_ids.filter(sid => localSubjects.find(s => s.id === sid)).length;
                      return (
                        <div
                          key={edital.id}
                          className="group flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-lg bg-secondary/50 dark:bg-zinc-800/30 border border-border dark:border-white/5 hover:border-primary/20 transition-all"
                        >
                          <span className="text-[10px] sm:text-[11px] font-bold text-content-muted group-hover:text-foreground transition-colors">{edital.name}</span>
                          <span className="text-[9px] sm:text-[10px] text-content-muted px-1 py-0 bg-black/5 dark:bg-black/20 rounded-md">{activeCount}</span>
                          <button
                            onClick={() => setUnloadConfirm({ 
                              isOpen: true, 
                              editalId: edital.id, 
                              editalName: edital.name, 
                              subjectIds: edital.subject_ids 
                            })}
                            disabled={unloadingEditalId === edital.id}
                            className="w-4 h-4 flex items-center justify-center rounded-md hover:text-red-400 hover:bg-red-500/10 transition-all opacity-30 group-hover:opacity-100"
                          >
                            {unloadingEditalId === edital.id ? <Loader2 size={10} className="animate-spin" /> : <X size={9} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Right Zone: Action Group (Font slightly larger) */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* New Subject Action */}
              <button
                onClick={() => navigate('/meus-editais', { state: { filterCycle: true } })}
                className="h-9 px-3 bg-transparent text-content-muted hover:text-primary transition-all rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider group"
              >
                <Plus size={14} className="text-primary transition-transform group-hover:scale-110" />
                <span>Nova Matéria</span>
              </button>

              {/* Suggest Action */}
              {!isImportEditalModalOpen && (
                <button
                  onClick={handleSuggestMerges}
                  disabled={isSuggesting}
                  className="h-9 px-3 bg-transparent text-content-muted hover:text-primary transition-all rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider group disabled:opacity-50"
                >
                  {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-primary transition-transform group-hover:scale-110" />}
                  <span>Sugerir</span>
                </button>
              )}

              {/* Merge Action */}
              {!isImportEditalModalOpen && (
                <button
                  onClick={() => {
                    setIsMergeMode(!isMergeMode);
                    setSelectedSubjectsToMerge([]);
                  }}
                  className={`h-9 px-3 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider group ${isMergeMode 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'bg-transparent text-content-muted hover:text-primary'}`}
                >
                  <Merge size={14} className="text-primary transition-transform group-hover:scale-110" />
                  <span>{isMergeMode ? 'Cancelar' : 'Mesclar'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 w-full mb-12">
            {localSubjects.length === 0 ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <span className="text-4xl text-primary">📚</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                      Nenhuma matéria por aqui
                  </h3>
                  <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                      Comece adicionando sua primeira matéria ou importe um edital pronto para iniciar seus estudos.
                  </p>
                  <button
                      onClick={() => navigate('/meus-editais', { state: { filterCycle: true } })}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                      Adicionar Matéria
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                      <Search size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Nenhuma matéria ativa</h3>
                  <p className="text-content-muted max-w-sm mx-auto mb-6">
                      Todas as matérias foram ocultadas ou o edital foi removido do ciclo. Ative matérias via
                      &ldquo;Meus Editais&rdquo; ou carregue um edital no ciclo.
                  </p>
                  <button
                      onClick={() => navigate('/meus-editais')}
                      className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all shadow-sm"
                  >
                      Ir para Meus Editais
                  </button>
                </>
              )}
            </div>
          ) : (
            <SortableContext
              items={displayList.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {displayList.map((item, index) => {
                const { subject, isView, viewIndex } = item;
                const progress = getSubjectProgress(subject);
                const calculatedStatus = calculateSubjectStatus(subject);
                const isEditing = editingSubjectId === subject.id;
                const viewCount = userCycle?.ciclo_atual ? getSubjectViewCount(subject.id, userCycle.ciclo_atual) : 0;

                // Forçar sequência visual baseada na ordem da lista
                const position = index + 1;

                return (
                  <SortableItem key={item.id} id={item.id}>
                    {({ listeners, attributes }) => (
                      <div className="w-full max-w-full">
                        <div
                          data-subject-id={subject.id}
                          onClick={(e) => {
                            if (isMergeMode) {
                              toggleSelectionForMerge(subject.id);
                            } else {
                              toggleExpand(item.id);
                            }
                          }}
                          className={`glow-card p-4 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer mb-2 relative overflow-hidden ${expandedSubjectIds.includes(item.id) ? 'border-primary/30 shadow-primary/5' : ''
                            } ${selectedSubjectsToMerge.includes(subject.id) ? 'border-primary/50 bg-primary/5' : ''}`}
                        >
                          {/* Left Status Border */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusBorderColor(calculatedStatus).replace('border-l-', 'bg-')}`}
                            title={`Status: ${calculatedStatus}`}
                          />

                          <div className="flex items-center gap-3 pl-2">
                            {/* Action icon */}
                            {isMergeMode ? (
                              <div className="text-primary" onClick={(e) => { e.stopPropagation(); toggleSelectionForMerge(subject.id); }}>
                                {selectedSubjectsToMerge.includes(subject.id) ? <CheckSquare size={18} /> : <div className="w-[18px] h-[18px] rounded border-2 border-primary/50 opacity-50" />}
                              </div>
                            ) : (
                              <div className="cursor-move text-content-muted hover:text-primary transition-colors p-1 -ml-2" onClick={(e) => e.stopPropagation()} {...listeners} {...attributes}>
                                <GripVertical size={16} />
                              </div>
                            )}

                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                              <span className="text-[10px] sm:text-[11px] font-black text-primary">#{position}</span>
                            </div>

                            <div className="flex flex-col min-w-0">
                              {isEditing ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-3 w-full" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Input
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        className="h-8 text-sm flex-1 min-w-0"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveEdit();
                                          if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        autoFocus
                                      />
                                      <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0 text-green-600">
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0 text-red-600">
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4
                                      className="font-bold text-content-main text-xs sm:text-sm tracking-tight uppercase truncate max-w-[200px] sm:max-w-xs hover:text-primary cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleStartEdit(subject); }}
                                    >{subject.name}</h4>
                                    {isView && (
                                      <Badge variant="outline" className="text-[8px] px-1 bg-primary/10 text-primary border-primary/20">DUP</Badge>
                                    )}
                                    {calculatedStatus === 'Concluída' && (
                                      <Badge variant="outline" className="text-[8px] px-1 bg-green-500/10 text-green-500 border-green-500/20">CONCLUÍDO</Badge>
                                    )}
                                    <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-content-muted bg-secondary dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-border dark:border-white/5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary/80"></div>
                                      {subject.topics.length} {subject.topics.length === 1 ? 'tópico' : 'tópicos'}
                                    </span>
                                  </div>
                                  {getOriginsForSubject(subject.id, subject.edital_id).length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {getOriginsForSubject(subject.id, subject.edital_id).map((origin) => {
                                          const typeBadge = origin.sourceId ? 'CÓPIA • SISTEMA' : origin.isImported ? 'CÓPIA • IA' : 'MANUAL';
                                          return (
                                            <Badge 
                                              key={origin.name} 
                                              variant="outline" 
                                              className="text-[10px] text-primary bg-primary/5 border-primary/10"
                                            >
                                              <span className="font-black mr-1">{typeBadge}</span>
                                              {origin.name}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                       <span className="text-[9px] font-bold uppercase tracking-wider text-content-muted/40">
                                        Sem Edital
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Progress Circle */}
                            <div className="hidden sm:flex items-center justify-center relative w-8 h-8 rounded-full bg-secondary dark:bg-deep-slate border border-border dark:border-white/5 mr-2">
                              <svg className="w-full h-full -rotate-90 transform p-0.5" viewBox="0 0 36 36">
                                <circle className="text-black/5 dark:text-white/5" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                                <circle className="text-primary transition-all duration-1000 ease-out" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                              </svg>
                              <span className="absolute text-[8px] font-bold text-content-main">{progress}%</span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSubjectNotesModal({ isOpen: true, subjectId: subject.id, subjectName: subject.name }); }}
                                title="Anotações"
                                className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                              >
                                <FileText size={14} />
                              </button>

                              {isView ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveSubjectView(subject.id, viewIndex, subject.name); }}
                                  title="Remover Cópia"
                                  className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-content-muted hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ) : (
                                <>
                                  {calculatedStatus !== 'Concluída' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAddSubjectView(subject); }}
                                      title="Duplicar no Ciclo"
                                      className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-content-muted hover:text-primary relative"
                                    >
                                      <Files size={14} />
                                      {!isView && viewCount > 1 && (
                                        <span className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center rounded-full text-[8px] font-bold bg-primary text-white">
                                          {viewCount - 1}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                  {/* Botão Excluir do Edital */}
                                  {!isView && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const editais = await getEditaisForMergedSubject(subject.id);
                                        // Verifica se é matéria mesclada (chave principal ou se é uma das mescladas)
                                        const isMainMerged = !!mergedSubjectsMap[subject.id];
                                        const isPartOfMerged = Object.values(mergedSubjectsMap).some(arr => arr.includes(subject.id));
                                        const isMerged = isMainMerged || isPartOfMerged;
                                        setDeletePermanentConfirm({
                                          isOpen: true,
                                          subjectId: subject.id,
                                          subjectName: subject.name,
                                          isMerged: isMerged,
                                          editais: editais.map(ed => ({ id: ed.id, name: ed.name, is_imported: ed.is_imported, source_id: ed.source_id }))
                                        });
                                      }}
                                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-content-muted hover:text-red-500"
                                      title="Excluir do Edital"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </>
                              )}

                            </div>

                            <div className="w-px h-4 bg-black/5 dark:bg-white/5 mx-0.5"></div>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                              className={`p-1.5 hover:bg-primary/10 rounded-lg transition-all text-content-muted hover:text-primary ${expandedSubjectIds.includes(item.id) ? 'rotate-180 text-primary' : ''
                                }`}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        </div>
                        {/* Expanded Content (Topics List) */}
                        {expandedSubjectIds.includes(item.id) && (
                          <div className="mt-2 ml-4 p-3 rounded-xl bg-secondary dark:bg-black/20 space-y-2 border border-border dark:border-white/5 relative z-10" onClick={e => e.stopPropagation()}>
                            {/* Inline Topic Input */}
                            <div className="relative group">
                              <input
                                type="text"
                                placeholder="Novo tópico..."
                                value={newTopicTexts[subject.id] || ''}
                                onChange={(e) => setNewTopicTexts(prev => ({ ...prev, [subject.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveNewTopic(subject.id);
                                }}
                                className="w-full bg-background dark:bg-white/5 border border-border dark:border-white/5 rounded-lg py-1.5 px-3 pr-8 text-xs focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/50"
                              />
                              <button
                                onClick={() => handleSaveNewTopic(subject.id)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-all"
                                title="Adicionar Tópico"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {subject.topics.length === 0 ? (
                              <div className="py-4 text-center text-[10px] text-content-muted uppercase font-bold tracking-widest">Nenhum tópico cadastrado</div>
                            ) : (
                              <div className="space-y-1">
                                {subject.topics.map((topic, idx) => {
                                  const isCompleted = topic.completed || topic.reviewStage === 'Concluído';
                                  const iconClass = getTopicIconClass(topic);

                                  return (
                                    <div key={topic.id} data-topic-item className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 dark:bg-white/5 hover:bg-secondary/60 dark:hover:bg-white/10 transition-all group/topic relative">
                                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                                        <span className="text-[9px] font-bold text-content-muted w-4 flex-shrink-0">{idx + 1}.</span>
                                        <div className={`flex-shrink-0 transition-colors ${iconClass}`}>
                                          {isCompleted ? <CheckCircle2 size={16} className="fill-green-100 dark:fill-green-900/40 text-green-600" /> : <Circle size={16} className="text-content-muted" />}
                                        </div>

                                        {editingTopicId === topic.id ? (
                                          <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <input
                                              type="text"
                                              value={editingTopicName}
                                              onChange={(e) => setEditingTopicName(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveTopicEdit();
                                                if (e.key === 'Escape') handleCancelTopicEdit();
                                                e.stopPropagation();
                                              }}
                                              className="h-7 text-xs py-1 px-2 w-full bg-white dark:bg-slate-800 border border-primary/30 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                              autoFocus
                                            />
                                            <button onClick={handleSaveTopicEdit} className="h-6 w-6 flex items-center justify-center text-green-600 hover:bg-green-100 rounded">
                                              <Check size={14} />
                                            </button>
                                            <button onClick={handleCancelTopicEdit} className="h-6 w-6 flex items-center justify-center text-red-600 hover:bg-red-100 rounded">
                                              <X size={14} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div
                                            className="flex flex-col flex-1 min-w-0 cursor-text"
                                            onClick={() => handleStartTopicEdit(topic)}
                                          >
                                            <span className={`text-xs font-medium truncate ${isCompleted ? 'text-content-muted line-through' : 'text-content-main'}`}>
                                              {topic.name}
                                            </span>
                                            <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest mt-0.5">
                                              {Boolean(topic.first_studied_at) || topic.reviewCount > 0 ? "ESTUDADO" : "NÃO INICIADO"}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-end relative min-w-[100px]">
                                        {/* Indicador de Origem (Mostra em estado normal) */}
                                        <div className="flex items-center gap-1.5 transition-all duration-300 opacity-100 group-hover/topic:opacity-0 group-hover/topic:pointer-events-none group-hover/topic:translate-x-4">
                                          {getOriginsForSubject(subject.id, subject.edital_id).map((origin, i) => {
                                            const typeBadge = origin.sourceId ? 'CÓPIA • SISTEMA' : origin.isImported ? 'CÓPIA • IA' : 'MANUAL';
                                            return (
                                              <span 
                                                key={i} 
                                                className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-1.5 py-0.5 rounded border text-primary/60 bg-primary/5 border-primary/10"
                                              >
                                                {typeBadge} {origin.name}
                                              </span>
                                            );
                                          })}
                                          {(!originsMap.get(subject.id) || originsMap.get(subject.id)!.length === 0) && (
                                             <span className="text-[9px] font-black text-content-muted/40 uppercase tracking-widest whitespace-nowrap">
                                              Manual
                                            </span>
                                          )}
                                        </div>

                                        {/* Action Buttons (Mostra no HOVER) */}
                                        <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-all duration-300 translate-x-4 group-hover/topic:translate-x-0">
                                          <button className="h-6 px-2 flex items-center gap-1 rounded bg-primary/10 text-primary hover:bg-primary transition-all hover:text-white text-[9px] font-bold uppercase tracking-tight">
                                            <Wand2 size={10} /> IA
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic, subject.name); }}
                                            className="h-6 w-6 flex items-center justify-center text-content-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Excluir tópico"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </SortableItem>
                );
              })}
            </div>
            </SortableContext>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 flex justify-center pb-12">
              <button
                onClick={handleLoadMore}
                className="group relative px-8 py-3 bg-card dark:bg-zinc-900 border border-border dark:border-white/5 rounded-2xl flex items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <RefreshCw size={16} className="text-primary group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-xs font-bold text-foreground group-hover:text-primary tracking-widest uppercase">
                  Ver mais matérias ({filteredList.length - visibleCount} restantes)
                </span>
                <ChevronDown size={14} className="text-content-muted group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </DndContext>
    </div >
  );

  return (
    <div className="flex w-full text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex-1 flex flex-col relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 px-4 md:px-8 pb-8 pt-0">
          {!isImportEditalModalOpen && mainSubjectUI}
        </main>

        {/* Modals positioned within the layout */}
        <div className="relative z-50">
          <CreateTopicModal
            isOpen={isCreateTopicModalOpen}
            onClose={() => setIsCreateTopicModalOpen(false)}
            onTopicCreated={() => refreshData()}
          />

          {topicsModal.subject && (
            <TopicsModal
              isOpen={topicsModal.isOpen}
              onClose={handleCloseTopicsModal}
              subject={topicsModal.subject}
              onUpdate={refreshData}
            />
          )}

          <AlertDialog open={!!topicToDelete} onOpenChange={(open) => !open && setTopicToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o tópico <strong>"{topicToDelete?.name}"</strong> da matéria <strong>"{topicToDelete?.subjectName}"</strong>?
                  <br /><br />
                  Esta ação não pode ser desfeita e todos os dados de revisão serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingTopic}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    confirmDeleteTopic();
                  }}
                  disabled={isDeletingTopic}
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                >
                  {isDeletingTopic ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog 
            open={unloadConfirm.isOpen} 
            onOpenChange={(open) => !open && setUnloadConfirm(prev => ({ ...prev, isOpen: false }))}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover do Ciclo Ativo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover o edital <strong>"{unloadConfirm.editalName}"</strong> do seu ciclo de estudos?
                  <br /><br />
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400 text-sm">
                    <p><strong>Fique tranquilo:</strong> Seu histórico de estudo e revisões <strong>não será perdido</strong>.</p>
                    <p className="mt-1">Todo seu progresso ficará preservado no <strong>Histórico Total</strong> das páginas de Estatísticas e Dashboard.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={unloadingEditalId === unloadConfirm.editalId}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    if (unloadConfirm.editalId) {
                      handleUnloadCycle(unloadConfirm.editalId, unloadConfirm.editalName || '', unloadConfirm.subjectIds);
                      setUnloadConfirm(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                  disabled={unloadingEditalId === unloadConfirm.editalId}
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                >
                  {unloadingEditalId === unloadConfirm.editalId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog 
            open={deletePermanentConfirm.isOpen} 
            onOpenChange={(open) => !open && setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, isMerged: false, editais: [] })}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Excluir do Edital
                </AlertDialogTitle>
                <div className="space-y-3 pt-2">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-400">
                      Matéria: <strong className="text-blue-200">{deletePermanentConfirm.subjectName}</strong>
                    </p>
                  </div>
                  <p>Tem certeza que deseja <strong>excluir esta matéria do edital</strong>?</p>
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-sm">
                    <p className="font-medium">Atenção: Esta ação não pode ser desfeita!</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Todos os tópicos serão excluídos</li>
                      <li>Todo o histórico de revisões será perdido</li>
                      <li>A matéria será removida do edital</li>
                    </ul>
                  </div>
                  
                  {deletePermanentConfirm.editais.length > 1 && (
                    <div className="mt-4">
                      <p className="font-medium text-foreground mb-2">Esta matéria pertence a múltiplos editais. De qual deseja remover?</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {deletePermanentConfirm.editais.map((edital) => {
                          // Verifica se é o edital original do sistema (não é cópia)
                          const isOriginalSystem = !edital.source_id && edital.is_imported;
                          return (
                          <button
                            key={edital.id}
                            onClick={() => {
                              if (isOriginalSystem) {
                                toastGate.notifyError('Não é possível excluir matérias do edital original do sistema!', 'DEL-SYS-01', { severity: 'high' });
                                return;
                              }
                              handleDeletePermanent(deletePermanentConfirm.subjectId!, edital.id);
                            }}
                            disabled={isOriginalSystem}
                            className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between ${
                              isOriginalSystem
                                ? 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed' 
                                : 'border-border hover:border-red-500 hover:bg-red-500/5'
                            }`}
                          >
                            <span className="text-sm">{edital.name}</span>
                            <div className="flex items-center gap-1">
                              {edital.source_id ? (
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  CÓPIA • SISTEMA
                                </span>
                              ) : edital.is_imported ? (
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  CÓPIA • IA
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  MANUAL
                                </span>
                              )}
                            </div>
                          </button>
                        );
                        })}
                        <button
                          onClick={() => handleDeletePermanent(deletePermanentConfirm.subjectId!)}
                          className="w-full text-left p-2 rounded-lg border border-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all"
                        >
                          <span className="text-sm font-medium text-red-400">Remover de TODOS os editais</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {deletePermanentConfirm.editais.length === 1 && (() => {
                    const edil = deletePermanentConfirm.editais[0];
                    const isOriginalSystem = !edil.source_id && edil.is_imported;
                    return (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      {isOriginalSystem ? (
                        <p className="text-amber-400">
                          <strong>Não é possível excluir</strong> esta matéria pois pertence ao edital original do sistema.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">Edital:</span>
                            <strong className="text-foreground text-sm">"{deletePermanentConfirm.editais[0].name}"</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-content-muted text-xs">Tipo:</span>
                            {deletePermanentConfirm.editais[0].source_id ? (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                CÓPIA • SISTEMA
                              </span>
                            ) : deletePermanentConfirm.editais[0].is_imported ? (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                CÓPIA • IA
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                MANUAL
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {deletePermanentConfirm.editais.length === 0 && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-foreground">
                        A matéria não está vinculada a nenhum edital e será <strong>excluída permanentemente</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                {deletePermanentConfirm.isMerged && (
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      if (deletePermanentConfirm.subjectId) {
                        handleSeparate(deletePermanentConfirm.subjectId);
                        setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, isMerged: false, editais: [] });
                      }
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-4 h-4" />
                    Separar Matérias
                  </AlertDialogAction>
                )}
                {deletePermanentConfirm.editais.length <= 1 && (deletePermanentConfirm.editais.length === 0 || !(deletePermanentConfirm.editais[0].is_imported && !deletePermanentConfirm.editais[0].source_id)) && (
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      if (deletePermanentConfirm.subjectId) {
                        handleDeletePermanent(deletePermanentConfirm.subjectId);
                      }
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <ImportEditalModal
            isOpen={isImportEditalModalOpen}
            onClose={() => setIsImportEditalModalOpen(false)}
            initialTab={modalInitialTab}
            manualModeChildren={mainSubjectUI}
            onImport={async (importedSubjects, editalName, isImported = true) => {
              if (!user) return;
              setIsLoading(true);
              try {
                // 1. Obter ou Criar o Edital
                const originName = editalName || 'IMPORTADO';
                const edital = await getOrCreateUserEdital(originName, isImported); // Use provided isImported flag
                const newSubjectIds: string[] = [];

                // 2. Processar cada matéria
                for (const subj of importedSubjects) {
                  // Inserir Matéria
                  const { data: newSubj, error: sErr } = await supabase
                    .from('subjects')
                    .insert({
                      user_id: user.id,
                      name: subj.name.trim().toUpperCase(),
                      status: 'Nova',
                      priority: localSubjects.length + newSubjectIds.length + 1
                    })
                    .select()
                    .single();
                  
                  if (sErr) throw sErr;
                  if (newSubj) {
                    newSubjectIds.push(newSubj.id);
                    
                    // Inserir Tópicos
                    if (subj.topics && subj.topics.length > 0) {
                      const topicsToInsert = subj.topics.map((t, idx) => ({
                        user_id: user.id,
                        subject_id: newSubj.id,
                        name: t.name,
                        position: (t as any).position ?? idx
                      }));
                      
                      const { error: tErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert);
                        
                      if (tErr) throw tErr;
                    }
                  }
                }

                // 3. Vincular ao Edital
                if (edital) {
                  const combinedIds = [...(edital.subject_ids || []), ...newSubjectIds];
                  await (supabase as any)
                    .from('user_editais')
                    .update({ subject_ids: combinedIds })
                    .eq('id', edital.id);
                }

                await refreshData();
                refresh(); // Atualizar hook useEditalOrigins
                window.dispatchEvent(new CustomEvent('subjectUpdated'));
                toast.success(`${importedSubjects.length} matérias vinculadas a "${originName}" com sucesso!`);
                setIsImportEditalModalOpen(false);
              } catch (err) {
                errorService.report(err, { module: 'Subjects', action: 'import', userMessage: 'Erro ao importar matérias.' });
              } finally {
                setIsLoading(false);
              }
            }}
            subjects={subjects}
          />

          <MergeModal
            isOpen={isMergeModalOpen}
            onClose={() => setIsMergeModalOpen(false)}
            selectedSubjects={subjects.filter(s => selectedSubjectsToMerge.includes(s.id))}
            onConfirm={async (finalName) => {
              if (!user) return;
              
              const subjectsToMerge = subjects.filter(s => selectedSubjectsToMerge.includes(s.id));
              if (subjectsToMerge.length < 2) return;
              
              try {
                // 1. Criar nova matéria com o nome escolhido
                const { data: newSubject, error: subjectError } = await supabase
                  .from('subjects')
                  .insert({
                    user_id: user.id,
                    name: finalName.toUpperCase(),
                    status: 'Nova',
                    priority: Math.max(...subjectsToMerge.map(s => s.priority || 0), 0) + 1
                  })
                  .select()
                  .single();
                
                if (subjectError) throw subjectError;
                
                // 2. Coletar todos os tópicos de todas as matérias
                const allTopics: { name: string; position: number }[] = [];
                subjectsToMerge.forEach(s => {
                  if (s.topics) {
                    s.topics.forEach((t, idx) => {
                      allTopics.push({ name: t.name, position: allTopics.length + 1 });
                    });
                  }
                });
                
                // 3. Inserir todos os tópicos na nova matéria
                if (allTopics.length > 0) {
                  const topicsToInsert = allTopics.map(t => ({
                    user_id: user.id,
                    subject_id: newSubject.id,
                    name: t.name,
                    position: t.position
                  }));
                  
                  const { error: topicsError } = await supabase
                    .from('topics')
                    .insert(topicsToInsert);
                  
                  if (topicsError) throw topicsError;
                }
                
                // 4. Guardar a relação de mesclagem no banco de dados
                const mergedIds = subjectsToMerge.map(s => s.id);
                const newMap = { ...mergedSubjectsMap, [newSubject.id]: mergedIds };
                setMergedSubjectsMap(newMap);
                
                await saveMergeRelationToDb(newSubject.id, mergedIds);
                
                // 5. Atualizar o state local para mostrar só a matéria mesclada
                const newSubjectWithTopics: Subject = {
                  id: newSubject.id,
                  name: newSubject.name,
                  status: 'Nova' as Status,
                  priority: newSubject.priority,
                  color: newSubject.color || '#3B82F6',
                  topics: allTopics.map((t, idx) => ({
                    id: `temp-${idx}`,
                    name: t.name,
                    subject_id: newSubject.id,
                    position: t.position,
                    completed: false,
                    reviewCount: 0,
                    review_count: 0,
                    reviewStage: 'Não Iniciado',
                    review_stage: 'Não Iniciado'
                  }))
                };
                
                setLocalSubjects(prev => [
                  ...prev.filter(s => !mergedIds.includes(s.id)),
                  newSubjectWithTopics
                ]);
                
                toast.success(`Matérias unidas em "${finalName}" com ${allTopics.length} tópicos!`);
              } catch (err) {
                console.error('Erro ao mesclar matérias:', err);
                errorService.report(err as Error, { module: 'Subjects', action: 'merge', userMessage: 'Erro ao mesclar matérias.' });
              }
              
              setIsMergeModalOpen(false);
              setSelectedSubjectsToMerge([]);
              setIsMergeMode(false);
            }}
          />

          <SmartMergeModal
            isOpen={isSmartMergeModalOpen}
            onClose={() => setIsSmartMergeModalOpen(false)}
            subjects={subjects}
            suggestions={smartMergeSuggestions}
            onApply={handleApplySmartMerge}
          />

          <ContentUploadModal
            open={contentUploadModal}
            onOpenChange={setContentUploadModal}
            onSuccess={refreshData}
          />

          <SubjectNotesModal
            isOpen={subjectNotesModal.isOpen}
            onClose={() => {
              setSubjectNotesModal(prev => ({ ...prev, isOpen: false }));
              setTimeout(() => {
                refreshData();
              }, 200);
            }}
            subjectId={subjectNotesModal.subjectId}
            subjectName={subjectNotesModal.subjectName}
          />
        </div>
      </div>
    </div>
  );
};

export default Subjects;
