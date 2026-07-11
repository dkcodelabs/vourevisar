import { useSyncExternalStore, type ReactNode } from 'react';

export type ToastId = string | number;
export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface CustomToastOptions {
  duration?: number;
  autoClose?: number | false;
  toastId?: ToastId;
  id?: ToastId;
  type?: ToastKind;
  render?: ReactNode | (() => ReactNode);
  isLoading?: boolean;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type UpdateOptions = Partial<CustomToastOptions>;

export interface PremiumToast {
  id: ToastId;
  kind: ToastKind;
  message: ReactNode;
  createdAt: number;
  action?: CustomToastOptions['action'];
  isLoading?: boolean;
  onClose?: () => void;
}

type PromiseParams<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
};

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 3600,
  error: 6400,
  warning: 5200,
  info: 4200,
  loading: 0,
};

let toasts: PremiumToast[] = [];
let nextId = 1;

const listeners = new Set<() => void>();
const timers = new Map<ToastId, ReturnType<typeof setTimeout>>();
const durations = new Map<ToastId, number>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => toasts;

const resolveMessage = (message: ReactNode | (() => ReactNode)) => (
  typeof message === 'function' ? (message as () => ReactNode)() : message
);

const clearTimer = (id: ToastId) => {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
};

const scheduleDismiss = (id: ToastId, options: CustomToastOptions | undefined, kind: ToastKind) => {
  clearTimer(id);
  const duration = options?.autoClose === false
    ? false
    : options?.duration ?? options?.autoClose ?? DEFAULT_DURATION[kind];

  if (!duration || duration === false) return;

  durations.set(id, duration);
  timers.set(id, setTimeout(() => {
    toast.dismiss(id);
  }, duration));
};

const createToast = (kind: ToastKind, message: ReactNode, options?: CustomToastOptions) => {
  const id = options?.toastId ?? options?.id ?? `toast-${nextId++}`;
  const normalizedKind = options?.type ?? kind;
  const toastItem: PremiumToast = {
    id,
    kind: normalizedKind,
    message: resolveMessage(options?.render ?? message),
    createdAt: Date.now(),
    action: options?.action,
    isLoading: options?.isLoading ?? normalizedKind === 'loading',
    onClose: options?.onClose,
  };

  toasts = [
    toastItem,
    ...toasts.filter((item) => item.id !== id),
  ].slice(0, 4);

  scheduleDismiss(id, options, normalizedKind);
  emit();
  return id;
};

export const toast = {
  success: (message: ReactNode, options?: CustomToastOptions) => createToast('success', message, options),

  error: (message: ReactNode, options?: CustomToastOptions) => createToast('error', message, options),

  warning: (message: ReactNode, options?: CustomToastOptions) => createToast('warning', message, options),

  warn: (message: ReactNode, options?: CustomToastOptions) => createToast('warning', message, options),

  info: (message: ReactNode, options?: CustomToastOptions) => createToast('info', message, options),

  loading: (message: ReactNode, options?: CustomToastOptions) => (
    createToast('loading', message, { ...options, autoClose: false, isLoading: true })
  ),

  promise: async <T>(
    promise: Promise<T>,
    { loading, success, error }: PromiseParams<T>,
  ) => {
    const id = toast.loading(loading);
    try {
      const data = await promise;
      toast.update(id, {
        render: typeof success === 'function' ? success(data) : success,
        type: 'success',
        isLoading: false,
        autoClose: DEFAULT_DURATION.success,
      });
      return data;
    } catch (caughtError) {
      toast.update(id, {
        render: typeof error === 'function' ? error(caughtError) : error,
        type: 'error',
        isLoading: false,
        autoClose: DEFAULT_DURATION.error,
      });
      throw caughtError;
    }
  },

  dismiss: (toastId?: ToastId) => {
    if (typeof toastId === 'undefined') {
      toasts.forEach((item) => {
        clearTimer(item.id);
        durations.delete(item.id);
        item.onClose?.();
      });
      toasts = [];
      emit();
      return;
    }

    const removed = toasts.find((item) => item.id === toastId);
    clearTimer(toastId);
    durations.delete(toastId);
    toasts = toasts.filter((item) => item.id !== toastId);
    removed?.onClose?.();
    emit();
  },

  update: (toastId: ToastId, options: UpdateOptions) => {
    const current = toasts.find((item) => item.id === toastId);
    if (!current) return;

    const nextKind = options.type ?? current.kind;
    toasts = toasts.map((item) => (
      item.id === toastId
        ? {
          ...item,
          kind: nextKind,
          message: options.render ? resolveMessage(options.render) : item.message,
          action: options.action ?? item.action,
          isLoading: options.isLoading ?? false,
          onClose: options.onClose ?? item.onClose,
        }
        : item
    ));

    scheduleDismiss(toastId, options, nextKind);
    emit();
  },

  isActive: (toastId: ToastId) => toasts.some((item) => item.id === toastId),

  pause: (toastId: ToastId) => {
    clearTimer(toastId);
  },

  resume: (toastId: ToastId) => {
    const item = toasts.find((toastItem) => toastItem.id === toastId);
    const duration = durations.get(toastId);
    if (!item || !duration || item.isLoading) return;
    scheduleDismiss(toastId, { duration }, item.kind);
  },
};

export function usePremiumToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const sonnerToast = toast;

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as typeof window & { __vouToast?: typeof toast }).__vouToast = toast;
}
