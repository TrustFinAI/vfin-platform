import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FinancialPeriodData, User, Kpi, ParsedFinancialData } from '../../types';
import { getPeriods, getPeriodData, processNewStatements, deletePeriod, getKpiExplanation } from '../../services/vcpaService';
import KpiCard from './KpiCard';
import Spinner from '../ui/Spinner';
import AiAnalysis from './AiAnalysis';
import FileUploadArea from './FileUploadArea';
import TopExpenses from './TopExpenses';
import FinancialHealthScore from './FinancialHealthScore';
import Modal from '../ui/Modal';
import Welcome from './Welcome';
import { DollarSign, AlertTriangle, TrendingUp, Landmark, Banknote, Percent, Scale, TrendingDown, Briefcase, CashFlowIcon, GrowthIcon, Activity, Zap, Package } from './Icons';
import TrendAnalysis from './TrendAnalysis';
import UpgradeCta from '../ui/UpgradeCta';
import WealthImpactSnapshot from './WealthImpactSnapshot';
import RevenueTrendSparkline from './RevenueTrendSparkline';
import PeriodComparisonModal from './PeriodComparisonModal';

type ViewState = 'loading' | 'welcome' | 'upload' | 'dashboard' | 'error';

const formatValue = (value: number | undefined | null, prefix = '', suffix = '') => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
};

