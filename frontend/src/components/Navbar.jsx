import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, demoMode } from '../auth.jsx';
import Avatar from './Avatar.jsx';

export default function Navbar() {
  const { user, ready, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link to="/" className="brand" aria-label="Margin home">
          <span className="brand-mark" aria-hidden="true" />
          Margin
        </Link>
        <nav className="nav-actions" aria-label="Main">
          {demoMode && <span className="chip chip-demo" title="No Cognito configured. Using local demo sign-in.">Demo mode</span>}
          {ready && user && (
            <>
              <NavLink to="/write" className="btn btn-primary">Write a story</NavLink>
              <span className="who">
                <Avatar name={user.name} seed={user.sub} size={30} />
                <span className="who-name">
                  {user.name}
                  {user.isAdmin && <span className="chip chip-admin">Moderator</span>}
                </span>
              </span>
              <button className="btn btn-quiet" onClick={() => { signOut(); navigate('/'); }}>Sign out</button>
            </>
          )}
          {ready && !user && (
            <>
              <NavLink to="/auth" className="btn btn-quiet">Sign in</NavLink>
              <NavLink to="/auth?mode=signup" className="btn btn-primary">Get started</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
