import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { FinancialPeriodData } from '../../types';
import { getPeriodData } from '../../services/vcpaService';
import Spinner from '../ui/Spinner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrendAnalysisProps {
  allPeriods: Pick<FinancialPeriodData, 'id' | 'periodName'>[];
}

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
          }
          return label;
        }
      }
    }
  },
  scales: {
    y: {
      ticks: {
        callback: function(value) {
          return '$' + (Number(value) / 1000) + 'k';
        }
      }
    }
  }
};

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ allPeriods }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (allPeriods.length < 2) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const detailedPeriods = await Promise.all(allPeriods.map(p => getPeriodData(p.id)));
        const labels = detailedPeriods.map(p => p.periodName);
        const revenueData = detailedPeriods.map(p => p.parsedData.totalRevenue);
        const netIncomeData = detailedPeriods.map(p => p.parsedData.netIncome);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Total Revenue',
              data: revenueData,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
            },
            {
              label: 'Net Income',
              data: netIncomeData,
              borderColor: 'rgb(22, 163, 74)',
              backgroundColor: 'rgba(22, 163, 74, 0.5)',
            },
          ],
        });
      } catch (error) {
        console.error("Failed to fetch detailed period data for charts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [allPeriods]);
  
  if (allPeriods.length < 2) {
      return null; // Don't show the component if there's not enough data to compare
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-lg font-bold text-primary mb-4">Trend Analysis</h2>
      {isLoading ? (
        <div className="flex justify-center items-center h-72">
          <Spinner text="Loading trend data..." />
        </div>
      ) : chartData ? (
        <div className="relative h-72">
          <Line options={chartOptions} data={chartData} />
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
            <p>Could not load trend data. Please try again later.</p>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysis;
