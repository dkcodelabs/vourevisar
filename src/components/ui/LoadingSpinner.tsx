import { cn } from "@/lib/utils";
import { AnimatedLogo } from "../AnimatedLogo";

interface LoadingSpinnerProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  message?: string;
}

export const LoadingSpinner = ({ className, size = 'medium', showText = false, message }: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: "scale-50",
    medium: "scale-75",
    large: "scale-100"
  };

  const displayMessage = message || (showText ? "Carregando..." : null);

  return (
    <div className={cn("flex flex-col justify-center items-center gap-2", className)}>
      <AnimatedLogo
        isRepeating={true}
        className={cn("cursor-default pointer-events-none", sizeClasses[size])}
      />
      {displayMessage && (
        <p className="text-xs font-medium text-muted-foreground animate-pulse tracking-wide uppercase">
          {displayMessage}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner; 