import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedTitleProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({
  children,
  className = '',
  icon,
  size = 'lg'
}) => {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3",
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      {icon && (
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {icon}
        </motion.div>
      )}
      <h1 className={cn(
        "font-bold bg-gradient-to-r from-app-blue to-purple-600 bg-clip-text text-transparent",
        sizes[size]
      )}>
        {children}
      </h1>
    </motion.div>
  );
};

export default AnimatedTitle; 