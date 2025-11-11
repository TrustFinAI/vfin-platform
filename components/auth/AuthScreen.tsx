import React, { useState, FormEvent } from 'react';
import { User } from '../../App';
import OfficialLogo from '../dashboard/OfficialLogo';

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const savedData = localStorage.getItem(key);
        return savedData ? JSON.parse(savedData) : defaultValue;
    } catch (error) {
        console.error(`Error reading "${key}" from localStorage`, error);
        return defaultValue;
    }
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing "${key}" to localStorage`, error);
    }
};

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const companyName = (formData.get('companyName') as string || email.split('@')[0]).trim();
    const password = formData.get('password') as string;

    const allUsers = loadFromLocalStorage<Record<string, User>>('allUsers', {});

    if (isLogin) {
        // Login Logic
        const user = allUsers[email];
        if (user) {
            // In a real app, you would verify the password here.
            onLoginSuccess(user);
        } else {
            setError("No account found with that email. Please register.");
        }
    } else {
        // Registration Logic
        if (allUsers[email]) {
            setError("An account with this email already exists. Please sign in.");
            return;
        }

        const existingCompany = Object.values(allUsers).find(user => user.companyName.toLowerCase() === companyName.toLowerCase());
        if (existingCompany) {
            setError(`An account for "${companyName}" already exists. Please choose a different company name or sign in.`);
            return;
        }
        
        // In a real app, password would be hashed before saving.
        const newUser: User = { email, companyName };
        const updatedUsers = { ...allUsers, [email]: newUser };
        saveToLocalStorage('allUsers', updatedUsers);
        
        onLoginSuccess(newUser);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg animate-fade-in">
        <div className="text-center space-y-4">
           <OfficialLogo className="w-16 h-16 mx-auto mb-4" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Welcome to VFIN</h1>
            <p className="mt-1 text-sm text-gray-500">Financial intelligence for your business.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`w-full p-2 text-sm font-semibold rounded-md transition-all duration-300 ${isLogin ? 'bg-accent text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
            aria-pressed={isLogin}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`w-full p-2 text-sm font-semibold rounded-md transition-all duration-300 ${!isLogin ? 'bg-accent text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
            aria-pressed={!isLogin}
          >
            Register
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
             <div className="space-y-4">
                <input id="company-name" name="companyName" type="text" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Company Name" aria-label="Company Name" />
                <input id="phone-number" name="phoneNumber" type="tel" className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Phone Number (Optional)" aria-label="Phone Number" />
            </div>
          )}
          <div className="space-y-4">
            <input id="email-address" name="email" type="email" autoComplete="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Email address" aria-label="Email address" />
            <input id="password" name="password" type="password" autoComplete="current-password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm" placeholder="Password" aria-label="Password" />
          </div>

          {!isLogin && (
            <div className="relative flex items-start">
              <div className="flex h-5 items-center">
                <input id="two-factor" aria-describedby="two-factor-description" name="two-factor" type="checkbox" disabled className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent cursor-not-allowed" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="two-factor" className="font-medium text-gray-500">Enable Two-Factor Authentication</label>
                <p id="two-factor-description" className="text-xs text-gray-400">Coming soon for enhanced security.</p>
              </div>
            </div>
          )}

           {isLogin && (
            <div className="flex items-center justify-end text-xs">
                <a href="#" className="font-medium text-gray-500 hover:text-primary transition-colors">
                    Forgot your password?
                </a>
            </div>
           )}
          
          {error && <p className="text-xs text-center font-semibold text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}

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
