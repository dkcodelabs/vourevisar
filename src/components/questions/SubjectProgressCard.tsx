import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TopicProgress {
  name: string;
  questions: number;
  correct: number;
  percentage: number;
}

interface SubjectProgressCardProps {
  subject: string;
  totalTopics: number;
  completedTopics: number;
  percentage: number;
  topics: TopicProgress[];
  color: string;
}

const SubjectProgressCard: React.FC<SubjectProgressCardProps> = ({
  subject,
  totalTopics,
  completedTopics,
  percentage,
  topics,
  color
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 mb-4">
      <CardContent className="p-4">
        {/* Cabeçalho da matéria com seta de expandir/recolher */}
        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setIsExpanded((v) => !v)}>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-600" />
            )}
            <div className="w-1.5 h-6 rounded bg-gray-300" style={{ backgroundColor: color }} />
            <span className="font-bold text-gray-800 text-base uppercase">{subject}</span>
          </div>
          <span className={`font-semibold text-sm px-2 py-1 rounded-full ${
            percentage >= 80
              ? 'bg-green-500 text-white'
              : percentage >= 60
              ? 'bg-blue-500 text-white'
              : percentage >= 40
              ? 'bg-yellow-400 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {percentage}%
          </span>
        </div>
        <div className="text-xs text-gray-500 mb-2">{completedTopics}/{totalTopics} tópicos concluídos</div>

        {/* Tópicos (expandido) */}
        {isExpanded && (
          <div className="space-y-3 mt-2">
            {topics.map((topic, index) => (
              <div key={index} className="flex items-start gap-2 border-b border-gray-100 pb-2 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="text-base text-zinc-800 dark:text-zinc-200 truncate">{topic.name}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(topic.percentage)}`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[60px] text-xs font-medium">
                  <span className="text-gray-600">Qst</span>
                  <span className="text-gray-800">{topic.questions}</span>
                </div>
                <div className="flex flex-col items-end min-w-[60px] text-xs font-medium">
                  <span className="text-gray-600">Acertos</span>
                  <span className="text-blue-700">{topic.correct}</span>
                </div>
                <div className="flex flex-col items-end min-w-[60px] text-xs font-medium">
                  <span className="text-gray-600">%</span>
                  {topic.questions > 0 ? (
                    <span className={getStatusColor(topic.percentage)}>{topic.percentage}%</span>
                  ) : (
                    <span className="text-gray-400">0%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubjectProgressCard;
