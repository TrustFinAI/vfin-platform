import React from 'react';
import { VWAData } from '../../types';
import WealthGapChart from './WealthGapChart';
import { Landmark, Briefcase, Banknote } from '../dashboard/Icons';

interface SynthesisDashboardProps {
    data: VWAData;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const SynthesisDashboard: React.FC<SynthesisDashboardProps> = ({ data }) => {
    const totalExternalAssets = data.externalAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalNetWorth = data.ownerEquity + totalExternalAssets;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="font-bold text-primary mb-2">Net Worth Summary</h3>
                        <p className="text-4xl font-extrabold text-primary">{formatCurrency(totalNetWorth)}</p>
                        <p className="text-sm text-slate-500">Your total calculated wealth.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="font-bold text-primary mb-2">Freedom Goal</h3>
                        <p className="text-4xl font-extrabold text-accent">{formatCurrency(data.targetNetWorth)}</p>
                        <p className="text-sm text-slate-500">Your target for age {data.targetAge}.</p>
                    </div>
                    <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="font-bold text-primary mb-4">Asset Breakdown</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Landmark className="w-5 h-5 mr-3 text-blue-500" />
                                    <span className="font-semibold">Owner Equity in Business</span>
                                </div>
                                <span className="font-bold">{formatCurrency(data.ownerEquity)}</span>
                            </div>
                            {data.externalAccounts.map(acc => (
                               <div key={acc.name} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        {acc.type === 'Investment' ? <Briefcase className="w-5 h-5 mr-3 text-green-500" /> : <Banknote className="w-5 h-5 mr-3 text-yellow-500" />}
                                        <span className="font-semibold">{acc.name}</span>
                                    </div>
                                    <span className="font-bold">{formatCurrency(acc.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
                <h3 className="font-bold text-primary mb-4 text-center">Progress to Freedom Goal</h3>
                <WealthGapChart currentNetWorth={totalNetWorth} targetNetWorth={data.targetNetWorth} />
            </div>
        </div>
    );
};

export default SynthesisDashboard;
