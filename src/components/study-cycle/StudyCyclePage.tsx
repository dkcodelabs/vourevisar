import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3, 
  List, 
  ChevronDown, 
  ChevronUp, 
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import NotesModal from '@/components/reviews/NotesModal';
import { useStudyCycle } from '@/hooks/useStudyCycle';

// Mock data para demonstração
const mockData = {
  todaySubjects: [
    { id: 1, name: 'Matemática', progress: 3, total: 5, color: 'bg-gray-400' },
    { id: 2, name: 'Direito', progress: 2, total: 5, color: 'bg-gray-400' },
    { id: 3, name: 'História', progress: 0, total: 5, color: 'bg-gray-400' }
  ],
  nextSubjects: [
    { id: 4, name: 'Química', progress: 4, total: 5, color: 'bg-gray-400' },
    { id: 5, name: 'Geografia', progress: 2, total: 5, color: 'bg-gray-400' },
    { id: 6, name: 'Português', progress: 3, total: 5, color: 'bg-gray-400' }
  ],
  reviewedSubjects: [
    { id: 7, name: 'Física', progress: 5, total: 5, color: 'bg-gray-400' },
    { id: 8, name: 'Inglês', progress: 3, total: 5, color: 'bg-gray-400' }
  ],
  completedSubjects: [
    { id: 9, name: 'Biologia', progress: 5, total: 5, color: 'bg-gray-400' },
    { id: 10, name: 'Filosofia', progress: 5, total: 5, color: 'bg-gray-400' },
    { id: 11, name: 'Sociologia', progress: 5, total: 5, color: 'bg-gray-400' }
  ]
};

type ViewMode = 'cards' | 'list';

interface SubjectCardProps {
  subject: any;
  isToday?: boolean;
  isReviewed?: boolean;
  viewMode: ViewMode;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, isToday, isReviewed, viewMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');
  
  const { tempMarkedTopics, handleMarkTopicForReview, handleCancelTopicReview, handleCompleteSession } = useStudyCycle();
  
  const progressPercentage = (subject.progress / subject.total) * 100;
  
  const handleMarkForReview = (topicIndex: number) => {
    // Por enquanto, vamos usar um ID temporário que não vai para o banco
    // Quando conectarmos com dados reais, usaremos o ID real do tópico
    setSelectedTopicId(`temp-topic-${subject.id}-${topicIndex}`);
    setSelectedTopicName(`Tópico ${topicIndex + 1}`);
    setIsNotesModalOpen(true);
  };
  
  const handleNotesClose = () => {
    setIsNotesModalOpen(false);
    setSelectedTopicId('');
    setSelectedTopicName('');
  };
  
  const handleNotesSaved = () => {
    setIsNotesModalOpen(false);
    // Usar a função real do hook - mas com IDs temporários por enquanto
    handleMarkTopicForReview(subject.id.toString(), selectedTopicId);
    setSelectedTopicId('');
    setSelectedTopicName('');
  };
  
  const handleCancelReviewClick = (topicIndex: number) => {
    // Usar a função real do hook - com ID temporário
    handleCancelTopicReview(subject.id.toString(), `temp-topic-${subject.id}-${topicIndex}`);
  };
  
  const handleCompleteSessionClick = () => {
    // Usar a função real do hook
    handleCompleteSession(subject.id.toString());
  };
  
  const cardClasses = `
    transition-all duration-300 cursor-pointer
    ${isToday ? 'transform scale-[1.02] shadow-lg ring-2 ring-blue-400 ring-opacity-50 z-10 relative' : 'hover:shadow-md'}
    ${isReviewed ? 'bg-green-50 border-green-200' : ''}
    ${viewMode === 'list' ? 'mb-2' : ''}
  `;

