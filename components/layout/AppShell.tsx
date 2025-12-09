import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { User } from '../../types';
import OfficialLogo from '../dashboard/OfficialLogo';

interface AppShellProps {
    currentUser: User;
    onLogout: () => void;
}

const AppShell: React.FC<AppShellProps> = ({ currentUser, onLogout }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
        }`;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <Link to="/vcpa" className="flex-shrink-0 flex items-center space-x-3">
                                <OfficialLogo className="w-10 h-10" />
                                {currentUser.companyLogoUrl && (
                                  <>
                                    <div className="h-6 w-px bg-slate-200"></div>
                                    <img src={currentUser.companyLogoUrl} alt={`${currentUser.companyName} logo`} className="h-8 max-w-24 object-contain" />
                                  </>
                                )}
                            </Link>
                            <nav className="hidden md:flex items-center space-x-4">
                                <NavLink to="/vcpa" className={navLinkClasses}>vCPA Dashboard</NavLink>
                                <NavLink to="/vcfo" className={navLinkClasses}>vCFO Strategy</NavLink>
                                <NavLink to="/vwa" className={navLinkClasses}>VWA Wealth</NavLink>
                            </nav>
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center space-x-2 p-2 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                <div className="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {currentUser.companyName.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:inline text-sm font-medium text-slate-700">{currentUser.companyName}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {dropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in" style={{animationDuration: '150ms'}}>
                                    <div className="py-1">
                                        <div className="px-4 py-2 border-b">
                                            <p className="text-sm font-semibold text-primary truncate">{currentUser.companyName}</p>
                                            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                                        </div>
                                        <Link
                                            to="/account"
                                            onClick={() => setDropdownOpen(false)}
                                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left"
                                        >
                                            Account & Billing
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setDropdownOpen(false);
                                                onLogout();
                                            }}
                                            className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                        >
                                            Log Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default AppShell;
