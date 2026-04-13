import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  icon?: LucideIcon;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  variant = 'default',
  icon: Icon
}) => {
  const variantStyles = {
    default: "bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:opacity-90",
    destructive: "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 hover:opacity-90",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 hover:opacity-90",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:opacity-90"
  };

  const iconStyles = {
    default: "text-primary",
    destructive: "text-red-500",
    warning: "text-amber-500",
    success: "text-emerald-500"
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[540px] border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {Icon && (
              <div className={cn("p-2 rounded-xl bg-muted/50", iconStyles[variant])}>
                <Icon size={20} />
              </div>
            )}
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild className="text-sm font-medium leading-relaxed text-content-muted">
            {typeof description === 'string' ? <span>{description}</span> : <div>{description}</div>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3 sm:gap-2">
          <AlertDialogCancel 
            onClick={onClose} 
            disabled={isLoading}
            className="h-10 px-4 rounded-xl font-bold text-[11px] uppercase tracking-widest border-border hover:bg-muted"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              "h-10 px-6 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 border-none shadow-lg transition-all active:scale-[0.98]",
              variantStyles[variant]
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmModal;
