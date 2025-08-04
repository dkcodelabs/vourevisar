
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudyPlanEmptyStateProps {
  type: 'no-subjects' | 'no-subjects-for-today' | 'no-subjects-but-pending' | 'no-topics';
  onNextDay?: () => void;
  isNextDayLoading?: boolean;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const StudyPlanEmptyState: React.FC<StudyPlanEmptyStateProps> = ({ 
  type, 
  onNextDay, 
  isNextDayLoading 
}) => {
  const navigate = useNavigate();

  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-subjects':
        return {
          icon: <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />,
          title: "Nenhuma matéria para estudar",
          description: "Você ainda não adicionou matérias para estudar.",
          action: (
            <Button onClick={() => navigate('/materias')}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Matérias
            </Button>
          )
        };
      
      case 'no-subjects-for-today':
        return {
          icon: <BookOpen className="h-12 w-12 mx-auto text-blue-400 mb-4" />,
          title: "Nenhuma matéria programada para hoje",
          description: "Você não tem matérias para estudar hoje. Fique atento às próximas revisões!",
          action: null
        };
      
      case 'no-subjects-but-pending':
        return {
          icon: <BookOpen className="h-12 w-12 mx-auto text-blue-400 mb-4" />,
          title: "Nenhuma matéria programada para hoje",
          description: "Você não tem matérias para estudar hoje, mas há matérias pendentes no ciclo atual.",
          action: (
            <Button 
              onClick={onNextDay} 
              className="bg-blue-500 hover:bg-blue-600" 
              disabled={isNextDayLoading}
            >
              {isNextDayLoading ? 'Carregando...' : 'Carregar próximas matérias'}
            </Button>
          )
        };
      
      case 'no-topics':
        return {
          icon: <span className="text-4xl mb-4">📚</span>,
          title: "Adicione tópicos para começar a estudar esta matéria",
          description: "Você já adicionou matérias, mas elas ainda não têm tópicos cadastrados.",
          action: (
            <Button onClick={() => navigate('/materias')} className="mt-2">
              Adicionar Tópicos
            </Button>
          )
        };
      
      default:
        return null;
    }
  };

  const content = getEmptyStateContent();
  if (!content) return null;

  return (
    <motion.div variants={itemVariants}>
      <Card className="text-center">
        <CardHeader>
          {content.icon}
          <CardTitle>{content.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {content.description}
          </p>
          {content.action}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StudyPlanEmptyState;
