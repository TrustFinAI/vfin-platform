import React, { useState, useEffect, useCallback } from 'react';
import { VWAData, User } from '../../types';
import { getVWAData } from '../../services/vwaService';
import Spinner from '../ui/Spinner';
import UpgradeCta from '../ui/UpgradeCta';
import VWAOnboarding from './VWAOnboarding';
import SynthesisDashboard from './SynthesisDashboard';
import DrawSalaryOptimizer from './DrawSalaryOptimizer';
import FreedomPlanner from './FreedomPlanner';

interface VWAPageProps {
    currentUser: User;
}

const VWAPage: React.FC<VWAPageProps> = ({ currentUser }) => {
    const [vwaData, setVwaData] = useState<VWAData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'loading' | 'onboarding' | 'dashboard'>('loading');
    const [activeTab, setActiveTab] = useState('synthesis');

    const fetchVwaData = useCallback(async () => {
        try {
            const data = await getVWAData();
            setVwaData(data);
            setView('dashboard');
        } catch (err: any) {
            if (err.message.includes('not set up')) {
                setView('onboarding');
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser.subscriptionTier === 'vwa') {
            fetchVwaData();
        } else {
            setIsLoading(false);
        }
    }, [currentUser, fetchVwaData]);

    const handleOnboardingComplete = () => {
        setIsLoading(true);
        fetchVwaData();
    };

    if (currentUser.subscriptionTier !== 'vwa') {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4">
                <UpgradeCta featureName="The Virtual Wealth Advisor" requiredTier="VWA" />
            </div>
        );
    }
    
    if (isLoading || view === 'loading') {
        return <div className="flex h-96 items-center justify-center"><Spinner size="lg" text="Loading Your Wealth Dashboard..." /></div>;
    }
    
    if (view === 'onboarding') {
        return <VWAOnboarding onComplete={handleOnboardingComplete} />;
    }

    if (view === 'dashboard' && vwaData) {
         return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8 border-b border-slate-200 pb-4">
                    <h1 className="text-3xl font-bold text-primary">Virtual Wealth Advisor</h1>
                    <p className="text-slate-500 mt-1">Connecting your business performance to your personal financial freedom.</p>
                </div>

                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button onClick={() => setActiveTab('synthesis')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'synthesis' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Synthesis Dashboard
                        </button>
                        <button onClick={() => setActiveTab('optimizer')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'optimizer' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Draw & Salary Optimizer
                        </button>
                         <button onClick={() => setActiveTab('planner')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'planner' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Freedom Planner
                        </button>
                    </nav>
                </div>
                
                <div>
                    {activeTab === 'synthesis' && <SynthesisDashboard data={vwaData} />}
                    {activeTab === 'optimizer' && <DrawSalaryOptimizer />}
                    {activeTab === 'planner' && <FreedomPlanner vwaData={vwaData} />}
                </div>

            </div>
        );
    }
    
    if(error) {
        return <div className="text-center text-red-500 py-12">{error}</div>
    }
    
    return <div>Unexpected error loading VWA module.</div>;
};

export default VWAPage;
