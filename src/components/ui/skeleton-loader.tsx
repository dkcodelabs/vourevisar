
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', width, height, lines = 1, ...props }, ref) => {
    const baseClasses = "skeleton rounded-lg";
    
    if (variant === 'text' && lines > 1) {
      return (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <motion.div
              key={index}
              ref={index === 0 ? ref : undefined}
              className={cn(
                baseClasses,
                'h-4',
                index === lines - 1 && 'w-3/4', // Last line is shorter
                className
              )}
              style={{ width: index === lines - 1 ? '75%' : width, height }}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.1
              }}
              {...props}
            />
          ))}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          baseClasses,
          variant === 'circular' && 'rounded-full',
          variant === 'text' && 'h-4',
          variant === 'rectangular' && 'h-20',
          className
        )}
        style={{ width, height }}
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
);

Skeleton.displayName = "Skeleton";

// Pre-built skeleton components
const CardSkeleton = () => (
  <div className="material-card p-6 space-y-4">
    <div className="flex items-center space-x-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="space-y-2">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={80} />
      </div>
    </div>
    <Skeleton variant="rectangular" className="h-32" />
    <Skeleton variant="text" lines={3} />
  </div>
);

const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4">
        <Skeleton variant="rectangular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    ))}
  </div>
);

const ListSkeleton = ({ items = 6 }: { items?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3">
        <Skeleton variant="circular" width={24} height={24} />
        <div className="flex-1">
          <Skeleton variant="text" width={`${Math.random() * 40 + 60}%`} />
        </div>
      </div>
    ))}
  </div>
);

export { Skeleton, CardSkeleton, TableSkeleton, ListSkeleton };
