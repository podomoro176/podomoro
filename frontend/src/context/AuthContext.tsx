import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '@/api/auth';
import { setToken } from '@/api/tokenStore';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) { setLoading(false); return; }

    import('axios').then(({ default: axios }) =>
      axios.post('/api/v1/auth/refresh', { refreshToken })
    ).then(({ data }) => {
      setToken(data.data.accessToken);
      return getMe();
    }).then((u) => {
      setUser(u);
    }).catch(() => {
      localStorage.removeItem('refreshToken');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    const { user: u } = await apiLogin(email, password);
    setUser(u);
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
