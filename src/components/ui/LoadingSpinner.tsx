import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = ({ className }: LoadingSpinnerProps) => {
  return (
    <div className={cn("flex justify-center items-center", className)}>
      <div 
        className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"
        aria-label="Carregando..."
      />
    </div>
  );
};

export default LoadingSpinner; 