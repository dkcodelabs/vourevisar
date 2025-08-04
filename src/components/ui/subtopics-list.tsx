import React from 'react';
import { Badge } from './badge';
import { TopicSubtopic } from '@/types';

interface SubtopicsListProps {
  subtopics: TopicSubtopic[];
  style?: 'comma' | 'badges';
  className?: string;
}

export const SubtopicsList: React.FC<SubtopicsListProps> = ({ 
  subtopics, 
  style = 'badges',
  className = '' 
}) => {
  if (!subtopics || subtopics.length === 0) {
    return null;
  }

  if (style === 'comma') {
    return (
      <p className={`text-xs text-muted-foreground mt-1 ${className}`}>
        {subtopics.map(sub => sub.name).join(', ')}
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${className}`}>
      {subtopics.map((subtopic, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="text-xs px-2 py-0.5 h-auto"
        >
          {subtopic.name}
        </Badge>
      ))}
    </div>
  );
};