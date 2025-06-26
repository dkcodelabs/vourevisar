
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RegisterQuestionsButtonProps {
  subject: string;
  topic: string;
}

const RegisterQuestionsButton: React.FC<RegisterQuestionsButtonProps> = ({ subject, topic }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    console.log('Navegando para questões com:', { subject, topic });
    const params = new URLSearchParams({
      materia: subject,
      topico: topic
    });
    navigate(`/questoes?${params}`);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4 text-purple-600" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Registrar questões</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default RegisterQuestionsButton;
