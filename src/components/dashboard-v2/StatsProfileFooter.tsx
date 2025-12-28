import React from 'react';
import { Award, Users, RotateCcw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface StatsProfileFooterProps {
    profileName: string;
    subjectsPerDay: number;
    completedCycles: number;
    intervals: number[];
}

export const StatsProfileFooter: React.FC<StatsProfileFooterProps> = ({
    profileName,
    subjectsPerDay,
    completedCycles,
    intervals
}) => {
    return (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Perfil:</span>
                <Badge variant="outline" className="flex items-center gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs">
                    <Award className="h-3 w-3 text-indigo-500" />
                    {profileName}
                </Badge>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Matérias por dia:</span>
                <Badge variant="secondary" className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Users className="h-3 w-3" />
                    {subjectsPerDay}
                </Badge>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Ciclos completos:</span>
                <Badge variant="secondary" className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <RotateCcw className="h-3 w-3" />
                    {completedCycles}
                </Badge>
            </div>

            <div className="pt-3 border-t border-slate-50 dark:border-slate-800/50">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Intervalos:
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                    {intervals.map((interval, index) => (
                        <span key={index}>
                            {interval === 1 ? '24h' : `${interval}d`}
                            {index < intervals.length - 1 ? ' → ' : ''}
                        </span>
                    ))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                    Equilíbrio entre revisões e progresso
                </div>
            </div>
        </div>
    );
};
