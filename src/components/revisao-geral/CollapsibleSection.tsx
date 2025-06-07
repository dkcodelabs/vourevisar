
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  colorScheme?: 'blue' | 'green' | 'orange' | 'purple';
}

const colorSchemes = {
  blue: {
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200',
    bg: 'bg-blue-50/30'
  },
  green: {
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-800',
    border: 'border-green-200',
    bg: 'bg-green-50/30'
  },
  orange: {
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800',
    border: 'border-orange-200',
    bg: 'bg-orange-50/30'
  },
  purple: {
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-800',
    border: 'border-purple-200',
    bg: 'bg-purple-50/30'
  }
};

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  count,
  description,
  children,
  defaultExpanded = true,
  colorScheme = 'blue'
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const colors = colorSchemes[colorScheme];

  if (count === 0) return null;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 h-auto flex items-center justify-between hover:bg-transparent"
      >
        <div className="flex items-center gap-3">
          <div className={colors.icon}>
            {icon}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              {title}
              <Badge variant="secondary" className={`${colors.badge} text-xs`}>
                {count}
              </Badge>
            </h2>
            {description && (
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <Minus className="h-5 w-5 text-gray-500" />
          ) : (
            <Plus className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </Button>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
