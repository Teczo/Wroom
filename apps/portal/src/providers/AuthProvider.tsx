import { Auth0Provider } from '@auth0/auth0-react';
import type { ReactNode } from 'react';

import { config, isAuthConfigured } from '../lib/config';

/**
 * Auth0 wiring. When the environment has no Auth0 application configured the
 * provider is skipped entirely — the shell then shows a setup message rather
 * than a redirect loop to a domain that does not exist.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;

  return (
    <Auth0Provider
      domain={config.auth0.domain}
      clientId={config.auth0.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(config.auth0.audience ? { audience: config.auth0.audience } : {}),
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
