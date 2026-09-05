import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: 'xs' | 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal';
  showText?: boolean;
  message?: string;
}

export const LoadingSpinner = ({
  className,
  size = 'medium',
  variant = 'default',
  showText = false,
  message,
  fullPage = false
}: LoadingSpinnerProps & { fullPage?: boolean }) => {
  const sizeClasses = {
    xs: "size-3.5",
    small: "size-4",
    medium: "size-5",
    large: "size-7"
  };

  const displayMessage = message || (showText ? "Carregando..." : null);

  const spinnerContent = (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-label={displayMessage ?? "Carregando"}
    >
      <Loader2
        aria-hidden="true"
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size],
          variant === 'minimal' && "text-current",
        )}
      />

      {displayMessage && (
        <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground text-center">
          {displayMessage}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="rounded-2xl p-6">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
