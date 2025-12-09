import React, { useState } from 'react';
import { User } from '../../types';
import { createPortalSession } from '../../services/subscriptionService';
import Spinner from '../ui/Spinner';

interface AccountPageProps {
  currentUser: User;
}

const AccountPage: React.FC<AccountPageProps> = ({ currentUser }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };
  
  const getPlanName = (tier: string) => {
      const names: Record<string, string> = {
          starter: 'vCPA Starter',
          growth: 'vCPA Growth',
          vcfo: 'vCFO',
          vwa: 'VWA (Virtual Wealth Advisor)',
          free: 'Free Plan'
      };
      return names[tier] || 'Unknown Plan';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-primary">Account Settings</h1>
          <p className="text-slate-500 mt-1">Manage your subscription and billing information.</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-primary mb-6">Subscription Details</h2>
          
          <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Current Plan</span>
                  <span className="text-sm font-bold text-primary">{getPlanName(currentUser.subscriptionTier)}</span>
              </div>
              <div className="flex justify-between items-center p-4 border rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Status</span>
                  <span className={`text-sm font-bold capitalize px-2 py-1 rounded-full ${currentUser.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {currentUser.subscriptionStatus.replace('_', ' ')}
                  </span>
              </div>
          </div>

          <div className="mt-8 border-t pt-6">
              <button
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                  {isLoading ? <Spinner size="sm" /> : 'Manage Subscription & Billing'}
              </button>
              <p className="text-xs text-slate-500 mt-3">
                  You will be securely redirected to our payment partner, Stripe, to manage your subscription.
              </p>
               {error && (
                <div className="mt-4 text-sm font-medium text-red-600 bg-red-100 p-3 rounded-md">
                    {error}
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default AccountPage;
