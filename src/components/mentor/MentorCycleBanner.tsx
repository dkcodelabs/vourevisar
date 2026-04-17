import React, { useState, useEffect } from 'react';
import { MentorAlert, MentorStrategicInsight } from '@/types/mentor';
import { X, Lightbulb, Flame, Target, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MentorCycleBannerProps {
  criticalAlerts: MentorAlert[];
  gargalos: MentorAlert[];
  strategicInsight: MentorStrategicInsight | null;
  className?: string;
}

export const MentorCycleBanner: React.FC<MentorCycleBannerProps> = ({
  criticalAlerts,
  gargalos,
  strategicInsight,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Seleciona o insight mais prioritário para exibir
  const getTopInsight = () => {
    if (criticalAlerts.length > 0) {
      return {
        type: 'critical',
        data: criticalAlerts[0],
        icon: Flame,
        colorClass: 'text-rose-500',
        bgClass: 'bg-rose-500/10 border-rose-500/20'
      };
    }
    if (gargalos.length > 0) {
      return {
        type: 'warning',
        data: gargalos[0],
        icon: Target, // or similar
        colorClass: 'text-amber-500',
        bgClass: 'bg-amber-500/10 border-amber-500/20'
      };
    }
    if (strategicInsight) {
      return {
        type: 'strategic',
        data: strategicInsight,
        icon: Lightbulb,
        colorClass: 'text-blue-500',
        bgClass: 'bg-blue-500/10 border-blue-500/20'
      };
    }
    return null;
  };

  const topInsight = getTopInsight();

  useEffect(() => {
    if (!topInsight) {
      setIsVisible(false);
      return;
    }

    // Checar localStorage
    const today = new Date().toISOString().split('T')[0];
    const insightId = topInsight.type === 'strategic' 
      ? `strategic-${(topInsight.data as MentorStrategicInsight).type}`
      : (topInsight.data as MentorAlert).id;
      
    const storageKey = `mentor-dismissed-${insightId}-${today}`;
    const isDismissed = localStorage.getItem(storageKey) === 'true';

    if (!isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [topInsight]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    if (!topInsight) return;
    const today = new Date().toISOString().split('T')[0];
    const insightId = topInsight.type === 'strategic' 
      ? `strategic-${(topInsight.data as MentorStrategicInsight).type}`
      : (topInsight.data as MentorAlert).id;
      
    const storageKey = `mentor-dismissed-${insightId}-${today}`;
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && topInsight && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, scale: 0.95, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn("overflow-hidden w-full", className)}
        >
          <div className={cn(
            "relative flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-[20px] border mb-6",
            "backdrop-blur-md glow-card",
            topInsight.bgClass
          )}>
            <div className={cn("p-2 rounded-xl shrink-0", "bg-background/50")}>
              <topInsight.icon className={cn("w-5 h-5", topInsight.colorClass)} />
            </div>
            
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("text-[10px] uppercase font-black tracking-wider", topInsight.colorClass)}>
                  Mentor IA
                </span>
                {topInsight.type === 'critical' && (
                  <span className="text-[10px] font-medium text-rose-500/80">
                    Ação Recomendada
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">
                {topInsight.type === 'strategic' 
                  ? (topInsight.data as MentorStrategicInsight).message 
                  : (topInsight.data as MentorAlert).message}
              </p>
            </div>

            {topInsight.type !== 'strategic' && (topInsight.data as MentorAlert).topicId && (
              <div className="shrink-0 mt-2 sm:mt-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("h-8 text-xs font-semibold px-3 hover:bg-background/50", topInsight.colorClass)}
                  onClick={() => navigate(`/revisoes?topicId=${(topInsight.data as MentorAlert).topicId}`)}
                >
                  Ir para Revisão <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 w-8 h-8 rounded-full text-content-muted hover:text-foreground hover:bg-background/50"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
