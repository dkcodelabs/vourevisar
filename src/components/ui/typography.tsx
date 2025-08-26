import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const PageTitle = ({ children, className, as: Component = 'h1' }: TypographyProps) => (
  <Component className={cn('text-xl font-bold', className)}>
    {children}
  </Component>
);

export const SectionTitle = ({ children, className, as: Component = 'h2' }: TypographyProps) => (
  <Component className={cn('text-lg font-semibold', className)}>
    {children}
  </Component>
);

export const CardTitle = ({ children, className, as: Component = 'h3' }: TypographyProps) => (
  <Component className={cn('text-lg font-bold', className)}>
    {children}
  </Component>
);

export const Subtitle = ({ children, className, as: Component = 'p' }: TypographyProps) => (
  <Component className={cn('text-base font-medium', className)}>
    {children}
  </Component>
);

export const BodyText = ({ children, className, as: Component = 'p' }: TypographyProps) => (
  <Component className={cn('text-base', className)}>
    {children}
  </Component>
);

export const CaptionText = ({ children, className, as: Component = 'span' }: TypographyProps) => (
  <Component className={cn('text-sm', className)}>
    {children}
  </Component>
);

// Consistent Card component
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const ConsistentCard = ({ children, className, hover = true }: CardProps) => (
  <div className={cn(
    'card-consistent',
    hover && 'hover:shadow-soft-hover',
    className
  )}>
    {children}
  </div>
);

// Consistent Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const ConsistentButton = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: ButtonProps) => {
  const baseClasses = 'button-consistent';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button 
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Consistent Input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ConsistentInput = ({ className, ...props }: InputProps) => (
  <input 
    className={cn('input-consistent', className)}
    {...props}
  />
);