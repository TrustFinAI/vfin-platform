import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { FreedomPlan, VWAData } from '../../types';
import { getFreedomPlan } from '../../services/vwaService';
import Spinner from '../ui/Spinner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface FreedomPlannerProps {
    vwaData: VWAData;
}

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: {
      callbacks: {
        label: (context) => `Net Worth: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y)}`
      }
    }
  },
  scales: {
    y: { ticks: { callback: (value) => '$' + (Number(value) / 1000000) + 'M' } }
  }
};

const FreedomPlanner: React.FC<FreedomPlannerProps> = ({ vwaData }) => {
    const [plan, setPlan] = useState<FreedomPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                // In a real app, you might pass a selected scenario ID
                const data = await getFreedomPlan(1); // Mocking with a scenario
                setPlan(data);
            } catch (error) {
                console.error("Failed to fetch freedom plan:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlan();
    }, []);

    const chartData = plan ? {
        labels: plan.baseProjection.map(p => p.year),
        datasets: [
            {
                label: 'Base Projection',
                data: plan.baseProjection.map(p => p.netWorth),
                borderColor: 'rgb(100, 116, 139)',
                backgroundColor: 'rgba(100, 116, 139, 0.5)',
                borderDash: [5, 5],
            },
            ...(plan.scenarioProjection ? [{
                label: 'With "High Growth" Scenario',
                data: plan.scenarioProjection.map(p => p.netWorth),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
            }] : [])
        ],
    } : null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-primary mb-4">Your Path to Freedom</h3>
            {isLoading ? <Spinner /> : chartData ? (
                <div className="relative h-96">
                    <Line options={chartOptions} data={chartData} />
                </div>
            ) : <p>Could not load plan.</p>}
        </div>
    );
};

export default FreedomPlanner;
