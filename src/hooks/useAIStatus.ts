import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { getConnectionErrorCode, getConnectionErrorMessage, isConnectionError } from '@/lib/errors/networkError';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos
const AI_STATUS_UPDATED_EVENT = 'ai-status-updated';

interface AIStatus {
  status: 'active' | 'inactive' | 'error' | 'unknown';
  lastCheck: string | null;
  errorMessage: string | null;
  modelName: string | null;
}

interface AIErrorLog {
  id: string;
  error_code: string;
  error_message: string;
  context: string | null;
  created_at: string;
}

function publishAIStatus(status: AIStatus) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AIStatus>(AI_STATUS_UPDATED_EVENT, { detail: status }));
}

// Função global para verificar status da IA (sem dependências de hook)
export async function checkAIStatusDirect(silent = true): Promise<AIStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-handler', {
      body: { action: 'checkStatus' }
    });

    if (error) {
      throw new Error(error.message);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Erro desconhecido da Edge Function');
    }
    
    const model = data?.model || null;
    console.log('[AIStatus] Modelo retornado pela API:', model);

    const newStatus: AIStatus = {
      status: 'active',
      lastCheck: new Date().toISOString(),
      errorMessage: null,
      modelName: model
    };
    
    try {
      await saveStatusToDB(newStatus);
    } catch (dbErr) {
      console.warn('[AIStatus] Erro na persistência (provavelmente coluna faltante):', dbErr);
    }
    publishAIStatus(newStatus);
    
    return newStatus;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    const errorCode = extractErrorCode(error);
    const isConnectionFailure = isConnectionError(error);
    
    const newStatus: AIStatus = {
      status: 'error',
      lastCheck: new Date().toISOString(),
      errorMessage: errorMessage,
      modelName: null
    };

    if (!isConnectionFailure) {
      await saveStatusToDB(newStatus);
      await saveErrorToDB(errorCode, errorMessage, 'checkAIStatusDirect');
    }
    publishAIStatus(newStatus);
    
    if (!silent) {
      toastGate.notifyError(errorMessage, errorCode, { severity: 'medium', flowKey: 'ai-status-check' });
    }
    
    return newStatus;
  }
}

async function saveStatusToDB(status: AIStatus) {
  try {
    const payload: {
      id: string;
      status: AIStatus['status'];
      last_check: string | null;
      error_message: string | null;
      updated_at: string;
      model_name?: string;
    } = {
      id: '00000000-0000-0000-0000-000000000001',
      status: status.status,
      last_check: status.lastCheck,
      error_message: status.errorMessage,
      updated_at: new Date().toISOString()
    };

    // Só adiciona se o campo existir para evitar erros de coluna ausente
    if (status.modelName) {
      payload.model_name = status.modelName; 
    }

    await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
      .from('ai_status')
      .upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Erro ao salvar status no banco:', err);
  }
}

async function saveErrorToDB(code: string, message: string, context: string) {
  try {
    await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
      .from('ai_error_logs')
      .insert({
        error_code: code,
        error_message: message,
        context: context
      });
  } catch (err) {
    console.warn('Erro ao salvar log de erro:', err);
  }
}

function extractErrorMessage(error: unknown): string {
  if (isConnectionError(error)) {
    return getConnectionErrorMessage(error);
  }

  const err = error as { message?: string; status?: number; cause?: { status?: number } };
  const msg = err?.message || '';
  const status = err?.status || err?.cause?.status;
  
  if (msg.includes('API key expired') || msg.includes('expired')) {
    return 'API key expirada. Renove no Google AI Studio.';
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('not valid')) {
    return 'API key inválida. Verifique no Google AI Studio.';
  }
  if (msg.includes('API_KEY_DENIED') || msg.includes('DENIED')) {
    return 'API key sem permissão. Verifique as configurações.';
  }
  if (msg.includes('quota') || msg.includes('QUOTA_EXCEEDED')) {
    return 'Cota da API excedida. Aguarde ou atualize seu plano.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('ENOTFOUND')) {
    return 'Erro de conexão. Verifique sua internet.';
  }
  if (status === 404 || msg.includes('not found') || msg.includes('404')) {
    return 'Modelo não encontrado. Verifique o nome do modelo nas configurações.';
  }
  if (status === 403 || msg.includes('forbidden')) {
    return 'Acesso proibido. Verifique as permissões da API key.';
  }
  return msg.substring(0, 200) || 'Erro desconhecido';
}

function extractErrorCode(error: unknown): string {
  const connectionCode = getConnectionErrorCode(error);
  if (connectionCode) return connectionCode;

  const err = error as { message?: string; status?: number; cause?: { status?: number } };
  const msg = err?.message || '';
  const status = err?.status || err?.cause?.status;
  
  if (msg.includes('API key expired') || msg.includes('expired')) return 'API_KEY_EXPIRED';
  if (msg.includes('API_KEY_INVALID') || msg.includes('not valid')) return 'API_KEY_INVALID';
  if (msg.includes('API_KEY_DENIED') || msg.includes('DENIED')) return 'API_KEY_DENIED';
  if (msg.includes('quota') || msg.includes('QUOTA')) return 'QUOTA_EXCEEDED';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('ENOTFOUND')) return 'CONNECTION_ERROR';
  if (status === 404 || msg.includes('not found') || msg.includes('404')) return 'MODEL_NOT_FOUND';
  if (status === 403 || msg.includes('forbidden')) return 'FORBIDDEN';
  return 'UNKNOWN_ERROR';
}

export async function getAIErrorLogs(limit = 20): Promise<AIErrorLog[]> {
  try {
    const { data, error } = await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
      .from('ai_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []) as unknown as AIErrorLog[];
  } catch (err) {
    console.warn('Erro ao carregar logs de erro:', err);
    return [];
  }
}

// Hook para usar na UI
export function useAIStatus(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [aiStatus, setAIStatus] = useState<AIStatus>({
    status: 'unknown',
    lastCheck: null,
    errorMessage: null,
    modelName: null
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkAIStatus = useCallback(async (isManual = false) => {
    if (!enabled) return aiStatus;

    setIsChecking(true);
    try {
      const status = await checkAIStatusDirect(!isManual);
      setAIStatus(status);
      
      if (isManual && status.status === 'active') {
        toast.success('Conexão com Gemini estabelecida com sucesso!');
      }
      
      return status;
    } finally {
      setIsChecking(false);
    }
  }, [aiStatus, enabled]);

  const loadStatusFromDB = useCallback(async () => {
    if (!enabled) return;

    try {
      const { data } = await (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
        .from('ai_status')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();
      
      if (data) {
        const savedStatus = data as unknown as {
          status: AIStatus['status'];
          last_check: string | null;
          error_message: string | null;
          model_name?: string | null;
        };
        setAIStatus({
          status: savedStatus.status,
          lastCheck: savedStatus.last_check,
          errorMessage: savedStatus.error_message,
          modelName: savedStatus.model_name || null
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar status do banco:', err);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    loadStatusFromDB();
  }, [enabled, loadStatusFromDB]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleStatusUpdate = (event: Event) => {
      const status = (event as CustomEvent<AIStatus>).detail;
      if (status) setAIStatus(status);
    };

    window.addEventListener(AI_STATUS_UPDATED_EVENT, handleStatusUpdate);
    return () => window.removeEventListener(AI_STATUS_UPDATED_EVENT, handleStatusUpdate);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      checkAIStatus();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, checkAIStatus]);

  return {
    aiStatus,
    isChecking,
    checkAIStatus,
    saveErrorToDB
  };
}
