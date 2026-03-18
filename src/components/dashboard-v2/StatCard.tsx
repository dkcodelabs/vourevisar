import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StatCardProps {
  title: string;
  value: number;
  unit?: string;
  target?: number;
  description: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, unit = '%', target, description, icon }) => {
  return (
    <Card className="bg-card border-border dark:border-white/5 overflow-hidden group hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-xl bg-secondary dark:bg-white/5 border border-border dark:border-white/5 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
            {icon}
          </div>
          {target && (
             <div className="text-[10px] font-bold text-content-muted bg-secondary dark:bg-white/5 px-2 py-1 rounded-lg border border-border dark:border-white/5">
                META: {target}%
             </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-content-muted uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-2xl font-black text-content-main italic tracking-tight">{value}</h3>
            <span className="text-xs font-bold text-content-muted">{unit}</span>
          </div>
        </div>

        {target ? (
          <div className="mt-4 space-y-2">
            <Progress value={value} className="h-1.5 bg-secondary dark:bg-white/5" progressColor="hsl(var(--primary))" />
            <p className="text-[10px] text-content-muted font-medium">{description}</p>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-border dark:border-white/5">
            <p className="text-[10px] text-content-muted font-medium">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
