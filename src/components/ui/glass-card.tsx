import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  whileHover?: HTMLMotionProps<'div'>['whileHover'];
  whileTap?: HTMLMotionProps<'div'>['whileTap'];
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '',
  onClick,
  whileHover = { scale: 1.01 },
  whileTap = { scale: 0.99 }
}) => {
  return (
    <motion.div
      className={cn(
        "bg-card/95 text-card-foreground backdrop-blur-lg border border-border shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl",
        className
      )}
      onClick={onClick}
      whileHover={whileHover}
      whileTap={whileTap}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
