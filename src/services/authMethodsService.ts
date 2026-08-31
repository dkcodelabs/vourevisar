import { invokeUserRpc } from '@/services/userRpcService';

export type AuthMethodsCapability = {
  hasPassword: boolean;
  providers: string[];
};

const parseAuthMethodsCapability = (value: unknown): AuthMethodsCapability => {
  if (!value || typeof value !== 'object') {
    throw new Error('Métodos de autenticação não retornados pelo servidor.');
  }

  const record = value as Record<string, unknown>;
  const providers = Array.isArray(record.providers)
    ? record.providers.filter((provider): provider is string => typeof provider === 'string')
    : [];

  return {
    hasPassword: record.has_password === true,
    providers,
  };
};

export const getMyAuthMethods = async (): Promise<AuthMethodsCapability> => {
  const data = await invokeUserRpc<unknown>('get_my_auth_methods');
  return parseAuthMethodsCapability(data);
};
