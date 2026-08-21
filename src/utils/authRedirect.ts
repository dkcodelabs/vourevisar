export const getAuthCallbackUrl = (): string =>
  `${window.location.origin}/auth/callback`;

type RedirectLocation = {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
};

const isInternalPath = (value: string) => value.startsWith('/') && !value.startsWith('//');

export const getPostAuthRedirect = (from: unknown, redirectParam?: string | null) => {
  if (from && typeof from === 'object') {
    const location = from as RedirectLocation;
    const pathname = typeof location.pathname === 'string' ? location.pathname : '';
    if (isInternalPath(pathname)) {
      const search = typeof location.search === 'string' ? location.search : '';
      const hash = typeof location.hash === 'string' ? location.hash : '';
      const destination = `${pathname}${search}${hash}`;
      return destination === '/' ? '/dashboard' : destination;
    }
  }

  if (redirectParam === 'planos') return '/planos';
  if (redirectParam && isInternalPath(redirectParam)) return redirectParam;
  return '/dashboard';
};
