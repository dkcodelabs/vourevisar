
import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  MessageSquareText,
  Check,
  Sparkles,
  Home,
  Star,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useApp } from '@/contexts/AppContext';
import { useReviewsData } from '@/hooks/useReviewsData';
import { useTopicReview } from '@/hooks/useTopicReview';
import { RevisionItem, RevisionStatus } from '@/types/revision';
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

  // New Layout State
  const [activeTab, setActiveTab] = useState<ViewTab>('FOCUS');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedItemForAI, setSelectedItemForAI] = useState<RevisionItem | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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
      return {
        id: topic.id,
        topic: topic.name,
        subject: subject?.name || 'Desconhecida',
        subjectId: topic.subject_id,
        difficulty: topic.difficulty_level || 0,
        dueDate: topic.next_review || new Date().toISOString(),
        notes: topic.notes || '',
        status: status,
        ownerImage: '' // Placeholder
      };
    };

    delayedTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.OVERDUE)));
    todayTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.TODAY)));
    futureTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.FUTURE)));
    completedTopics.forEach(t => allItems.push(mapTopicToItem(t, RevisionStatus.COMPLETED)));

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      return allItems.filter(item =>
        item.topic.toLowerCase().includes(lowerTerm) ||
        item.subject.toLowerCase().includes(lowerTerm)
      );
    }

    return allItems;
  }, [delayedTopics, todayTopics, futureTopics, completedTopics, subjects, searchTerm]);

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

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const allKeys = Object.keys(groupedItems);
    const newCollapsedState = allKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setCollapsedGroups(newCollapsedState);
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
      await markTopicAsReviewed(id);
      setTimeout(async () => {
        await refreshData();
        refetch();
      }, 500);
    } catch (error) {
      console.error('Erro ao marcar tópico como revisado:', error);
      toast.error('Erro ao marcar tópico como revisado');
    }
  };

  const handleAiAssist = async (item: RevisionItem) => {
    setSelectedItemForAI(item);
    setAiExplanation('');
    setIsAiLoading(true);

    // Simulate AI delay since we don't have the service yet
    setTimeout(() => {
      setAiExplanation(`Esta é uma explicação simulada para o tópico: **${item.topic}**.\n\nO recurso de IA será integrado em breve para fornecer resumos detalhados e dicas de estudo personalizadas.`);
      setIsAiLoading(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f6f8]">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-[#f5f6f8] text-[#323338] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Header Section */}
        <header className="bg-white px-4 md:px-8 pt-6 pb-2 border-b border-gray-200 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#323338] mb-1">Processo de Revisão</h1>
              <p className="text-gray-500 text-xs">Painel de controle de repetição espaçada</p>
            </div>
            <div className="flex w-full md:w-auto items-center gap-3">
              {/* Controls moved to tabs row */}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => {
                const allKeys = Object.keys(groupedItems);
                const isAnyCollapsed = allKeys.some(key => collapsedGroups[key]);

                if (isAnyCollapsed) {
                  setCollapsedGroups({});
                } else {
                  const newCollapsedState = allKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
                  setCollapsedGroups(newCollapsedState);
                }
              }}
              className="p-2 mr-2 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-full transition-colors shrink-0"
              title={Object.keys(groupedItems).some(key => collapsedGroups[key]) ? "Expandir Tudo" : "Recolher Tudo"}
            >
              {Object.keys(groupedItems).some(key => collapsedGroups[key]) ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} className="-rotate-90" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('FOCUS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === 'FOCUS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <span>Hoje</span>
              {stats.today > 0 && (
                <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.today}</span>
              )}
              <span className="mx-1">&</span>
              <span>Atrasadas</span>
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.overdue}</span>
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1 shrink-0"></div>

            <button
              onClick={() => setActiveTab('FUTURE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === 'FUTURE'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <span>Futuras</span>
              <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {stats.future}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === 'COMPLETED'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <span>Concluídas</span>
              <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {stats.completed}
              </span>
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1 shrink-0"></div>

            <button
              onClick={() => setActiveTab('SUBJECTS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === 'SUBJECTS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <span>Por Matéria</span>
            </button>

            <div className="relative w-full md:w-auto ml-2 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full md:w-48 pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-xs focus:outline-none focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

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
                  <div className={`mr-2 p-1 rounded-sm text-gray-400 hover:bg-gray-200 transition-colors`}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </div>
                  <h2 className={`text-lg font-bold ${style.text} flex items-center`}>
                    {style.title}
                  </h2>
                  <span className="ml-3 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] font-semibold">{groupItems.length}</span>
                  <div className="flex-1 h-px bg-gray-200 ml-4 group-hover:bg-gray-300 transition-colors"></div>
                </div>

                {/* Collapsible Content */}
                {!isCollapsed && (
                  <>
                    {/* Table Header - HIDDEN ON MOBILE */}
                    <div className="hidden md:grid grid-cols-12 gap-0 border-b border-gray-200 pb-2 mb-1 px-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                      <div className="col-span-5 pl-8">Tópico</div>
                      <div className="col-span-2 text-center">Matéria</div>
                      <div className="col-span-2 text-center">Dificuldade</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-1 text-center">Ações</div>
                    </div>

                    {/* Rows */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {groupItems.map((item) => (
                        <div key={item.id} className="
                          group relative border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors
                          flex flex-col md:grid md:grid-cols-12
                        ">
                          {/* Sticky Left Color Bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.color.replace('border-', 'bg-')}`}></div>

                          {/* Topic Column */}
                          <div className="
                              md:col-span-5 md:p-3 flex items-center gap-3 pl-4 md:pl-8
                              pt-4 md:pt-3 md:border-r border-gray-100
                            ">
                            <div className="font-semibold md:font-medium text-gray-800 text-sm md:text-xs">{item.topic}</div>
                          </div>

                          {/* Subject & Difficulty */}
                          <div className="flex items-center px-4 pb-2 md:p-0 md:contents">
                            {/* Subject */}
                            <div className="md:col-span-2 md:p-3 flex items-center md:justify-center md:border-r border-gray-100 mr-4 md:mr-0">
                              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-medium truncate max-w-[200px] md:max-w-full">
                                {item.subject}
                              </span>
                            </div>

                            {/* Difficulty */}
                            <div className="md:col-span-2 md:p-3 flex items-center md:justify-center md:border-r border-gray-100 cursor-pointer"
                              onClick={() => {
                                console.log('⭐ Star clicked:', {
                                  id: item.id,
                                  topic: item.topic,
                                  subjectId: item.subjectId,
                                  subject: item.subject,
                                  difficulty: item.difficulty
                                });
                                openDifficultyModal(item.id, item.topic, item.subjectId, item.subject, item.difficulty);
                              }}
                            >
                              <DifficultyRating value={item.difficulty} readonly size="sm" />
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-3 px-4 pb-4 md:p-0 md:contents">
                            {/* Status/Date */}
                            <div className="flex-1 md:col-span-2 md:p-1 flex items-center md:justify-center md:border-r border-gray-100">
                              <StatusBadge status={item.status} daysDiff={getDaysDiff(item.dueDate)} />
                            </div>

                            {/* Actions */}
                            <div className="md:col-span-1 md:p-2 flex items-center justify-end md:justify-center gap-2">
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
                                className={`p-1.5 rounded transition-colors ${item.notes ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                title={item.notes ? "Ver/Editar Nota" : "Adicionar Nota"}
                              >
                                <MessageSquareText size={14} className={item.notes ? "fill-blue-200" : ""} />
                              </button>

                              {item.status !== RevisionStatus.COMPLETED ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkCompleted(item.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Marcar como Revisado"
                                >
                                  <CheckCircle2 size={16} />
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
                  </>
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
        topicName={difficultyModalData.topicName}
        subjectName={difficultyModalData.subjectName}
        initialDifficulty={difficultyModalData.currentDifficulty}
      />
    </div>
  );
};

export default Revisoes;
