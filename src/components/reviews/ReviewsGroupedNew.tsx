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
import { DifficultyRating } from '@/components/ui/difficulty-rating';

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
  onRateDifficulty: (subjectId: string, topicId: string, topicName: string, subjectName: string) => void;
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
  onSubjectNote,
  onRateDifficulty
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

        // Log removido para otimização

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

    // Função para determinar a cor da matéria baseada no status dos tópicos
    const getSubjectColor = (subject: Subject, topics: any[], index: number) => {
        // Para a aba "hoje" (que inclui hoje + atrasadas), usar cores baseadas no status
        if (tab === 'hoje') {
            // Verificar se há tópicos atrasados
            const hasOverdueTopics = topics.some(topic => getTopicStatus(topic) === 'overdue');
            if (hasOverdueTopics) {
                return '#ef4444'; // Vermelho para atrasadas
            }
            
            // Se não há atrasados, mas há tópicos para hoje
            const hasTodayTopics = topics.some(topic => getTopicStatus(topic) === 'today');
            if (hasTodayTopics) {
                return '#f97316'; // Laranja para hoje
            }
        } else if (tab === 'futuras') {
            // Aba futuras: cor azul
            return '#3b82f6'; // Azul para futuras
        } else if (tab === 'concluido') {
            // Aba concluído: cor verde
            return '#22c55e'; // Verde para concluídas
        }
        
        // Para outros casos padrão, usar as cores do array
        return colors[index % colors.length];
    };

    // Função para calcular quantos dias um tópico está atrasado
    const getDaysOverdue = (topic: any) => {
        if (!topic.nextReview) return 0;
        const today = startOfDay(new Date());
        const reviewDate = startOfDay(new Date(topic.nextReview));
        const daysOverdue = differenceInDays(today, reviewDate);
        return Math.max(0, daysOverdue); // Retorna 0 se não estiver atrasado
    };

    // Função para encontrar o maior atraso de uma matéria
    const getSubjectMaxOverdue = (topics: any[]) => {
        if (topics.length === 0) return 0;
        return Math.max(...topics.map(topic => getDaysOverdue(topic)));
    };

    // Função para encontrar a próxima revisão mais próxima de uma matéria
    const getSubjectNextReview = (topics: any[]) => {
        const validDates = topics
            .filter(topic => topic.nextReview)
            .map(topic => new Date(topic.nextReview))
            .sort((a, b) => a.getTime() - b.getTime());
        
        return validDates.length > 0 ? validDates[0] : null;
    };

    // Função para encontrar a conclusão mais recente de uma matéria
    const getSubjectLatestCompletion = (topics: any[]) => {
        const validDates = topics
            .filter(topic => topic.updatedAt)
            .map(topic => new Date(topic.updatedAt))
            .sort((a, b) => b.getTime() - a.getTime());
        
        return validDates.length > 0 ? validDates[0] : null;
    };

    // Filtrar matérias que têm tópicos para a aba atual
    const subjectsWithTopics = subjects
        .map((subject, index) => {
            const filteredTopics = getTopicsForTab(subject).filter(topic => {
                if (searchTerm.trim() === '') return true;

                const searchLower = searchTerm.toLowerCase();
                return (
                    topic.name.toLowerCase().includes(searchLower) ||
                    subject.name.toLowerCase().includes(searchLower)
                );
            });

            // Ordenar tópicos dentro da matéria baseado na aba
            const sortedTopics = filteredTopics.sort((a, b) => {
                if (tab === 'hoje') {
                    // Aba hoje: ordenar por atraso (mais atrasado primeiro)
                    const aDaysOverdue = getDaysOverdue(a);
                    const bDaysOverdue = getDaysOverdue(b);
                    
                    // Se ambos estão atrasados, ordenar pelo mais atrasado primeiro
                    if (aDaysOverdue > 0 && bDaysOverdue > 0) {
                        return bDaysOverdue - aDaysOverdue;
                    }
                    
                    // Se apenas um está atrasado, ele vem primeiro
                    if (aDaysOverdue > 0) return -1;
                    if (bDaysOverdue > 0) return 1;
                    
                    // Se nenhum está atrasado, ordenar alfabeticamente
                    return a.name.localeCompare(b.name);
                    
                } else if (tab === 'futuras') {
                    // Aba futuras: ordenar do mais próximo para o mais distante
                    if (!a.nextReview && !b.nextReview) return a.name.localeCompare(b.name);
                    if (!a.nextReview) return 1;
                    if (!b.nextReview) return -1;
                    
                    const aDate = new Date(a.nextReview);
                    const bDate = new Date(b.nextReview);
                    return aDate.getTime() - bDate.getTime(); // Mais próximo primeiro
                    
                } else if (tab === 'concluido') {
                    // Aba concluído: ordenar pela sequência que foi concluído (mais recente primeiro)
                    // Assumindo que tópicos concluídos mais recentemente têm last_reviewed_at mais recente
                    if (!a.last_reviewed_at && !b.last_reviewed_at) return a.name.localeCompare(b.name);
                    if (!a.last_reviewed_at) return 1;
                    if (!b.last_reviewed_at) return -1;
                    
                    const aDate = new Date(a.last_reviewed_at);
                    const bDate = new Date(b.last_reviewed_at);
                    return bDate.getTime() - aDate.getTime(); // Mais recente primeiro
                }
                
                // Ordenação padrão alfabética
                return a.name.localeCompare(b.name);
            });

            return {
                subject,
                color: getSubjectColor(subject, sortedTopics, index),
                topics: sortedTopics,
                maxOverdue: getSubjectMaxOverdue(sortedTopics),
                nextReview: getSubjectNextReview(sortedTopics),
                latestCompletion: getSubjectLatestCompletion(sortedTopics)
            };
        })
        .filter(item => item.topics.length > 0)
        .sort((a, b) => {
            if (tab === 'hoje') {
                // Aba hoje: ordenar por atraso (matéria mais atrasada primeiro)
                if (a.maxOverdue > 0 && b.maxOverdue === 0) return -1;
                if (a.maxOverdue === 0 && b.maxOverdue > 0) return 1;
                
                if (a.maxOverdue > 0 && b.maxOverdue > 0) {
                    return b.maxOverdue - a.maxOverdue;
                }
                
            } else if (tab === 'futuras') {
                // Aba futuras: ordenar pela próxima revisão mais próxima
                if (!a.nextReview && !b.nextReview) return a.subject.name.localeCompare(b.subject.name);
                if (!a.nextReview) return 1;
                if (!b.nextReview) return -1;
                
                return a.nextReview.getTime() - b.nextReview.getTime();
                
            } else if (tab === 'concluido') {
                // Aba concluído: ordenar pela conclusão mais recente
                if (!a.latestCompletion && !b.latestCompletion) return a.subject.name.localeCompare(b.subject.name);
                if (!a.latestCompletion) return 1;
                if (!b.latestCompletion) return -1;
                
                return b.latestCompletion.getTime() - a.latestCompletion.getTime();
            }
            
            // Ordenação padrão por nome da matéria
            return a.subject.name.localeCompare(b.subject.name);
        });

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
                        <Card key={subject.id} className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 mb-4">
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
                                    <div className="mt-2">
                                        {/* Cabeçalho das colunas - apenas desktop */}
                                        <div className="hidden md:grid grid-cols-[1fr_120px_100px_100px_120px_120px] gap-4 items-center pb-2 mb-2 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            <div className="ml-7">Tópico</div>
                                            <div className="text-center">Dificuldade</div>
                                            <div className="text-center">Revisões</div>
                                            <div className="text-center">Próxima</div>
                                            <div className="text-center">Status</div>
                                            <div className="text-center">Ações</div>
                                        </div>
                                        
                                        {/* Lista de tópicos */}
                                        <div className="space-y-0">
                                        {topics.map((topic) => {
                                            const status = getTopicStatus(topic);
                                            const statusText = getStatusText(topic);
                                            const reviewCount = getReviewCount(topic);
                                            const isHighlighted = highlightedTopic === topic.id;

                                            return (
                                                <div 
                                                    key={topic.id} 
                                                    className={`transition-all duration-300 ${
                                                        isHighlighted 
                                                            ? 'animate-pulse bg-yellow-100 border-yellow-300 rounded-lg px-3 -mx-3' 
                                                            : ''
                                                    }`}
                                                    style={{
                                                        animation: isHighlighted 
                                                            ? 'highlight-blink 2s ease-in-out 3' 
                                                            : undefined
                                                    }}
                                                >
                                                    {/* Layout Desktop */}
                                                    <div className="hidden md:grid grid-cols-[1fr_120px_100px_100px_120px_120px] gap-4 items-center border-b border-gray-100 pb-3 pt-3 last:border-b-0">
                                    {/* Coluna 1: Nome do tópico + Subtópicos */}
                                    <div className="min-w-0 ml-7">
                                        <div className={`font-medium truncate mb-1 ${
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

                                    {/* Coluna 2: Estrelas de dificuldade (clicável) */}
                                    <div 
                                        className="flex justify-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors group"
                                        onClick={() => onRateDifficulty(subject.id, topic.id, topic.name, subject.name)}
                                        title={topic.difficulty_level ? "Clique para editar dificuldade" : "Clique para avaliar dificuldade"}
                                    >
                                        {topic.difficulty_level ? (
                                            <DifficultyRating
                                                value={topic.difficulty_level}
                                                readonly={true}
                                                size="sm"
                                                className="flex-shrink-0 group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <span className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap group-hover:underline">
                                                + Avaliar
                                            </span>
                                        )}
                                    </div>

                                                    {/* Coluna 3: Revisões */}
                                                    <div className="flex justify-center text-xs font-medium">
                                                        <span className={getRevisionsColor(status)}>{reviewCount}/{getMaxReviews()}</span>
                                                    </div>

                                                    {/* Coluna 4: Próxima */}
                                                    <div className="flex justify-center text-xs font-medium">
                                                        <span className={getStatusColor(status)}>{topic.reviewStage || '1ª Revisão'}</span>
                                                    </div>

                                                    {/* Coluna 5: Status */}
                                                    <div className="flex justify-center text-xs font-medium">
                                                        <span className={getStatusColor(status)}>{statusText}</span>
                                                    </div>

                                                    {/* Coluna 6: Ações */}
                                                    <div className="flex items-center gap-1 justify-end">
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

                                                    {/* Layout Mobile */}
                                                    <div className="md:hidden border-b border-gray-100 pb-3 pt-3 last:border-b-0">
                                                        {/* Nome do tópico */}
                                                        <div className={`font-medium mb-3 ${
                                                            isHighlighted ? 'text-yellow-900' : 'text-gray-800'
                                                        }`}>
                                                            {topic.name}
                                                        </div>
                                                        
                                                        {/* Grid de informações */}
                                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                                            {/* Dificuldade */}
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-gray-500 mb-1">Dificuldade</span>
                                                                <div 
                                                                    className="cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors"
                                                                    onClick={() => onRateDifficulty(subject.id, topic.id, topic.name, subject.name)}
                                                                >
                                                                    {topic.difficulty_level ? (
                                                                        <DifficultyRating
                                                                            value={topic.difficulty_level}
                                                                            readonly={true}
                                                                            size="sm"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-blue-600 font-medium">+ Avaliar</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Revisões */}
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-gray-500 mb-1">Revisões</span>
                                                                <span className={getRevisionsColor(status)}>{reviewCount}/{getMaxReviews()}</span>
                                                            </div>
                                                            
                                                            {/* Próxima */}
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-gray-500 mb-1">Próxima</span>
                                                                <span className={getStatusColor(status)}>{topic.reviewStage || '1ª Revisão'}</span>
                                                            </div>
                                                            
                                                            {/* Status */}
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-gray-500 mb-1">Status</span>
                                                                <span className={getStatusColor(status)}>{statusText}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Ações */}
                                                        <div className="flex items-center justify-center gap-2 mt-3">
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
                                                </div>
                                            );
                                        })}
                                        </div>
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