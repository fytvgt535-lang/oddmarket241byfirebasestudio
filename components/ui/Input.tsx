
import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ElementType;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, leftIcon: Icon, className = '', ...props }, ref) => {
  const id = useId();
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            w-full bg-white text-gray-900 border rounded-xl outline-none transition-all font-medium placeholder:text-gray-400
            ${Icon ? 'pl-12 pr-4' : 'px-4'}
            ${props.type === 'color' ? 'h-12 p-1' : 'py-3'}
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 font-bold ml-1">{error}</p>}
    </div>
  );
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(({ label, children, className = '', ...props }, ref) => {
  const id = useId();
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{label}</label>}
      <div className="relative">
        <select
          id={id}
          ref={ref}
          className={`
            w-full bg-white text-gray-900 border border-gray-200 rounded-xl outline-none transition-all font-medium py-3 px-4 appearance-none
            focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
});

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(({ label, className = '', ...props }, ref) => {
  const id = useId();
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{label}</label>}
      <textarea
        id={id}
        ref={ref}
        className={`
          w-full bg-white text-gray-900 border border-gray-200 rounded-xl outline-none transition-all font-medium py-3 px-4
          focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none
          ${className}
        `}
        {...props}
      />
    </div>
  );
});
