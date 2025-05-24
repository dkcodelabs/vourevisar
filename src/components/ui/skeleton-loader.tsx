
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  className, 
  variant = 'text', 
  width, 
  height,
  ...props 
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700";
  
  const variantClasses = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-md"
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <motion.div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <motion.div 
      className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-3">
        <Skeleton variant="rectangular" className="h-4 w-3/4" />
        <Skeleton variant="text" className="h-3 w-1/2" />
        <Skeleton variant="text" className="h-3 w-full" />
        <Skeleton variant="text" className="h-3 w-2/3" />
      </div>
    </motion.div>
  );
}
