
import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface ModernInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRealTimeValidation?: (value: string) => string | null;
}

const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({ 
    className, 
    label, 
    type = 'text', 
    error, 
    success, 
    helperText, 
    leftIcon, 
    rightIcon,
    onRealTimeValidation,
    onChange,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [realTimeError, setRealTimeError] = useState<string | null>(null);
    const id = useId();
    
    const hasValue = props.value !== undefined ? String(props.value).length > 0 : false;
    const isFloating = isFocused || hasValue;
    const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onRealTimeValidation) {
        const validationError = onRealTimeValidation(e.target.value);
        setRealTimeError(validationError);
      }
      onChange?.(e);
    };

    const currentError = error || realTimeError;

    return (
      <div className="relative w-full">
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
              {leftIcon}
            </div>
          )}
          
          {/* Input */}
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              'peer w-full bg-transparent border-2 rounded-xl transition-all duration-200',
              'placeholder-transparent focus:outline-none',
              'text-base font-medium',
              leftIcon ? 'pl-10' : 'pl-4',
              type === 'password' || rightIcon ? 'pr-12' : 'pr-4',
              isFloating ? 'pt-6 pb-2' : 'py-4',
              currentError 
                ? 'border-destructive focus:border-destructive' 
                : success 
                  ? 'border-green-500 focus:border-green-600'
                  : 'border-border focus:border-primary',
              currentError && 'bg-destructive/5',
              success && 'bg-green-50 dark:bg-green-950/20',
              'focus:ring-2 focus:ring-primary/20',
              className
            )}
            placeholder={label}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            {...props}
          />
          
          {/* Floating Label */}
          <motion.label
            htmlFor={id}
            className={cn(
              'absolute left-4 text-muted-foreground pointer-events-none',
              'transition-all duration-200 ease-out',
              leftIcon && 'left-10'
            )}
            animate={{
              top: isFloating ? '0.5rem' : '50%',
              fontSize: isFloating ? '0.75rem' : '1rem',
              fontWeight: isFloating ? '500' : '400',
              y: isFloating ? '0' : '-50%',
              color: isFocused 
                ? 'hsl(var(--primary))' 
                : currentError 
                  ? 'hsl(var(--destructive))'
                  : success
                    ? 'rgb(34 197 94)'
                    : 'hsl(var(--muted-foreground))'
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {label}
          </motion.label>
          
          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Validation Icons */}
            <AnimatePresence mode="wait">
              {currentError && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </motion.div>
              )}
              {success && !currentError && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Password Toggle */}
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors touch-target"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Custom Right Icon */}
            {rightIcon && type !== 'password' && rightIcon}
          </div>
        </div>
        
        {/* Helper Text / Error Message */}
        <AnimatePresence mode="wait">
          {(currentError || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="mt-1.5"
            >
              <p className={cn(
                'text-sm font-medium',
                currentError ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {currentError || helperText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ModernInput.displayName = "ModernInput";

export { ModernInput };
