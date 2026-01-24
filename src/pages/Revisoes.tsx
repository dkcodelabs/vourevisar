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
  ChevronUp,
  Loader2,
  PlayCircle,
  RotateCw,
  Clock,
  BookOpen,
  AlertCircle,
  X,
  CalendarOff,
  CheckCircle2,
  Settings,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  Square,
  HelpCircle
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
import { SpacedRepetitionInfoModal } from '@/components/reviews/SpacedRepetitionInfoModal';

type ViewTab = 'FOCUS' | 'FUTURE' | 'COMPLETED' | 'SUBJECTS' | 'ALL';

interface ActiveTimer {
  topicId: string;
  startTime: number;
}

const DifficultyStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
      <span className="text-sm">{rating}</span>
      <Star
        size={14}
        className="fill-amber-400 text-amber-400"
      />
    </div>
  );
};

export const Revisoes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Existing Hooks
  const { subjects, refreshData } = useApp();
  const {
    markTopicAsReviewed,
    openReviewModal: openReviewModalHook,
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
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    resetFilters,
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics
  } = useReviewsData();

  const { settings, getProfileInfo } = useUserSettings();
  const profileInfo = getProfileInfo();
  const userProfile = profileInfo?.profile || ReviewProfile.INTERMEDIATE;
  const maxReviews = profileInfo?.maxReviews || 3;

  // Fetch review history for weekly engagement chart
  const { data: reviewData, refetch: refetchHistory } = useQuery({
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

  // Listen for topic updates to refresh history
  useEffect(() => {
    const handleTopicUpdate = () => {
      console.log('🔄 Refetching history due to topic update');
      refetchHistory();
    };

    window.addEventListener('topicUpdated', handleTopicUpdate);
    return () => window.removeEventListener('topicUpdated', handleTopicUpdate);
  }, [refetchHistory]);

  // State
  const [activeTab, setActiveTab] = useState<ViewTab>('FOCUS');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // Timer State
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
    const saved = localStorage.getItem('revisoes-active-timer');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [reviewStageFilter, setReviewStageFilter] = useState<string>('all');
  const [loadingActions, setLoadingActions] = useState<Record<string, string>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedItemForAI, setSelectedItemForAI] = useState<RevisionItem | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [trendViewMode, setTrendViewMode] = useState<'days' | 'hours'>('days');

  // Header cards visibility state with localStorage persistence
  const [headerCardsCollapsed, setHeaderCardsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('revisoes-header-collapsed');
    return saved === 'true';
  });

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

  // Save timer state whenever it changes
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem('revisoes-active-timer', JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem('revisoes-active-timer');
    }
  }, [activeTimer]);

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
      // userProfile/maxReviews are available in scope
      // Logic: 1st Study (Count 1) -> R1 (Index 0).
      //        R1 (Count 2) -> R2 (Index 1).
      //        R2 (Count 3) -> R3 (Index 2).
      //        R3 (Count 4) -> R4 (Index 3) - Only if R4 exists.
      // But user wants "R3" for pending 15d (Index 2).
      // So Count 4 -> Index 3? Wait.
      // If Pending 15d (Index 2). Why Count 4?
      // Assuming Count 4 in DB is an anomaly or tracks "Next Step".
      // We will shift -1 to handle standards.
      const rawCount = topic.reviewCount || topic.review_count || 0;
      const reviewIndex = Math.max(0, rawCount - 1);
      // If index is 0 (Pending R1), we want to store 1 (so render is R1).
      // If index is 3 (Pending R3??), we want to store 3.
      // Wait. If rawCount=1 -> Index=0. Display R1.
      //       If rawCount=4 -> Index=3. Display R3? No, R3 is Index 2 (0,1,2).
      //       So rawCount=4 maps to Index 3. 
      //       If Index 3 corresponds to R4 (30d). Then R4 is correct.
      //       If User sees R4 for Pending R3.
      //       Then rawCount was 4. But Index should be 2.
      //       This implies rawCount was +2 relative to index?
      //       Or Pending R3 is actually Index 3??
      //       [24h, 7d, 15d, 30d].
      //       Review 1 (24h). Index 0.
      //       Review 3 (15d). Index 2.
      //       Users call it "R3".
      //       So Index 2 == R3.
      //       Wait. Index 0 == R1.
      //       So R-Number = Index + 1.
      //       If User wants R3. They want Index 2.
      //       So we need R-Number = 3.
      //       So we need Index = 2.
      //       If rawCount=4. `rawCount - X = 3`. X=1.
      //       So `4 - 1 = 3`. Display R3. Correct.
      //       If rawCount=1. `1 - 1 = 0`. Display R0? No, R1.
      //       So `count || 1`.

      const reviewCount = status === 'COMPLETED'
        ? maxReviews
        : Math.min(Math.max(1, rawCount), maxReviews);

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

    if (activeTab === 'ALL') {
      const todayDateString = new Date().toISOString().split('T')[0];

      topics.forEach(t => {
        let status = RevisionStatus.UNSTARTED;

        if (t.completed || t.review_stage === 'Concluído') {
          status = RevisionStatus.COMPLETED;
        } else if (t.next_review) {
          const reviewDateString = new Date(t.next_review).toISOString().split('T')[0];
          if (reviewDateString < todayDateString) status = RevisionStatus.OVERDUE;
          else if (reviewDateString === todayDateString) status = RevisionStatus.TODAY;
          else status = RevisionStatus.FUTURE;
        }

        allItems.push(mapTopicToItem(t, status));
      });
    } else {
      delayedTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.OVERDUE)));
      todayTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.TODAY)));
      futureTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.FUTURE)));
      completedTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.COMPLETED)));
    }

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

    // 4. Revisões FEITAS = soma de review_count de todos os tópicos
    const completedReviews = allTopics.reduce((sum, t) => sum + (t.review_count || 0), 0);

    // 5. Revisões pendentes no total (atrasadas + hoje + futuras)
    const pendingReviews = delayedTopics.length + todayTopics.length + futureTopics.length;

    // 6. Revisões NÃO INICIADAS = Total - Feitas - Pendentes
    // São revisões de tópicos que você ainda nem começou
    const notStartedReviews = Math.max(0, totalScheduledReviews - completedReviews - pendingReviews);

    return {
      today: todayTopics.length,
      overdue: delayedTopics.length,
      future: futureTopics.length,
      completedTopicsCount: completedTopics.length,
      totalTopics,
      totalScheduledReviews,
      startedTopicsCount,
      completedReviews,
      pendingReviews,
      notStartedReviews,
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
      if (activeTab === 'ALL') {
        // Initialize groups
        Object.values(RevisionStatus).forEach(status => groups[status] = []);

        items.forEach(item => {
          if (!groups[item.status]) groups[item.status] = [];
          groups[item.status].push(item);
        });
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
      case RevisionStatus.UNSTARTED: return { title: 'Não Iniciados', color: 'border-slate-300', text: 'text-slate-500' };
      default: return { title: groupKey, color: 'border-purple-500', text: 'text-purple-600' };
    }
  };

  // Actions
  const handleMarkCompleted = async (id: string) => {
    // 1. Check if timer is active for this topic
    if (activeTimer && activeTimer.topicId === id) {
      // STOP TIMER
      const endTime = Date.now();
      const startTime = activeTimer.startTime;
      const durationMs = endTime - startTime;

      // Regra: < 1 min = 0. > 1 min = Arredonda pra cima (ex: 32m40s -> 33m)
      const durationMinutes = durationMs < 60000 ? 0 : Math.ceil(durationMs / 60000);

      setActiveTimer(null); // Clear timer

      toast.success(`Revisão finalizada em ${durationMinutes} min!`);

      setLoadingActions(prev => ({ ...prev, [id]: 'review' }));
      try {
        await openReviewModalHook(id, durationMinutes);
      } catch (error) {
        console.error('Erro ao abrir modal:', error);
      } finally {
        setLoadingActions(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }
      return;
    }

    // 2. Check if timer is active for ANOTHER topic
    if (activeTimer && activeTimer.topicId !== id) {
      return;
    }

    // 3. START TIMER
    setActiveTimer({ topicId: id, startTime: Date.now() });
    toast.success('Cronômetro iniciado! Bons estudos.');
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
    <div className="flex min-h-full w-full text-gray-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">

        {/* Header Section with Chart and Stats Card */}
        <div className="mt-[15px] mb-4 shrink-0 px-4 md:px-8">
          {/* Toggle Button */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Visão Geral
            </h3>
            <button
              onClick={() => {
                const newState = !headerCardsCollapsed;
                setHeaderCardsCollapsed(newState);
                localStorage.setItem('revisoes-header-collapsed', String(newState));
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              title={headerCardsCollapsed ? 'Expandir cards' : 'Minimizar cards'}
            >
              {headerCardsCollapsed ? (
                <>
                  <ChevronDown size={14} />
                  <span>Expandir</span>
                </>
              ) : (
                <>
                  <ChevronUp size={14} />
                  <span>Minimizar</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsed Summary Bar */}
          {headerCardsCollapsed && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 mb-4">
              <div className="flex items-center justify-around gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Hoje & Atrasadas:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.today + stats.overdue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Futuras:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.future}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Concluídas:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.completedTopicsCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Revisões Feitas:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.completedReviews}/{stats.totalScheduledReviews}</span>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Cards */}
          {!headerCardsCollapsed && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Left: Tendência de Estudos */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                        <Sparkles size={16} className="text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          Tendência de Estudos
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Iniciadas vs Revisadas
                        </p>
                      </div>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => setTrendViewMode('days')}
                        className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-md transition-all ${trendViewMode === 'days'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <Calendar size={10} />
                        Dias
                      </button>
                      <button
                        onClick={() => setTrendViewMode('hours')}
                        className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-md transition-all ${trendViewMode === 'hours'
                          ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <Clock size={10} />
                        Horas
                      </button>
                    </div>
                  </div>
                  {/* Chart */}
                  <div className="flex-1 flex items-end">
                    <ReviewsTrendChart topics={topics} reviewData={reviewData || []} viewMode={trendViewMode} />
                  </div>
                  {/* Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
                        <span>Iniciadas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
                        <span>Revisadas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle: Weekly Engagement Chart */}
                <div className="h-full">
                  <WeeklyEngagementChart
                    reviewData={reviewData || []}
                    subjects={subjects}
                  />
                </div>

                {/* Right: Stats Card */}
                <div className="h-full">
                  <ReviewsStatsCard
                    totalTopics={stats.totalTopics}
                    totalScheduledReviews={stats.totalScheduledReviews}
                    startedTopicsCount={stats.startedTopicsCount}
                    completedTopicsCount={stats.completedTopicsCount}
                    completedReviews={stats.completedReviews}
                    pendingReviews={stats.pendingReviews}
                    notStartedReviews={stats.notStartedReviews}
                    overdue={stats.overdue}
                    today={stats.today}
                    future={stats.future}
                    reviewProfile={userProfile}
                    maxReviews={maxReviews}
                    className="h-full"
                  />
                </div>
              </div>

            </>
          )}
        </div>


        {/* Divider Line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-0 shrink-0"></div>

        {/* Global Toolbar - Sticky below header */}
        <div className="sticky top-14 z-20 bg-transparent px-4 md:px-8 py-2 shrink-0 transition-all">
          <section className="w-full flex flex-wrap items-center gap-2 md:gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md transition-all">
            {/* 1. Botão Recolher/Expandir (SÓ ÍCONE) */}
            <button
              onClick={handleToggleAll}
              className="flex items-center justify-center w-10 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group shrink-0"
              title={areAllExpanded ? 'Recolher Tudo' : 'Expandir Tudo'}
            >
              {areAllExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* 1.5 Botão de Informação */}
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all group shrink-0"
              title="Como funciona o agendamento?"
            >
              <HelpCircle size={18} />
            </button>

            {/* 2. Campo de Pesquisa Integrado */}
            <div className="order-last md:order-none w-full md:w-auto md:flex-1 min-w-[200px] relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  title="Limpar pesquisa"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 3. Abas Principais Migradas */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 max-w-full">
              {/* Todas */}
              <button
                onClick={() => {
                  setActiveTab('ALL');
                  setReviewStageFilter('all');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <span>Todas</span>
                <span className={`text-[10px] font-black px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'ALL' ? 'bg-slate-700 text-slate-200 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {stats.totalTopics}
                </span>
              </button>

              {/* Hoje & Atrasadas */}
              <button
                onClick={() => setActiveTab('FOCUS')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'FOCUS'
                  ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <span>Hoje & Atrasadas</span>
                <span className={`text-[10px] font-black px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'FOCUS' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {stats.today + stats.overdue}
                </span>
              </button>

              {/* Futuras */}
              <button
                onClick={() => setActiveTab('FUTURE')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'FUTURE'
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <span>Futuras</span>
                <span className={`text-[10px] font-black px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'FUTURE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {stats.future}
                </span>
              </button>

              {/* Concluídas */}
              <button
                onClick={() => {
                  setActiveTab('COMPLETED');
                  setReviewStageFilter('all');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${activeTab === 'COMPLETED'
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <span>Concluídas</span>
                <span className={`text-[10px] font-black px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {stats.completedTopicsCount}
                </span>
              </button>
            </div>

            <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

            {/* 4. Botão Agrupar por Matéria */}
            <button
              onClick={toggleSubjectView}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all text-xs font-bold whitespace-nowrap ${activeTab === 'SUBJECTS' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Layers size={16} />
              <span className="hidden sm:inline">Agrupar por Matéria</span>
              <span className="sm:hidden">Agrupar</span>
            </button>

            <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

            {/* 5. Filtro Ciclo */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider whitespace-nowrap">Ciclo:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setReviewStageFilter(reviewStageFilter === num.toString() ? 'all' : num.toString())}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-black transition-all ${reviewStageFilter === num.toString() ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold'}`}
                  >
                    R{num}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Search Notification - Now below toolbar inside sticky container */}
          {
            (searchTerm || reviewStageFilter !== 'all') && (
              <div className="mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center bg-amber-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-3 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                      <AlertCircle size={14} className="text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">
                        {searchTerm ? (
                          <>
                            {`Pesquisando por "${searchTerm}"`}
                            {` em ${activeTab === 'FOCUS' ? 'Hoje & Atrasadas' :
                              activeTab === 'FUTURE' ? 'Futuras' :
                                activeTab === 'COMPLETED' ? 'Concluídas' :
                                  activeTab === 'SUBJECTS' ? 'Matérias' :
                                    'Todas'
                              }`
                            }
                            {reviewStageFilter !== 'all' && <span className="text-amber-600 dark:text-amber-500 ml-1">• Ciclo R{reviewStageFilter}</span>}
                          </>
                        ) : (
                          <>
                            {reviewStageFilter !== 'all'
                              ? `Filtrando por Ciclo R${reviewStageFilter}`
                              : `Visualizando ${activeTab === 'FOCUS' ? 'Hoje & Atrasadas' :
                                activeTab === 'FUTURE' ? 'Futuras' :
                                  activeTab === 'COMPLETED' ? 'Concluídas' :
                                    activeTab === 'SUBJECTS' ? 'Matérias' :
                                      'Todas'
                              }`
                            }
                          </>
                        )}
                      </span>
                      <span className="text-[10px] opacity-70">
                        Encontrados {Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0)} tópicos
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setReviewStageFilter('all');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 shadow-sm rounded-xl text-[10px] font-bold text-amber-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700 transition-all"
                  >
                    <X size={12} />
                    Limpar
                  </button>
                </div>
              </div>
            )
          }
        </div>

        {/* Scrollable Content */}
        {/* Scrollable Content */}
        {/* Scrollable Content */}
        <main className="flex-1 px-4 md:px-8 pt-2 mr-1 shrink-0 pb-24 lg:pb-8 space-y-6">

          {Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
              {/* FOCUS TAB EMPTY STATE */}
              {activeTab === 'FOCUS' && (
                <>
                  {/* Caso 1: Usuário não tem dados ainda */}
                  {stats.totalTopics === 0 ? (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <span className="text-4xl">📚</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Comece sua jornada de revisões!</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                        Adicione suas matérias e tópicos — o sistema agenda automaticamente suas revisões usando a técnica de repetição espaçada.
                      </p>
                      <button
                        onClick={() => navigate('/materias')}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        Adicionar Matérias
                      </button>
                    </>
                  ) : (
                    /* Caso 2: Usuário zerou as revisões de hoje e atrasadas */
                    <>
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                        <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Parabéns! Tudo em dia!</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                        Você zerou suas revisões de hoje e atrasadas. <br /> Seu foco e disciplina estão rendendo frutos.
                      </p>

                      {/* Frase Motivacional - Responsiva */}
                      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 px-5 py-3 rounded-2xl mb-8 shadow-sm">
                        <span className="text-xl flex-shrink-0">✅</span>
                        <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium whitespace-normal md:whitespace-nowrap">
                          Cada revisão concluída é uma etapa mais perto da sua conquista.
                        </p>
                      </div>

                      {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer" onClick={() => navigate('/ciclo-estudos')}>
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
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer" onClick={() => navigate('/ciclo-estudos')}>
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

              {/* ALL TAB EMPTY STATE */}
              {activeTab === 'ALL' && (
                <>
                  {stats.totalTopics === 0 ? (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <span className="text-4xl">📋</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Central de Revisões</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                        Aqui você terá a visão completa de todos os seus tópicos organizados por status de revisão.
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap justify-center gap-3 max-w-lg mb-8">
                        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-orange-700 dark:text-orange-300">
                          <span>⏰</span> Atrasados
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
                          <span>📅</span> Para Hoje
                        </div>
                        <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-cyan-700 dark:text-cyan-300">
                          <span>🔮</span> Futuros
                        </div>
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-green-700 dark:text-green-300">
                          <span>✅</span> Concluídos
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/materias')}
                        className="px-6 py-3 bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        Adicionar Matérias
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                        <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Nenhum tópico corresponde aos filtros</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                        Tente ajustar a pesquisa ou os filtros de ciclo para visualizar seus tópicos.
                      </p>
                      <button
                        onClick={() => { setSearchTerm(''); setReviewStageFilter('all'); }}
                        className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        Limpar Filtros
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([key, groupItems]) => {
                if (groupItems.length === 0) return null;

                const style = getGroupStyle(key);
                const isCollapsed = collapsedGroups[key];
                const isGroupExpanded = !isCollapsed;

                /* Handle Subject View Title Logic if needed, otherwise use style.title */
                const groupTitle = activeTab === 'SUBJECTS' ? key : style.title;

                return (
                  <div key={key} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
                    {/* Header */}
                    <button
                      onClick={() => {
                        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
                      }}
                      className="w-full flex items-center justify-between px-8 py-5 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'SUBJECTS' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          <ChevronRight size={18} className={`transition-transform duration-300 ${isGroupExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <div className={`text-base font-bold ${activeTab === 'SUBJECTS' ? 'text-slate-800 dark:text-slate-200' : style.text}`}>
                          {groupTitle}
                        </div>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-full">
                          {groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic hidden sm:block">Clique para alternar visão</p>
                      </div>
                    </button>

                    {/* Content */}
                    {isGroupExpanded && (
                      <div className="overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                        {/* Desktop Header */}
                        <div className="hidden md:grid md:grid-cols-[1.5fr,120px,120px,140px] gap-4 px-6 py-4 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                          <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Tópico & Disciplina</div>
                          <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Dificuldade</div>
                          <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Progresso</div>
                          <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Ações</div>
                        </div>

                        {/* List Items Grid */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {groupItems.map(item => {
                            const isActive = activeTimer?.topicId === item.id;
                            return (
                              <div
                                key={item.id}
                                className={`group transition-all ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                              >
                                {/* Mobile: Stacked / Desktop: Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-[1.5fr,120px,120px,140px] gap-4 p-4 md:px-6 md:py-5 items-center">

                                  {/* 1. Tópico */}
                                  <div className="pl-2">
                                    <div className="flex items-start gap-3">
                                      <div className={`w-1.5 h-10 rounded-full shrink-0 transition-all ${isActive ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-y-110' :
                                        item.status === 'TODAY' || item.status === 'OVERDUE' ? 'bg-rose-500 dark:bg-rose-500' :
                                          item.status === 'FUTURE' ? 'bg-indigo-500 dark:bg-indigo-500' :
                                            'bg-emerald-500 dark:bg-emerald-500'
                                        }`} />
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                          {item.topic}
                                          {isActive && <span className="ml-2 inline-block text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full animate-pulse">Em andamento</span>}
                                        </p>
                                        {item.subject && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase truncate">{item.subject}</p>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 2. Dificuldade (Mobile: row) */}
                                  <div className="flex items-center justify-between md:justify-center pl-4 md:pl-0">
                                    <span className="md:hidden text-xs text-slate-400 font-medium">Dificuldade:</span>
                                    <DifficultyStars rating={item.difficulty || 0} />
                                  </div>

                                  {/* 3. Progresso (Mobile: row) */}
                                  <div className="flex items-center justify-between md:justify-center pl-4 md:pl-0">
                                    <span className="md:hidden text-xs text-slate-400 font-medium">Ciclo:</span>
                                    <div className="flex flex-col gap-1.5 w-24">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider ${item.status === 'TODAY' || item.status === 'OVERDUE'
                                          ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                          }`}>
                                          R{item.reviewCount || 1}
                                        </span>
                                        {(item.status === 'OVERDUE') && (
                                          <span className="text-rose-600 dark:text-rose-400 text-[11px] font-bold">Atrasada</span>
                                        )}
                                      </div>
                                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${item.status === 'TODAY' || item.status === 'OVERDUE' ? 'bg-rose-400' : 'bg-indigo-400'}`}
                                          style={{ width: `${((item.reviewCount || 1) / 5) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* 4. Ações */}
                                  <div className="flex justify-end md:justify-center pr-2 md:pr-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-800 mt-2 md:mt-0">
                                    <div className="flex items-center gap-2 w-full justify-between md:justify-center">
                                      {/* Mobile Label */}
                                      <span className="md:hidden text-xs text-slate-400 font-medium">Ações:</span>

                                      <div className="flex gap-2">
                                        {/* Botão IA */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleAiAssist(item); }}
                                          disabled={!!loadingActions[item.id]}
                                          className="h-10 w-10 flex items-center justify-center text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="Assistente de Revisão"
                                        >
                                          {loadingActions[item.id] === 'ai' ? (
                                            <Loader2 size={16} className="animate-spin" />
                                          ) : (
                                            <Sparkles size={16} />
                                          )}
                                        </button>

                                        {/* Botão Marcar Revisão (PLAY/STOP) */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id); }}
                                          disabled={!!loadingActions[item.id]}
                                          className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isActive
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-200'
                                            : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                            }`}
                                          title={isActive ? "Parar e Avaliar" : "Iniciar Cronômetro"}
                                        >
                                          {loadingActions[item.id] === 'review' ? (
                                            <Loader2 size={16} className="animate-spin" />
                                          ) : isActive ? (
                                            <Square size={16} className="fill-current" />
                                          ) : (
                                            <Play size={16} className="fill-current" />
                                          )}
                                        </button>

                                        {/* Botão Ver Nota */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNotesModalData({
                                              isOpen: true,
                                              topicId: item.id,
                                              topicName: item.topic,
                                              subjectName: item.subject || ''
                                            });
                                          }}
                                          disabled={!!loadingActions[item.id]}
                                          className="h-10 w-10 flex items-center justify-center text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="Ver Nota"
                                        >
                                          {loadingActions[item.id] === 'notes' ? (
                                            <Loader2 size={16} className="animate-spin" />
                                          ) : (
                                            <FileText size={16} />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                    }
                  </div>
                );
              })}
            </div>
          )}
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
        onConfirmReview={difficultyModalData.reviewCount > 0 ? async (difficulty, duration) => {
          // Novo fluxo: marcar revisão + salvar dificuldade + duração editada
          await markTopicAsReviewed(difficultyModalData.topicId, difficulty, duration);
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
        duration={difficultyModalData.duration}
      />

      {/* Modal de Informação sobre Repetição Espaçada */}
      <SpacedRepetitionInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        hasExamDate={!!settings?.data_prova_meta}
      />
    </div >
  );
};

export default Revisoes;
