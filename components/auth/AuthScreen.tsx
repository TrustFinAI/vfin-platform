import React, { useState, FormEvent } from 'react';
import { User } from '../../App';
import OfficialLogo from '../dashboard/OfficialLogo';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    // For this app, we'll use a sanitized company name as a unique client key.
    // In a real app, this would be a unique ID from the backend.
    const companyName = formData.get('companyName') as string || email.split('@')[0];
    
    onLoginSuccess({ email, companyName });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg animate-fade-in">
        <div className="text-center space-y-4">
           <OfficialLogo className="w-16 h-16 mx-auto mb-4" />
          <div>
            <h1 className="text-2xl font-bold text-primary">CPA Financial Health Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Your virtual partner in financial clarity.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setIsLogin(true)}
            className={`w-full p-2 text-sm font-semibold rounded-md transition-all duration-300 ${isLogin ? 'bg-accent text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`w-full p-2 text-sm font-semibold rounded-md transition-all duration-300 ${!isLogin ? 'bg-accent text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
          >
            Register
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
             <div className="space-y-4">
                <input id="company-name" name="companyName" type="text" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Company Name" />
                <input id="phone-number" name="phoneNumber" type="tel" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Phone Number" />
            </div>
          )}
          <div className="space-y-4">
            <input id="email-address" name="email" type="email" autoComplete="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Email address" />
            <input id="password" name="password" type="password" autoComplete="current-password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Password" />
          </div>

           {isLogin && (
            <div className="flex items-center justify-end text-xs">
                <a href="#" className="font-medium text-gray-500 hover:text-primary transition-colors">
                    Forgot your password?
                </a>
            </div>
           )}

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-300">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
      <footer className="text-center mt-8">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} NWTFI. All Rights Reserved.
          </p>
      </footer>
    </div>
  );
};

export default AuthScreen;
