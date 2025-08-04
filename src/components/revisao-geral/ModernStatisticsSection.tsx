
import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/glass-card';
import { CheckCircle, BookOpen, AlertTriangle, Clock, Trophy, TrendingUp } from 'lucide-react';

interface ModernStatisticsSectionProps {
  totalSubjects: number;
  completedSubjects: number;
  totalTopics: number;
  completedTopics: number;
  delayedTopics: number;
  futureTopics: number;
  dominatedTopics: number;
  isLoading: boolean;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

export const ModernStatisticsSection: React.FC<ModernStatisticsSectionProps> = ({
  totalSubjects,
  completedSubjects,
  totalTopics,
  completedTopics,
  delayedTopics,
  futureTopics,
  dominatedTopics,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const completionPercentage = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;
  const topicsCompletionPercentage = totalTopics > 0 ? Math.round((dominatedTopics / totalTopics) * 100) : 0;

  return (
    <motion.div variants={itemVariants}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Estatísticas Gerais</h2>
        <p className="text-gray-600">Visão geral do seu progresso de estudos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{completedSubjects}</div>
              <div className="text-sm text-green-600 font-medium">{completionPercentage}%</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Matérias Concluídas</h3>
            <p className="text-sm text-gray-600">de {totalSubjects} matérias</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{dominatedTopics}</div>
              <div className="text-sm text-blue-600 font-medium">{topicsCompletionPercentage}%</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Tópicos Dominados</h3>
            <p className="text-sm text-gray-600">de {totalTopics} tópicos</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">{completedTopics}</div>
              <div className="text-sm text-purple-600 font-medium">Total</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Tópicos Concluídos</h3>
            <p className="text-sm text-gray-600">estudados pelo menos uma vez</p>
          </div>
        </GlassCard>

        {delayedTopics > 0 && (
          <GlassCard className="p-6 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">{delayedTopics}</div>
                <div className="text-sm text-red-600 font-medium">Atrasadas</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Revisões Atrasadas</h3>
              <p className="text-sm text-gray-600">precisam de atenção</p>
            </div>
          </GlassCard>
        )}

        {futureTopics > 0 && (
          <GlassCard className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-orange-600">{futureTopics}</div>
                <div className="text-sm text-orange-600 font-medium">Agendadas</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Revisões Futuras</h3>
              <p className="text-sm text-gray-600">programadas</p>
            </div>
          </GlassCard>
        )}
      </div>
    </motion.div>
  );
};
