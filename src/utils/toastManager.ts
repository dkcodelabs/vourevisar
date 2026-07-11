import { toast, type ToastId } from '@/lib/toast';

const activeToasts = new Map<string, ToastId>();

const clearToastFromMap = (key: string, toastId: ToastId, duration = 5000) => {
  setTimeout(() => {
    if (activeToasts.get(key) === toastId) {
      activeToasts.delete(key);
    }
  }, duration);
};

const shouldReuseToast = (key: string) => {
  const existingId = activeToasts.get(key);
  return existingId && toast.isActive(existingId) ? existingId : null;
};

export const toastManager = {
  success: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    const existingId = shouldReuseToast(key);
    if (existingId) return existingId;

    const duration = options?.duration || 4000;
    const toastId = toast.success(message, { duration, id: key });
    activeToasts.set(key, toastId);
    clearToastFromMap(key, toastId, duration);
    return toastId;
  },

  error: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || `error-${Date.now()}`;
    const duration = options?.duration || 6000;
    const toastId = toast.error(message, { duration, id: key });

    if (options?.id) {
      activeToasts.set(key, toastId);
      clearToastFromMap(key, toastId, duration);
    }

    return toastId;
  },

  warning: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    const existingId = shouldReuseToast(key);
    if (existingId) return existingId;

    const duration = options?.duration || 5000;
    const toastId = toast.warning(message, { duration, id: key });
    activeToasts.set(key, toastId);
    clearToastFromMap(key, toastId, duration);
    return toastId;
  },

  info: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    const existingId = shouldReuseToast(key);
    if (existingId) return existingId;

    const duration = options?.duration || 4000;
    const toastId = toast.info(message, { duration, id: key });
    activeToasts.set(key, toastId);
    clearToastFromMap(key, toastId, duration);
    return toastId;
  },

  dismiss: (toastId?: ToastId) => {
    toast.dismiss(toastId);
  },

  clear: () => {
    activeToasts.clear();
    toast.dismiss();
  },
};
