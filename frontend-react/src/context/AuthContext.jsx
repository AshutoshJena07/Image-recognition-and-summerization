import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, loginUser, registerUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children, navigate }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  // Sync token to API validation
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const profile = await getMe(token);
        setUser(profile);
      } catch (err) {
        console.warn("Token validation failed. Logging out.", err);
        // Clear expired/invalid token
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    validateToken();
  }, [token]);

  const handleLogin = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setGuestMode(false);
      navigate('#/dashboard');
    } catch (err) {
      throw err;
    }
  };

  const handleRegister = async (email, password) => {
    try {
      await registerUser(email, password);
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (err) {
        console.warn("Server logout failed, proceeding to clear client session.", err);
      }
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setGuestMode(false);
    navigate('#/');
  };

  const enterGuestMode = () => {
    setGuestMode(true);
    setToken(null);
    setUser(null);
    navigate('#/workspace');
  };

  const value = {
    token,
    user,
    loading,
    guestMode,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    enterGuestMode
  };

  return (
    <AuthContext.Provider value={value}>
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
