import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos

interface AIStatus {
  status: 'active' | 'inactive' | 'error' | 'unknown';
  lastCheck: string | null;
  errorMessage: string | null;
}

interface AIErrorLog {
  id: string;
  error_code: string;
  error_message: string;
  context: string | null;
  created_at: string;
}

// Função global para verificar status da IA (sem dependências de hook)
export async function checkAIStatusDirect(): Promise<AIStatus> {
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
    
    const newStatus: AIStatus = {
      status: 'active',
      lastCheck: new Date().toISOString(),
      errorMessage: null
    };
    
    await saveStatusToDB(newStatus);
    
    return newStatus;
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error);
    const errorCode = extractErrorCode(error);
    
    const newStatus: AIStatus = {
      status: 'error',
      lastCheck: new Date().toISOString(),
      errorMessage: errorMessage
    };
    
    await saveStatusToDB(newStatus);
    await saveErrorToDB(errorCode, errorMessage, 'checkAIStatusDirect');
    
    return newStatus;
  }
}

async function saveStatusToDB(status: AIStatus) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('ai_status')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        status: status.status,
        last_check: status.lastCheck,
        error_message: status.errorMessage,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Erro ao salvar status no banco:', err);
  }
}

async function saveErrorToDB(code: string, message: string, context: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
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

function extractErrorMessage(error: any): string {
  const msg = error?.message || '';
  const status = error?.status || error?.cause?.status;
  
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
    return 'Cota da API excedida. Aguarde ou升级 seu plano.';
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

function extractErrorCode(error: any): string {
  const msg = error?.message || '';
  const status = error?.status || error?.cause?.status;
  
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('ai_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Erro ao carregar logs de erro:', err);
    return [];
  }
}

// Hook para usar na UI
export function useAIStatus() {
  const [aiStatus, setAIStatus] = useState<AIStatus>({
    status: 'unknown',
    lastCheck: null,
    errorMessage: null
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkAIStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await checkAIStatusDirect();
      setAIStatus(status);
      return status;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const loadStatusFromDB = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('ai_status')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setAIStatus({
          status: data.status,
          lastCheck: data.last_check,
          errorMessage: data.error_message
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar status do banco:', err);
    }
  }, []);

  useEffect(() => {
    loadStatusFromDB();
  }, [loadStatusFromDB]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAIStatus();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkAIStatus]);

  return {
    aiStatus,
    isChecking,
    checkAIStatus,
    saveErrorToDB
  };
}
