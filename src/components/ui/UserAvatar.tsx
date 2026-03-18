import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Get initials from a name (e.g. "John Doe" -> "JD")
 */
const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
};

/**
 * Generate a consistent background color based on name
 */
const getBgColor = (name?: string | null): string => {
  if (!name) return 'bg-slate-200 text-slate-600';
  
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  name, 
  className,
  fallbackClassName 
}) => {
  const initials = getInitials(name);
  const bgColor = getBgColor(name);

  return (
    <Avatar className={cn("shrink-0", className)}>
      {src && (
        <AvatarImage 
          src={src} 
          alt={name || "User avatar"} 
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback className={cn("font-medium", bgColor, fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
