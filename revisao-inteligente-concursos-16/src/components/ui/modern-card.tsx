
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'elevated' | 'outlined';
  interactive?: boolean;
}

export function ModernCard({ 
  children, 
  className, 
  variant = 'glass', 
  interactive = false,
  ...props 
}: ModernCardProps & Omit<HTMLMotionProps<"div">, keyof ModernCardProps>) {
  const baseClasses = "rounded-xl border transition-all duration-300";
  
  const variantClasses = {
    glass: "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-white/20 dark:border-gray-700/20 shadow-lg",
    elevated: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-xl",
    outlined: "bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
  };

  const interactiveClasses = interactive 
    ? "hover:scale-[1.02] hover:shadow-xl cursor-pointer" 
    : "";

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        interactiveClasses,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
