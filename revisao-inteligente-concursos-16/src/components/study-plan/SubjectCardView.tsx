import React from 'react';
import { Subject } from '@/types';
import { BookOpenIcon, ArrowPathIcon, CheckCircleIcon } from './icons';

interface SubjectCardViewProps {
  subject: Subject;
  category: 'available' | 'completed' | 'review';
}

const categoryStyles = {
  available: {
    bg: 'bg-white',
    border: 'border-sky-500',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    progressBg: 'bg-sky-500',
  },
  completed: {
    bg: 'bg-white',
    border: 'border-green-500',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    progressBg: 'bg-green-500',
  },
  review: {
    bg: 'bg-white',
    border: 'border-yellow-500',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    progressBg: 'bg-yellow-500',
  }
};

const SubjectCardView: React.FC<SubjectCardViewProps> = ({ subject, category }) => {
  const styles = categoryStyles[category];
  const Icon = category === 'review' ? ArrowPathIcon : category === 'completed' ? CheckCircleIcon : BookOpenIcon;
  const progress = subject.topics && subject.topics.length > 0 
    ? (subject.topics.filter(topic => topic.status === 'completed').length / subject.topics.length) * 100 
    : 0;

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} p-4 rounded-lg shadow-sm flex flex-col justify-between h-full`}>
      <div>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${styles.iconBg} ${styles.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-800">{subject.name}</h4>
            <p className="text-sm font-medium text-gray-500">{subject.topics?.length || 0} tópicos</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${styles.progressBg} h-2 rounded-full`} 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-medium text-gray-600 w-10 text-right">{Math.round(progress)}%</p>
        </div>
      </div>
    </div>
  );
};

export default SubjectCardView;