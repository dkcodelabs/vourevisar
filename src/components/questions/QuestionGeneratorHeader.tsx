
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';

const QuestionGeneratorHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <Button 
        variant="outline" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Button 
        variant="outline" 
        onClick={() => navigate('/questoes/estatisticas')}
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Ver Estatísticas
      </Button>
    </div>
  );
};

export default QuestionGeneratorHeader;
