
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular', 
  width, 
  height 
}) => {
  const baseClasses = "animate-pulse bg-gray-200";
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  const style = {
    width: width,
    height: height,
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      style={style}
    />
  );
};
