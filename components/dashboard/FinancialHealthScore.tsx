import React from 'react';
import { FinancialHealthScore as FinancialHealthScoreType, ParsedFinancialData, FinancialPeriodData } from '../../types';
import { WarningIcon, CheckCircleIcon } from './Icons';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface FinancialHealthScoreProps {
  allPeriodsData: FinancialPeriodData[];
  currentPeriodId: number;
}

const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({ allPeriodsData, currentPeriodId }) => {
  const currentData = allPeriodsData.find(p => p.id === currentPeriodId);
  if (!currentData || !currentData.financialHealthScore) return null;

  const { score, rating, strengths, weaknesses } = currentData.financialHealthScore;
  
  const getRatingStyle = () => {
    switch (rating) {
      case 'Excellent': case 'Good': return { card: 'bg-green-50 border-green-200', text: 'text-green-800', icon: <CheckCircleIcon className="w-8 h-8 text-green-500" /> };
      case 'Fair': return { card: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: <WarningIcon className="w-8 h-8 text-yellow-500" /> };
      case 'Poor': return { card: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <WarningIcon className="w-8 h-8 text-red-500" /> };
      default: return { card: 'bg-slate-50 border-slate-200', text: 'text-slate-800', icon: <WarningIcon className="w-8 h-8 text-slate-500" /> };
    }
  };
  
  const ratingStyle = getRatingStyle();
  
  const chartData = {
    labels: allPeriodsData.map(p => p.periodName),
    datasets: [
      { label: 'Total Revenue', data: allPeriodsData.map(p => p.parsedData.totalRevenue), backgroundColor: '#4285F4' },
      { label: 'Total Expenses', data: allPeriodsData.map(p => (p.parsedData.operatingExpenses ?? 0) + (p.parsedData.costOfGoodsSold ?? 0)), backgroundColor: '#ef4444' },
    ],
  };

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4"><div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div><h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Financial Health Score</h2></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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

        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
            <h3 className="font-bold text-primary mb-2">Revenue vs. Expenses Over Time</h3>
            <div className="h-48">
              <Bar options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} data={chartData} />
            </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl lg:col-span-3">
             <div className="flex items-center text-blue-800 mb-4"><WarningIcon className="w-5 h-5 mr-2"/><h3 className="font-bold">Understanding Your Score</h3></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Key Strengths</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">{strengths.map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
                 <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">{weaknesses.map((item, i) => <li key={i}>{item}</li>)}</ul>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialHealthScore;
