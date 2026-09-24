import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch (error) {
      // Only drop the session when the server actually rejected the token —
      // a network hiccup shouldn't sign the user out.
      if (error?.status === 401 || error?.status === 404) {
        localStorage.removeItem('token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const result = await api.login(email, password);

    // 2FA required — return the result so the login page can show OTP screen
    if (result.twoFactorRequired) {
      return { twoFactorRequired: true, email: result.email };
    }

    // No 2FA — store token and set user
    localStorage.setItem('token', result.token);
    setUser(result.user);
    return result.user;
  };

  const verifyLogin = async (email, code) => {
    const { token, user } = await api.verifyLoginOtp(email, code);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const signup = async (data) => {
    const result = await api.signup(data);
    return result;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isApproved = user?.status === 'APPROVED';
  const isPending = user?.status === 'PENDING';

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyLogin, signup, logout, isAdmin, isApproved, isPending, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
