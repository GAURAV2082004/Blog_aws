import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, demoMode, authApi } from '../auth.jsx';

export default function AuthPage() {
  const { user, signIn, signInDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin'); // signin | signup | confirm
  const [f, setF] = useState({ name: '', email: '', password: '', code: '', admin: false });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function run(fn) {
    setError(''); setInfo(''); setBusy(true);
    try { await fn(); } catch (err) { setError(err.message || 'Something went wrong. Try again.'); } finally { setBusy(false); }
  }

  const submitDemo = (e) => { e.preventDefault(); run(async () => { await signInDemo(f.name, f.admin); navigate('/'); }); };

  const submitSignIn = (e) => {
    e.preventDefault();
    run(async () => {
      try { await signIn(f.email, f.password); navigate('/'); }
      catch (err) {
        if (err.code === 'UserNotConfirmedException') { setMode('confirm'); setInfo('Enter the code we emailed you to finish creating your account.'); return; }
        throw err;
      }
    });
  };

  const submitSignUp = (e) => {
    e.preventDefault();
    run(async () => { await authApi.signUp(f.name, f.email, f.password); setMode('confirm'); setInfo(`We sent a 6-digit code to ${f.email}.`); });
  };

  const submitConfirm = (e) => {
    e.preventDefault();
    run(async () => { await authApi.confirm(f.email, f.code); await signIn(f.email, f.password); navigate('/'); });
  };

  if (demoMode) {
    return (
      <form className="auth" onSubmit={submitDemo}>
        <h1>Try it locally</h1>
        <p className="lede">Cognito is not configured, so sign-in is simulated. Pick a name and a role. Real sign-up appears once you add your user pool IDs.</p>
        <label htmlFor="name" className="field-label">Display name</label>
        <input id="name" className="input" value={f.name} onChange={set('name')} placeholder="e.g. Gaurav" required />
        <label className="check">
          <input type="checkbox" checked={f.admin} onChange={set('admin')} />
          <span>Sign in as a moderator (simulates the Cognito "admins" group)</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>Continue</button>
      </form>
    );
  }

  return (
    <div className="auth">
      <h1>{mode === 'signup' ? 'Create your account' : mode === 'confirm' ? 'Confirm your email' : 'Welcome back'}</h1>

      {mode === 'signin' && (
        <form onSubmit={submitSignIn}>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={f.email} onChange={set('email')} required />
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={f.password} onChange={set('password')} required />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <p className="switch">New here? <button type="button" className="link-btn" onClick={() => { setMode('signup'); setError(''); }}>Create an account</button></p>
        </form>
      )}

      {mode === 'signup' && (
        <form onSubmit={submitSignUp}>
          <label htmlFor="name" className="field-label">Display name</label>
          <input id="name" autoComplete="name" className="input" value={f.name} onChange={set('name')} required />
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={f.email} onChange={set('email')} required />
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="input" minLength={8} value={f.password} onChange={set('password')} required />
          <p className="muted hint">At least 8 characters with upper case, lower case and a number.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
          <p className="switch">Have an account? <button type="button" className="link-btn" onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></p>
        </form>
      )}

      {mode === 'confirm' && (
        <form onSubmit={submitConfirm}>
          {info && <p className="callout">{info}</p>}
          {!f.password && (
            <>
              <label htmlFor="email" className="field-label">Email</label>
              <input id="email" type="email" className="input" value={f.email} onChange={set('email')} required />
              <label htmlFor="password" className="field-label">Password</label>
              <input id="password" type="password" className="input" value={f.password} onChange={set('password')} required />
            </>
          )}
          <label htmlFor="code" className="field-label">Confirmation code</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" className="input" value={f.code} onChange={set('code')} required />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Confirming...' : 'Confirm and sign in'}</button>
          <p className="switch"><button type="button" className="link-btn" onClick={() => run(async () => { await authApi.resend(f.email); setInfo('A new code is on its way.'); })}>Send a new code</button></p>
        </form>
      )}
    </div>
  );
}
