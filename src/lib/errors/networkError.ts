type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  cause?: unknown;
};

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }

  if (typeof error === 'string') return error;

  const err = error as ErrorLike | null | undefined;
  const parts = [
    err?.name,
    err?.message,
    err?.code,
    err?.status,
    (err?.cause as ErrorLike | undefined)?.message,
  ];

  return parts.filter(Boolean).map(String).join(' ');
}

export function isConnectionError(error: unknown): boolean {
  const normalized = stringifyError(error).toLowerCase();

  return [
    'failed to fetch',
    'failed to send a request',
    'functionsfetcherror',
    'functionsrelayerror',
    'networkerror',
    'fetcherror',
    'load failed',
    'enotfound',
    'err_internet_disconnected',
    'err_network_changed',
    'err_cert_authority_invalid',
    'err_cert',
    'certificate',
  ].some(pattern => normalized.includes(pattern));
}

export function isCertificateConnectionError(error: unknown): boolean {
  const normalized = stringifyError(error).toLowerCase();

  return normalized.includes('err_cert')
    || normalized.includes('cert_authority_invalid')
    || normalized.includes('certificate');
}

export function getConnectionErrorCode(error: unknown): string | null {
  if (!isConnectionError(error)) return null;
  return isCertificateConnectionError(error) ? 'SECURE_CONNECTION_ERROR' : 'CONNECTION_ERROR';
}

export function getConnectionErrorMessage(error: unknown): string {
  if (isCertificateConnectionError(error)) {
    return 'Não consegui validar a conexão segura com o servidor. Desative VPN/proxy/antivírus com inspeção HTTPS ou tente outra rede.';
  }

  return 'Não consegui conectar ao servidor agora. Confira sua internet e tente novamente.';
}
