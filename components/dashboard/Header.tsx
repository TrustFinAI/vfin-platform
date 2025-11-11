
import React from 'react';
import OfficialLogo from './OfficialLogo';
import { ClientProfile } from '../../types';

interface HeaderProps {
    onLogout: () => void;
    onNewAnalysis: () => void;
    periodOptions: { value: string, label: string }[];
    currentPeriodId: string | null;
    setCurrentPeriodId: (id: string) => void;
    onDeletePeriod: (id: string) => void;
    currentPeriodLabel?: string;
    companyName: string;
    clientProfile: ClientProfile | null;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onNewAnalysis, periodOptions, currentPeriodId, setCurrentPeriodId, onDeletePeriod, currentPeriodLabel, companyName, clientProfile }) => {

    const logoUrl = clientProfile?.companyLogoUrl;

    return (
        <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {logoUrl ? (
                            <img src={logoUrl} alt={`${companyName} Logo`} className="w-12 h-12 mr-4 rounded-md object-contain" />
                        ) : (
                            <OfficialLogo className="w-12 h-12 mr-4" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-primary">VFIN Dashboard</h1>
                            {currentPeriodLabel ? 
                                <p className="text-sm text-slate-500">{currentPeriodLabel}</p>
                                : <p className="text-sm text-slate-500">{companyName}</p>
                            }
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onNewAnalysis}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload New Period
                        </button>
                         <button onClick={onLogout} title="Log Out" className="group relative text-slate-500 hover:text-primary transition-colors p-2 rounded-full hover:bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-auto min-w-max p-2 text-xs text-white bg-slate-700 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                Log Out
                            </span>
                        </button>
                    </div>
                </div>
                 {currentPeriodId && (
                    <div className="flex items-center justify-start border-t border-slate-200 pt-4">
                        <div className="flex items-center space-x-4">
                            <label className="text-xs font-bold text-slate-500 uppercase">Viewing Period</label>
                             <select
                                value={currentPeriodId ?? ''}
                                onChange={(e) => setCurrentPeriodId(e.target.value)}
                                className="block w-72 pl-3 pr-10 py-2 text-base border-slate-300 bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm disabled:bg-slate-100"
                                disabled={periodOptions.length <= 1}
                                >
                                {periodOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                             <button 
                                onClick={() => onDeletePeriod(currentPeriodId)}
                                className="group relative p-2 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                              >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-auto min-w-max p-2 text-xs text-white bg-slate-700 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    Delete this period
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
