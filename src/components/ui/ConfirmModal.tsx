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
    default: "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-destructive/20 hover:bg-destructive/90",
    warning: "bg-warning text-warning-foreground shadow-warning/20 hover:bg-warning/90",
    success: "bg-success text-success-foreground shadow-success/20 hover:bg-success/90"
  };

  const iconStyles = {
    default: "text-primary",
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success"
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[540px] border-border/50 bg-modal/95 backdrop-blur-xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {Icon && (
              <div className={cn("p-2 rounded-xl bg-muted/50", iconStyles[variant])}>
                <Icon size={20} />
              </div>
            )}
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-title-section">
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
            className="h-10 rounded-xl border-border px-4 text-sm font-semibold hover:bg-control-hover"
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
              "flex h-10 items-center justify-center gap-2 rounded-xl border-none px-6 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
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
