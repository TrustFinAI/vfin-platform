import React from 'react';
import { FinancialHealthScore as FinancialHealthScoreType, ParsedFinancialData } from '../../types';
import { WarningIcon, CheckCircleIcon } from './Icons';

interface FinancialHealthScoreProps {
  scoreData: FinancialHealthScoreType;
  parsedData: ParsedFinancialData;
  totalExpenses: number;
}

const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({ scoreData, parsedData, totalExpenses }) => {
  const { score, rating, strengths, weaknesses } = scoreData;
  const { totalRevenue, netIncome } = parsedData;

  const getRatingStyle = () => {
    switch (rating) {
      case 'Excellent':
      case 'Good':
        return {
          card: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: <CheckCircleIcon className="w-8 h-8 text-green-500" />
        };
      case 'Fair':
        return {
          card: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: <WarningIcon className="w-8 h-8 text-yellow-500" />
        };
      case 'Poor':
        return {
          card: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: <WarningIcon className="w-8 h-8 text-red-500" />
        };
      default:
        return {
          card: 'bg-slate-50 border-slate-200',
          text: 'text-slate-800',
          icon: <WarningIcon className="w-8 h-8 text-slate-500" />
        };
    }
  };
  
  const ratingStyle = getRatingStyle();
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
  const revenueVsExpenses = totalExpenses > 0 ? (totalRevenue / totalExpenses) : 0;

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Financial Health Score</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Score Card */}
        <div className={`p-6 rounded-xl border ${ratingStyle.card} flex flex-col justify-between`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className={`text-sm font-bold uppercase ${ratingStyle.text}`}>Overall Performance</p>
                    <p className={`text-5xl font-bold mt-2 ${ratingStyle.text}`}>{score}<span className="text-3xl opacity-60">/100</span></p>
                    <p className={`text-lg font-semibold mt-1 ${ratingStyle.text}`}>{rating}</p>
                </div>
                {ratingStyle.icon}
            </div>
        </div>

        {/* Sub-metrics */}
        <div className="space-y-4 lg:col-span-2">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-700">Profit Margin</span>
                    <span className="font-bold text-primary">{profitMargin.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2">
                  <div
                    className={`${profitMargin > 10 ? 'bg-green-500' : profitMargin > 0 ? 'bg-yellow-500' : 'bg-red-500'} h-2.5 rounded-full`}
                    style={{ width: `${Math.min(Math.abs(profitMargin) * 4, 100)}%` }}
                  ></div>
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                    <p className="font-semibold text-slate-700 text-sm">Revenue vs Expenses</p>
                    <p className="text-xs text-slate-500">{`$${totalRevenue.toLocaleString()}`} revenue / {`$${totalExpenses.toLocaleString()}`} expenses</p>
                </div>
                <p className="text-xl font-bold text-primary">{revenueVsExpenses.toFixed(2)}x</p>
            </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl md:col-span-2 lg:col-span-3">
             <div className="flex items-center text-blue-800 mb-4">
                <WarningIcon className="w-5 h-5 mr-2"/>
                <h3 className="font-bold">Understanding Your Score</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Key Strengths</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {strengths.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {weaknesses.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialHealthScore;
