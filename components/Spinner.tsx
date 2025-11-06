
import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`animate-spin rounded-full border-4 border-t-primary border-gray-200 ${sizeClasses[size]}`}
      ></div>
      {text && <p className="text-primary animate-pulse">{text}</p>}
    </div>
  );
};

export default Spinner;
