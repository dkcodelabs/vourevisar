// =====================================================
// OTIMIZAÇÕES DE PERFORMANCE
// =====================================================

// Sistema de debounce global para eventos
const eventDebounceMap = new Map<string, NodeJS.Timeout>();

export const debounceEvent = (key: string, callback: () => void, delay: number = 300) => {
  if (eventDebounceMap.has(key)) {
    clearTimeout(eventDebounceMap.get(key)!);
  }
  
  const timeout = setTimeout(() => {
    callback();
    eventDebounceMap.delete(key);
  }, delay);
  
  eventDebounceMap.set(key, timeout);
};

// Sistema de cache simples para dados que não mudam frequentemente
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const getCachedData = <T>(key: string): T | null => {
  const cached = dataCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    dataCache.delete(key);
    return null;
  }
  
  return cached.data as T;
};

export const setCachedData = <T>(key: string, data: T, ttl: number = 30000) => {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
};

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of dataCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      dataCache.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto

// Sistema de throttle para funções que são chamadas muito frequentemente
const throttleMap = new Map<string, { lastCall: number; timeout?: NodeJS.Timeout }>();

export const throttle = (key: string, callback: () => void, delay: number = 1000) => {
  const now = Date.now();
  const throttled = throttleMap.get(key);
  
  if (!throttled || now - throttled.lastCall >= delay) {
    callback();
    throttleMap.set(key, { lastCall: now });
    return;
  }
  
  // Se já existe um timeout, não criar outro
  if (throttled.timeout) return;
  
  const timeout = setTimeout(() => {
    callback();
    const current = throttleMap.get(key);
    if (current) {
      current.lastCall = Date.now();
      current.timeout = undefined;
    }
  }, delay - (now - throttled.lastCall));
  
  throttled.timeout = timeout;
};

// Função para logs condicionais (apenas em desenvolvimento)
export const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Função para logs de erro (sempre ativo)
export const errorLog = (message: string, error?: any) => {
  console.error(message, error);
};