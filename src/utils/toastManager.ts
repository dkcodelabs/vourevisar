import { toast, ToastOptions, Id } from 'react-toastify';

// Mapa para rastrear toasts ativos e evitar duplicatas
const activeToasts = new Map<string, Id>();

// Função para limpar toast do mapa quando ele expira
const clearToastFromMap = (key: string, toastId: Id) => {
  // O react-toastify tem seu próprio gerenciamento, mas mantemos isso
  // para garantir que nossa lógica de prevenção de duplicatas funcione
  setTimeout(() => {
    if (activeToasts.get(key) === toastId) {
      activeToasts.delete(key);
    }
  }, 5000);
};

export const toastManager = {
  success: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;

    // Se já existe um toast ativo com a mesma chave, verificar se ainda está ativo
    if (activeToasts.has(key)) {
      const existingId = activeToasts.get(key);
      if (existingId && toast.isActive(existingId)) {
        return existingId;
      }
    }

    // Usar toastId para evitar duplicatas nativamente também
    const toastId = toast.success(message, {
      autoClose: options?.duration || 4000,
      toastId: key,
    });

    activeToasts.set(key, toastId);
    clearToastFromMap(key, toastId);

    return toastId;
  },

  error: (message: string, options?: { duration?: number; id?: string }) => {
    // Para erros, geralmente queremos mostrar sempre, mas se especificar ID, respeitamos
    const key = options?.id || `error-${Date.now()}`;

    const toastId = toast.error(message, {
      autoClose: options?.duration || 6000,
      toastId: key
    });

    if (options?.id) {
      activeToasts.set(key, toastId);
      clearToastFromMap(key, toastId);
    }

    return toastId;
  },

  warning: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;

    if (activeToasts.has(key)) {
      const existingId = activeToasts.get(key);
      if (existingId && toast.isActive(existingId)) {
        return existingId;
      }
    }

    const toastId = toast.warning(message, {
      autoClose: options?.duration || 5000,
      toastId: key,
    });

    activeToasts.set(key, toastId);
    clearToastFromMap(key, toastId);

    return toastId;
  },

  info: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;

    if (activeToasts.has(key)) {
      const existingId = activeToasts.get(key);
      if (existingId && toast.isActive(existingId)) {
        return existingId;
      }
    }

    const toastId = toast.info(message, {
      autoClose: options?.duration || 4000,
      toastId: key,
    });

    activeToasts.set(key, toastId);
    clearToastFromMap(key, toastId);

    return toastId;
  },

  dismiss: (toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  // Função para limpar todos os toasts ativos
  clear: () => {
    activeToasts.clear();
    toast.dismiss();
  }
};