interface DashboardProps {
    currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [allPeriods, setAllPeriods] = useState<Pick<FinancialPeriodData, 'id' | 'periodName'>[]>([]);
  const [allPeriodsData, setAllPeriodsData] = useState<FinancialPeriodData[]>([]);
  const [currentPeriodData, setCurrentPeriodData] = useState<FinancialPeriodData | null>(null);
  const [view, setView] = useState<ViewState>('loading');
  const [loadingText, setLoadingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [periodIdToDelete, setPeriodIdToDelete] = useState<number | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const periods = await getPeriods();
      setAllPeriods(periods);
      if (periods.length > 0) {
        const detailedPeriods = await Promise.all(periods.map(p => getPeriodData(p.id)));
        setAllPeriodsData(detailedPeriods);
        setCurrentPeriodData(detailedPeriods[detailedPeriods.length - 1]);
        setView('dashboard');
      } else if (!currentUser.clientProfile) {
        setView('welcome');
      } else {
        setView('upload');
      }
    } catch (err: any) {
      setError(err.message);
      setView('error');
    }
  }, [currentUser.clientProfile]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleProfileSave = () => {
    // In a real app with better state management, we'd update currentUser globally
    // For now, we just move to the next step
    setView('upload');
  };

  const processStatements = useCallback(async (statements: { balanceSheet: string; incomeStatement: string; cashFlow: string; }) => {
    setView('loading');
    setError(null);
    setLoadingText("Processing your statements with AI...");
    try {
      await processNewStatements(statements);
      setLoadingText("Refreshing data...");
      await fetchInitialData(); 
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
      setView('error');
    } finally {
      setLoadingText('');
    }
  }, [fetchInitialData]);

  const handlePeriodChange = (periodId: number) => {
    const data = allPeriodsData.find(p => p.id === periodId);
    if (data) {
        setCurrentPeriodData(data);
    }
  };
  
  const handleDeletePeriod = (periodId: number) => {
    setPeriodIdToDelete(periodId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!periodIdToDelete) return;
    try {
      await deletePeriod(periodIdToDelete);
      setIsDeleteModalOpen(false);
      setPeriodIdToDelete(null);
      await fetchInitialData();
    } catch (err: any) {
      setError("Failed to delete the period. " + err.message);
    }
  };

  const industryKpis = useMemo(() => {
    if (!currentPeriodData || !currentUser.clientProfile) return [];
    
    const industry = currentUser.clientProfile.industry;
    const { parsedData } = currentPeriodData;
    const industryList: Kpi[] = [];

    if (industry === 'Technology / SaaS') {
        if (parsedData.MRR) {
            industryList.push({ label: 'MRR', value: formatValue(parsedData.MRR, '$'), description: 'Monthly Recurring Revenue', icon: <Activity />, color: 'blue' });
        }
        if (parsedData.CAC) {
            industryList.push({ label: 'CAC', value: formatValue(parsedData.CAC, '$'), description: 'Customer Acquisition Cost', icon: <Zap />, color: 'yellow' });
        }
    } else if (industry === 'Retail / E-commerce') {
        if (parsedData.inventoryTurnover) {
            industryList.push({ label: 'Inventory Turnover', value: formatValue(parsedData.inventoryTurnover), description: 'Times inventory is sold per period', icon: <Package />, color: 'blue' });
        }
    }
    return industryList;

  }, [currentPeriodData, currentUser.clientProfile]);

  const kpis = useMemo(() => {
    if (!currentPeriodData) return [];
    const { parsedData } = currentPeriodData;
    const { totalRevenue, netIncome, costOfGoodsSold, equity, currentAssets, currentLiabilities, cashFromOps, interestBearingDebt } = parsedData;

    const grossMargin = totalRevenue > 0 && costOfGoodsSold !== undefined ? ((totalRevenue - costOfGoodsSold) / totalRevenue) * 100 : undefined;
    const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : undefined;
    const currentRatio = currentLiabilities !== undefined && currentLiabilities > 0 && currentAssets !== undefined ? currentAssets / currentLiabilities : undefined;
    const debtToEquity = equity > 0 && interestBearingDebt !== undefined ? interestBearingDebt / equity : undefined;

    const kpiList: Kpi[] = [
      { label: 'Net Profit Margin', value: formatValue(netProfitMargin, '', '%'), description: 'Profit per dollar of revenue', icon: <Percent />, color: netProfitMargin === undefined ? 'default' : netProfitMargin > 10 ? 'green' : netProfitMargin > 0 ? 'yellow' : 'red' },
      { label: 'Gross Margin', value: formatValue(grossMargin, '', '%'), description: 'Revenue left after COGS', icon: <CashFlowIcon />, color: grossMargin === undefined ? 'default' : grossMargin > 40 ? 'green' : 'yellow' },
      { label: 'Current Ratio', value: formatValue(currentRatio), description: 'Liquidity measure', icon: <Scale />, color: currentRatio === undefined ? 'default' : currentRatio > 2 ? 'green' : currentRatio > 1 ? 'yellow' : 'red' },
      { label: 'Debt-to-Equity', value: formatValue(debtToEquity), description: 'Company leverage', icon: <Landmark />, color: debtToEquity === undefined ? 'default' : debtToEquity < 0.5 ? 'green' : debtToEquity < 1 ? 'yellow' : 'red' },
      { label: 'Cash From Ops', value: formatValue(cashFromOps, '$'), description: 'Core business cash flow', icon: <Banknote />, color: cashFromOps === undefined ? 'default' : cashFromOps > 0 ? 'green' : 'red' },
    ];
    
    return kpiList.filter(kpi => kpi.value !== 'N/A');

  }, [currentPeriodData]);

  const renderContent = () => {
      switch (view) {
          case 'loading':
              return <div className="flex h-screen items-center justify-center"><Spinner size="lg" text={loadingText} /></div>;
          case 'error':
              return (
                  <div className="flex flex-col h-screen items-center justify-center text-center p-4">
                      <AlertTriangle className="w-16 h-16 text-error mb-4" />
                      <h2 className="text-2xl font-bold text-primary mb-2">Analysis Failed</h2>
                      <p className="text-red-600 mb-6 max-w-md">{error}</p>
                      <button onClick={() => setView('upload')} className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent-hover">Try Again</button>
                  </div>
              );
          case 'welcome':
              return <div className="flex h-screen items-center justify-center p-4"><Welcome onProfileSave={handleProfileSave} currentUser={currentUser}/></div>;
          case 'upload':
              return <div className="flex h-screen items-center justify-center p-4"><FileUploadArea onFilesReady={processStatements} isLoading={loadingText.includes('Processing')} /></div>;
          case 'dashboard':
              if (!currentPeriodData) return <div className="flex h-screen items-center justify-center"><Spinner text="Loading dashboard..." /></div>;
              
              const { parsedData, aiAnalysis, financialHealthScore } = currentPeriodData;
              const snapshotKpis: Kpi[] = [
                  { label: 'Total Revenue', value: formatValue(parsedData.totalRevenue, '$'), icon: <DollarSign />, color: 'blue', description: 'Total sales generated' },
                  { label: 'Net Income', value: formatValue(parsedData.netIncome, '$'), icon: parsedData.netIncome > 0 ? <TrendingUp /> : <TrendingDown />, color: parsedData.netIncome > 0 ? 'green' : 'red', description: 'Profit after all expenses' },
                  { label: 'Total Assets', value: formatValue(parsedData.totalAssets, '$'), icon: <Briefcase />, color: 'default', description: 'What the company owns' },
              ];
              const revenueData = allPeriodsData.map(p => ({ period: p.periodName, value: p.parsedData.totalRevenue }));

              return (
                  <div>
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                           <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-primary">vCPA Dashboard</h1>
                                    <p className="text-sm text-slate-500">
                                        Financial Clarity & Health for {currentPeriodData?.periodName}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <select value={currentPeriodData.id} onChange={(e) => handlePeriodChange(Number(e.target.value))} className="block w-48 pl-3 pr-10 py-2 text-base border-slate-300 bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm">
                                          {allPeriods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
                                      </select>
                                      <button onClick={() => handleDeletePeriod(currentPeriodData.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" aria-label="Delete Period">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                    <button onClick={() => setIsCompareModalOpen(true)} disabled={allPeriods.length < 2} className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Compare Periods</button>
                                    <button onClick={() => setView('upload')} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary">Upload New</button>
                                </div>
                            </div>

                          <WealthImpactSnapshot />

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {snapshotKpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="snapshot" getExplanation={getKpiExplanation} />)}
                              <RevenueTrendSparkline data={revenueData} />
                          </div>

                          {(currentUser.subscriptionTier === 'growth' || currentUser.subscriptionTier === 'vcfo' || currentUser.subscriptionTier === 'vwa') ? (
                            <TrendAnalysis allPeriods={allPeriods} />
                          ) : (
                            <UpgradeCta featureName="Historical Trend Analysis" requiredTier="vCPA Growth" />
                          )}

                          <div className="mb-8">
                            <div className="flex items-center mb-4"><div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div><h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Key Performance Indicators</h2></div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                                {kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="kpi" getExplanation={getKpiExplanation}/>)}
                                {industryKpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="kpi" getExplanation={getKpiExplanation}/>)}
                            </div>
                          </div>

                          {financialHealthScore && (
                            <FinancialHealthScore allPeriodsData={allPeriodsData} currentPeriodId={currentPeriodData.id} />
                          )}
                          
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="lg:col-span-2"><AiAnalysis analysis={aiAnalysis} /></div>
                              <div className="lg:col-span-1"><TopExpenses expenses={parsedData.topExpenses} totalExpenses={(parsedData.costOfGoodsSold ?? 0) + (parsedData.operatingExpenses ?? 0)} /></div>
                          </div>
                      </main>
                      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                          <p className="text-gray-600 mb-6">Are you sure you want to permanently delete the financial data for {allPeriods.find(p => p.id === periodIdToDelete)?.periodName}?</p>
                          <div className="flex justify-end space-x-4">
                              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
                              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-md text-white bg-error hover:bg-red-700">Delete</button>
                          </div>
                      </Modal>
                       <PeriodComparisonModal 
                          isOpen={isCompareModalOpen} 
                          onClose={() => setIsCompareModalOpen(false)} 
                          periods={allPeriodsData} 
                        />
                  </div>
              );
          default:
              return <div>Unexpected view state.</div>;
      }
  };

  return <div className="bg-slate-50 min-h-screen">{renderContent()}</div>;
};

export default Dashboard;
