

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
            // If profile exists, go to upload, otherwise back to welcome
            setView(clientProfile ? 'upload' : 'welcome');
        }
    }
    
    setIsDeleteModalOpen(false);
    setPeriodIdToDelete(null);
  }, [periodIdToDelete, clientData, clientPeriodIds, currentPeriodId, currentUser.companyName, clientProfile]);

  const currentData = useMemo(() => {
    if (!currentPeriodId) return null;
    return clientData[currentPeriodId] ?? null;
  }, [currentPeriodId, clientData]);

  const previousData = useMemo(() => {
    if (!currentPeriodId || clientPeriodIds.length < 2) return null;
    const currentIndex = clientPeriodIds.indexOf(currentPeriodId);
    if (currentIndex > 0) {
      const previousPeriodId = clientPeriodIds[currentIndex - 1];
      return clientData[previousPeriodId]?.parsedData || null;
    }
    return null;
  }, [currentPeriodId, clientPeriodIds, clientData]);

  const totalExpenses = useMemo(() => {
    if (!currentData) return 0;
    const { costOfGoodsSold, operatingExpenses } = currentData.parsedData;
    return (costOfGoodsSold || 0) + (operatingExpenses || 0);
  }, [currentData]);

  const snapshotKpis = useMemo((): Kpi[] => {
    if (!currentData) return [];
    const data = currentData.parsedData;
    const { totalRevenue, netIncome, totalLiabilities, cashAndEquivalents, cashFromOps, interestBearingDebt } = data;
    
    const useInterestBearingDebt = interestBearingDebt !== undefined && interestBearingDebt > 0;
    const debtToDisplay = useInterestBearingDebt ? interestBearingDebt : totalLiabilities;
    const debtDescription = useInterestBearingDebt ? 'Interest-bearing loans & notes' : 'Total short & long-term liabilities';

    return [
      { 
        label: 'Total Revenue', 
        value: formatValue(totalRevenue, '$'), 
        description: 'Sales & Income', 
        color: 'green', 
        icon: <DollarSign />,
        modalExplanation: "This is the total amount of money your business generated from sales of its products or services before any expenses are deducted. It's the 'top line' number that shows the overall sales activity and market demand for what you offer."
      },
      { 
        label: 'Total Expenses', 
        value: formatValue(totalExpenses, '$'), 
        description: 'Total costs (incl. COGS)', 
        color: 'yellow', 
        icon: <AlertTriangle />,
        modalExplanation: "This represents the total cost of running your business during the period. It includes everything from the cost of goods sold (COGS) to operating expenses like rent, salaries, marketing, and utilities. Monitoring this helps you understand your cost structure."
      },
      { 
        label: 'Net Income', 
        value: formatValue(netIncome, '$'), 
        description: `${totalRevenue > 0 ? ((netIncome/totalRevenue)*100).toFixed(1) : 0}% profit margin`, 
        color: 'blue', 
        icon: <TrendingUp />,
        modalExplanation: "Often called the 'bottom line,' this is the profit that remains after all expenses, including costs, operating expenses, interest, and taxes, have been subtracted from your total revenue. It's the clearest indicator of your business's overall profitability."
      },
      { 
        label: 'Operating Cash Flow', 
        value: formatValue(cashFromOps, '$'), 
        description: 'Cash from core operations', 
        color: 'blue', 
        icon: <CashFlowIcon />,
        modalExplanation: "This is the cash generated by your company's normal day-to-day business operations. It's a crucial measure of your ability to generate cash to maintain and grow your operations, and it can be more important than Net Income for understanding your short-term financial health."
      },
      { 
        label: 'Cash Balance', 
        value: formatValue(cashAndEquivalents, '$'), 
        description: 'Available now', 
        color: 'green', 
        icon: <Banknote />,
        modalExplanation: "This is the total amount of cash your company has on hand at the end of the period, including cash in the bank and any other highly liquid assets. This figure is critical for assessing your ability to pay immediate expenses like payroll and rent."
      },
      { 
        label: 'Total Debt', 
        value: formatValue(debtToDisplay, '$'), 
        description: debtDescription, 
        color: 'red', 
        icon: <Landmark />,
        modalExplanation: "This tile shows the amount of money your business has borrowed. It prioritizes showing your interest-bearing debt (like loans). If that isn't present, it will show your Total Liabilities. Understanding this helps you assess your financial risk and leverage."
      },
    ];
  }, [currentData, totalExpenses]);

  const performanceKpis = useMemo((): Kpi[] => {
    if (!currentData) return [];
    const data = currentData.parsedData;
    const { totalRevenue, netIncome, costOfGoodsSold, operatingExpenses, currentAssets, currentLiabilities, totalLiabilities, equity, accountsReceivable, accountsPayable, interestBearingDebt } = data;
    const kpis: Kpi[] = [];

    if (previousData && previousData.totalRevenue > 0) {
        const value = ((totalRevenue - previousData.totalRevenue) / previousData.totalRevenue) * 100;
        kpis.push({ label: 'Revenue Growth', value: value.toFixed(1), unit: '%', description: 'Vs. previous period', color: value >= 0 ? 'green' : 'red', icon: <GrowthIcon /> });
    }

    if (totalRevenue > 0) {
      const value = (netIncome / totalRevenue) * 100;
      kpis.push({ label: 'Net Profit Margin', value: value.toFixed(1), unit: '%', description: 'Net income as % of revenue', color: value > 10 ? 'green' : (value > 0 ? 'yellow' : 'red'), icon: <Percent /> });
    }

    if (totalRevenue > 0 && costOfGoodsSold !== undefined) {
        const value = ((totalRevenue - costOfGoodsSold) / totalRevenue) * 100;
        kpis.push({ label: 'Gross Profit Margin', value: value.toFixed(1), unit: '%', description: costOfGoodsSold > 0 ? 'Gross profit as % of revenue' : 'No COGS (service business)', color: value > 50 ? 'green' : (value > 20 ? 'yellow' : 'red'), icon: <TrendingUp /> });
    }
    
    if (totalRevenue > 0 && costOfGoodsSold !== undefined && operatingExpenses !== undefined) {
        const opIncome = totalRevenue - costOfGoodsSold - operatingExpenses;
        const value = (opIncome / totalRevenue) * 100;
        kpis.push({ label: 'Operating Margin', value: value.toFixed(1), unit: '%', description: 'Operational profit as % of revenue', color: value > 15 ? 'green' : (value > 5 ? 'yellow' : 'red'), icon: <CogIcon /> });
    }
    
    if (currentAssets && currentLiabilities && currentLiabilities > 0) {
      const value = currentAssets / currentLiabilities;
      kpis.push({ label: 'Short-Term Health', value: value.toFixed(2), description: 'Current assets / current liabilities', color: value > 2 ? 'green' : (value > 1 ? 'yellow' : 'red'), icon: <Scale /> });
    }

    if (equity && equity !== 0) {
      const useInterestBearingDebt = interestBearingDebt !== undefined && interestBearingDebt > 0;
      const debtForRatio = useInterestBearingDebt ? interestBearingDebt : totalLiabilities;
      const debtDescForRatio = useInterestBearingDebt ? 'Interest-bearing debt vs equity' : 'Total liabilities vs equity';
      const value = debtForRatio / equity;
      kpis.push({ label: 'Financial Leverage', value: value.toFixed(2), description: debtDescForRatio, color: value < 0.5 ? 'green' : (value < 1 ? 'yellow' : 'red'), icon: <Briefcase /> });
    }

    if (equity && equity !== 0) {
      const value = (netIncome / equity) * 100;
      kpis.push({ label: 'Investment Efficiency', value: value.toFixed(1), unit: '%', description: 'Net income vs total equity', color: value > 15 ? 'green' : (value > 5 ? 'yellow' : 'red'), icon: <PiggyBank /> });
    }

    if (accountsReceivable !== undefined) {
      kpis.push({ label: 'Money Owed to You', value: formatValue(accountsReceivable, '$'), description: '(Accounts Receivable)', color: 'blue', icon: <ArrowRight /> });
    }
    if (accountsPayable !== undefined) {
      kpis.push({ label: 'Money You Owe', value: formatValue(accountsPayable, '$'), description: '(Accounts Payable)', color: 'yellow', icon: <TrendingDown /> });
    }

    return kpis;
  }, [currentData, previousData]);

  const handleNewAnalysis = useCallback(() => {
    setView('upload');
  }, []);

  const periodOptions = useMemo(() => {
      return clientPeriodIds.map(id => ({
          value: id,
          label: clientData[id]?.parsedData?.period || id,
      }));
  }, [clientPeriodIds, clientData]);
  
  const handlePeriodChange = (id: string) => {
    setCurrentPeriodId(id);
    setView('dashboard');
  };
  
  const renderContent = () => {
    switch(view) {
        case 'loading':
            return (
                <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg shadow">
                    <Spinner text={loadingText || "Loading your dashboard..."} size="lg" />
                    {loadingText && <p className="mt-4 text-gray-500 text-center max-w-md">Our AI is working hard to give you the best financial insights. Thanks for your patience!</p>}
                </div>
            );
        case 'error':
             return (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mb-6" role="alert">
                    <p className="font-bold">Analysis Error</p>
                    <p>{error}</p>
                    <button onClick={() => setView('upload')} className="mt-2 text-sm font-semibold text-red-800 hover:underline">Try a new analysis</button>
                </div>
            );
        case 'welcome':
            return <Welcome onProfileSave={handleProfileSave} />;
        case 'upload':
            return <FileUploadArea onFilesReady={processStatements} isLoading={false} />;
        case 'dashboard':
            if (!currentData) {
                // This is a fallback, should be handled by 'welcome' state
                return <Welcome onProfileSave={handleProfileSave} />;
            }
            return (
                <div className="animate-fade-in space-y-8">
                    {currentData.financialHealthScore ? (
                        <FinancialHealthScore 
                            scoreData={currentData.financialHealthScore}
                            parsedData={currentData.parsedData}
                            totalExpenses={totalExpenses}
                        />
                    ) : (
                        <div className="bg-white p-6 rounded-lg shadow-md text-center">
                            <Spinner text="Calculating Financial Health Score..." />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center mb-4">
                            <div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Snapshot Financial Data</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                            {snapshotKpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="snapshot" />)}
                        </div>
                    </div>
                    <div>
                         <div className="flex items-center mb-4">
                            <div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Key Performance Indicators (KPIs)</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                             {performanceKpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} variant="kpi" />)}
                        </div>
                    </div>
                    <div>
                      <div className="flex items-center mb-4">
                          <div className="w-2 h-2 bg-slate-400 rounded-full mr-3"></div>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">CPA ANALYSIS & INSIGHTS</h2>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                          <div className="lg:col-span-3">
                              <AiAnalysis analysis={currentData.aiAnalysis} />
                          </div>
                          <div className="lg:col-span-2">
                              <TopExpenses expenses={currentData.parsedData.topExpenses} totalExpenses={totalExpenses} />
                          </div>
                      </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onLogout={onLogout}
        onNewAnalysis={handleNewAnalysis}
        periodOptions={periodOptions}
        currentPeriodId={currentPeriodId}
        setCurrentPeriodId={handlePeriodChange}
        onDeletePeriod={handleDeletePeriod}
        currentPeriodLabel={currentData?.parsedData.period}
        companyName={currentUser.companyName}
      />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderContent()}
      </main>
       <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Period Deletion"
        >
          <div>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete the period 
              <span className="font-semibold"> "{periodIdToDelete ? clientData[periodIdToDelete]?.parsedData.period : ''}"</span>?
              <br/>
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-error hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default Dashboard;
