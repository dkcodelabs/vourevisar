
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuestionsButtonProps {
  subject: string;
  topic: string;
}

const QuestionsButton: React.FC<QuestionsButtonProps> = ({ subject, topic }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams({
      materia: subject,
      topico: topic
    });
    navigate(`/questoes?${params}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="text-xs"
    >
      <BookOpen className="mr-1 h-3 w-3" />
      Questões
    </Button>
  );
};

export default QuestionsButton;
