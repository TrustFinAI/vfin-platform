import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface WealthGapChartProps {
    currentNetWorth: number;
    targetNetWorth: number;
}

const WealthGapChart: React.FC<WealthGapChartProps> = ({ currentNetWorth, targetNetWorth }) => {
    const achieved = Math.min(currentNetWorth, targetNetWorth);
    const remaining = Math.max(0, targetNetWorth - currentNetWorth);
    const percentage = targetNetWorth > 0 ? (achieved / targetNetWorth) * 100 : 0;

    const data = {
        labels: ['Achieved', 'Remaining'],
        datasets: [
            {
                label: 'Net Worth',
                data: [achieved, remaining],
                backgroundColor: ['#4285F4', '#E0E0E0'],
                borderColor: ['#ffffff'],
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false,
            },
        },
    };

    return (
        <div className="relative w-48 h-48">
            <Doughnut data={data} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary">{percentage.toFixed(0)}%</span>
                <span className="text-xs text-slate-500">Complete</span>
            </div>
        </div>
    );
};

export default WealthGapChart;
