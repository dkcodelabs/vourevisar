import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SubjectProgressCard from './SubjectProgressCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface TopicProgress {
  name: string;
  questions: number;
  correct: number;
  percentage: number;
}

interface SubjectData {
  subject: string;
  totalTopics: number;
  completedTopics: number;
  percentage: number;
  topics: TopicProgress[];
  color: string;
}

const QuestionsOverview: React.FC = () => {
  const { user } = useAuth();
  const [subjectsData, setSubjectsData] = useState<SubjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    if (user) {
      fetchQuestionsData();
    }
  }, [user]);

  const fetchQuestionsData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Buscar todas as tentativas de questões do usuário
      const { data: attempts, error } = await supabase
        .from('question_attempts')
        .select('subject, topic, is_correct')
        .eq('user_id', user.id);

      if (error) throw error;

      // Agrupar dados por matéria e tópico
      const subjectMap = new Map<string, Map<string, { total: number; correct: number }>>();

      attempts?.forEach(attempt => {
        if (!subjectMap.has(attempt.subject)) {
          subjectMap.set(attempt.subject, new Map());
        }
        
        const topicMap = subjectMap.get(attempt.subject)!;
        if (!topicMap.has(attempt.topic)) {
          topicMap.set(attempt.topic, { total: 0, correct: 0 });
        }
        
        const topicData = topicMap.get(attempt.topic)!;
        topicData.total++;
        if (attempt.is_correct) {
          topicData.correct++;
        }
      });

      // Converter para o formato necessário
      const processedData: SubjectData[] = [];
      let colorIndex = 0;

      subjectMap.forEach((topicMap, subject) => {
        const topics: TopicProgress[] = [];
        let totalQuestions = 0;
        let totalCorrect = 0;

        topicMap.forEach((data, topic) => {
          const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
          topics.push({
            name: topic,
            questions: data.total,
            correct: data.correct,
            percentage
          });
          totalQuestions += data.total;
          totalCorrect += data.correct;
        });

        // Ordenar tópicos por nome
        topics.sort((a, b) => a.name.localeCompare(b.name));

        const subjectPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const completedTopics = topics.filter(t => t.percentage >= 80).length;

        processedData.push({
          subject,
          totalTopics: topics.length,
          completedTopics,
          percentage: subjectPercentage,
          topics,
          color: colors[colorIndex % colors.length]
        });

        colorIndex++;
      });

      // Ordenar matérias por nome
      processedData.sort((a, b) => a.subject.localeCompare(b.subject));

      setSubjectsData(processedData);
    } catch (error) {
      console.error('Erro ao buscar dados das questões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subjectsData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Nenhuma questão registrada ainda</p>
            <p className="text-sm text-gray-500">
              Comece registrando suas questões resolvidas para ver o progresso por matéria e tópico
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {subjectsData.map((subjectData, index) => (
          <SubjectProgressCard
            key={index}
            subject={subjectData.subject}
            totalTopics={subjectData.totalTopics}
            completedTopics={subjectData.completedTopics}
            percentage={subjectData.percentage}
            topics={subjectData.topics}
            color={subjectData.color}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionsOverview;
