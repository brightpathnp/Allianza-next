'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AnalyticsOption {
  id: string;
  label: string;
  component: React.ReactNode;
}

interface CustomizableAnalyticsCardProps {
  id: string;
  options: AnalyticsOption[];
  defaultOptionId?: string;
  className?: string;
}

export function CustomizableAnalyticsCard({
  id,
  options,
  defaultOptionId,
  className = ""
}: CustomizableAnalyticsCardProps) {
  const storageKey = `analytics_card_selection_${id}`;
  const [selectedId, setSelectedId] = useState<string>(() => {
    return localStorage.getItem(storageKey) || defaultOptionId || options[0]?.id || "";
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, selectedId);
  }, [selectedId, storageKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.id === selectedId) || options[0];

  return (
    <div className={`bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm relative flex flex-col justify-between transition-all hover:shadow-md h-full min-h-0 transform-gpu ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px] truncate pr-8" title={selectedOption?.label}>
          {selectedOption?.label}
        </h3>
        
        <div className="absolute top-5 right-5" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Change card metric"
          >
            <ChevronDown size={18} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden"
              >
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedId(option.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedId === option.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {selectedId === option.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-sm shadow-blue-200" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center overflow-hidden min-h-0">
        {selectedOption?.component}
      </div>
    </div>
  );
}