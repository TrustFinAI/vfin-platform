import React from 'react';
import { Link } from 'react-router-dom';

interface UpgradeCtaProps {
  featureName: string;
  requiredTier: string;
}

const UpgradeCta: React.FC<UpgradeCtaProps> = ({ featureName, requiredTier }) => {
  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-6 rounded-xl text-center">
      <h3 className="text-lg font-bold text-primary">Unlock {featureName}</h3>
      <p className="text-sm text-slate-600 mt-2">
        This is a premium feature included in the <span className="font-semibold">{requiredTier}</span> plan and above.
      </p>
      <Link
        to="/pricing"
        className="mt-4 inline-block bg-accent text-white font-semibold px-6 py-2 rounded-md hover:bg-accent-hover transition-colors"
      >
        Upgrade Your Plan
      </Link>
    </div>
  );
};

export default UpgradeCta;
