import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, loginUser, registerUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children, navigate }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    const savedEmail = localStorage.getItem('user_email');
    return savedEmail ? { email: savedEmail } : null;
  });
  const [loading, setLoading] = useState(() => {
    return Boolean(localStorage.getItem('auth_token'));
  });
  const [guestMode, setGuestModeState] = useState(() => {
    return localStorage.getItem('guest_mode') === 'true';
  });

  const setGuestMode = (val) => {
    setGuestModeState(val);
    if (val) {
      localStorage.setItem('guest_mode', 'true');
    } else {
      localStorage.removeItem('guest_mode');
    }
  };

  // Sync token to API validation
  useEffect(() => {
    let isMounted = true;

    async function validateToken() {
      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        setLoading(true);
        const profile = await getMe(token);
        if (isMounted) {
          setUser(profile);
          if (profile?.email) {
            localStorage.setItem('user_email', profile.email);
          }
        }
      } catch (err) {
        console.warn("Token validation issue:", err);
        // Only clear token if server explicitly rejected with 401 or 403 or 404
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_email');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleLogin = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_email', data.email || email);
      localStorage.removeItem('guest_mode');
      setToken(data.token);
      setUser({ email: data.email || email });
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
    localStorage.removeItem('user_email');
    localStorage.removeItem('guest_mode');
    setToken(null);
    setUser(null);
    setGuestMode(false);
    navigate('#/');
  };

  const enterGuestMode = () => {
    setGuestMode(true);
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
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
