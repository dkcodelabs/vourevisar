import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubtopicsList } from "@/components/ui/subtopics-list";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Edit3, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject, Topic } from '@/types';
import { ReviewConfirmDialog } from './ReviewConfirmDialog';

interface ReviewsGroupedProps {
    subjects: Subject[];
    tab: 'hoje' | 'futuras' | 'concluido';
    expandedSubjects: string[];
    searchTerm?: string;
    onToggleExpanded: (subjectId: string) => void;
    onMarkReviewed: (subjectId: string, topicId: string) => void;
    onAddNote: (subjectId: string, topicId: string) => void;
    onEditTopic: (subjectId: string, topicId: string) => void;
}

export const ReviewsGrouped: React.FC<ReviewsGroupedProps> = ({
    subjects,
    tab,
    expandedSubjects,
    searchTerm = '',
    onToggleExpanded,
    onMarkReviewed,
    onAddNote,
    onEditTopic
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

    const getTopicsForTab = (subject: Subject) => {
        const today = startOfDay(new Date());

        return subject.topics.filter(topic => {
            if (!topic.nextReview) return false;

            const reviewDate = startOfDay(new Date(topic.nextReview));

            switch (tab) {
                case 'hoje':
                    // Hoje + Atrasadas
                    return reviewDate <= today;
                case 'futuras':
                    // Futuras
                    return reviewDate > today;
                case 'concluido':
                    // Concluídos
                    return topic.reviewStage === 'Concluído';
                default:
                    return false;
            }
        });
    };

    const getTopicStatus = (topic: Topic) => {
        if (topic.reviewStage === 'Concluído') return 'completed';

        if (!topic.nextReview) return 'new';

        const today = startOfDay(new Date());
        const reviewDate = startOfDay(new Date(topic.nextReview));
        const daysOverdue = differenceInDays(today, reviewDate);

        if (daysOverdue > 0) return 'overdue';
        if (daysOverdue === 0) return 'today';
        return 'future';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'overdue': return '🔴';
            case 'today': return '🟡';
            case 'future': return '🟢';
            case 'completed': return '✅';
            default: return '⚪';
        }
    };

    const getStatusText = (topic: Topic) => {
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

    // Filtrar matérias que têm tópicos para a aba atual
    const subjectsWithTopics = subjects
        .map(subject => ({
            subject,
            topics: getTopicsForTab(subject).filter(topic => {
                // Aplicar filtro de busca se searchTerm estiver presente
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

    // Verificar se há busca ativa mas sem resultados
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
                {subjectsWithTopics.map(({ subject, topics }) => {
                    const isExpanded = expandedSubjects.includes(subject.id);

                    return (
                        <Card key={subject.id} className="overflow-hidden">
                            <Collapsible open={isExpanded} onOpenChange={() => onToggleExpanded(subject.id)}>
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b">
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className="h-5 w-5 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-gray-500" />
                                            )}
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {topics.length} {topics.length === 1 ? 'tópico' : 'tópicos'}
                                        </Badge>
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <CardContent className="p-0">
                                        <div className="space-y-1">
                                            {topics.map((topic, index) => {
                                                const status = getTopicStatus(topic);
                                                const statusText = getStatusText(topic);

                                                return (
                                                    <div
                                                        key={topic.id}
                                                        className={`flex items-center justify-between p-4 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                                            } hover:bg-gray-100 transition-colors`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-lg">{getStatusIcon(status)}</span>
                                                <h4 className="font-medium text-gray-900 truncate">
                                                    {topic.name}
                                                </h4>
                                            </div>
                                            <SubtopicsList subtopics={topic.subtopics || []} style="badges" className="ml-6" />

                                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                                                <div className="flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    <span>{statusText}</span>
                                                                </div>

                                                                {topic.reviewStage && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        <span>Estágio: {topic.reviewStage}</span>
                                                                    </div>
                                                                )}

                                                                {topic.nextReview && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span>📅</span>
                                                                        <span>{format(new Date(topic.nextReview), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 ml-4">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onAddNote(subject.id, topic.id)}
                                                                title="Adicionar nota"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onEditTopic(subject.id, topic.id)}
                                                                title="Editar tópico"
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
                                                                    className="bg-green-600 hover:bg-green-700"
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
                                    </CardContent>
                                </CollapsibleContent>
                            </Collapsible>
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
