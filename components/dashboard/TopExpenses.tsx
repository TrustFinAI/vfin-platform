import React from 'react';
import { ExpenseItem } from '../../types';

interface TopExpensesProps {
  expenses?: ExpenseItem[];
  totalExpenses?: number;
}

const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TopExpenses: React.FC<TopExpensesProps> = ({ expenses, totalExpenses }) => {

  const totalTopExpenses = expenses ? expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;

  const percentageOfTotal = (totalExpenses && totalExpenses > 0 && totalTopExpenses > 0)
    ? ((totalTopExpenses / totalExpenses) * 100).toFixed(1)
    : null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg animate-fade-in h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-primary">Top 5 Expenses</h3>
        {percentageOfTotal && (
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                {percentageOfTotal}% of Total Expenses
            </span>
        )}
      </div>
       {!expenses || expenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Expense data not available in the provided statements.</p>
          </div>
       ) : (
         <div className="space-y-4">
          {expenses.map((expense, index) => {
            const percentageOfBar = totalTopExpenses > 0 ? (expense.amount / totalTopExpenses) * 100 : 0;
            const percentageOfTotalExpenses = totalExpenses && totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0;
            return (
              <div key={index}>
                <div className="flex justify-between items-center mb-1 text-sm">
                  <div className="flex items-center truncate">
                    <span className="font-medium text-slate-700 truncate pr-1">{expense.name}</span>
                    {percentageOfTotalExpenses > 0 && (
                      <span className="ml-2 text-xs font-bold text-red-600 flex-shrink-0">
                        ({percentageOfTotalExpenses.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-primary flex-shrink-0">{formatCurrency(expense.amount)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full"
                    style={{ width: `${percentageOfBar}%` }}
                    title={`${percentageOfBar.toFixed(1)}% of top 5`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
       )}
    </div>
  );
};

export default TopExpenses;
