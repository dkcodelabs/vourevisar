
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Detalhamento por Matéria e Tópico
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-gray-600 mb-4">
            <p><strong>Visão Geral (sem expansão)</strong></p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Cada matéria tem uma <strong>seta de expansão</strong> (▶ ou 📋)</li>
              <li>• A cor indica o desempenho geral</li>
            </ul>
          </div>
        </CardContent>
      </Card>

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

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 Destaque Automático: Tópicos Negligenciados</h4>
          <p className="text-sm text-blue-700 mb-2">
            Se houver tópicos com <strong>0 ou poucas questões</strong> (ex: &lt;3), aparece um bloco assim:
          </p>
          <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded-r">
            <p className="text-sm text-red-800 font-medium">⚠️ Tópicos com pouca prática:</p>
            <p className="text-sm text-red-700">- Acentuação (0 questões)</p>
            <p className="text-sm text-red-700">- Concordância verbal (2 questões)</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-purple-800 mb-2">🎨 Estilo visual sugerido (componentes):</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Use <strong>cards</strong> com leve sombra e bordas arredondadas</li>
            <li>• Dentro do card da matéria, os tópicos são listados como uma <strong>tabela flexível responsiva</strong></li>
            <li>• As <strong>barras de progresso</strong> podem ser feitas com divs coloridas com width proporcional à % de acerto</li>
            <li>• Ícones ou alertas <strong>em vermelho</strong> para chamar atenção nos tópicos não praticados</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionsOverview;
