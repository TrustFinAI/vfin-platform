import React, { useState, useEffect } from 'react';
import { runOptimizer, getVWAData } from '../../services/vwaService';
import { OptimizerResult } from '../../types';
import Spinner from '../ui/Spinner';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const DrawSalaryOptimizer: React.FC = () => {
    const [salary, setSalary] = useState(80000);
    const [distribution, setDistribution] = useState(50000);
    const [cashFromOps, setCashFromOps] = useState(200000); // This would be fetched
    const [result, setResult] = useState<OptimizerResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // In a real app, we'd fetch the latest cash from ops data
        // For now, we use a default.
    }, []);

    const handleOptimize = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await runOptimizer(salary, distribution, cashFromOps);
            setResult(res);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getImpactColor = (impact: 'Safe' | 'Caution' | 'Risky') => {
        if (impact === 'Safe') return 'text-green-600';
        if (impact === 'Caution') return 'text-yellow-600';
        return 'text-red-600';
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="font-bold text-primary mb-4">Set Your Compensation</h3>
                <div className="space-y-6">
                    <div>
                        <label className="flex justify-between text-sm font-medium text-slate-600">
                            <span>Annual Salary</span>
                            <span className="font-bold text-primary">{formatCurrency(salary)}</span>
                        </label>
                        <input type="range" min="0" max="250000" step="5000" value={salary} onChange={e => setSalary(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                     <div>
                        <label className="flex justify-between text-sm font-medium text-slate-600">
                            <span>Annual Distributions</span>
                             <span className="font-bold text-primary">{formatCurrency(distribution)}</span>
                        </label>
                        <input type="range" min="0" max="250000" step="5000" value={distribution} onChange={e => setDistribution(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <button onClick={handleOptimize} disabled={isLoading} className="w-full py-3 bg-accent text-white font-bold rounded-md hover:bg-accent-hover transition-colors disabled:bg-slate-400">
                        {isLoading ? <Spinner size="sm" /> : "Run AI Optimization"}
                    </button>
                     {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                </div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                 <h3 className="font-bold text-primary mb-4">AI-Powered Analysis</h3>
                 {result ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm text-slate-500">Est. Take-Home Pay</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(result.takeHomePay)}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm text-slate-500">Total Tax Burden</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(result.totalTaxBurden)}</p>
                            </div>
                             <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm text-slate-500">Business Cash Impact</p>
                                <p className={`text-2xl font-bold ${getImpactColor(result.businessCashImpact)}`}>{result.businessCashImpact}</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start">
                            <span className="text-2xl mr-3">💡</span>
                            <div>
                                <h4 className="font-bold">AI Coach Advice</h4>
                                <p className="text-sm">{result.coachAdvice}</p>
                            </div>
                        </div>
                    </div>
                 ) : (
                    <div className="text-center flex flex-col justify-center items-center h-full">
                        <p className="text-slate-500">Adjust the sliders and run the AI optimization to see your results.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default DrawSalaryOptimizer;
