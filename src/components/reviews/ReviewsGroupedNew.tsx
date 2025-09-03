import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, Edit3, CheckCircle, NotebookPen } from 'lucide-react';
import { differenceInDays, startOfDay } from 'date-fns';
import { Subject } from '@/types';
import { SubtopicsList } from '@/components/ui/subtopics-list';
import { ReviewConfirmDialog } from './ReviewConfirmDialog';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ReviewProfile, REVIEW_PROFILES } from '@/types/study';

interface ReviewsGroupedNewProps {
    subjects: Subject[];
    tab: 'hoje' | 'futuras' | 'concluido';
    expandedSubjects: string[];
    searchTerm?: string;
    highlightedTopic?: string | null;
    onToggleExpanded: (subjectId: string) => void;
  onMarkReviewed: (subjectId: string, topicId: string) => void;
  onAddNote: (subjectId: string, topicId: string) => void;
  onEditTopic: (subjectId: string, topicId: string) => void;
  onSubjectNote: (subjectId: string) => void;
}

export const ReviewsGroupedNew: React.FC<ReviewsGroupedNewProps> = ({
    subjects,
    tab,
    expandedSubjects,
    searchTerm = '',
    highlightedTopic = null,
    onToggleExpanded,
  onMarkReviewed,
  onAddNote,
  onEditTopic,
  onSubjectNote
}) => {
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        subjectId: string;
        topicId: string;
        topicName: string;
    }>({
        isOpen: false,
        subjectId: '',
        topicId: '',
        topicName: ''
    });

    const { settings } = useUserSettings();
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

    const getTopicsForTab = (subject: Subject) => {
        const today = startOfDay(new Date());

        return subject.topics.filter(topic => {
            switch (tab) {
                case 'hoje':
                    if (!topic.nextReview) return false;
                    const reviewDate = startOfDay(new Date(topic.nextReview));
                    return reviewDate <= today;
                case 'futuras':
                    if (!topic.nextReview) return false;
                    const futureReviewDate = startOfDay(new Date(topic.nextReview));
                    return futureReviewDate > today;
                case 'concluido':
                    // Tópicos concluídos podem não ter nextReview
                    return topic.reviewStage === 'Concluído' || topic.completed === true;
                default:
                    return false;
            }
        });
    };

    const getTopicStatus = (topic: any) => {
        if (topic.reviewStage === 'Concluído') return 'completed';
        if (!topic.nextReview) return 'new';

        const today = startOfDay(new Date());
        const reviewDate = startOfDay(new Date(topic.nextReview));
        const daysOverdue = differenceInDays(today, reviewDate);

        if (daysOverdue > 0) return 'overdue';
        if (daysOverdue === 0) return 'today';
        return 'future';
    };

    const getStatusText = (topic: any) => {
        const status = getTopicStatus(topic);

        if (status === 'completed') return 'Concluído';
        if (!topic.nextReview) return 'Novo';

        const today = startOfDay(new Date());
        const reviewDate = startOfDay(new Date(topic.nextReview));
        const daysOverdue = differenceInDays(today, reviewDate);

        if (daysOverdue > 0) return `${daysOverdue} dias atraso`;
        if (daysOverdue === 0) return 'Hoje';
        return `Em ${Math.abs(daysOverdue)} dias`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'overdue': return 'text-red-600';
            case 'today': return 'text-orange-600';
            case 'future': return 'text-blue-600';
            case 'completed': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    const getRevisionsColor = (status: string) => {
        switch (status) {
            case 'overdue': return 'text-red-600';
            case 'today': return 'text-orange-600';
            case 'future': return 'text-blue-600';
            case 'completed': return 'text-green-600';
            default: return 'text-blue-600'; // cor padrão
        }
    };

    const getReviewCount = (topic: any) => {
        // Obter o perfil do usuário e o número máximo de revisões
        const userProfile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
        const maxReviews = REVIEW_PROFILES[userProfile].maxReviews;

        // Debug para verificar os dados do tópico
        console.log('🔍 Debug tópico:', {
            name: topic.name,
            reviewStage: topic.reviewStage,
            reviewCount: topic.reviewCount,
            review_count: topic.review_count
        });

        // Usar reviewCount do banco se disponível, senão usar 0
        const actualReviewCount = topic.reviewCount || topic.review_count || 0;

        // Se está concluído, completou todas as revisões do perfil
        if (topic.reviewStage === 'Concluído') return maxReviews;

        // Retornar o número real de revisões feitas, limitado pelo máximo do perfil
        return Math.min(actualReviewCount, maxReviews);
    };

    const getMaxReviews = () => {
        const userProfile = settings?.review_profile || ReviewProfile.INTERMEDIATE;
        return REVIEW_PROFILES[userProfile].maxReviews;
    };

    // Filtrar matérias que têm tópicos para a aba atual
    const subjectsWithTopics = subjects
        .map((subject, index) => ({
            subject,
            color: colors[index % colors.length],
            topics: getTopicsForTab(subject).filter(topic => {
                if (searchTerm.trim() === '') return true;

                const searchLower = searchTerm.toLowerCase();
                return (
                    topic.name.toLowerCase().includes(searchLower) ||
                    subject.name.toLowerCase().includes(searchLower)
                );
            })
        }))
        .filter(item => item.topics.length > 0)
        .sort((a, b) => a.subject.name.localeCompare(b.subject.name));

    const hasActiveSearch = searchTerm.trim() !== '';
    const hasNoResults = subjectsWithTopics.length === 0;

    if (hasNoResults) {
        if (hasActiveSearch) {
            return (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhuma correspondência encontrada
                    </h3>
                    <p className="text-gray-600">
                        Nenhuma disciplina ou tópico encontrado para "{searchTerm}".
                        <br />
                        Verifique a ortografia ou limpe o filtro.
                    </p>
                </div>
            );
        }

        return (
            <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">
                    {tab === 'hoje' ? '🎉' : tab === 'futuras' ? '📅' : '✅'}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {tab === 'hoje' ? 'Nenhuma revisão pendente!' :
                        tab === 'futuras' ? 'Nenhuma revisão futura' :
                            'Nenhum tópico concluído ainda'}
                </h3>
                <p className="text-gray-600">
                    {tab === 'hoje' ? 'Parabéns! Você está em dia com todas as revisões.' :
                        tab === 'futuras' ? 'Não há revisões programadas para o futuro.' :
                            'Continue estudando para ver seus progressos aqui.'}
                </p>
            </div>
        );
    }

    const handleConfirmReview = () => {
        onMarkReviewed(confirmDialog.subjectId, confirmDialog.topicId);
        setConfirmDialog({
            isOpen: false,
            subjectId: '',
            topicId: '',
            topicName: ''
        });
    };

    const handleCloseDialog = () => {
        setConfirmDialog({
            isOpen: false,
            subjectId: '',
            topicId: '',
            topicName: ''
        });
    };

    return (
        <>
            <div className="space-y-4">
                {subjectsWithTopics.map(({ subject, topics, color }) => {
                    const isExpanded = expandedSubjects.includes(subject.id);

                    return (
                        <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 mb-4">
                            <CardContent className="p-4">
                                {/* Cabeçalho da matéria com seta de expandir/recolher */}
                                 <div className="flex items-center justify-between mb-2">
                                     <div 
                                       className="flex items-center gap-2 cursor-pointer flex-1" 
                                       onClick={() => onToggleExpanded(subject.id)}
                                     >
                                         {isExpanded ? (
                                             <ChevronDown className="h-5 w-5 text-gray-600" />
                                         ) : (
                                             <ChevronRight className="h-5 w-5 text-gray-600" />
                                         )}
                                         <div className="w-1.5 h-6 rounded bg-gray-300" style={{ backgroundColor: color }} />
                                         <span className="font-bold text-gray-800 text-base uppercase">{subject.name}</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 onSubjectNote(subject.id);
                                             }}
                                             className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                                             title="Anotações da matéria"
                                         >
                                             <NotebookPen className="w-4 h-4" />
                                         </button>
                                         <div className="text-xs text-gray-500">
                                             {topics.length} {topics.length === 1 ? 'tópico' : 'tópicos'}
                                         </div>
                                     </div>
                                 </div>

                                {/* Tópicos (expandido) */}
                                {isExpanded && (
                                    <div className="space-y-3 mt-2">
                                        {topics.map((topic) => {
                                            const status = getTopicStatus(topic);
                                            const statusText = getStatusText(topic);
                                            const reviewCount = getReviewCount(topic);
                                            const isHighlighted = highlightedTopic === topic.id;

                                            return (
                                                <div 
                                                    key={topic.id} 
                                                    className={`flex items-start gap-2 border-b border-gray-100 pb-2 last:border-b-0 transition-all duration-300 ${
                                                        isHighlighted 
                                                            ? 'animate-pulse bg-yellow-100 border-yellow-300 rounded-lg p-2 -m-2' 
                                                            : ''
                                                    }`}
                                                    style={{
                                                        animation: isHighlighted 
                                                            ? 'highlight-blink 2s ease-in-out 3' 
                                                            : undefined
                                                    }}
                                                >
                                    <div className="flex-1 min-w-0 ml-7">
                                        <div className={`font-medium truncate ${
                                            isHighlighted ? 'text-yellow-900' : 'text-gray-800'
                                        }`}>
                                            {topic.name}
                                        </div>
                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                            <div className="mt-1">
                                                <SubtopicsList subtopics={topic.subtopics} style="badges" />
                                            </div>
                                        )}
                                    </div>

                                                    <div className="flex flex-col items-end min-w-[60px] text-xs font-medium">
                                                        <span className="text-gray-600">Revisões</span>
                                                        <span className={getRevisionsColor(status)}>{reviewCount}/{getMaxReviews()}</span>
                                                    </div>

                                                    <div className="flex flex-col items-end min-w-[80px] text-xs font-medium">
                                                        <span className="text-gray-600">Revisão</span>
                                                        <span className={getStatusColor(status)}>{topic.reviewStage || '1ª Revisão'}</span>
                                                    </div>

                                                    <div className="flex flex-col items-end min-w-[100px] text-xs font-medium">
                                                        <span className="text-gray-600">Status</span>
                                                        <span className={getStatusColor(status)}>{statusText}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1 ml-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onAddNote(subject.id, topic.id)}
                                                            title="Adicionar nota"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onEditTopic(subject.id, topic.id)}
                                                            title="Editar tópico"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </Button>

                                                        {status !== 'completed' && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={() => setConfirmDialog({
                                                                    isOpen: true,
                                                                    subjectId: subject.id,
                                                                    topicId: topic.id,
                                                                    topicName: topic.name
                                                                })}
                                                                className="bg-green-600 hover:bg-green-700 h-8 px-3"
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Revisei
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <ReviewConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={handleCloseDialog}
                onConfirm={handleConfirmReview}
                topicName={confirmDialog.topicName}
            />
        </>
    );
};