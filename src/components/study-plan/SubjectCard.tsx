import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle, Trash } from 'lucide-react';
import { Subject } from '@/types';
import TopicItem from './TopicItem';

interface SubjectCardProps {
  subject: Subject;
  isExpanded: boolean;
  tempMarkedTopics: Record<string, string[]>;
  onToggleExpand: (subjectId: string) => void;
  onMarkTopicForReview: (subjectId: string, topicId: string) => void;
  onCancelTopicReview: (subjectId: string, topicId: string) => void;
  onCompleteSession: (subjectId: string) => void;
  isDaySubject?: boolean;
  viewNumber?: number;
  totalViews?: number;
  cycleIndex?: number;
  onRemoveView?: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  isExpanded,
  tempMarkedTopics,
  onToggleExpand,
  onMarkTopicForReview,
  onCancelTopicReview,
  onCompleteSession,
  isDaySubject = false,
  viewNumber,
  totalViews,
  onRemoveView
}) => {
  return (
    <div className="w-full">
      <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow w-full">
        <CardHeader className="p-3 pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle
              className="text-sm font-bold text-app-blue cursor-pointer flex items-center group"
              onClick={() => onToggleExpand(subject.id)}
            >
              <BookOpen size={18} className="mr-2 text-app-blue group-hover:rotate-12 transition-transform" />
              {subject.name}
              {isDaySubject && " (Hoje)"}
              {viewNumber && totalViews && totalViews > 1 && (
                <Badge className="ml-2 bg-blue-600 text-white text-xs">
                  {viewNumber}ª passada
                </Badge>
              )}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ type: "tween", duration: 0.2 }}
              >
                {isExpanded ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </motion.div>
            </CardTitle>
            {onRemoveView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveView();
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Remover esta visualização do ciclo"
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isExpanded ? (
            <div className="space-y-2">
              {subject.topics.map(topic => (
                <TopicItem
                  key={topic.id}
                  topic={topic}
                  subjectId={subject.id}
                  isMarkedForReview={tempMarkedTopics[subject.id]?.includes(topic.id) || false}
                  onMarkTopicForReview={onMarkTopicForReview}
                  onCancelTopicReview={onCancelTopicReview}
                />
              ))}
              <Button
                className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1 mt-2 w-full sm:w-auto h-7"
                onClick={() => onCompleteSession(subject.id)}
              >
                <CheckCircle className="h-3 w-3 mr-2" />
                {(tempMarkedTopics[subject.id]?.length ?? 0) > 0 ? "Concluir Sessão" : "Pular Matéria"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-xs text-gray-500">
                {subject.topics.length} tópicos disponíveis
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1 w-full sm:w-auto h-7"
                  onClick={() => onToggleExpand(subject.id)}
                >
                  <BookOpen className="h-3 w-3 mr-2" />
                  Iniciar Estudo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectCard;
