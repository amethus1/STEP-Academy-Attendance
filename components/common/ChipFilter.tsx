import React from 'react';

interface FilterOption {
    label: string;
    value: string;
}

interface ChipFilterProps {
    label?: string;
    options: FilterOption[];
    selectedValue: string;
    onChange: (value: string) => void;
    allLabel?: string;
}

export const ChipFilter: React.FC<ChipFilterProps> = ({
    label,
    options,
    selectedValue,
    onChange,
    allLabel = 'All'
}) => {
    return (
        <div className="flex flex-col gap-1">
            {label && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onChange('All')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${selectedValue === 'All'
                            ? 'bg-brand text-white border-brand'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-brand/50 hover:text-brand'
                        }`}
                >
                    {allLabel}
                </button>
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${selectedValue === option.value
                                ? 'bg-brand text-white border-brand'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-brand/50 hover:text-brand'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
