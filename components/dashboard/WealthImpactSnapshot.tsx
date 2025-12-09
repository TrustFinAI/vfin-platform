import React, { useState, useEffect } from 'react';
import { getValuation } from '../../services/vwaService';
import { Landmark, PiggyBank } from './Icons';

const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
};

const WealthImpactSnapshot: React.FC = () => {
  const [valuation, setValuation] = useState<{ businessValue: number, ownerEquity: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchValuation = async () => {
      try {
        const data = await getValuation();
        setValuation(data);
      } catch (error) {
        console.error("Failed to fetch valuation data:", error);
        setValuation(null); // Set to null on error to show placeholder
      } finally {
        setIsLoading(false);
      }
    };
    fetchValuation();
  }, []);
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <>
            <div className="bg-slate-200 h-6 w-24 rounded-md animate-pulse"></div>
            <div className="bg-slate-200 h-4 w-32 rounded-md animate-pulse mt-1"></div>
        </>
      );
    }
    
    if (!valuation) {
        return <p className="text-sm text-slate-500">Valuation data not available.</p>;
    }

    return (
        <>
            <p className="text-3xl font-bold text-primary">{formatCurrency(valuation.businessValue)}</p>
            <p className="text-xs text-slate-500 mt-1">AI-Powered Estimate</p>
        </>
    );
  };
  
  const renderEquityContent = () => {
     if (isLoading) {
      return (
        <>
            <div className="bg-slate-200 h-6 w-24 rounded-md animate-pulse"></div>
            <div className="bg-slate-200 h-4 w-32 rounded-md animate-pulse mt-1"></div>
        </>
      );
    }
    
    if (!valuation || !valuation.ownerEquity) {
        return <p className="text-sm text-slate-500">Equity data not available.</p>;
    }
     return (
        <>
            <p className="text-3xl font-bold text-primary">{formatCurrency(valuation.ownerEquity)}</p>
            <p className="text-xs text-slate-500 mt-1">Based on Ownership Stake</p>
        </>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Wealth Impact Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Landmark className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-700">Estimated Business Value</h3>
                    {renderContent()}
                </div>
            </div>
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <PiggyBank className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-700">Your Available Equity</h3>
                    {renderEquityContent()}
                </div>
            </div>
        </div>
    </div>
  );
};

export default WealthImpactSnapshot;
