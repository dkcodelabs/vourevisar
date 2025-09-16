import { toast as sonnerToast } from 'sonner';

// Mapa para rastrear toasts ativos e evitar duplicatas
const activeToasts = new Map<string, number>();

// Função para limpar toast do mapa quando ele expira
const clearToastFromMap = (key: string, toastId: number) => {
  setTimeout(() => {
    if (activeToasts.get(key) === toastId) {
      activeToasts.delete(key);
    }
  }, 5000); // Limpar após 5 segundos
};

export const toastManager = {
  success: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    
    // Se já existe um toast ativo com a mesma mensagem, não criar outro
    if (activeToasts.has(key)) {
      return activeToasts.get(key);
    }
    
    const toastId = sonnerToast.success(message, {
      duration: options?.duration || 4000,
    });
    
    activeToasts.set(key, toastId as number);
    clearToastFromMap(key, toastId as number);
    
    return toastId;
  },
  
  error: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    
    // Para erros, sempre mostrar (podem ser diferentes)
    const toastId = sonnerToast.error(message, {
      duration: options?.duration || 6000,
    });
    
    return toastId;
  },
  
  warning: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    
    if (activeToasts.has(key)) {
      return activeToasts.get(key);
    }
    
    const toastId = sonnerToast.warning(message, {
      duration: options?.duration || 5000,
    });
    
    activeToasts.set(key, toastId as number);
    clearToastFromMap(key, toastId as number);
    
    return toastId;
  },
  
  info: (message: string, options?: { duration?: number; id?: string }) => {
    const key = options?.id || message;
    
    if (activeToasts.has(key)) {
      return activeToasts.get(key);
    }
    
    const toastId = sonnerToast.info(message, {
      duration: options?.duration || 4000,
    });
    
    activeToasts.set(key, toastId as number);
    clearToastFromMap(key, toastId as number);
    
    return toastId;
  },
  
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
  
  // Função para limpar todos os toasts ativos
  clear: () => {
    activeToasts.clear();
    sonnerToast.dismiss();
  }
};