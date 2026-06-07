import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { status, data } = await apiFetch('/api/sessions/current');
    setUser(status === 200 ? data : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (username, password) => {
    const { status, data } = await apiFetch('/api/sessions', {
      method: 'POST',
      body: { username, password },
    });
    if (status !== 201) {
      return { ok: false, error: data?.error ?? 'LOGIN_FAILED' };
    }
    setUser(data);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/sessions/current', { method: 'DELETE' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
