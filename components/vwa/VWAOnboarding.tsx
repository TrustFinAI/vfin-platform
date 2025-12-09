import React, { useState } from 'react';
import { VWAOnboardingData } from '../../types';
import { saveVWAOnboarding } from '../../services/vwaService';
import Spinner from '../ui/Spinner';

interface VWAOnboardingProps {
    onComplete: () => void;
}

const VWAOnboarding: React.FC<VWAOnboardingProps> = ({ onComplete }) => {
    const [data, setData] = useState<VWAOnboardingData>({
        ownershipStake: 100,
        freedomGoal: 'Financial Independence to pursue other passions.',
        targetAge: 55,
        targetNetWorth: 5000000,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await saveVWAOnboarding(data);
            onComplete();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: name === 'freedomGoal' ? value : Number(value) }));
    };

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">Define Your Freedom</h1>
                    <p className="mt-2 text-slate-600">Let's set your personal goals. This helps us connect your business strategy to what matters most to you.</p>
                </div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="ownershipStake" className="block text-sm font-medium text-gray-700">What percentage of the business do you own?</label>
                        <input type="number" name="ownershipStake" id="ownershipStake" value={data.ownershipStake} onChange={handleInputChange} min="0" max="100" className="mt-1 block w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="freedomGoal" className="block text-sm font-medium text-gray-700">Describe your primary long-term goal (e.g., retirement, starting a new venture, etc.)</label>
                        <textarea name="freedomGoal" id="freedomGoal" value={data.freedomGoal} onChange={handleInputChange} rows={3} className="mt-1 block w-full p-2 border rounded-md"></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="targetAge" className="block text-sm font-medium text-gray-700">Target Age</label>
                            <input type="number" name="targetAge" id="targetAge" value={data.targetAge} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="targetNetWorth" className="block text-sm font-medium text-gray-700">Target Net Worth</label>
                            <input type="number" name="targetNetWorth" id="targetNetWorth" value={data.targetNetWorth} onChange={handleInputChange} className="mt-1 block w-full p-2 border rounded-md" />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-accent text-white font-bold rounded-md hover:bg-accent-hover transition-colors disabled:bg-slate-400">
                        {isLoading ? <Spinner size="sm" /> : "Save Goals & Start"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VWAOnboarding;
