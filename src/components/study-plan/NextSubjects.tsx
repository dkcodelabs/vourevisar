
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X 
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubjectWithStatus } from '@/hooks/useNextSubjects';

interface NextSubjectsProps {
  subjectsByStatus: {
    available: SubjectWithStatus[];
    'in-review': SubjectWithStatus[];
    completed: SubjectWithStatus[];
    'no-topics': SubjectWithStatus[];
    unavailable: SubjectWithStatus[];
  };
}

const getStatusIcon = (status: SubjectWithStatus['status'], size = 16) => {
  switch (status) {
    case 'available':
      return <BookOpen size={size} className="text-app-blue" />;
    case 'in-review':
      return <Clock size={size} className="text-yellow-500" />;
    case 'completed':
      return <CheckCircle size={size} className="text-green-500" />;
    case 'no-topics':
      return <AlertCircle size={size} className="text-gray-400" />;
    case 'unavailable':
      return <X size={size} className="text-red-500" />;
    default:
      return <BookOpen size={size} className="text-gray-400" />;
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
  const iconSize = isMobile ? 14 : 16;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full"
          >
            <Card className={`${getStatusColor(item.status)} border backdrop-blur-lg shadow-sm hover:shadow-md transition-all w-full`}>
              <CardContent className={`${isMobile ? 'p-2' : 'p-3'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(item.status, iconSize)}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>
                      {item.subject.name}
                    </h3>
                    <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 truncate`}>
                      {item.subject.topics?.length || 0} tópicos
                    </p>
                  </div>
                </div>
                <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-400 whitespace-nowrap`}>
                  {item.statusLabel}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{item.subject.name}</p>
            <p className="text-gray-600">{item.statusLabel}</p>
            <p className="text-gray-500">{item.subject.topics?.length || 0} tópicos total</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const StatusSection: React.FC<{ 
  title: string; 
  items: SubjectWithStatus[]; 
  isMobile: boolean;
  icon: React.ReactNode;
}> = ({ title, items, isMobile, icon }) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold flex items-center gap-2 text-gray-700`}>
        {icon}
        {title} ({items.length})
      </h3>
      <div className={`grid gap-2 ${
        isMobile 
          ? 'grid-cols-1' 
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {items.map(item => (
          <SubjectStatusCard 
            key={item.subject.id} 
            item={item} 
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
};

const NextSubjects: React.FC<NextSubjectsProps> = ({ subjectsByStatus }) => {
  const isMobile = useIsMobile();
  
  const totalSubjects = Object.values(subjectsByStatus).reduce((acc, curr) => acc + curr.length, 0);
  
  if (totalSubjects === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold flex items-center`}>
        <ArrowRight className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
        Próximas Disciplinas ({totalSubjects})
      </h2>
      
      <div className="space-y-4">
        <StatusSection
          title="Disponíveis para Estudo"
          items={subjectsByStatus.available}
          isMobile={isMobile}
          icon={getStatusIcon('available', isMobile ? 14 : 16)}
        />
        
        <StatusSection
          title="Em Revisão"
          items={subjectsByStatus['in-review']}
          isMobile={isMobile}
          icon={getStatusIcon('in-review', isMobile ? 14 : 16)}
        />
        
        <StatusSection
          title="Concluídas"
          items={subjectsByStatus.completed}
          isMobile={isMobile}
          icon={getStatusIcon('completed', isMobile ? 14 : 16)}
        />
        
        <StatusSection
          title="Sem Tópicos"
          items={subjectsByStatus['no-topics']}
          isMobile={isMobile}
          icon={getStatusIcon('no-topics', isMobile ? 14 : 16)}
        />
        
        <StatusSection
          title="Indisponíveis"
          items={subjectsByStatus.unavailable}
          isMobile={isMobile}
          icon={getStatusIcon('unavailable', isMobile ? 14 : 16)}
        />
      </div>
    </div>
  );
};

export default NextSubjects;
