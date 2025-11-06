import React from 'react';
import { AiAnalysisData } from '../../types';

interface AiAnalysisProps {
    analysis: AiAnalysisData;
}

const AiAnalysis: React.FC<AiAnalysisProps> = ({ analysis }) => {
    const isLoading = analysis.recommendations.includes("Generating AI analysis...");

    return (
        <div className="animate-fade-in h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg h-full">
                    <h3 className="font-bold text-primary mb-3">Executive Summary</h3>
                    {isLoading ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
                            <span>Generating...</span>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm text-slate-600">
                           {analysis.summary.map((p, index) => <p key={index}>{p}</p>)}
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2">
                    <div className="space-y-4">
                        <h3 className="font-bold text-primary ml-6 mb-2">CPA Actionable Recommendations</h3>
                        {isLoading ? (
                             <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl shadow-lg animate-pulse h-16"></div>
                                <div className="bg-white p-4 rounded-xl shadow-lg animate-pulse h-16"></div>
                             </div>
                        ) : (
                            analysis.recommendations.map((rec, index) => (
                                <div key={index} className="flex items-start bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 mt-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-slate-700">{rec}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AiAnalysis;
