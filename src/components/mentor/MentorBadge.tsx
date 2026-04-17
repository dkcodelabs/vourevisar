import React from 'react';
import { Flame, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MentorAlert } from '@/types/mentor';

interface MentorBadgeProps {
  alert: MentorAlert;
  className?: string;
}

export const MentorBadge: React.FC<MentorBadgeProps> = ({ alert, className }) => {
  const isCritical = alert.level === 'critical';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors cursor-help",
              isCritical
                ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
              className
            )}
          >
            {isCritical ? (
              <Flame className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] p-3 text-xs leading-relaxed glass-card">
          <p>
            <strong className={isCritical ? "text-rose-500 block mb-1" : "text-amber-500 block mb-1"}>
              {isCritical ? "Risco de Esquecimento" : "Gargalo Detectado"}
            </strong>
            {alert.message}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
