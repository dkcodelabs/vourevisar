
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const negligencedTopics = topics.filter(topic => topic.questions < 3);

  return (
    <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              )}
            </motion.div>
            
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-semibold text-gray-800">{subject}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {completedTopics}/{totalTopics}
            </span>
            <span className={`font-semibold ${getStatusColor(percentage)}`}>
              {percentage}%
            </span>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              {negligencedTopics.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Tópicos com pouca prática:
                    </span>
                  </div>
                  <ul className="text-sm text-red-700">
                    {negligencedTopics.map((topic, index) => (
                      <li key={index}>
                        - {topic.name} ({topic.questions} questões)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-1 font-medium text-gray-700">TÓPICO</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-700">QUESTÕES</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-700">ACERTOS</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-700">%</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-700">BARRA DE PROGRESSO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-1 text-gray-800">{topic.name}</td>
                        <td className="py-2 px-1 text-center text-gray-600">{topic.questions}</td>
                        <td className="py-2 px-1 text-center text-gray-600">{topic.correct}</td>
                        <td className="py-2 px-1 text-center font-medium">
                          {topic.questions > 0 ? (
                            <span className={getStatusColor(topic.percentage)}>
                              {topic.percentage}%
                            </span>
                          ) : (
                            <span className="text-gray-400">0%</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {topic.questions > 0 ? (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(topic.percentage)}`}
                                style={{ width: `${topic.percentage}%` }}
                              />
                            </div>
                          ) : (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <span className="text-xs text-gray-500">(neutro ou não iniciado)</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default SubjectProgressCard;
