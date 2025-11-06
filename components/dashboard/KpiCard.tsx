
import React, { useState, useCallback } from 'react';
import { Kpi } from '../../types';
import { getKpiExplanation } from '../../services/geminiService';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

interface KpiCardProps {
  kpi: Kpi;
  variant?: 'snapshot' | 'kpi';
}

const KpiCard: React.FC<KpiCardProps> = ({ kpi, variant = 'snapshot' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCardClick = useCallback(async () => {
    setIsModalOpen(true);
    // If there's a pre-written explanation, use it instantly.
    if (kpi.modalExplanation) {
      setExplanation(kpi.modalExplanation);
      setIsLoading(false);
      return;
    }
    
    // Otherwise, fetch from AI for KPI cards.
    setIsLoading(true);
    try {
      const result = await getKpiExplanation(kpi.label, `${kpi.unit === '$' ? '$' : ''}${kpi.value}${kpi.unit === '%' ? '%' : ''}`);
      setExplanation(result);
    } catch (error) {
      setExplanation('Could not load explanation.');
    } finally {
      setIsLoading(false);
    }
  }, [kpi]);

  const colorClasses = {
    snapshot: {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      default: 'bg-slate-500',
    },
    kpi: {
      green: 'bg-kpi-green-bg border border-green-200',
      yellow: 'bg-kpi-yellow-bg border border-yellow-200',
      red: 'bg-kpi-red-bg border border-red-200',
      blue: 'bg-blue-50 border border-blue-200',
      default: 'bg-white',
    }
  };

  const iconColorClasses = {
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600',
      blue: 'text-blue-600',
      default: 'text-slate-600',
  }

  const kpiColor = kpi.color || 'default';
  
  if (variant === 'kpi') {
    return (
       <>
        <div 
            onClick={handleCardClick} 
            className={`p-4 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between animate-slide-in-up h-full cursor-pointer ${colorClasses.kpi[kpiColor]}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        >
          <div>
            <div className="flex justify-between items-center mb-1">
               <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{kpi.label}</h3>
               <div className={`p-2 rounded-full ${colorClasses.kpi[kpiColor]}`}>
                  <div className={iconColorClasses[kpiColor]}>
                    {React.cloneElement(kpi.icon, { className: "w-5 h-5" })}
                  </div>
               </div>
            </div>
            <p className="text-3xl font-bold text-primary">
              {kpi.unit === '$' && '$'}{kpi.value}{kpi.unit === '%' && '%'}
            </p>
          </div>
          {kpi.description && (
              <p className="text-xs text-slate-500 mt-2">{kpi.description}</p>
          )}
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`What is ${kpi.label}?`}>
            {isLoading ? <Spinner text="Asking our CPA..." /> : (
                <p className="text-gray-600 whitespace-pre-wrap">{explanation}</p>
            )}
        </Modal>
      </>
    )
  }

  return (
    <>
      <div 
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        className="bg-white p-5 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between animate-slide-in-up h-full cursor-pointer"
      >
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</h3>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${colorClasses.snapshot[kpiColor]}`}>
                {React.cloneElement(kpi.icon, { className: "w-5 h-5" })}
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-neutral">
            {kpi.value}
          </p>
        </div>
         {kpi.description && (
            <p className="text-xs text-gray-400 mt-2">{kpi.description}</p>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`What is ${kpi.label}?`}>
        {isLoading ? <Spinner text="Asking our CPA..." /> : (
            <p className="text-gray-600 whitespace-pre-wrap">{explanation}</p>
        )}
      </Modal>
    </>
  );
};

export default KpiCard;
