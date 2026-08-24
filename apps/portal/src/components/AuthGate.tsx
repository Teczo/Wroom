import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, type ReactNode } from 'react';

import { setTokenGetter } from '../lib/api';
import { config, isAuthConfigured } from '../lib/config';
import { Button } from './Button';
import { LoadingState } from './StateViews';

function SetupNeeded() {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-lg font-semibold text-slate-900">Auth0 is not configured</h1>
      <p className="mt-2 text-sm text-slate-600">
        The portal needs an Auth0 application before anyone can sign in. Copy{' '}
        <code className="rounded bg-slate-100 px-1">apps/portal/.env.example</code> to{' '}
        <code className="rounded bg-slate-100 px-1">.env</code> and fill in the domain, client id
        and audience.
      </p>
    </div>
  );
}

function SignIn() {
  const { loginWithRedirect, error } = useAuth0();

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Wroom</h1>
      <p className="mt-2 text-sm text-slate-600">
        The war room for everything Teczo is building. Sign in to continue.
      </p>
      {error ? <p className="mt-4 text-sm text-red-600">{error.message}</p> : null}
      <Button className="mt-6" onClick={() => void loginWithRedirect()}>
        Sign in
      </Button>
    </div>
  );
}

/**
 * Nothing in the portal renders unauthenticated. The access token is handed to
 * the API client here — one place, so no component has to think about it.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasToken(false);
      return;
    }

    setTokenGetter(async () => {
      try {
        return await getAccessTokenSilently({
          authorizationParams: config.auth0.audience
            ? { audience: config.auth0.audience }
            : undefined,
        });
      } catch {
        return null;
      }
    });
    setHasToken(true);
  }, [isAuthenticated, getAccessTokenSilently]);

  if (!isAuthConfigured) return <SetupNeeded />;
  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }
  if (!isAuthenticated) return <SignIn />;
  // Children stay unmounted until the token getter above is in place. React
  // runs a child's effects before its parent's, so mounting them in the same
  // commit lets their first queries go out unauthenticated and come back 401.
  if (!hasToken) {
    return (
      <div className="p-6">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  return <>{children}</>;
}
