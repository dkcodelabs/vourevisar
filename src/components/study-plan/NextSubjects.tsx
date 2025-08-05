
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, AlertCircle, X } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubjectWithStatus } from '@/hooks/useNextSubjects';
import { BookOpen, CheckCircle, Clock, ChevronDown } from 'lucide-react';

interface NextSubjectsProps {
  subjectsByStatus: {
    available: SubjectWithStatus[];
    'in-review': SubjectWithStatus[];
    completed: SubjectWithStatus[];
    'no-topics': SubjectWithStatus[];
    unavailable: SubjectWithStatus[];
  };
  nextCycleSubjects: any[];
  viewMode: 'list' | 'card';
}

const getStatusIcon = (status: SubjectWithStatus['status'], size = 16) => {
  const className = size === 20 ? "w-5 h-5" : "w-4 h-4";
  
  switch (status) {
    case 'available':
      return <BookOpen className={className} />;
    case 'in-review':
      return <Clock className={className} />;
    case 'completed':
      return <CheckCircle className={className} />;
    case 'no-topics':
      return <AlertCircle size={size} className="text-gray-400" />;
    case 'unavailable':
      return <X size={size} className="text-red-500" />;
    default:
      return <BookOpen className={className} />;
  }
};

const getStatusColor = (status: SubjectWithStatus['status']) => {
  switch (status) {
    case 'available':
      return 'border-app-blue bg-blue-50';
    case 'in-review':
      return 'border-yellow-500 bg-yellow-50';
    case 'completed':
      return 'border-green-500 bg-green-50';
    case 'no-topics':
      return 'border-gray-400 bg-gray-50';
    case 'unavailable':
      return 'border-red-500 bg-red-50';
    default:
      return 'border-gray-300 bg-gray-50';
  }
};

const SubjectStatusCard: React.FC<{ item: SubjectWithStatus; isMobile: boolean }> = ({ item, isMobile }) => {
  // Calcular progresso
  const progress = item.subject.topics && item.subject.topics.length > 0 
    ? (item.subject.topics.filter((topic: any) => topic.status === 'completed').length / item.subject.topics.length) * 100 
    : 0;

  // Obter estilos baseados no status
  const getBorderColor = (status: string) => {
    switch (status) {
      case 'available': return 'border-sky-500';
      case 'completed': return 'border-green-500';
      case 'in-review': return 'border-yellow-500';
      default: return 'border-gray-500';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-sky-500';
      case 'completed': return 'bg-green-500';
      case 'in-review': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-sky-600';
      case 'completed': return 'text-green-600';
      case 'in-review': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white border-l-4 ${getBorderColor(item.status)} p-4 rounded-lg shadow-sm flex items-center justify-between mb-3 transition-all`}>
      <div className="flex items-center gap-4 flex-grow">
        <div className="flex-shrink-0">
          {React.cloneElement(getStatusIcon(item.status, 20), { 
            className: `w-5 h-5 ${getIconColor(item.status)}` 
          })}
        </div>
        <div className="flex-grow">
          <h4 className="text-base font-semibold text-gray-800">{item.subject.name}</h4>
          <p className="text-sm font-medium text-gray-500">{item.subject.topics?.length || 0} tópicos</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-1/3 max-w-sm ml-4 flex-shrink-0">
        <p className="text-sm font-medium text-gray-600 w-16 text-right">{Math.round(progress)}%</p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${getProgressColor(item.status)} h-2 rounded-full transition-all duration-500`} 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Componente CollapsibleSection para NextSubjects
interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, count, icon, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="mb-6">
      <button 
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="mt-4 pl-2 pr-1">
          {children}
        </div>
      )}
    </section>
  );
};

const StatusSection: React.FC<{ 
  title: string; 
  items: SubjectWithStatus[]; 
  isMobile: boolean;
  icon: React.ReactNode;
  viewMode: 'list' | 'card';
}> = ({ title, items, isMobile, icon, viewMode }) => {
  if (items.length === 0) return null;

  // Função para mapear status para categoria do card
  const getCardCategory = (status: string): 'available' | 'completed' | 'review' => {
    switch (status) {
      case 'completed': return 'completed';
      case 'in-review': return 'review';
      default: return 'available';
    }
  };

  return (
    <CollapsibleSection
      title={title}
      count={items.length}
      icon={icon}
    >
      {viewMode === 'list' ? (
        <div className="space-y-0">
          {items.map(item => (
            <SubjectStatusCard 
              key={item.subject.id} 
              item={item} 
              isMobile={isMobile}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <SubjectStatusCard 
              key={item.subject.id} 
              item={item} 
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
};

const NextSubjects: React.FC<NextSubjectsProps> = ({ subjectsByStatus, nextCycleSubjects, viewMode }) => {
  const isMobile = useIsMobile();
  
  console.log('NextSubjects renderizado com viewMode:', viewMode);
  
  const totalSubjects = Object.values(subjectsByStatus).reduce((acc, curr) => acc + curr.length, 0);
  const hasAvailableSubjects = subjectsByStatus.available.length > 0;
  
  if (totalSubjects === 0) return null;

  return (
    <div className="space-y-4">
      
      <div className="space-y-4">
        {/* Mensagem quando não há próximas disciplinas do ciclo */}
        {!hasAvailableSubjects && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-base text-blue-700 font-medium">
              ✅ Não há mais disciplinas disponíveis no ciclo atual
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Continue revisando os tópicos em andamento ou aguarde novas revisões
            </p>
          </div>
        )}

        <StatusSection
          title="Próximas Disciplinas do Ciclo"
          items={subjectsByStatus.available}
          isMobile={isMobile}
          icon={getStatusIcon('available', isMobile ? 14 : 16)}
          viewMode={viewMode}
        />
        
        <StatusSection
          title="Em Revisão"
          items={subjectsByStatus['in-review']}
          isMobile={isMobile}
          icon={getStatusIcon('in-review', isMobile ? 14 : 16)}
          viewMode={viewMode}
        />
        
        <StatusSection
          title="Concluídas"
          items={subjectsByStatus.completed}
          isMobile={isMobile}
          icon={getStatusIcon('completed', isMobile ? 14 : 16)}
          viewMode={viewMode}
        />
        

      </div>
    </div>
  );
};

export default NextSubjects;
