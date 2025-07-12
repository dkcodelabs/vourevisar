
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, AlertTriangle, Clock, Target } from 'lucide-react';
import { Topic } from '@/types';

interface CompactTopicsSummaryCardsProps {
  topics: (Topic & { subjectName: string })[];
}

const CompactTopicsSummaryCards: React.FC<CompactTopicsSummaryCardsProps> = ({
  topics
}) => {
  const totalTopics = topics.length;
  const delayedTopics = topics.filter(topic => {
    if (!topic.nextReview) return false;
    const now = new Date();
    const nextReview = new Date(topic.nextReview);
    return nextReview < now && !topic.completed;
  }).length;
  
  const futureTopics = topics.filter(topic => {
    if (!topic.nextReview || topic.completed) return false;
    const now = new Date();
    const nextReview = new Date(topic.nextReview);
    return nextReview > now;
  }).length;

  const completedTopics = topics.filter(topic => topic.completed).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalTopics}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Atrasados</p>
              <p className="text-2xl font-bold text-red-600">{delayedTopics}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Próximos</p>
              <p className="text-2xl font-bold text-green-600">{futureTopics}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Concluídos</p>
              <p className="text-2xl font-bold text-blue-600">{completedTopics}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactTopicsSummaryCards;
