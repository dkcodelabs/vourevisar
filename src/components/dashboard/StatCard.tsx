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
    <div className={`bg-card rounded-xl p-6 shadow-sm border ${className || ''}`}>
      <div className="flex flex-col space-y-4">
        {/* Header with icon, title and subtitle */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center ml-4"
            style={{ backgroundColor: iconBgColor }}
          >
            <Icon className="w-6 h-6" style={{ color: progressColor }} />
          </div>
        </div>

        {/* Main value */}
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {completed}/{total} {unit}
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress 
              value={percentage} 
              className="h-2"
              progressColor={progressColor}
            />
            <p className="text-sm text-muted-foreground">
              Você já concluiu {completed} de {total} {unit} cadastradas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};