import React from 'react';
import { Button } from "@/components/ui/button";
import { BookOpen, Target, BarChart3, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '@/types';
import { differenceInDays, startOfDay } from 'date-fns';

interface SubjectOverviewProps {
  subjects: Subject[];
}

interface SubjectStatus {
  subject: Subject;
  status: 'critical' | 'attention' | 'good';
  daysOverdue: number;
  overdueTopics: number;
}

export const SubjectOverview: React.FC<SubjectOverviewProps> = ({ subjects }) => {
  const navigate = useNavigate();

  const getSubjectStatuses = (): SubjectStatus[] => {
    const today = startOfDay(new Date());

    return subjects.map(subject => {
      const overdueTopics = subject.topics.filter(topic => {
        if (!topic.nextReview) return false;
        const reviewDate = startOfDay(new Date(topic.nextReview));
        return reviewDate < today;
      });

      let maxDaysOverdue = 0;
      if (overdueTopics.length > 0) {
        maxDaysOverdue = Math.max(...overdueTopics.map(topic => {
          const reviewDate = startOfDay(new Date(topic.nextReview!));
          return differenceInDays(today, reviewDate);
        }));
      }

      let status: 'critical' | 'attention' | 'good' = 'good';
      if (maxDaysOverdue >= 5) {
        status = 'critical';
      } else if (maxDaysOverdue >= 1 || overdueTopics.length > 0) {
        status = 'attention';
      }

      return {
        subject,
        status,
        daysOverdue: maxDaysOverdue,
        overdueTopics: overdueTopics.length
      };
    });
  };

  const subjectStatuses = getSubjectStatuses();
  const criticalSubjects = subjectStatuses.filter(s => s.status === 'critical');
  const attentionSubjects = subjectStatuses.filter(s => s.status === 'attention');
  const goodSubjects = subjectStatuses.filter(s => s.status === 'good');



  // Função para encontrar o tópico mais atrasado de uma matéria
  const getMostOverdueTopic = (subject: Subject) => {
    const today = startOfDay(new Date());
    const overdueTopics = subject.topics.filter(topic => {
      if (!topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate < today;
    });

    if (overdueTopics.length === 0) return null;

    // Retorna o tópico com maior atraso
    return overdueTopics.reduce((mostOverdue, topic) => {
      const topicDate = startOfDay(new Date(topic.nextReview!));
      const mostOverdueDate = startOfDay(new Date(mostOverdue.nextReview!));
      return topicDate < mostOverdueDate ? topic : mostOverdue;
    });
  };

  // Função para navegar para revisões com destaque
  const handleSubjectClick = (subject: Subject, status: 'critical' | 'attention' | 'good') => {
    if (status === 'good') {
      // Para matérias em dia, vai para a página da matéria
      navigate(`/materias/${subject.id}`);
    } else {
      // Para matérias críticas/atenção, vai para revisões com parâmetros
      const mostOverdueTopic = getMostOverdueTopic(subject);
      if (mostOverdueTopic) {
        navigate(`/revisoes?subject=${subject.id}&topic=${mostOverdueTopic.id}&highlight=true`);
      } else {
        navigate(`/revisoes?subject=${subject.id}`);
      }
    }
  };

  const renderSubjectGroup = (
    subjects: SubjectStatus[],
    status: 'critical' | 'attention' | 'good'
  ) => {
    if (subjects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-3">
            {status === 'critical' ? '🎉' : status === 'attention' ? '✨' : '📚'}
          </div>
          <p className="text-sm font-medium text-gray-600">
            {status === 'critical' ? 'Nenhuma crítica!' :
              status === 'attention' ? 'Nenhuma precisando atenção!' :
                'Todas precisam atenção'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {subjects.slice(0, 3).map(({ subject, daysOverdue, overdueTopics }) => (
          <div
            key={subject.id}
            className="flex items-center justify-between py-2 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => handleSubjectClick(subject, status)}
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">
                {subject.name}
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {status !== 'good' && (
                <span className="font-medium">
                  {daysOverdue}d
                </span>
              )}
              {status !== 'good' && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  status === 'critical' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {overdueTopics} atrasado{overdueTopics !== 1 ? 's' : ''}
                </span>
              )}
              {status === 'good' && (
                <span className="text-gray-500">
                  {subject.topics.length} tópico{subject.topics.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
        
        {subjects.length > 3 && (
          <button 
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors text-left"
            onClick={() => navigate('/ciclo-estudos')}
          >
            + {subjects.length - 3} outras matérias
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-6">
      {/* Header exatamente como na imagem */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Visão por Matéria</h2>
            <p className="text-sm text-gray-500">
              Suas {subjects.length} matérias organizadas por prioridade
            </p>
          </div>
        </div>
        
        {/* Botões como na imagem */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/ciclo-estudos')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Ver Ciclo
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/ciclo-estudos')}
          >
            <Target className="h-4 w-4 mr-1" />
            Plano
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/estatisticas')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Grid das categorias exatamente como na imagem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Críticas */}
        <div>
          <h3 className="flex items-center gap-2 font-medium text-red-600 text-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            Críticas <span className="text-gray-500 font-normal">(5+ dias atraso)</span>
          </h3>
          {renderSubjectGroup(criticalSubjects, 'critical')}
        </div>

        {/* Atenção */}
        <div>
          <h3 className="flex items-center gap-2 font-medium text-yellow-600 text-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            Atenção <span className="text-gray-500 font-normal">(1-4 dias)</span>
          </h3>
          {renderSubjectGroup(attentionSubjects, 'attention')}
        </div>

        {/* Em dia */}
        <div>
          <h3 className="flex items-center gap-2 font-medium text-green-600 text-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Em dia
          </h3>
          {renderSubjectGroup(goodSubjects, 'good')}
        </div>
      </div>
    </div>
  );
};
