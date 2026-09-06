import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { AppShell } from './components/AppShell';
import { Loader2 } from 'lucide-react';

const RootApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-7 h-7 animate-spin text-stone-700 mb-3" />
        <span className="text-sm font-medium text-stone-600">Verifying session security...</span>
      </div>
    );
  }

  // Strictly gate access: Unauthenticated users only see the Login screen.
  if (!user) {
    return <LoginView />;
  }

  // Authenticated users enter the protected application shell.
  return <AppShell />;
};

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
