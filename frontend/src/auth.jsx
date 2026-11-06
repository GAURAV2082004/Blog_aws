import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

const poolId = import.meta.env.VITE_USER_POOL_ID;
const clientId = import.meta.env.VITE_CLIENT_ID;

/** No Cognito config means demo mode: fake local identities that only the local API accepts. */
export const demoMode = !poolId || !clientId;
const pool = demoMode ? null : new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId });
const DEMO_KEY = 'margin_demo_user';

function userFromIdToken(idToken) {
  const c = idToken.decodePayload();
  const groups = c['cognito:groups'] || [];
  return {
    sub: c.sub,
    name: c.name || (c.email ? c.email.split('@')[0] : 'Reader'),
    email: c.email,
    isAdmin: groups.includes('admins'),
  };
}

function cognitoSession() {
  return new Promise((resolve) => {
    const current = pool.getCurrentUser();
    if (!current) return resolve(null);
    // getSession refreshes expired tokens automatically with the refresh token.
    current.getSession((err, session) => (err || !session?.isValid() ? resolve(null) : resolve(session)));
  });
}

export async function getToken() {
  if (demoMode) {
    const d = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
    return d ? `dev:${d.name}:${d.isAdmin ? 'admin' : 'reader'}` : null;
  }
  const session = await cognitoSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

async function loadUser() {
  if (demoMode) {
    const d = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
    return d ? { sub: `dev-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user'}`, ...d } : null;
  }
  const session = await cognitoSession();
  return session ? userFromIdToken(session.getIdToken()) : null;
}

const cognitoUser = (email) => new CognitoUser({ Username: email, Pool: pool });

export const authApi = {
  signUp: (name, email, password) =>
    new Promise((resolve, reject) => {
      const attrs = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name }),
      ];
      pool.signUp(email, password, attrs, null, (err, res) => (err ? reject(err) : resolve(res)));
    }),
  confirm: (email, code) =>
    new Promise((resolve, reject) =>
      cognitoUser(email).confirmRegistration(code, true, (err, res) => (err ? reject(err) : resolve(res)))),
  resend: (email) =>
    new Promise((resolve, reject) =>
      cognitoUser(email).resendConfirmationCode((err, res) => (err ? reject(err) : resolve(res)))),
  signIn: (email, password) =>
    new Promise((resolve, reject) => {
      cognitoUser(email).authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
        onSuccess: (session) => resolve(userFromIdToken(session.getIdToken())),
        onFailure: reject,
      });
    }),
  signInDemo: (name, isAdmin) => {
    const user = { name: name.trim() || 'Guest', email: 'demo@local', isAdmin };
    localStorage.setItem(DEMO_KEY, JSON.stringify(user));
    return loadUser();
  },
  signOut: () => {
    if (demoMode) localStorage.removeItem(DEMO_KEY);
    else pool.getCurrentUser()?.signOut();
  },
};

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadUser().then((u) => { setUser(u); setReady(true); });
  }, []);

  const signIn = useCallback(async (email, password) => setUser(await authApi.signIn(email, password)), []);
  const signInDemo = useCallback(async (name, isAdmin) => setUser(await authApi.signInDemo(name, isAdmin)), []);
  const signOut = useCallback(() => { authApi.signOut(); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
