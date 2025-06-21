
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuestionsButtonProps {
  subjectName: string;
  topicName: string;
  disabled?: boolean;
}

const QuestionsButton: React.FC<QuestionsButtonProps> = ({
  subjectName,
  topicName,
  disabled = false
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams({
      materia: subjectName,
      topico: topicName
    });
    
    navigate(`/questoes?${params.toString()}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2 py-1 h-7 min-w-[80px]"
    >
      <BookOpen className="h-3 w-3 mr-1" />
      Questões
    </Button>
  );
};

export default QuestionsButton;
