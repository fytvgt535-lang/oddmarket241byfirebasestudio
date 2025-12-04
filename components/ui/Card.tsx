
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: 'default' | 'gradient' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, variant = 'default' }) => {
  const baseStyles = "rounded-2xl overflow-hidden shadow-sm transition-all";
  
  const variants = {
    default: "bg-white border border-gray-100 text-gray-900",
    gradient: "bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-200 shadow-xl border-none",
    outlined: "bg-transparent border-2 border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50",
    flat: "bg-gray-50 border-none text-gray-800"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {noPadding ? children : <div className="p-6">{children}</div>}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; className?: string }> = ({ title, subtitle, action, className = '' }) => (
  <div className={`p-6 border-b border-gray-100 flex justify-between items-start ${className}`}>
    <div>
      <h3 className="text-lg font-bold text-inherit">{title}</h3>
      {subtitle && <p className="text-sm opacity-80 mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);
