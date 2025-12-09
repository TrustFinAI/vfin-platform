import React, { useState, useEffect, useCallback } from 'react';
import { ScenarioData, ScenarioInput, User } from '../../types';
import { getScenarios, runScenario, deleteScenario } from '../../services/vcfoService';
import Spinner from '../ui/Spinner';
import { ArrowRight } from '../dashboard/Icons';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

interface VCFOPageProps {
    currentUser: User;
}

const VCFOPage: React.FC<VCFOPageProps> = ({ currentUser }) => {
    const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModeling, setIsModeling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newScenario, setNewScenario] = useState<ScenarioInput>({
        name: 'High Growth Scenario',
        revenueChange: 15,
        cogsChange: 5,
        opexChange: 10,
        newMonthlyDebt: 0,
        notes: 'Aggressive marketing push and team expansion.'
    });

    const fetchScenarios = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getScenarios();
            setScenarios(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScenarios();
    }, [fetchScenarios]);

    const handleRunScenario = async () => {
        setIsModeling(true);
        setError(null);
        try {
            const result = await runScenario(newScenario);
            setScenarios(prev => [result, ...prev]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsModeling(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteScenario(id);
            setScenarios(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            setError(err.message);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewScenario(prev => ({ ...prev, [name]: name === 'name' || name === 'notes' ? value : Number(value) }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8 border-b border-slate-200 pb-4">
                <h1 className="text-3xl font-bold text-primary">vCFO Scenario Modeler</h1>
                <p className="text-slate-500 mt-1">Project the financial impact of your business decisions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
                        <h2 className="text-lg font-bold text-primary mb-4">Create New Scenario</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600">Scenario Name</label>
                                <input type="text" name="name" value={newScenario.name} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">Revenue Change (%)</label>
                                <input type="number" name="revenueChange" value={newScenario.revenueChange} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-600">COGS Change (%)</label>
                                <input type="number" name="cogsChange" value={newScenario.cogsChange} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">OpEx Change (%)</label>
                                <input type="number" name="opexChange" value={newScenario.opexChange} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600">New Monthly Debt ($)</label>
                                <input type="number" name="newMonthlyDebt" value={newScenario.newMonthlyDebt} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" />
                            </div>
                             <div>
                                <label className="text-sm font-medium text-slate-600">Notes</label>
                                <textarea name="notes" value={newScenario.notes} onChange={handleInputChange} rows={3} className="w-full mt-1 p-2 border rounded-md"></textarea>
                            </div>
                            <button onClick={handleRunScenario} disabled={isModeling} className="w-full py-3 bg-accent text-white font-bold rounded-md hover:bg-accent-hover transition-colors disabled:bg-slate-400">
                                {isModeling ? <Spinner size="sm" /> : "Run AI Projection"}
                            </button>
                            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-primary mb-4">Saved Scenarios</h2>
                    {isLoading ? <Spinner /> : (
                        <div className="space-y-4">
                            {scenarios.length === 0 && <p className="text-slate-500">No scenarios created yet. Use the form to run your first projection.</p>}
                            {scenarios.map(s => (
                                <div key={s.id} className="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-primary text-lg">{s.name}</h3>
                                            <p className="text-xs text-slate-400">Created on {new Date(s.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-red-500">&times;</button>
                                    </div>
                                    <p className="text-sm text-slate-600 my-4">{s.result.commentary}</p>
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 uppercase">Projected Net Income</p>
                                            <p className="text-xl font-bold text-green-600">{formatCurrency(s.result.projectedNetIncome)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 uppercase">Projected Cash Flow</p>
                                            <p className="text-xl font-bold text-blue-600">{formatCurrency(s.result.projectedCashFlow)}</p>
                                        </div>
                                    </div>
                                     <div className="mt-4 text-center">
                                        <button className="text-sm font-semibold text-accent hover:text-accent-hover flex items-center justify-center w-full">
                                            See How This Impacts Your Freedom Plan <ArrowRight className="w-4 h-4 ml-2" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VCFOPage;
