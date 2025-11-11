

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FinancialPeriodData, ParsedFinancialData, Kpi, ClientProfile } from '../../types';
import { parseFinancialStatements, getFinancialAnalysis, getFinancialHealthScore } from '../../services/geminiService';
import { User } from '../../App';
import KpiCard from './KpiCard';
import Spinner from '../ui/Spinner';
import Header from './Header';
import AiAnalysis from './AiAnalysis';
import FileUploadArea from './FileUploadArea';
import TopExpenses from './TopExpenses';
import FinancialHealthScore from './FinancialHealthScore';

import Modal from '../ui/Modal';
import Welcome from './Welcome';
import { DollarSign, AlertTriangle, TrendingUp, Landmark, Banknote, Percent, Scale, PiggyBank, Briefcase, ArrowRight, TrendingDown, CashFlowIcon, GrowthIcon, CogIcon } from './Icons';


type Statements = {
  balanceSheet: string;
  incomeStatement: string;
  cashFlow: string;
};

const formatValue = (value: number | undefined, prefix = '', suffix = '') => {
    if (value === undefined || isNaN(value)) return 'N/A';
    return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
};

interface DashboardProps {
    currentUser: User;
    onLogout: () => void;
}

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const savedData = localStorage.getItem(key);
        return savedData ? JSON.parse(savedData) : defaultValue;
    } catch (error) {
        console.error(`Error reading "${key}" from localStorage`, error);
        return defaultValue;
    }
};

