import React from 'react';
import { Subject } from '@/types';
import TopicItem from './TopicItem';
import { ChevronDownIcon } from './icons';

interface SubjectCardProps {
  subject: Subject;
  isExpanded: boolean;
  tempMarkedTopics: Record<string, string[]>;
  onToggleExpand: (subjectId: string) => void;
  onMarkTopicForReview: (subjectId: string, topicId: string) => void;
  onCancelTopicReview: (subjectId: string, topicId: string) => void;
  onCompleteSession: (subjectId: string) => void;
  isDaySubject?: boolean;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  isExpanded,
  tempMarkedTopics,
  onToggleExpand,
  onMarkTopicForReview,
  onCancelTopicReview,
  onCompleteSession,
  isDaySubject = false
}) => {
  // Calcular progresso
  const completedTopics = subject.topics.filter((topic: any) => topic.status === 'completed').length;
  const progress = subject.topics.length > 0 ? (completedTopics / subject.topics.length) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpand(subject.id)}
        aria-expanded={isExpanded}
        aria-controls={`subject-topics-${subject.id}`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m-5.747-8.247 11.494 0M4.187 12.001h15.626" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              {subject.name} {isDaySubject && "(Hoje)"}
            </h3>
            <p className="text-sm font-medium text-gray-500">
              {completedTopics} de {subject.topics.length} tópicos concluídos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div id={`subject-topics-${subject.id}`} className="border-t border-gray-200">
          <div className="divide-y divide-gray-200">
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
          </div>
          <div className="p-4 bg-gray-50 flex justify-end">
            <button
              onClick={() => onCompleteSession(subject.id)}
              className="text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md transition-colors"
            >
              {(tempMarkedTopics[subject.id]?.length ?? 0) > 0 ? "Concluir Sessão" : "Pular Matéria"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectCard;
