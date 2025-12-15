import { toast as reactToast, ToastOptions } from 'react-toastify';

// Enhanced toast helpers with consistent styling and better UX
export const toast = {
  success: (message: string, options?: { duration?: number; action?: any }) => {
    return reactToast.success(message, {
      autoClose: options?.duration || 4000,
      // action support depends on custom component in toastify, skipping for now as it wasn't strictly standard in sonner either without custom render
    });
  },

  error: (message: string, options?: { duration?: number; action?: any }) => {
    return reactToast.error(message, {
      autoClose: options?.duration || 6000,
    });
  },

  warning: (message: string, options?: { duration?: number; action?: any }) => {
    return reactToast.warning(message, {
      autoClose: options?.duration || 5000,
    });
  },

  info: (message: string, options?: { duration?: number; action?: any }) => {
    return reactToast.info(message, {
      autoClose: options?.duration || 4000,
    });
  },

  // Loading toast
  loading: (message: string) => {
    return reactToast.loading(message);
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
    return reactToast.promise(promise, {
      pending: loading,
      success: {
        render({ data }: any) {
          return typeof success === 'function' ? success(data) : success;
        }
      },
      error: {
        render({ data }: any) {
          return typeof error === 'function' ? error(data) : error;
        }
      }
    });
  },

  // Dismiss all toasts
  dismiss: (toastId?: string | number) => {
    return reactToast.dismiss(toastId);
  },
};

// Re-export the raw toast for special cases
export { reactToast as sonnerToast };