import React, { useState, useMemo, useEffect } from 'react';
import { FinancialPeriodData, ParsedFinancialData } from '../../types';
import Modal from '../ui/Modal';

interface PeriodComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: FinancialPeriodData[];
}

const formatValue = (value: number | undefined, prefix = '', suffix = '') => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`;
};

const PeriodComparisonModal: React.FC<PeriodComparisonModalProps> = ({ isOpen, onClose, periods }) => {
  const [periodAId, setPeriodAId] = useState<number | null>(null);
  const [periodBId, setPeriodBId] = useState<number | null>(null);

  useEffect(() => {
    if (periods.length > 1) {
      setPeriodAId(periods[0].id);
      setPeriodBId(periods[1].id);
    }
  }, [periods]);

  const periodA = useMemo(() => periods.find(p => p.id === periodAId), [periods, periodAId]);
  const periodB = useMemo(() => periods.find(p => p.id === periodBId), [periods, periodBId]);

  const comparisonData = useMemo(() => {
    if (!periodA || !periodB) return [];

    const dataA = periodA.parsedData;
    const dataB = periodB.parsedData;

    const metrics: (keyof ParsedFinancialData)[] = [
      'totalRevenue', 'netIncome', 'costOfGoodsSold', 'operatingExpenses', 'cashFromOps', 
      'totalAssets', 'totalLiabilities', 'equity', 'currentAssets', 'currentLiabilities'
    ];

    return metrics.map(key => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const valueA = dataA[key] as number | undefined;
      const valueB = dataB[key] as number | undefined;
      
      let change = 'N/A';
      if (valueA !== undefined && valueB !== undefined && valueA !== 0) {
        const pctChange = ((valueB - valueA) / Math.abs(valueA)) * 100;
        const isPositive = pctChange >= 0;
        const color = isPositive ? 'text-green-600' : 'text-red-600';
        change = `<span class="${color}">${isPositive ? '▲' : '▼'} ${Math.abs(pctChange).toFixed(1)}%</span>`;
      }

      return {
        label,
        valueA: formatValue(valueA, '$'),
        valueB: formatValue(valueB, '$'),
        change,
      };
    });
  }, [periodA, periodB]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Financial Periods">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Period A</label>
            <select value={periodAId ?? ''} onChange={e => setPeriodAId(Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md">
              {periods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Period B</label>
            <select value={periodBId ?? ''} onChange={e => setPeriodBId(Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md">
              {periods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Metric</th>
                <th className="px-4 py-2 text-right">{periodA?.periodName || 'Period A'}</th>
                <th className="px-4 py-2 text-right">{periodB?.periodName || 'Period B'}</th>
                <th className="px-4 py-2 text-right">% Change</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map(row => (
                <tr key={row.label} className="border-b">
                  <td className="px-4 py-2 font-medium text-slate-800">{row.label}</td>
                  <td className="px-4 py-2 text-right">{row.valueA}</td>
                  <td className="px-4 py-2 text-right">{row.valueB}</td>
                  <td className="px-4 py-2 text-right" dangerouslySetInnerHTML={{ __html: row.change }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-white bg-primary hover:bg-secondary">Close</button>
        </div>
      </div>
    </Modal>
  );
};

export default PeriodComparisonModal;
