import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandLogo";

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
    xs: "size-8",
    small: "size-10",
    medium: "size-14",
    large: "size-20"
  };

  const displayMessage = message || (showText ? "Carregando..." : null);

  const spinnerContent = (
    <div className={cn("flex flex-col justify-center items-center gap-2", className)}>
      <div className={cn("relative flex items-center justify-center pointer-events-none", sizeClasses[size])}>
        <BrandMark
          motion="entrance"
          className={cn(
            "h-full w-full text-foreground",
            variant !== 'minimal' && "drop-shadow-[0_7px_10px_hsl(var(--foreground)/0.08)]",
          )}
        />
      </div>

      {displayMessage && (
        <p className="text-xs font-bold text-muted-foreground animate-pulse tracking-[0.2em] uppercase mt-2 text-center">
          {displayMessage}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-background/0 backdrop-blur-[2px] rounded-3xl p-8">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
