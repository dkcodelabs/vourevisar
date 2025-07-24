import { toast as sonnerToast } from 'sonner';

// Enhanced toast helpers with consistent styling and better UX
export const toast = {
  success: (message: string, options?: { duration?: number; action?: any }) => {
    return sonnerToast.success(message, {
      duration: options?.duration || 4000,
      action: options?.action,
    });
  },

  error: (message: string, options?: { duration?: number; action?: any }) => {
    return sonnerToast.error(message, {
      duration: options?.duration || 6000, // Longer duration for errors
      action: options?.action,
    });
  },

  warning: (message: string, options?: { duration?: number; action?: any }) => {
    return sonnerToast.warning(message, {
      duration: options?.duration || 5000,
      action: options?.action,
    });
  },

  info: (message: string, options?: { duration?: number; action?: any }) => {
    return sonnerToast.info(message, {
      duration: options?.duration || 4000,
      action: options?.action,
    });
  },

  // Loading toast
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  // Promise toast - useful for async operations
  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
    });
  },

  // Dismiss all toasts
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};

// Re-export the raw sonner toast for special cases
export { toast as sonnerToast } from 'sonner';