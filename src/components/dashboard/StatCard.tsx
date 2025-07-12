import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StatCardProps {
  title: string;
  subtitle: string;
  completed: number;
  total: number;
  unit: string;
  icon: LucideIcon;
  iconBgColor: string;
  progressColor: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  subtitle,
  completed,
  total,
  unit,
  icon: Icon,
  iconBgColor,
  progressColor,
  className
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${className || ''}`}>
      <div className="flex flex-col h-full justify-between">
        {/* Header with icon and title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center ml-3 flex-shrink-0"
            style={{ backgroundColor: iconBgColor }}
          >
            <Icon className="w-4 h-4" style={{ color: progressColor }} />
          </div>
        </div>

        {/* Main value */}
        <div className="space-y-2">
          <div className="text-lg font-semibold text-gray-900">
            {completed}/{total}
          </div>
          
          {/* Progress bar */}
          <Progress 
            value={percentage} 
            className="h-1.5"
            progressColor={progressColor}
          />
        </div>
      </div>
    </div>
  );
};