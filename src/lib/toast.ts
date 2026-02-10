import { toast as reactToast, ToastOptions, UpdateOptions } from 'react-toastify';

// Enhanced toast helpers with consistent styling and better UX
// Toast Queue Management is now handled by ToastGate (src/lib/errors/toastGate.ts)
// This file remains as a direct wrapper for React Toastify to maintain style consistency

export interface CustomToastOptions extends ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toast = {
  success: (message: string, options?: CustomToastOptions) => {
    return reactToast.success(message, {
      autoClose: options?.duration || 4000,
      ...options
    });
  },

  error: (message: string, options?: CustomToastOptions) => {
    return reactToast.error(message, {
      autoClose: options?.duration || 6000,
      ...options
    });
  },

  warning: (message: string, options?: CustomToastOptions) => {
    return reactToast.warning(message, {
      autoClose: options?.duration || 5000,
      ...options
    });
  },

  info: (message: string, options?: CustomToastOptions) => {
    return reactToast.info(message, {
      autoClose: options?.duration || 4000,
      ...options
    });
  },

  // Loading and Promise bypass the gate usually
  loading: (message: string) => {
    return reactToast.loading(message);
  },

  promise: <T>(
    promise: Promise<T>,
    { loading, success, error }: PromiseParams<T>
  ) => {
    return reactToast.promise(promise, {
      pending: loading,
      success: {
        render({ data }: { data: T }) {
          return typeof success === 'function' ? success(data) : success;
        }
      },
      error: {
        render({ data }: { data: unknown }) {
          return typeof error === 'function' ? error(data) : error;
        }
      }
    });
  },

  dismiss: (toastId?: string | number) => {
    return reactToast.dismiss(toastId);
  },

  update: (toastId: string | number, options: UpdateOptions) => {
    reactToast.update(toastId, options);
  },

  isActive: (toastId: string | number) => {
    return reactToast.isActive(toastId);
  }
};

type PromiseParams<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: any) => string);
};

// Re-export the raw toast for special cases
export { reactToast as sonnerToast };