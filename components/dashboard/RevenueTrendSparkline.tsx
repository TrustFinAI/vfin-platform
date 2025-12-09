import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

interface RevenueTrendSparklineProps {
  data: { period: string; value: number }[];
}

const RevenueTrendSparkline: React.FC<RevenueTrendSparklineProps> = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.period),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(d => d.value),
        borderColor: data.length < 2 || data[data.length - 1]?.value >= data[data.length - 2]?.value ? '#16a34a' : '#ef4444',
        backgroundColor: 'rgba(0,0,0,0)',
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
  };

  const latestValue = data[data.length - 1]?.value || 0;
  const previousValue = data[data.length - 2]?.value || 0;
  const percentageChange = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : (latestValue > 0 ? 100 : 0);
  const isGrowth = percentageChange >= 0;

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg flex flex-col justify-between animate-slide-in-up h-full">
      <div>
        <div className="flex justify-between items-start">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue Trend</h3>
             {data.length > 1 && (
                <div className={`flex items-center text-xs font-bold ${isGrowth ? 'text-green-600' : 'text-red-600'}`}>
                    {isGrowth ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(1)}%
                </div>
             )}
        </div>
        <p className="mt-4 text-3xl font-bold text-neutral">
            ${latestValue.toLocaleString()}
        </p>
      </div>
      <div className="h-16 mt-2 -mb-2 -mx-2">
        {data.length > 1 && <Line options={options} data={chartData} />}
      </div>
    </div>
  );
};

export default RevenueTrendSparkline;