type ViewState = 'loading' | 'welcome' | 'upload' | 'dashboard' | 'error';

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout }) => {
  const [allClientsData, setAllClientsData] = useState(() => 
    loadFromLocalStorage<Record<string, Record<string, FinancialPeriodData>>>('allClientsData', {})
  );

  const [allClientsPeriodIds, setAllClientsPeriodIds] = useState(() =>
    loadFromLocalStorage<Record<string, string[]>>('allClientsPeriodIds', {})
  );
  
  const [allClientsProfiles, setAllClientsProfiles] = useState(() => 
    loadFromLocalStorage<Record<string, ClientProfile>>('allClientsProfiles', {})
  );

  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>('loading');
  
  const [loadingText, setLoadingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [periodIdToDelete, setPeriodIdToDelete] = useState<string | null>(null);

  // Initialization effect on mount
  useEffect(() => {
    const userPeriodIds = allClientsPeriodIds[currentUser.companyName] || [];
    const userProfile = allClientsProfiles[currentUser.companyName];

    if (userPeriodIds.length > 0) {
      setCurrentPeriodId(userPeriodIds[userPeriodIds.length - 1]);
      setView('dashboard');
    } else if (userProfile) {
        setView('upload'); // Profile is set, ready to upload first statements
    } else {
      setView('welcome'); // New user, show welcome/profile setup
    }
  }, []); // Empty array ensures this runs only once on mount

  // Effect to save data to localStorage whenever it changes.
  useEffect(() => {
    try {
        localStorage.setItem('allClientsData', JSON.stringify(allClientsData));
        localStorage.setItem('allClientsPeriodIds', JSON.stringify(allClientsPeriodIds));
        localStorage.setItem('allClientsProfiles', JSON.stringify(allClientsProfiles));
    } catch (error) {
        console.error("Error saving data to localStorage", error);
    }
  }, [allClientsData, allClientsPeriodIds, allClientsProfiles]);

  const clientData = useMemo(() => allClientsData[currentUser.companyName] || {}, [allClientsData, currentUser.companyName]);
  const clientPeriodIds = useMemo(() => allClientsPeriodIds[currentUser.companyName] || [], [allClientsPeriodIds, currentUser.companyName]);
  const clientProfile = useMemo(() => allClientsProfiles[currentUser.companyName] || null, [allClientsProfiles, currentUser.companyName]);

  const financialPeriodsForChart = useMemo(() => Object.values(clientData), [clientData]);

  const handleProfileSave = (profile: ClientProfile) => {
    setAllClientsProfiles(prev => ({ ...prev, [currentUser.companyName]: profile }));
    setView('upload');
  };

  const processStatements = useCallback(async (statements: Statements) => {
    setView('loading');
    setError(null);
    
    try {
      setLoadingText("Parsing your statements with AI...");
      const parsedData = await parseFinancialStatements(statements);
      const newPeriodId = parsedData.period.replace(/\s+/g, '-').toLowerCase();

      const tempClientPeriodIds = [...clientPeriodIds.filter(id => id !== newPeriodId), newPeriodId];
      const currentIndex = tempClientPeriodIds.indexOf(newPeriodId);
      const previousPeriodId = currentIndex > 0 ? tempClientPeriodIds[currentIndex - 1] : null;
      const previousData = previousPeriodId ? clientData[previousPeriodId]?.parsedData : null;
      
      const newClientPeriodIds = [...clientPeriodIds.filter(id => id !== newPeriodId), newPeriodId];

      const tempPeriodData: FinancialPeriodData = { id: newPeriodId, parsedData, aiAnalysis: { summary: [], recommendations: ["Generating..."] } };
      
      setAllClientsData(prev => ({ ...prev, [currentUser.companyName]: { ...clientData, [newPeriodId]: tempPeriodData } }));
      setAllClientsPeriodIds(prev => ({ ...prev, [currentUser.companyName]: newClientPeriodIds }));
      setCurrentPeriodId(newPeriodId);

      setLoadingText("Generating financial analysis & health score...");
      
      const [analysis, healthScore] = await Promise.all([
        getFinancialAnalysis(parsedData, previousData, clientProfile),
        getFinancialHealthScore(parsedData, previousData, clientProfile)
      ]);

      setAllClientsData(prev => {
        const updatedPeriodData = { ...prev[currentUser.companyName][newPeriodId], aiAnalysis: analysis, financialHealthScore: healthScore };
        const updatedClientData = { ...prev[currentUser.companyName], [newPeriodId]: updatedPeriodData };
        return { ...prev, [currentUser.companyName]: updatedClientData };
      });
      setView('dashboard');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
      setView('error');
      console.error(err);
    } finally {
      setLoadingText('');
    }
  }, [clientData, clientPeriodIds, currentUser.companyName, clientProfile]);
  
  const handleDeletePeriod = useCallback((periodId: string) => {
    setPeriodIdToDelete(periodId);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!periodIdToDelete) return;

    const updatedClientData = { ...clientData };
    delete updatedClientData[periodIdToDelete];

    const updatedClientPeriodIds = clientPeriodIds.filter(id => id !== periodIdToDelete);
    
    setAllClientsData(prev => ({ ...prev, [currentUser.companyName]: updatedClientData }));
    setAllClientsPeriodIds(prev => ({ ...prev, [currentUser.companyName]: updatedClientPeriodIds }));

    if (currentPeriodId === periodIdToDelete) {
        if (updatedClientPeriodIds.length > 0) {
            setCurrentPeriodId(updatedClientPeriodIds[updatedClientPeriodIds.length - 1]);
            setView('dashboard');
        } else {
            setCurrentPeriodId(null);
            setView(clientProfile ? 'upload' : 'welcome');
        }
    }
    
    setIsDeleteModalOpen(false);
    setPeriodIdToDelete(null);
  }, [periodIdToDelete, clientData, clientPeriodIds, currentUser.companyName, currentPeriodId, clientProfile]);

  const currentPeriodData = useMemo(() => {
    return currentPeriodId ? clientData[currentPeriodId] : null;
  }, [clientData, currentPeriodId]);

  const previousPeriodData = useMemo(() => {
      const currentIndex = clientPeriodIds.indexOf(currentPeriodId!);
      if (currentIndex > 0) {
          const previousId = clientPeriodIds[currentIndex - 1];
          return clientData[previousId]?.parsedData || null;
      }
      return null;
  }, [clientData, clientPeriodIds, currentPeriodId]);

  const kpis = useMemo(() => {
    if (!currentPeriodData) return [];
    const { parsedData } = currentPeriodData;
    const { totalRevenue, netIncome, costOfGoodsSold, totalAssets, equity, currentAssets, currentLiabilities, cashFromOps, interestBearingDebt } = parsedData;

    const grossMargin = totalRevenue > 0 && costOfGoodsSold !== undefined ? ((totalRevenue - costOfGoodsSold) / totalRevenue) * 100 : undefined;
    const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : undefined;
    const returnOnEquity = equity > 0 ? (netIncome / equity) * 100 : undefined;
    const currentRatio = currentLiabilities !== undefined && currentLiabilities > 0 && currentAssets !== undefined ? currentAssets / currentLiabilities : undefined;
    const debtToEquity = equity > 0 && interestBearingDebt !== undefined ? interestBearingDebt / equity : undefined;

    const revenueGrowth = previousPeriodData && previousPeriodData.totalRevenue > 0 ? ((totalRevenue - previousPeriodData.totalRevenue) / previousPeriodData.totalRevenue) * 100 : undefined;
    
    const kpiList: Kpi[] = [
      { label: 'Revenue Growth', value: formatValue(revenueGrowth, '', '%'), description: 'vs. previous period', icon: <GrowthIcon />, color: revenueGrowth === undefined ? 'default' : revenueGrowth > 0 ? 'green' : 'red' },
      { label: 'Net Profit Margin', value: formatValue(netProfitMargin, '', '%'), description: 'Profit per dollar of revenue', icon: <Percent />, color: netProfitMargin === undefined ? 'default' : netProfitMargin > 10 ? 'green' : netProfitMargin > 0 ? 'yellow' : 'red' },
      { label: 'Gross Margin', value: formatValue(grossMargin, '', '%'), description: 'Revenue left after COGS', icon: <CashFlowIcon />, color: grossMargin === undefined ? 'default' : grossMargin > 40 ? 'green' : 'yellow' },
      { label: 'Return on Equity', value: formatValue(returnOnEquity, '', '%'), description: 'Profitability of equity', icon: <TrendingUp />, color: returnOnEquity === undefined ? 'default' : returnOnEquity > 15 ? 'green' : 'yellow' },
      { label: 'Current Ratio', value: formatValue(currentRatio), description: 'Liquidity measure', icon: <Scale />, color: currentRatio === undefined ? 'default' : currentRatio > 2 ? 'green' : currentRatio > 1 ? 'yellow' : 'red' },
      { label: 'Debt-to-Equity', value: formatValue(debtToEquity), description: 'Company leverage', icon: <Landmark />, color: debtToEquity === undefined ? 'default' : debtToEquity < 0.5 ? 'green' : debtToEquity < 1 ? 'yellow' : 'red' },
      { label: 'Cash From Ops', value: formatValue(cashFromOps, '$'), description: 'Core business cash flow', icon: <Banknote />, color: cashFromOps === undefined ? 'default' : cashFromOps > 0 ? 'green' : 'red' },
    ];
    
    return kpiList.filter(kpi => kpi.value !== 'N/A');

  }, [currentPeriodData, previousPeriodData]);

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
              return <div className="flex h-screen items-center justify-center p-4"><Welcome onProfileSave={handleProfileSave} /></div>;
          case 'upload':
              return <div className="flex h-screen items-center justify-center p-4"><FileUploadArea onFilesReady={processStatements} isLoading={loadingText.includes('Parsing')} /></div>;
          case 'dashboard':
              if (!currentPeriodData) {
                  return (
                      <div className="flex h-screen items-center justify-center">
                          <Spinner text="Loading dashboard..." />
                      </div>
                  );
              }
              const { parsedData, aiAnalysis, financialHealthScore } = currentPeriodData;
              const totalExpenses = parsedData.operatingExpenses ? parsedData.operatingExpenses + (parsedData.costOfGoodsSold ?? 0) : (parsedData.costOfGoodsSold ?? 0);
              
              const snapshotKpis = [
                  { label: 'Total Revenue', value: formatValue(parsedData.totalRevenue, '$'), icon: <DollarSign />, color: 'blue' as const, description: 'Total sales generated' },
                  { label: 'Net Income', value: formatValue(parsedData.netIncome, '$'), icon: parsedData.netIncome > 0 ? <TrendingUp /> : <TrendingDown />, color: parsedData.netIncome > 0 ? 'green' as const : 'red' as const, description: 'Profit after all expenses' },
                  { label: 'Total Assets', value: formatValue(parsedData.totalAssets, '$'), icon: <Briefcase />, color: 'default' as const, description: 'What the company owns' },
                  { label: 'Total Liabilities', value: formatValue(parsedData.totalLiabilities, '$'), icon: <AlertTriangle />, color: 'yellow' as const, description: 'What the company owes' },
              ];

              return (
                  <div>
                      <Header
                          onLogout={onLogout}
                          onNewAnalysis={() => setView('upload')}
                          periodOptions={clientPeriodIds.map(id => ({ value: id, label: clientData[id].parsedData.period }))}
                          currentPeriodId={currentPeriodId}
                          setCurrentPeriodId={setCurrentPeriodId}
                          onDeletePeriod={handleDeletePeriod}
                          currentPeriodLabel={currentPeriodData?.parsedData.period}
                          companyName={currentUser.companyName}
                          clientProfile={clientProfile}
                      />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {snapshotKpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="snapshot" />)}
                          </div>
                          <div className="mb-8">
                            <div className="flex items-center mb-4">
                                <div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Key Performance Indicators</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                                {kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="kpi" />)}
                            </div>
                          </div>

                          {financialHealthScore && (
                            <FinancialHealthScore
                              scoreData={financialHealthScore}
                              parsedData={parsedData}
                              totalExpenses={totalExpenses}
                            />
                          )}
                          
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="lg:col-span-2">
                                  <AiAnalysis analysis={aiAnalysis} />
                              </div>
                              <div className="lg:col-span-1">
                                  <TopExpenses expenses={parsedData.topExpenses} totalExpenses={totalExpenses} />
                              </div>
                          </div>
                      </main>
                      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                          <p className="text-gray-600 mb-6">Are you sure you want to permanently delete the financial data for the period "{periodIdToDelete ? clientData[periodIdToDelete]?.parsedData.period : ''}"?</p>
                          <div className="flex justify-end space-x-4">
                              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-md text-white bg-error hover:bg-red-700 transition-colors">Delete</button>
                          </div>
                      </Modal>
                  </div>
              );
          default:
              return <div>Unexpected view state.</div>;
      }
  };

  return <div className="bg-slate-50 min-h-screen">{renderContent()}</div>;
};

export default Dashboard;
