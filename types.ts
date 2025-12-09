import type { ReactElement, SVGProps } from 'react';

export interface User {
  companyName: string;
  email: string;
  subscriptionTier: 'free' | 'starter' | 'growth' | 'vcfo' | 'vwa';
  subscriptionStatus: 'active' | 'canceled' | 'incomplete' | 'free' | 'past_due';
  companyLogoUrl?: string | null;
  clientProfile?: ClientProfile | null;
}

export interface Product {
  name: string;
  description: string;
  tier_name: string;
  stripe_price_id: string;
}

export interface Kpi {
  label: string;
  value: string;
  unit?: '%' | '$';
  description?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'default';
  icon: ReactElement<SVGProps<SVGSVGElement>>;
  modalExplanation?: string; // For fixed explanations, no AI call
}

export interface ExpenseItem {
  name: string;
  amount: number;
}

export interface FinancialHealthScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  strengths: string[];
  weaknesses: string[];
}

export interface ClientProfile {
  industry: string;
  businessModel: 'B2B' | 'B2C' | 'D2C' | 'Hybrid';
  primaryGoal: 'Aggressive Growth' | 'Maximize Profitability' | 'Maintain Stability';
}

export interface ParsedFinancialData {
  period: string;
  totalRevenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  interestBearingDebt?: number;
  creditCardDebt?: number;
  cashFromOps: number;
  equity: number;
  costOfGoodsSold?: number;
  operatingExpenses?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  cashAndEquivalents?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  topExpenses?: ExpenseItem[];
  // Industry-specific KPIs
  MRR?: number; // SaaS
  CAC?: number; // SaaS
  inventory?: number; // Retail
  inventoryTurnover?: number; // Retail
}

export interface AiAnalysisData {
    summary: string[];
    recommendations: string[];
}

export interface FinancialPeriodData {
  id: number;
  periodName: string;
  parsedData: ParsedFinancialData;
  aiAnalysis: AiAnalysisData;
  financialHealthScore?: FinancialHealthScore;
}

// --- vCFO Types ---
export interface ScenarioInput {
  name: string;
  revenueChange: number; // Percentage
  cogsChange: number; // Percentage
  opexChange: number; // Percentage
  newMonthlyDebt: number; // Absolute value
  notes?: string;
}

export interface ScenarioResult {
  projectedNetIncome: number;
  projectedCashFlow: number;
  commentary: string;
}

export interface ScenarioData extends ScenarioInput {
  id: number;
  userId: number;
  createdAt: string;
  result: ScenarioResult;
}

// --- VWA Types ---
export interface VWAOnboardingData {
  ownershipStake: number;
  freedomGoal: string;
  targetAge: number;
  targetNetWorth: number;
}

export interface ExternalAccount {
  type: 'Investment' | 'Retirement' | 'Bank Account';
  name: string;
  balance: number;
}

export interface VWAData extends VWAOnboardingData {
  businessValue: number;
  ownerEquity: number;
  externalAccounts: ExternalAccount[];
}

export interface OptimizerResult {
    takeHomePay: number;
    totalTaxBurden: number;
    businessCashImpact: 'Safe' | 'Caution' | 'Risky';
    coachAdvice: string;
}

export interface FreedomPlan {
    baseProjection: { year: number, netWorth: number }[];
    scenarioProjection: { year: number, netWorth: number }[] | null;
}
