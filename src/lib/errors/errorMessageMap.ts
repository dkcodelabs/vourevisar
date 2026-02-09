/**
 * Mapeia padrões de erro (códigos ou substrings) para mensagens amigáveis ao usuário.
 */
export const errorMessageMap: Record<string, string> = {
    // Constraints de Banco de Dados (Supabase/Postgres)
    '23505': 'Este registro já existe no sistema.', // Unique violation
    '23503': 'A operação depende de outro registro que não foi encontrado.', // Foreign key violation
    '23502': 'Um campo obrigatório não foi preenchido.', // Not null violation
    'PGRST116': 'O registro solicitado não foi encontrado.', // Single row not found
    '42501': 'Você não tem permissão para realizar esta ação.', // RLS violation
    
    // Constraints específicas do sistema
    'user_events_event_type_check': 'Não foi possível concluir a ação. Verifique os dados e tente novamente.',
    'profiles_email_key': 'Este email já está cadastrado no sistema.',
    'user_subscriptions_user_id_key': 'Assinatura duplicada detectada.',

    // Erros de Rede / Fetch
    'TypeError: Failed to fetch': 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    'NetworkError': 'Erro de conexão. Tente novamente.',
    'AbortError': 'A requisição demorou muito e foi cancelada.',

    // Auth
    'AuthApiError': 'Erro de autenticação. Tente fazer login novamente.',
    'Invalid login credentials': 'Email ou senha incorretos.',

    // Genéricos Fallback
    'DEFAULT': 'Não foi possível concluir a ação agora. Tente novamente em instantes.',
};

export const getFriendlyMessage = (technicalMessage: string, code?: string): string => {
    if (code && errorMessageMap[code]) {
        return errorMessageMap[code];
    }

    // Busca por substrings conhecidas na mensagem técnica
    for (const [key, msg] of Object.entries(errorMessageMap)) {
        if (technicalMessage?.includes(key)) {
            return msg;
        }
    }

    return errorMessageMap['DEFAULT'];
};
