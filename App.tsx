import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthScreen from './components/auth/AuthScreen';
import Dashboard from './components/dashboard/Dashboard';
import PricingPage from './components/pricing/PricingPage';
import AccountPage from './components/account/AccountPage';
import AppShell from './components/layout/AppShell';
import VCFOPage from './components/vcfo/VCFOPage';
import VWAPage from './components/vwa/VWAPage';
import { User } from './types';
import { getMe } from './services/authService';
import Spinner from './components/ui/Spinner';

interface ProtectedLayoutProps {
  currentUser: User | null;
  onLogout: () => void;
}

// This component acts as the layout for all protected routes.
// It checks for authentication and subscription status.
const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ currentUser, onLogout }) => {
  if (!currentUser) {
    // If there's no user, redirect to the login page.
    return <Navigate to="/" replace />;
  }
  if (currentUser.subscriptionStatus !== 'active') {
    // If the user isn't subscribed, redirect to the pricing page.
    return <Navigate to="/pricing" replace />;
  }

  // If the user is authenticated and subscribed, render the main app shell.
  // The <Outlet /> within AppShell will render the specific nested route (e.g., Dashboard).
  return <AppShell currentUser={currentUser} onLogout={onLogout} />;
};


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const user = await getMe();
        setCurrentUser(user);
      } catch (error) {
        console.error("Session check failed:", error);
        localStorage.removeItem('authToken');
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    checkCurrentUser();
  }, [checkCurrentUser]);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);
  
  const handleSubscriptionSuccess = useCallback(() => {
    // Re-fetch user data to get the latest subscription status
    setIsLoading(true);
    checkCurrentUser();
  }, [checkCurrentUser]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken');
    setCurrentUser(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" text="Loading Your Workspace..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans">
      <Routes>
        <Route path="/" element={
          !currentUser ? (
            <AuthScreen onLoginSuccess={handleLoginSuccess} />
          ) : currentUser.subscriptionStatus !== 'active' ? (
            <Navigate to="/pricing" replace />
          ) : (
            <Navigate to="/vcpa" replace />
          )
        }/>
        
        <Route path="/pricing" element={
          !currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <PricingPage onSubscriptionSuccess={handleSubscriptionSuccess} />
          )
        }/>

        {/* This layout route wraps all protected pages using the new component */}
        <Route element={<ProtectedLayout currentUser={currentUser} onLogout={handleLogout} />}>
          <Route path="vcpa" element={<Dashboard currentUser={currentUser!} />} />
          <Route path="vcfo" element={<VCFOPage currentUser={currentUser!} />} />
          <Route path="vwa/*" element={<VWAPage currentUser={currentUser!} />} />
          <Route path="account" element={<AccountPage currentUser={currentUser!} />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
