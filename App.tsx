
import React, { useState, useCallback } from 'react';
import AuthScreen from './components/auth/AuthScreen';
import Dashboard from './components/dashboard/Dashboard';

export interface User {
  companyName: string;
  email: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      {currentUser ? (
        <Dashboard currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
