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
  X,
  CalendarOff,
  CheckCircle2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { ChevronsDownIcon, ChevronsUpIcon } from '@/components/study-cycle/Icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { useApp } from '@/contexts/AppContext';
import { useReviewsData } from '@/hooks/useReviewsData';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ReviewsTrendChart } from '@/components/reviews/ReviewsTrendChart';
import { RevisionItem, RevisionStatus } from '@/types/revision';
import { ReviewProfile, REVIEW_PROFILES } from '@/types/study';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { StatusBadge } from '@/components/reviews/new/StatusBadge';

import NotesModal from '@/components/reviews/NotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { ReviewsStatsCard } from '@/components/reviews/ReviewsStatsCard';
import { WeeklyEngagementChart } from '@/components/reviews/WeeklyEngagementChart';

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
  const { user } = useAuth();

  // Fetch review history for weekly engagement chart
  const { data: reviewData } = useQuery({
    queryKey: ['reviews-page-history', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;
      if (!subjectsData || subjectsData.length === 0) return [];

      const userSubjectIds = subjectsData.map(s => s.id);

      // @ts-ignore - existing table
      const response = await (supabase as any)
        .from('topic_review_history')
        .select(`
          id, topic_id, review_stage, reviewed_at,
          topics!inner (id, name, subject_id)
        `)
        .in('topics.subject_id', userSubjectIds)
        .order('reviewed_at', { ascending: false });

      if (response.error) throw response.error;
      return response.data?.map((review: any) => ({
        id: review.id,
        topic_id: review.topic_id,
        review_stage: review.review_stage,
        reviewed_at: review.reviewed_at,
        topic_name: review.topics?.name,
        subject_id: review.topics?.subject_id
      })) || [];
    },
    enabled: !!user
  });

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
  const userProfile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
  const maxReviews = REVIEW_PROFILES[userProfile].maxReviews;

  const stats = useMemo(() => {
    // Todos os tópicos (incluindo concluídos)
    const allTopics = [...delayedTopics, ...todayTopics, ...futureTopics, ...completedTopics];

    // 1. Total de tópicos
    const totalTopics = allTopics.length;

    // 2. Total de revisões programadas = tópicos × maxReviews
    const totalScheduledReviews = totalTopics * maxReviews;

    // 3. Tópicos iniciados (com review_count >= 1 OU first_studied_at)
    const startedTopicsCount = allTopics.filter(t =>
      (t.review_count >= 1 || t.first_studied_at)
    ).length;

    // 4. Revisões de tópicos iniciados = tópicos iniciados × maxReviews
    const startedReviews = startedTopicsCount * maxReviews;

    // 5. Total de revisões FEITAS = soma de todos os review_count
    const completedReviews = allTopics.reduce((sum, t) => sum + (t.review_count || 0), 0);

    // 6. Revisões pendentes no total (atrasadas + hoje + futuras)
    const pendingTotal = delayedTopics.length + todayTopics.length + futureTopics.length;

    return {
      today: todayTopics.length,
      overdue: delayedTopics.length,
      future: futureTopics.length,
      completedTopicsCount: completedTopics.length,
      totalTopics,
      totalScheduledReviews,
      startedTopicsCount,
      startedReviews,
      completedReviews,
      pendingTotal,
    };
  }, [todayTopics, delayedTopics, futureTopics, completedTopics, maxReviews]);

  // Grouping Logic
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: RevisionItem[] } = {};

    if (activeTab === 'SUBJECTS') {
      items.forEach(item => {
        if (!groups[item.subject]) groups[item.subject] = [];
        groups[item.subject].push(item);
      });
    } else if (activeTab === 'FOCUS') {
      // Merge Today & Overdue
      const mergedItems: RevisionItem[] = [];
      // Push Today first
      items.filter(i => i.status === RevisionStatus.TODAY).forEach(i => mergedItems.push(i));
      // Push Overdue second
      items.filter(i => i.status === RevisionStatus.OVERDUE).forEach(i => mergedItems.push(i));

      if (mergedItems.length > 0) {
        groups['FOCUS_MERGED'] = mergedItems;
      }
    } else {
      const targetStatuses: string[] = [];
      if (activeTab === 'FUTURE') {
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
      case 'FOCUS_MERGED':
        return {
          title: (
            <div className="flex items-center gap-1.5">
              <span>Hoje</span>
              <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] font-bold min-w-[16px] flex items-center justify-center">
                {stats.today}
              </span>
              <span className="mx-0.5">&</span>
              <span>Atrasadas</span>
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-bold min-w-[16px] flex items-center justify-center">
                {stats.overdue}
              </span>
            </div>
          ),
          color: 'border-red-400',
          text: 'text-red-600 dark:text-red-400'
        };
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
      <div className="flex-1 flex flex-col h-full lg:overflow-hidden overflow-y-auto relative">

        {/* Header Section with Chart and Stats Card */}
        <div className="mt-[15px] grid grid-cols-1 xl:grid-cols-[1fr,380px,380px] gap-4 mb-4 shrink-0 items-stretch">
          {/* Left: Controls Header */}
          <header className="px-4 md:px-6 pt-5 pb-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col h-full">

            {/* Row 1: Search + Controls */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6">
              {/* Search */}
              <div className="w-full xl:flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Pesquisar por disciplina ou tópico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Right Controls: Por Matéria + Status */}
              <div className="flex items-center gap-3 w-full xl:w-auto">
                {/* Por Matéria Button */}
                <button
                  onClick={toggleSubjectView}
                  className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-3 h-10 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${activeTab === 'SUBJECTS'
                    ? 'border-indigo-200 text-indigo-700 bg-indigo-50'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  title="Agrupar por Matéria"
                >
                  <BookOpen size={14} className="text-indigo-500" />
                  <span>Por Matéria</span>
                </button>

                {/* Status Filter */}
                <div className="flex-1 xl:flex-none xl:w-[140px]">
                  <Select value={reviewStageFilter} onValueChange={setReviewStageFilter} disabled={activeTab === 'COMPLETED'}>
                    <SelectTrigger className="h-10 text-xs font-medium border-slate-200 bg-white shadow-sm rounded-lg focus:ring-indigo-500/20 w-full justify-between px-2">
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        <Clock size={14} className="text-amber-500 shrink-0" />
                        <span className="text-slate-600 truncate">
                          {reviewStageFilter === 'all' ? 'Status' : `${reviewStageFilter}ª Revisão`}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos Status</SelectItem>
                      {Array.from({ length: maxReviews }).map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                          {i + 1}ª Revisão
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Row 2: Tabs */}
            <div className="flex items-center gap-3 w-full overflow-x-auto scrollbar-hide mb-6">
              {/* Hoje & Atrasadas */}
              <button
                onClick={() => setActiveTab('FOCUS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'FOCUS'
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>Hoje</span>
                  <span className={`text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'FOCUS' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-slate-200 text-slate-600'}`}>
                    {stats.today}
                  </span>
                  <span>&</span>
                  <span>Atrasadas</span>
                  <span className={`text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'FOCUS' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-slate-200 text-slate-600'}`}>
                    {stats.overdue}
                  </span>
                </div>
              </button>

              {/* Futuras */}
              <button
                onClick={() => setActiveTab('FUTURE')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'FUTURE'
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <span>Futuras</span>
                <span className={`text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'FUTURE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-200 text-slate-600'}`}>
                  {stats.future}
                </span>
              </button>

              {/* Concluídas */}
              <button
                onClick={() => {
                  setActiveTab('COMPLETED');
                  setReviewStageFilter('all');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'COMPLETED'
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <span>Concluídas</span>
                <span className={`text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'}`}>
                  {stats.completedTopicsCount}
                </span>
              </button>
            </div>

            {/* Row 3: Trend Chart */}
            <div className="mt-auto">
              <ReviewsTrendChart topics={topics} reviewData={reviewData || []} />
            </div>
          </header>

          {/* Middle: Weekly Engagement Chart */}
          <div className="hidden lg:block">
            <WeeklyEngagementChart
              reviewData={reviewData || []}
              subjects={subjects}
            />
          </div>

          {/* Right: Stats Card */}
          <div className="hidden xl:block h-full">
            <ReviewsStatsCard
              totalTopics={stats.totalTopics}
              totalScheduledReviews={stats.totalScheduledReviews}
              startedTopicsCount={stats.startedTopicsCount}
              startedReviews={stats.startedReviews}
              completedReviews={stats.completedReviews}
              overdue={stats.overdue}
              today={stats.today}
              future={stats.future}
              reviewProfile={userProfile}
              maxReviews={maxReviews}
              className="h-full"
            />
          </div>
        </div>

        {/* Mobile Stats Card */}
        <div className="lg:hidden mb-4">
          <ReviewsStatsCard
            totalTopics={stats.totalTopics}
            totalScheduledReviews={stats.totalScheduledReviews}
            startedTopicsCount={stats.startedTopicsCount}
            startedReviews={stats.startedReviews}
            completedReviews={stats.completedReviews}
            overdue={stats.overdue}
            today={stats.today}
            future={stats.future}
            reviewProfile={userProfile}
            maxReviews={maxReviews}
          />
        </div>

        {/* Mobile Weekly Chart */}
        <div className="lg:hidden mb-4">
          <WeeklyEngagementChart
            reviewData={reviewData || []}
            subjects={subjects}
          />
        </div>
        {
          (searchTerm || reviewStageFilter !== 'all') && (
            <div className="mb-6 flex justify-between items-center bg-amber-50/50 dark:bg-slate-900 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs font-medium">
                  {searchTerm && `Pesquisando por "${searchTerm}"`}
                  {searchTerm && reviewStageFilter !== 'all' && ' • '}
                  {reviewStageFilter !== 'all' && `Filtrando por ${reviewStageFilter}ª Revisão`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-amber-600 dark:text-amber-400/80 flex flex-col items-end">
                  <span>Encontrados {Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0)} tópicos</span>
                  <span className="text-[10px] text-amber-500 dark:text-amber-500/60">
                    Mostrando top 50
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setReviewStageFilter('all');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 shadow-sm rounded-md text-xs font-medium text-amber-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                  title="Limpar e mostrar tudo"
                >
                  <X size={14} />
                  Limpar
                </button>
              </div>
            </div>
          )
        }

        {/* Divider Line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-0 shrink-0"></div>

        {/* Global Toolbar (Toggle All Only) */}
        <div className="px-4 md:px-8 py-3 flex items-center justify-start shrink-0">
          <div
            onClick={handleToggleAll}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-900 transition-all"
            >
              {areAllExpanded ? <ChevronsUpIcon className="w-4 h-4" /> : <ChevronsDownIcon className="w-4 h-4" />}
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors select-none">
              {areAllExpanded ? "Recolher Todas as Revisões" : "Expandir Todas as Revisões"}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 lg:overflow-y-auto p-4 md:p-8 custom-scrollbar mr-1 shrink-0 pb-24 lg:pb-8">

          {Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
              {/* FOCUS TAB EMPTY STATE */}
              {activeTab === 'FOCUS' && (
                <>
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                    <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Parabéns! Tudo em dia!</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                    Você zerou suas revisões de hoje e atrasadas. <br /> Seu foco e disciplina estão rendendo frutos.
                  </p>

                  {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer" onClick={() => navigate('/ciclo')}>
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles size={80} />
                      </div>
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-800/50 rounded-xl shrink-0">
                          <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400 fill-indigo-200 dark:fill-indigo-900" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Mantenha o progresso!</p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-400/90 mb-3 leading-relaxed">
                            Você tem <span className="font-bold bg-indigo-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200">{stats.totalTopics - stats.startedTopicsCount} tópicos</span> ainda não iniciados. Que tal começar um agora?
                          </p>
                          <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                            Ir para o Ciclo <ChevronRight size={14} className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* FUTURE TAB EMPTY STATE */}
              {activeTab === 'FUTURE' && (
                <>
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50 dark:ring-blue-900/10">
                    <CalendarOff size={32} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Sem revisões futuras</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                    Não há revisões agendadas para os próximos dias.
                  </p>

                  {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer" onClick={() => navigate('/ciclo')}>
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles size={80} />
                      </div>
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-800/50 rounded-xl shrink-0">
                          <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Explore novos conteúdos</p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-400/90 mb-3 leading-relaxed">
                            Existem <span className="font-bold bg-indigo-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200">{stats.totalTopics - stats.startedTopicsCount} tópicos</span> aguardando início. Ótima oportunidade para avançar.
                          </p>
                          <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                            Ver Matérias <ChevronRight size={14} className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* COMPLETED TAB EMPTY STATE */}
              {activeTab === 'COMPLETED' && (
                <>
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Construindo sua jornada</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                    Você tem <span className="font-bold text-slate-700 dark:text-slate-300">{stats.startedTopicsCount} tópicos</span> em fase de estudos. <br /> Continue revisando com consistência para vê-los aqui em breve.
                  </p>
                </>
              )}
            </div>
          ) : Object.entries(groupedItems).map(([key, groupItems]: [string, RevisionItem[]]) => {
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
                  <div className="mr-3 flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-all shadow-sm">
                    {isCollapsed ? <ChevronRight size={14} className="ml-0.5" /> : <ChevronDown size={14} />}
                  </div>
                  <div className={`text-xs font - bold ${style.text} flex items - center`}>
                    {style.title}
                  </div>
                  {key !== 'FOCUS_MERGED' && (
                    <span className="ml-3 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-semibold">{groupItems.length}</span>
                  )}
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
      </div >

      {/* AI Assistant Modal */}
      {
        selectedItemForAI && (
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
        )
      }

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
    </div >
  );
};

export default Revisoes;
