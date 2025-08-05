import React from 'react';
import { BookOpen, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SubjectWithStatus } from '@/hooks/useNextSubjects';
import { Subject } from '@/types';

interface NextCycleSubjectsProps {
  subjectsByStatus: {
    available: SubjectWithStatus[];
    'in-review': SubjectWithStatus[];
    completed: SubjectWithStatus[];
    'no-topics': SubjectWithStatus[];
    unavailable: SubjectWithStatus[];
  };
  nextCycleSubjects: Subject[];
}

const NextCycleSubjects: React.FC<NextCycleSubjectsProps> = ({
  subjectsByStatus,
  nextCycleSubjects
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'in-review':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'border-blue-200 bg-blue-50';
      case 'in-review':
        return 'border-yellow-200 bg-yellow-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-blue-500';
      case 'in-review':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getSubjectProgress = (subject: Subject | SubjectWithStatus['subject']) => {
    const totalTopics = subject.topics?.length || 0;
    const completedTopics = subject.topics?.filter(topic => {
      const reviewCount = topic.reviewCount || topic.review_count || 0;
      return reviewCount > 0;
    }).length || 0;
    
    return totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  };

  const SubjectCard: React.FC<{ 
    subject: Subject | SubjectWithStatus['subject']; 
    status?: string;
    isNextCycle?: boolean;
  }> = ({ subject, status = 'available', isNextCycle = false }) => {
    const progress = getSubjectProgress(subject);
    
    return (
      <Card className={`${getStatusColor(status)} border shadow-sm hover:shadow-md transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {isNextCycle ? (
              <ArrowRight className="h-4 w-4 text-purple-600 mt-0.5" />
            ) : (
              getStatusIcon(status)
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 truncate">
                {subject.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {subject.topics?.length || 0} tópicos
              </p>
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isNextCycle ? 'bg-purple-500' : getProgressColor(status)
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const SectionTitle: React.FC<{ 
    title: string; 
    count: number; 
    icon: React.ReactNode;
    isCollapsible?: boolean;
  }> = ({ title, count, icon, isCollapsible = true }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-900">
          {title} {count > 0 && `(${count})`}
        </h3>
      </div>
      {isCollapsible && count > 0 && (
        <button className="text-gray-400 hover:text-gray-600">
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Próximas Disciplinas do Ciclo */}
      {subjectsByStatus.available.length > 0 && (
        <div className="space-y-3">
          <SectionTitle
            title="Próximas Disciplinas do Ciclo"
            count={subjectsByStatus.available.length}
            icon={<BookOpen className="h-5 w-5 text-blue-600" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjectsByStatus.available.map((item) => (
              <SubjectCard
                key={item.subject.id}
                subject={item.subject}
                status={item.status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Em Revisão */}
      {subjectsByStatus['in-review'].length > 0 && (
        <div className="space-y-3">
          <SectionTitle
            title="Em Revisão"
            count={subjectsByStatus['in-review'].length}
            icon={<Clock className="h-5 w-5 text-yellow-600" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjectsByStatus['in-review'].map((item) => (
              <SubjectCard
                key={item.subject.id}
                subject={item.subject}
                status={item.status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Concluídas */}
      {subjectsByStatus.completed.length > 0 && (
        <div className="space-y-3">
          <SectionTitle
            title="Concluídas"
            count={subjectsByStatus.completed.length}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjectsByStatus.completed.map((item) => (
              <SubjectCard
                key={item.subject.id}
                subject={item.subject}
                status={item.status}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NextCycleSubjects;