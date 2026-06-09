import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <header className="app-header">
      <div className="header-inner">
        <NavLink to="/" className="brand">
          LAST RACE
        </NavLink>

        <nav className="header-nav">
          
          {user ? (
            <>
              <NavLink to="/game" className={linkClass}>
                Play
              </NavLink>
              <NavLink to="/ranking" className={linkClass}>
                Ranking
              </NavLink>
              <NavLink to="/" className={linkClass}>
                Instructions
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={linkClass}>
                Instructions
              </NavLink>
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
            </>
          )}
        </nav>

        {user ? (
          <div className="header-user">
            <span className="username">{user.username}</span>
            <button type="button" className="btn-text" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
