import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Target,
  Lightbulb,
  Star,
  Zap
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'streak' | 'productivity' | 'subject' | 'time' | 'achievement';
  message: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

interface InsightsSectionProps {
  data: Insight[];
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ data }) => {
  const getIcon = (iconName: string) => {
    const iconMap = {
      'Flame': Flame,
      'Clock': Clock,
      'Trophy': Trophy,
      'TrendingUp': TrendingUp,
      'Target': Target,
      'Lightbulb': Lightbulb,
      'Star': Star,
      'Zap': Zap,
    };
    
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Lightbulb;
    return IconComponent;
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          border: 'border-green-200',
          bg: 'bg-gradient-to-r from-green-50 to-green-100',
          iconBg: 'bg-green-500',
          textColor: 'text-green-800',
        };
      case 'medium':
        return {
          border: 'border-blue-200',
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          iconBg: 'bg-blue-500',
          textColor: 'text-blue-800',
        };
      case 'low':
        return {
          border: 'border-gray-200',
          bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          iconBg: 'bg-gray-500',
          textColor: 'text-gray-800',
        };
      default:
        return {
          border: 'border-gray-200',
          bg: 'bg-white',
          iconBg: 'bg-gray-500',
          textColor: 'text-gray-800',
        };
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'streak':
        return '🔥';
      case 'productivity':
        return '📈';
      case 'subject':
        return '📚';
      case 'time':
        return '⏰';
      case 'achievement':
        return '🏆';
      default:
        return '💡';
    }
  };

  // Ordenar insights por prioridade
  const sortedInsights = [...data].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Insights Inteligentes</h2>
      </div>

      {/* Insights principais em destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedInsights.slice(0, 2).map((insight, index) => {
          const IconComponent = getIcon(insight.icon);
          const style = getPriorityStyle(insight.priority);
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`${style.border} ${style.bg} border-2 hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${style.iconBg} flex-shrink-0`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getTypeEmoji(insight.type)}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          insight.priority === 'high' ? 'bg-green-200 text-green-800' :
                          insight.priority === 'medium' ? 'bg-blue-200 text-blue-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {insight.priority === 'high' ? 'Alta Prioridade' :
                           insight.priority === 'medium' ? 'Média Prioridade' :
                           'Baixa Prioridade'}
                        </span>
                      </div>
                      <p className={`${style.textColor} font-medium leading-relaxed`}>
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Insights secundários */}
      {sortedInsights.length > 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedInsights.slice(2).map((insight, index) => {
            const IconComponent = getIcon(insight.icon);
            const style = getPriorityStyle(insight.priority);
            
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: (index + 2) * 0.1 }}
              >
                <Card className={`${style.border} hover:shadow-md transition-all duration-300 h-full`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${style.iconBg} flex-shrink-0`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-lg">{getTypeEmoji(insight.type)}</span>
                        </div>
                        <p className={`${style.textColor} text-sm font-medium leading-relaxed`}>
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Seção de dicas adicionais */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-indigo-500 flex-shrink-0">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-900 mb-2">
                💡 Dica Inteligente
              </h3>
              <p className="text-indigo-800 leading-relaxed">
                Com base no seu padrão de estudos, recomendamos manter a consistência nos horários que você já demonstrou ser mais produtivo. 
                Continue focando nas matérias com menor progresso para equilibrar seu desenvolvimento geral.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo de insights por categoria */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['streak', 'productivity', 'subject', 'time', 'achievement'].map((type) => {
          const count = data.filter(insight => insight.type === type).length;
          const emoji = getTypeEmoji(type);
          const label = {
            streak: 'Sequência',
            productivity: 'Produtividade',
            subject: 'Matérias',
            time: 'Horários',
            achievement: 'Conquistas'
          }[type];

          return (
            <Card key={type} className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{count}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};