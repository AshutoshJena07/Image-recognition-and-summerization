import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';

function AppRouter() {
  const { token, user, loading, guestMode } = useAuth();
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || '#/');
  
  // Dashboard dynamic launchers preloads
  const [preloadedFile, setPreloadedFile] = useState(null);
  const [preloadedPrompt, setPreloadedPrompt] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (hash) => {
    window.location.hash = hash;
  };

  const handleNewSessionWithFile = (file) => {
    setPreloadedFile(file);
    navigate('#/workspace');
  };

  const handleNewSessionWithPrompt = (promptText) => {
    setPreloadedPrompt(promptText);
    navigate('#/workspace');
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="welcome-orb" style={{ margin: '0 auto 16px auto', width: '50px', height: '50px', fontSize: '18px' }}>✦</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>SYNCHRONIZING PRIVATE ENVIRONMENT...</p>
        </div>
      </div>
    );
  }

  // Routing gates
  const hash = currentHash;

  if (hash === '#/' || hash === '') {
    return <HomePage navigate={navigate} />;
  }

  if (hash === '#/login' || hash === '#/signup') {
    if (token) {
      navigate('#/dashboard');
      return null;
    }
    return <AuthPage isSignUpDefault={hash === '#/signup'} navigate={navigate} />;
  }

  const isDashboard = hash === '#/dashboard';
  const isWorkspaceNew = hash === '#/workspace';
  const isWorkspaceSession = hash.startsWith('#/workspace/');

  if (isDashboard || isWorkspaceNew || isWorkspaceSession) {
    if (!token && !guestMode) {
      navigate('#/login');
      return null;
    }

    if (isDashboard) {
      return (
        <DashboardPage 
          navigate={navigate} 
          onNewSessionWithFile={handleNewSessionWithFile}
          onNewSessionWithPrompt={handleNewSessionWithPrompt}
        />
      );
    }

    const conversationId = isWorkspaceSession ? hash.replace('#/workspace/', '') : null;

    return (
      <WorkspacePage 
        navigate={navigate} 
        conversationId={conversationId}
        preloadedFile={preloadedFile}
        clearPreloadedFile={() => setPreloadedFile(null)}
        preloadedPrompt={preloadedPrompt}
        clearPreloadedPrompt={() => setPreloadedPrompt('')}
      />
    );
  }

  // Redirect invalid paths back to landing
  navigate('#/');
  return null;
}

function App() {
  const navigate = (hash) => {
    window.location.hash = hash;
  };

  return (
    <ThemeProvider>
      <AuthProvider navigate={navigate}>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
