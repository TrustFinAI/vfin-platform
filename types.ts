
import React from 'react';

export interface Kpi {
  label: string;
  value: string;
  unit?: '%' | '$';
  description?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'default';
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
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
}

export interface AiAnalysisData {
    summary: string[];
    recommendations: string[];
}

export interface FinancialPeriodData {
  id: string;
  parsedData: ParsedFinancialData;
  aiAnalysis: AiAnalysisData;
  financialHealthScore?: FinancialHealthScore;
}
