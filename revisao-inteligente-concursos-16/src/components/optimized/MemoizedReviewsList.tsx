import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Topic } from '@/types';
import { useMemoizedTopicFilters } from '@/hooks/useMemoizedCalculations';

interface MemoizedReviewsListProps {
  topics: Topic[];
  onTopicReview: (topicId: string) => void;
  isLoading?: boolean;
}

const TopicCard = memo<{
  topic: Topic;
  onReview: (topicId: string) => void;
}>(({ topic, onReview }) => {
  const handleReview = useCallback(() => {
    onReview(topic.id);
  }, [topic.id, onReview]);

  const getStatusIcon = () => {
    if (!topic.nextReview) return <Clock className="h-4 w-4" />;
    
    const today = new Date();
    const reviewDate = new Date(topic.nextReview);
    
    if (reviewDate < today) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (reviewDate.toDateString() === today.toDateString()) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (topic.reviewStage === 'Concluído') {
      return <Badge variant="secondary">Concluído</Badge>;
    }
    
    if (!topic.nextReview) {
      return <Badge variant="outline">Não iniciado</Badge>;
    }
    
    const today = new Date();
    const reviewDate = new Date(topic.nextReview);
    
    if (reviewDate < today) {
      return <Badge variant="destructive">Atrasado</Badge>;
    } else if (reviewDate.toDateString() === today.toDateString()) {
      return <Badge variant="default">Hoje</Badge>;
    }
    return <Badge variant="outline">Futuro</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{topic.name}</CardTitle>
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Revisões: {topic.reviewCount}</span>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {topic.nextReview ? (
              <span>
                Próxima: {format(new Date(topic.nextReview), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            ) : (
              <span>Não iniciado</span>
            )}
          </div>
          {topic.reviewStage !== 'Concluído' && (
            <Button size="sm" onClick={handleReview}>
              Revisar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

TopicCard.displayName = 'TopicCard';

const MemoizedReviewsList = memo<MemoizedReviewsListProps>(({ 
  topics, 
  onTopicReview, 
  isLoading = false 
}) => {
  const { delayed, today, future, completed } = useMemoizedTopicFilters(topics);

  const sections = useMemo(() => [
    {
      title: 'Atrasadas',
      topics: delayed,
      color: 'text-red-600',
      count: delayed.length,
    },
    {
      title: 'Hoje',
      topics: today,
      color: 'text-blue-600',
      count: today.length,
    },
    {
      title: 'Futuras',
      topics: future,
      color: 'text-green-600',
      count: future.length,
    },
    {
      title: 'Concluídas',
      topics: completed,
      color: 'text-gray-600',
      count: completed.length,
    },
  ], [delayed, today, future, completed]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <p className="text-muted-foreground">
            Nenhum tópico encontrado para revisão
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        section.count > 0 && (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className={`text-lg font-semibold ${section.color}`}>
                {section.title}
              </h3>
              <Badge variant="outline">
                {section.count}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onReview={onTopicReview}
                />
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
});

MemoizedReviewsList.displayName = 'MemoizedReviewsList';

export default MemoizedReviewsList;