  return (
    <div className={cardClasses}>
      <Card className="h-full border border-gray-200 shadow-sm">
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-400" />
              <CardTitle className="text-lg">{subject.name}</CardTitle>
              {isReviewed && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {subject.progress}/{subject.total}
              </Badge>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="h-2 rounded-full transition-all duration-500 bg-green-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0 border-t border-gray-100">
            <div className="space-y-3">
              {/* Tópicos */}
              <div className="space-y-2">
                {Array.from({ length: subject.total }, (_, i) => {
                  const topicId = `temp-topic-${subject.id}-${i}`;
                  const isMarkedForReview = tempMarkedTopics[subject.id.toString()]?.includes(topicId) || false;
                  const isReviewed = i < subject.progress;
                  
                  // Simular diferentes status
                  let status = "Não Iniciado";
                  if (isMarkedForReview) {
                    status = "Em Revisão";
                  } else if (isReviewed) {
                    const stages = ["24h", "7 dias", "30 dias", "Concluído"];
                    status = stages[Math.floor(Math.random() * stages.length)];
                  }
                  
                  const getStatusClasses = (status: string) => {
                    switch (status) {
                      case 'Concluído':
                        return 'bg-gray-100 text-gray-600';
                      case 'Em Revisão':
                        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                      case '24h':
                      case '7 dias':
                      case '30 dias':
                        return 'bg-blue-100 text-blue-800 border-blue-200';
                      default:
                        return 'bg-sky-100 text-sky-800 border-sky-200';
                    }
                  };
                  
                  return (
                    <div key={i} className="flex items-center justify-between py-3 px-4 transition-colors hover:bg-gray-50 border rounded-lg">
                      <span className="text-sm font-medium text-gray-600 flex-1 min-w-0 pr-4">Tópico {i + 1}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {status === 'Concluído' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            Concluído
                          </span>
                        ) : status === 'Em Revisão' || isMarkedForReview ? (
                          <>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses('Em Revisão')}`}>
                              Em Revisão
                            </span>
                            <button 
                              onClick={() => handleCancelReviewClick(i)}
                              className="text-xs font-medium px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(status)}`}>
                              {status}
                            </span>
                            <button 
                              onClick={() => handleMarkForReview(i)}
                              className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md border border-green-200"
                            >
                              <CheckCircle2 className="w-4 h-4" /> 
                              Marcar Revisão
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Botões de ação da matéria */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  📝 Anotações
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  📊 Estatísticas
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleCompleteSessionClick}
                >
                  ✅ Concluir Sessão
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={handleNotesClose}
        onSave={handleNotesSaved}
        topicId={selectedTopicId}
        topicName={selectedTopicName}
        subjectName={subject.name}
      />
    </div>
  );
};

interface SubjectSectionProps {
  title: string;
  icon: React.ReactNode;
  subjects: any[];
  isToday?: boolean;
  isReviewed?: boolean;
  viewMode: ViewMode;
  defaultExpanded?: boolean;
}

const SubjectSection: React.FC<SubjectSectionProps> = ({ 
  title, 
  icon, 
  subjects, 
  isToday, 
  isReviewed, 
  viewMode,
  defaultExpanded = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (subjects.length === 0) return null;

  return (
    <div className="mb-8">
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            {subjects.length}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </div>
      
      {isExpanded && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {subjects.map((subject) => (
              <SubjectCard 
                key={subject.id} 
                subject={subject} 
                isToday={isToday}
                isReviewed={isReviewed}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CongratulationsMessage: React.FC = () => {
  return (
    <div className="mb-6">
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <h3 className="text-xl font-bold text-green-700">
              🎉 Parabéns! Todas as matérias do dia foram revisadas!
            </h3>
          </div>
          <p className="text-green-600">
            Amanhã tem mais. Continue assim!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const StudyCyclePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // Simular se todas as matérias do dia foram concluídas
  const allTodayCompleted = mockData.todaySubjects.every(s => s.progress === s.total);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Controle de Estudos</h1>
          <p className="text-gray-600">Gerencie seu ciclo de estudos de forma inteligente</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      {/* Mensagem de parabéns */}
      {allTodayCompleted && <CongratulationsMessage />}

      {/* Matérias do Dia */}
      <SubjectSection
        title="Matérias do Dia"
        icon={<Target className="w-6 h-6 text-blue-600" />}
        subjects={mockData.todaySubjects}
        isToday={true}
        viewMode={viewMode}
      />

      {/* Próximas do Ciclo */}
      <SubjectSection
        title="Próximas do Ciclo"
        icon={<Clock className="w-6 h-6 text-orange-600" />}
        subjects={mockData.nextSubjects}
        viewMode={viewMode}
      />

      {/* Matérias Revisadas do Ciclo */}
      <SubjectSection
        title="Matérias Revisadas do Ciclo"
        icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
        subjects={mockData.reviewedSubjects}
        isReviewed={true}
        viewMode={viewMode}
      />

      {/* Concluídas Gerais */}
      <SubjectSection
        title="Concluídas Gerais"
        icon={<Trophy className="w-6 h-6 text-yellow-600" />}
        subjects={mockData.completedSubjects}
        viewMode={viewMode}
        defaultExpanded={false}
      />
    </div>
  );
};

export default StudyCyclePage;