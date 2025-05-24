
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'neuro' | 'material' | 'elevated';
  interactive?: boolean;
  children: React.ReactNode;
}

const cardVariants = {
  glass: 'glass-card',
  neuro: 'neuro-card',
  material: 'material-card',
  elevated: 'bg-card shadow-elevation-2 border border-border rounded-2xl'
};

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant = 'material', interactive = false, children, ...props }, ref) => {
    const MotionDiv = interactive ? motion.div : 'div';
    
    const motionProps = interactive ? {
      whileHover: { 
        scale: 1.02,
        y: -4,
        transition: { 
          type: "spring", 
          stiffness: 300, 
          damping: 20 
        }
      },
      whileTap: { 
        scale: 0.98,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }
      },
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1] 
      }
    } : {};

    return (
      <MotionDiv
        ref={ref}
        className={cn(
          cardVariants[variant],
          'overflow-hidden relative',
          interactive && 'cursor-pointer group',
          className
        )}
        {...motionProps}
        {...props}
      >
        {children}
        {interactive && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        )}
      </MotionDiv>
    );
  }
);

ModernCard.displayName = "ModernCard";

export { ModernCard };
