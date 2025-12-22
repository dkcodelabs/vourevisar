import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Search,
  FileText,
  Check,
  Sparkles,
  Star,
  ChevronDown,
  ChevronRight,
  Loader2,
  PlayCircle,
  RotateCw,
  Clock,
  BookOpen,
  AlertCircle,
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { ChevronsDownIcon, ChevronsUpIcon } from '@/components/study-cycle/Icons';

import { useApp } from '@/contexts/AppContext';
import { useReviewsData } from '@/hooks/useReviewsData';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useUserSettings } from '@/hooks/useUserSettings';
import { RevisionItem, RevisionStatus } from '@/types/revision';
import { ReviewProfile, REVIEW_PROFILES } from '@/types/study';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { StatusBadge } from '@/components/reviews/new/StatusBadge';

import NotesModal from '@/components/reviews/NotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';

type ViewTab = 'FOCUS' | 'FUTURE' | 'COMPLETED' | 'SUBJECTS';

const Revisoes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Existing Hooks
  const { subjects, refreshData } = useApp();
  const {
    markTopicAsReviewed,
    openReviewModal,
    difficultyModalData,
    openDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating
  } = useTopicReview();

  const {
    topics,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics
  } = useReviewsData();

  const { settings } = useUserSettings();

  // New Layout State
  const [activeTab, setActiveTab] = useState<ViewTab>('FOCUS');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedItemForAI, setSelectedItemForAI] = useState<RevisionItem | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [reviewStageFilter, setReviewStageFilter] = useState<string>('all');

  // Modal States
  const [notesModalData, setNotesModalData] = useState<{
    isOpen: boolean;
    topicId: string;
    topicName: string;
    subjectName: string;
  }>({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectName: ''
  });

  const [subjectNotesModal, setSubjectNotesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });

  // Effect to handle URL params
  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (subjectId) {
      setActiveTab('SUBJECTS');
    }
  }, [searchParams]);

  // Effect to reload data on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
        refreshData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch, refreshData]);

  // Transform Data to RevisionItem
  const items: RevisionItem[] = useMemo(() => {
    const allItems: RevisionItem[] = [];

    // Helper to map topic to item
    const mapTopicToItem = (topic: any, status: RevisionStatus): RevisionItem => {
      const subject = subjects.find(s => s.id === topic.subject_id);

      // Calculate review count and max reviews
      const userProfile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
      const maxReviews = REVIEW_PROFILES[userProfile].maxReviews;
      const actualReviewCount = topic.reviewCount || topic.review_count || 0;
      const reviewCount = status === 'COMPLETED'
        ? maxReviews
        : Math.min(actualReviewCount, maxReviews); // Removido o -1

      return {
        id: topic.id,
        topic: topic.name,
        subject: subject?.name || 'Desconhecida',
        subjectId: topic.subject_id,
        difficulty: topic.difficulty_level || 0,
        dueDate: topic.next_review || new Date().toISOString(),
        notes: topic.notes || '',
        status: status,
        ownerImage: '', // Placeholder
        reviewCount,
        maxReviews
      };
    };

    delayedTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.OVERDUE)));
    todayTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.TODAY)));
    futureTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.FUTURE)));
    completedTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.COMPLETED)));

    let result = allItems;

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.topic.toLowerCase().includes(lowerTerm) ||
        item.subject.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter by review stage
    if (reviewStageFilter !== 'all') {
      const targetStage = parseInt(reviewStageFilter);
      result = result.filter(item => item.reviewCount === targetStage);
    }

    return result;
  }, [delayedTopics, todayTopics, futureTopics, completedTopics, subjects, searchTerm, reviewStageFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      today: todayTopics.length,
      overdue: delayedTopics.length,
      future: futureTopics.length,
      completed: completedTopics.length,
    };
  }, [todayTopics, delayedTopics, futureTopics, completedTopics]);

  // Grouping Logic
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: RevisionItem[] } = {};

    if (activeTab === 'SUBJECTS') {
      items.forEach(item => {
        if (!groups[item.subject]) groups[item.subject] = [];
        groups[item.subject].push(item);
      });
    } else {
      const targetStatuses: string[] = [];
      if (activeTab === 'FOCUS') {
        targetStatuses.push(RevisionStatus.TODAY); // Show today first
        targetStatuses.push(RevisionStatus.OVERDUE);
      } else if (activeTab === 'FUTURE') {
        targetStatuses.push(RevisionStatus.FUTURE);
      } else if (activeTab === 'COMPLETED') {
        targetStatuses.push(RevisionStatus.COMPLETED);
      }

      targetStatuses.forEach(status => groups[status] = []);

      items.forEach(item => {
        if (targetStatuses.includes(item.status)) {
          groups[item.status].push(item);
        }
      });
    }
    return groups;
  }, [items, activeTab]);

  // Helpers
  const getDaysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 text-gray-900 rounded-[2px] px-0.5">{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Auto-expand on filter
  useEffect(() => {
    if (searchTerm || reviewStageFilter !== 'all') {
      setCollapsedGroups({});
    }
  }, [searchTerm, reviewStageFilter]);

  // Logic for Single Expand Toggle
  const allKeys = Object.keys(groupedItems || {});
  // Check if ALL keys are present in collapsedGroups and are true (collapsed)
  // Note: The logic in StudyCycle is "areAllExpanded". Here we track "collapsed".
  // "Expanded" means NOT collapsed.
  // So areAllExpanded = every key is NOT in collapsedGroups OR is false.
  const areAllExpanded = allKeys.length > 0 && allKeys.every(key => !collapsedGroups[key]);

  const handleToggleAll = () => {
    if (areAllExpanded) {
      // Collapse all
      const newCollapsedState = allKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
      setCollapsedGroups(newCollapsedState);
    } else {
      // Expand all (clear collapsed state)
      setCollapsedGroups({});
    }
  };

  const toggleSubjectView = () => {
    if (activeTab === 'SUBJECTS') {
      setActiveTab('FOCUS'); // Toggle off -> go to default Focus
    } else {
      setActiveTab('SUBJECTS');
    }
  };

  const getGroupStyle = (groupKey: string) => {
    switch (groupKey) {
      case RevisionStatus.OVERDUE: return { title: 'Atrasadas', color: 'border-red-400', text: 'text-red-500' };
      case RevisionStatus.TODAY: return { title: 'Hoje', color: 'border-orange-500', text: 'text-orange-600' };
      case RevisionStatus.FUTURE: return { title: 'Futuras', color: 'border-blue-500', text: 'text-blue-600' };
      case RevisionStatus.COMPLETED: return { title: 'Concluídas', color: 'border-green-500', text: 'text-green-600' };
      default: return { title: groupKey, color: 'border-purple-500', text: 'text-purple-600' };
    }
  };

  // Actions
  const handleMarkCompleted = async (id: string) => {
    try {
      // Novo fluxo: abrir modal primeiro (n\u00e3o marca ainda)
      await openReviewModal(id);
    } catch (error) {
      console.error('Erro ao abrir modal de revis\u00e3o:', error);
      toast.error('Erro ao abrir modal de revis\u00e3o');
    }
  };

  const handleAiAssist = async (item: RevisionItem) => {
    setSelectedItemForAI(item);
    setAiExplanation('');
    setIsAiLoading(true);

    // Simulate AI delay since we don't have the service yet
    setTimeout(() => {
      setAiExplanation(`Esta é uma explicação simulada para o tópico: ** ${item.topic}**.\n\nO recurso de IA será integrado em breve para fornecer resumos detalhados e dicas de estudo personalizadas.`);
      setIsAiLoading(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] w-full text-gray-900 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Header Section */}
        {/* Header Section */}
        <header className="mt-[15px] px-4 md:px-8 pt-6 pb-6 mb-4 shrink-0 bg-white rounded-2xl border border-gray-200 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mt-1">Painel de controle de repetição espaçada</p>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] my-2"></div>
            </div>
            <div className="flex w-full md:w-auto items-center gap-3">
              {/* Controls moved to tabs row */}
            </div>
          </div>

          {/* Navigation Tabs */}
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 md:gap-2 mt-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 md:-mx-8 md:px-8">
            <button
              onClick={() => setActiveTab('FOCUS')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'FOCUS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } `}
            >
              <span>Hoje</span>
              {stats.today > 0 && (
                <span className="bg-orange-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{stats.today}</span>
              )}
              <span className="mx-1">&</span>
              <span>Atrasadas</span>
              <span className="bg-red-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{stats.overdue}</span>
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1 shrink-0"></div>

            <button
              onClick={() => setActiveTab('FUTURE')}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'FUTURE'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } `}
            >
              <span>Futuras</span>
              <span className="bg-blue-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {stats.future}
              </span>
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1 shrink-0"></div>

            <button
              onClick={() => {
                setActiveTab('COMPLETED');
                setReviewStageFilter('all');
              }}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'COMPLETED'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } `}
            >
              <span>Concluídas</span>
              <span className="bg-green-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {stats.completed}
              </span>
            </button>
          </div>

          {/* Controls: Reorganized for mobile */}
          <div className="mt-4 flex flex-col gap-3">
            {/* Line 1: Search only */}
            <div className="relative w-full md:w-auto md:max-w-md bg-gray-50/50 border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200 h-9">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full pl-9 pr-4 text-xs bg-transparent border-none shadow-none focus:ring-0 placeholder:text-gray-400 h-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Line 2: Toggle + Por Matéria + Status */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Button */}
              <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg h-9 shrink-0">
                <button
                  onClick={handleToggleAll}
                  className="p-1 px-3 h-full rounded-md text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center min-w-[3rem]"
                  aria-label={areAllExpanded ? "Recolher Todos" : "Expandir Todos"}
                  title={areAllExpanded ? "Recolher Todos" : "Expandir Todos"}
                >
                  {areAllExpanded ? <ChevronsUpIcon className="w-4 h-4" /> : <ChevronsDownIcon className="w-4 h-4" />}
                </button>
              </div>

              {/* Por Matéria Button */}
              <button
                onClick={toggleSubjectView}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap h-9 shrink-0 ${activeTab === 'SUBJECTS'
                  ? 'border-blue-200 text-blue-700 bg-blue-50'
                  : 'border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                title="Agrupar por Matéria"
              >
                <BookOpen size={14} />
                <span>Por Matéria</span>
              </button>

              {/* Status Filter */}
              {activeTab !== 'COMPLETED' && (
                <div className="w-auto min-w-[140px]">
                  <Select value={reviewStageFilter} onValueChange={setReviewStageFilter}>
                    <SelectTrigger className="h-9 text-xs font-medium border-gray-200 bg-white shadow-sm rounded-lg focus:ring-blue-500/20">
                      <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                        <Clock size={12} className="text-blue-500 shrink-0" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Status</SelectItem>
                      {Array.from({ length: REVIEW_PROFILES[settings?.review_profile || ReviewProfile.INTERMEDIATE].maxReviews }).map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                          {i + 1}ª Revisão
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </header>

        {(searchTerm || reviewStageFilter !== 'all') && (
          <div className="px-4 md:px-8 mb-4 shrink-0 animate-in fade-in slide-in-from-top-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Filtrando por:
                    {searchTerm && <span className="font-bold ml-1">"{searchTerm}"</span>}
                    {searchTerm && reviewStageFilter !== 'all' && <span className="mx-1">+</span>}
                    {reviewStageFilter !== 'all' && <span className="font-bold ml-1">{reviewStageFilter}ª Revisão</span>}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {searchTerm && reviewStageFilter !== 'all'
                      ? "Filtro no nome do tópico e status da revisão."
                      : searchTerm
                        ? "Filtro no nome do tópico."
                        : "Filtro por status da revisão."
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setReviewStageFilter('all');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 shadow-sm rounded-md text-xs font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                title="Limpar e mostrar tudo"
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar mr-1">

          {Object.entries(groupedItems).map(([key, groupItems]: [string, RevisionItem[]]) => {
            if (groupItems.length === 0) return null;
            const style = getGroupStyle(key);
            const isCollapsed = collapsedGroups[key];

            return (
              <div key={key} className="mb-6 md:mb-8">
                {/* Group Header */}
                <div
                  className="flex items-center mb-3 group cursor-pointer select-none"
                  onClick={() => toggleGroup(key)}
                >
                  <div className={`mr - 2 p - 1 rounded - sm text - gray - 400 hover: bg - gray - 200 transition - colors`}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </div>
                  <h2 className={`text-xs font - bold ${style.text} flex items - center`}>
                    {style.title}
                  </h2>
                  <span className="ml-3 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-semibold">{groupItems.length}</span>
                </div>

                {/* Collapsible Content */}
                {!isCollapsed && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table Header - INTEGRATED */}
                    <div className="hidden lg:grid grid-cols-[1fr_100px_160px_120px] gap-0 border-b border-gray-200 bg-gray-50/80 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                      <div className="pl-8">Tópico / Matéria</div>
                      <div className="text-center">Dificuldade</div>
                      <div className="text-center">Status</div>
                      <div className="text-center">Ações</div>
                    </div>

                    {/* Rows */}
                    <div>
                      {groupItems.map((item) => (
                        <div key={item.id} className="
                          group relative border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors
                          flex flex-col lg:grid lg:grid-cols-[1fr_100px_160px_120px] lg:gap-0
                        ">
                          {/* Sticky Left Color Bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.color.replace('border-', 'bg-')}`}></div>

                          {/* Mobile: Vertical layout */}
                          <div className="lg:hidden px-4 pt-4">
                            {/* Line 1: Subject name */}
                            <div className="text-[11px] text-gray-500 font-normal capitalize mb-1">
                              {highlightText(item.subject.toLowerCase(), searchTerm)}
                            </div>
                            {/* Line 2: Topic name */}
                            <div className="font-semibold text-gray-800 text-sm break-words whitespace-normal leading-tight transition-colors first-letter:uppercase mb-3">
                              {highlightText(item.topic, searchTerm)}
                            </div>
                          </div>

                          {/* Desktop: Topic and Subject in same column */}
                          <div className="hidden lg:flex lg:p-3 lg:flex-col lg:justify-center lg:pl-8 lg:border-r border-gray-100 min-w-0">
                            <div className="font-semibold lg:font-medium text-gray-800 text-sm lg:text-xs break-words whitespace-normal leading-tight transition-colors first-letter:uppercase">
                              {highlightText(item.topic, searchTerm)}
                            </div>
                            <div className="text-xs text-gray-500 font-normal mt-0.5 lg:mt-1 break-words whitespace-normal capitalize">
                              {highlightText(item.subject.toLowerCase(), searchTerm)}
                            </div>
                          </div>

                          {/* Mobile: Line 3 - All controls in one row, aligned right */}
                          <div className="flex items-center justify-end gap-2 px-4 pb-4 lg:hidden">
                            <div className="cursor-pointer"
                              onClick={() => {
                                openDifficultyModal(item.id, item.topic, item.subjectId, item.subject, item.difficulty);
                              }}
                            >
                              <DifficultyRating value={item.difficulty} readonly size="sm" />
                            </div>
                            <div className="w-[115px]">
                              <StatusBadge
                                status={item.status}
                                daysDiff={getDaysDiff(item.dueDate)}
                                reviewCount={item.reviewCount}
                                maxReviews={item.maxReviews}
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotesModalData({
                                  isOpen: true,
                                  topicId: item.id,
                                  topicName: item.topic,
                                  subjectName: item.subject
                                });
                              }}
                              className={`p-1.5 rounded transition-colors ${(typeof item.notes === 'string' ? item.notes.trim() !== '' : !!item.notes)
                                ? 'text-blue-600 hover:bg-blue-100'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                              title={(typeof item.notes === 'string' ? item.notes.trim() !== '' : !!item.notes) ? "Ver/Editar Nota" : "Adicionar Nota"}
                            >
                              <FileText size={18} className={(typeof item.notes === 'string' ? item.notes.trim() !== '' : !!item.notes) ? "fill-blue-200" : ""} />
                            </button>
                            {item.status !== RevisionStatus.COMPLETED ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkCompleted(item.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Iniciar Revisão"
                              >
                                <PlayCircle size={20} />
                              </button>
                            ) : (
                              <Check size={16} className="text-green-500" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAiAssist(item);
                              }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Explicação com IA"
                            >
                              <Sparkles size={14} />
                            </button>
                          </div>

                          {/* Desktop: Difficulty */}
                          <div className="hidden lg:flex lg:p-0 lg:contents">
                            <div className="lg:p-3 flex items-center lg:justify-center lg:border-r border-gray-100 cursor-pointer"
                              onClick={() => {
                                openDifficultyModal(item.id, item.topic, item.subjectId, item.subject, item.difficulty);
                              }}
                            >
                              <DifficultyRating value={item.difficulty} readonly size="sm" />
                            </div>
                          </div>

                          {/* Desktop: Status & Actions */}
                          <div className="hidden lg:flex lg:items-center lg:gap-3 lg:p-0 lg:contents">
                            {/* Status/Date */}
                            <div className="md:px-1 md:py-1 flex items-center justify-center md:border-r border-gray-100">
                              <div className="w-[115px]">
                                <StatusBadge
                                  status={item.status}
                                  daysDiff={getDaysDiff(item.dueDate)}
                                  reviewCount={item.reviewCount}
                                  maxReviews={item.maxReviews}
                                />
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="md:p-2 flex items-center justify-end md:justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🔍 DEBUG NOTE ICON:', {
                                    topicId: item.id,
                                    topic: item.topic,
                                    notes: item.notes,
                                    notesType: typeof item.notes,
                                    hasNotes: !!item.notes
                                  });
                                  setNotesModalData({
                                    isOpen: true,
                                    topicId: item.id,
                                    topicName: item.topic,
                                    subjectName: item.subject
                                  });
                                }}
                                className={`p - 1.5 rounded transition - colors ${(typeof item.notes === 'string' ? item.notes.trim() !== '' : !!item.notes) ?
                                  'text-blue-600 hover:bg-blue-100' :
                                  'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                  } `}
                                title={(typeof item.notes === 'string' ? item.notes.trim() !== '' : !!item.notes) ? "Ver/Editar Nota" : "Adicionar Nota"}
                              >
                                <FileText size={18} className={(typeof item.notes === 'string' ? item.notes.trim() !== '' : !!item.notes) ? "fill-blue-200" : ""} />
                              </button>

                              {item.status !== RevisionStatus.COMPLETED ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkCompleted(item.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Iniciar Revisão"
                                >
                                  <PlayCircle size={20} />
                                </button>
                              ) : (
                                <Check size={16} className="text-green-500" />
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAiAssist(item);
                                }}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                title="Explicação com IA"
                              >
                                <Sparkles size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      {/* AI Assistant Modal */}
      {selectedItemForAI && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-purple-100">
            <div className="p-6 bg-gradient-to-r from-purple-50 to-white rounded-t-xl border-b border-purple-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Assistente de Revisão</h3>
                  <p className="text-xs text-purple-600 font-medium">Powered by Gemini 2.5</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Explicando: <span className="font-semibold">{selectedItemForAI.topic}</span>
              </p>
            </div>

            <div className="p-6">
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 animate-pulse">Gerando explicação inteligente...</p>
                </div>
              ) : (
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {aiExplanation}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedItemForAI(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModalData.isOpen}
        onClose={() => {
          setNotesModalData(prev => ({ ...prev, isOpen: false }));
          setTimeout(async () => {
            await refreshData();
            refetch();
          }, 200);
        }}
        onSave={() => {
          setNotesModalData(prev => ({ ...prev, isOpen: false }));
          setTimeout(async () => {
            await refreshData();
            refetch();
          }, 200);
        }}
        topicId={notesModalData.topicId}
        topicName={notesModalData.topicName}
        subjectName={notesModalData.subjectName}
        showSubjectNotes={false}
      />

      {/* Subject Notes Modal */}
      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() => {
          setSubjectNotesModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(async () => {
            await refreshData();
            refetch();
          }, 200);
        }}
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />

      {/* Difficulty Rating Modal */}
      <DifficultyRatingModal
        isOpen={difficultyModalData.isOpen}
        onClose={closeDifficultyModal}
        onSubmit={async (difficulty) => {
          await submitDifficultyRating(difficulty);
          refetch();
        }}
        onConfirmReview={difficultyModalData.reviewCount > 0 ? async (difficulty) => {
          // Novo fluxo: marcar revisão + salvar dificuldade
          await markTopicAsReviewed(difficultyModalData.topicId, difficulty);
          closeDifficultyModal();
          setTimeout(async () => {
            await refreshData();
            refetch();
          }, 500);
        } : undefined}
        topicName={difficultyModalData.topicName}
        subjectName={difficultyModalData.subjectName}
        initialDifficulty={difficultyModalData.currentDifficulty}
        reviewStage={difficultyModalData.reviewStage}
        reviewCount={difficultyModalData.reviewCount}
        isCompleting={difficultyModalData.isCompleting}
      />
    </div>
  );
};

export default Revisoes;
