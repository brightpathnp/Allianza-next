'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FunnelChart } from './FunnelChart';
import { normalizeCountryName, COUNTRY_FLAGS } from '../../lib/countryUtils';
import { Globe } from 'lucide-react';

const ChartEffects = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter id="glass3d" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
        <feOffset in="blur" dx="0.5" dy="0.5" result="offsetBlur" />
        <feSpecularLighting in="blur" surfaceScale="1.2" specularConstant="0.2" specularExponent="20" lightingColor="#ffffff" result="specOut">
          <fePointLight x="-5000" y="-10000" z="10000" />
        </feSpecularLighting>
        <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
        <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
      </filter>

      <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.3" />
        <stop offset="50%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.05" />
      </linearGradient>

      <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feFlood floodColor="white" floodOpacity="0.3" result="glowColor" />
        <feComposite in="glowColor" in2="SourceGraphic" operator="in" result="glowIn" />
        <feGaussianBlur in="glowIn" stdDeviation="2" result="glowBlur" />
        <feComposite in="glowBlur" in2="SourceGraphic" operator="over" />
      </filter>
    </defs>
  </svg>
);

interface FunnelData {
  submitted?: number;
  incomplete?: number;
  interviewPending?: number;
  approved?: number;
  rejected?: number;
  withdrawn?: number;
  total?: number;
}

interface ApplicationFunnelProps {
  funnel: FunnelData;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export function ApplicationFunnelContent({ funnel, onMetricClick, activeFilter }: ApplicationFunnelProps) {
  const funnelData = [
    { label: 'Submitted', value: funnel.submitted || 0, color: '#1D4ED8' },
    { label: 'Incomplete', value: funnel.incomplete || 0, color: '#B45309' },
    { label: 'Interview Pending', value: funnel.interviewPending || 0, color: '#7E22CE' },
    { label: 'Withdrawn', value: funnel.withdrawn || 0, color: '#475569' },
    { label: 'Rejected', value: funnel.rejected || 0, color: '#B91C1C' },
    { label: 'Approved', value: funnel.approved || 0, color: '#15803D' },
  ];

  return (
    <div className="w-full h-full py-2">
      {funnelData.length > 0 ? (
        <FunnelChart 
          data={funnelData} 
          onItemClick={(item) => onMetricClick?.('funnel', item.label)} 
          activeFilter={activeFilter}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
          No pipeline data recorded.
        </div>
      )}
    </div>
  );
}

interface ProgramDemandData {
  name: string;
  count: number;
}

interface TopProgramDemandProps {
  programs: ProgramDemandData[];
  totalActive: number;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export function TopProgramDemandContent({ programs, totalActive, onMetricClick, activeFilter }: TopProgramDemandProps) {
  const calcPct = (val: number, total: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return (
    <div className="space-y-3 h-full flex flex-col justify-center no-scrollbar overflow-y-auto">
      <ChartEffects />
      {programs && programs.length > 0 ? (
        programs.slice(0, 4).map((program) => {
          const filterValStr = typeof activeFilter?.value === 'string' ? activeFilter.value.toLowerCase().trim() : '';
          const isFilterActive = (activeFilter?.type === 'programs' || activeFilter?.type === 'program') && 
            filterValStr === (program.name || '').toLowerCase().trim();

          return (
            <div 
              key={program.name}
              onClick={() => onMetricClick?.('programs', program.name)}
              className={`space-y-1 p-1.5 rounded-xl cursor-pointer transition-all border ${
                isFilterActive 
                  ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-xs' 
                  : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className={`flex justify-between text-[11px] font-bold transition-colors ${
                isFilterActive ? 'text-blue-700 font-extrabold' : 'text-slate-700'
              }`}>
                <span className="truncate pr-2">{program.name}</span>
                <span className="shrink-0">{program.count} <span className="text-slate-400 font-medium">({calcPct(program.count, totalActive)}%)</span></span>
              </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner relative">
              <div 
                style={{ width: `${calcPct(program.count, totalActive)}%` }} 
                className={`h-full ${isFilterActive ? 'bg-blue-600' : 'bg-blue-500'} rounded-full transition-all duration-500 relative shadow-[0_2px_4px_rgba(0,0,0,0.1)]`}
              >
                <div className="absolute inset-0 bg-linear-to-b from-white/25 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-linear-to-r from-white/5 via-transparent to-black/5 pointer-events-none" />
              </div>
            </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-4 text-xs font-bold text-slate-400">No active programs in demand</div>
      )}
    </div>
  );
}

interface ProcessingVelocityProps {
  avgDays: number;
  totalActive: number;
}

export function ProcessingVelocityContent({ avgDays, totalActive }: ProcessingVelocityProps) {
  return (
    <div className="flex flex-col justify-between h-full py-2">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-4xl font-black text-[#1E293B] tracking-tight">{avgDays} Days</div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-100 tracking-wide">Excellent SLA</span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 my-2">
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-slate-400">Target SLA:</span>
          <span className="text-slate-700 font-black">48-Hour</span>
        </div>
        <div className="w-full h-1.5 bg-emerald-400 rounded-full shadow-inner" />
        <p className="text-[10px] text-slate-400 font-medium leading-tight">
          Fast turnarounds prevent students from accepting rival offers.
        </p>
      </div>

      <div className="text-[10px] font-extrabold text-emerald-600 tracking-wide flex items-center gap-1">
        <span>→</span> {totalActive} active files maintained
      </div>
    </div>
  );
}

interface TierSpreadData {
  diploma: number;
  bachelor: number;
  master: number;
  phd: number;
  dominantText?: string;
}

interface AcademicTierSpreadProps {
  data: TierSpreadData;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export function AcademicTierSpreadContent({ data, onMetricClick, activeFilter }: AcademicTierSpreadProps) {
  const maxVal = Math.max(data.diploma, data.bachelor, data.master, data.phd) || 1;
  
  const getDynamicColor = (val: number) => {
    const ratio = val / maxVal;
    const lightness = 85 - (ratio * 55);
    return `hsl(217, 91%, ${lightness}%)`;
  };

  const tiers = [
    { key: 'diploma', label: 'Diploma', value: data.diploma, color: getDynamicColor(data.diploma) },
    { key: 'bachelor', label: 'Bachelor', value: data.bachelor, color: getDynamicColor(data.bachelor) },
    { key: 'master', label: 'Master', value: data.master, color: getDynamicColor(data.master) },
    { key: 'doctorate', label: 'PhD / Doctorate', value: data.phd, color: getDynamicColor(data.phd) },
  ];

  const computedDominantText = useMemo(() => {
    const tierList = [
      { name: "Bachelor's tier", val: Number(data.bachelor) || 0 },
      { name: "Master's tier", val: Number(data.master) || 0 },
      { name: "Diploma tier", val: Number(data.diploma) || 0 },
      { name: "Doctorate tier", val: Number(data.phd) || 0 },
    ];
    
    tierList.sort((a, b) => b.val - a.val);
    
    if (tierList[0].val > 0) {
      if (tierList[0].val === tierList[1]?.val) {
        return `${tierList[0].name} and ${tierList[1].name} tied at ${tierList[0].val}% of volume.`;
      }
      return `${tierList[0].name} dominant at ${tierList[0].val}% of volume.`;
    }
    
    return data.dominantText || 'No application tiers recorded yet.';
  }, [data.bachelor, data.master, data.diploma, data.phd, data.dominantText]);

  return (
    <div className="space-y-3 h-full flex flex-col justify-center">
      <ChartEffects />
      {tiers.map((tier) => {
        const isFilterActive = activeFilter?.type === 'tier_spread' && activeFilter?.value === tier.key;

        return (
          <div 
            key={tier.key}
            onClick={() => onMetricClick && onMetricClick('tier_spread', tier.key)}
            className={`space-y-1 p-2 rounded-xl cursor-pointer transition-all border ${
              isFilterActive 
                ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-xs' 
                : 'border-transparent hover:bg-slate-50'
            }`}
          >
            <div className={`flex justify-between text-[11px] font-bold tracking-wider transition-colors ${
              isFilterActive ? 'text-blue-700 font-extrabold' : 'text-slate-700'
            }`}>
              <span className="truncate mr-1">{tier.label}</span><span>{tier.value}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner relative">
              <div 
                style={{ 
                  width: `${tier.value}%`,
                  backgroundColor: isFilterActive ? '#2563EB' : tier.color
                }} 
                className="h-full rounded-full transition-all duration-500 relative shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
              >
                <div className="absolute inset-0 bg-linear-to-b from-white/25 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-linear-to-r from-white/5 via-transparent to-black/5 pointer-events-none" />
              </div>
            </div>
          </div>
        );
      })}
      {computedDominantText && (
        <p className="text-[10px] text-slate-400 font-medium leading-tight pt-1">
          {computedDominantText}
        </p>
      )}
    </div>
  );
}

export function ComplianceDocumentContent({ breakdown, total }: { breakdown: { transcripts: number; passport: number; englishProof: number }; total: number }) {
  const items = [
    { label: 'Transcripts', value: breakdown.transcripts, color: 'bg-red-400' },
    { label: 'Passport Copies', value: breakdown.passport, color: 'bg-amber-400' },
    { label: 'English Proof', value: breakdown.englishProof, color: 'bg-blue-400' },
  ];
  const max = Math.max(...items.map(i => i.value)) || 1;

  return (
    <div className="space-y-4 h-full flex flex-col justify-center">
      <ChartEffects />
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 tracking-wider">
            <span className="truncate mr-1">{item.label}</span>
            <span className="text-slate-700 font-black shrink-0">{item.value} Pending</span>
          </div>
          <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-200/50 shadow-inner relative">
            <div 
              style={{ width: `${(item.value / max) * 100}%` }} 
              className={`h-full ${item.color} rounded-full transition-all duration-700 relative shadow-[0_2px_4px_rgba(0,0,0,0.1)]`} 
            >
              <div className="absolute inset-0 bg-linear-to-b from-white/50 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-linear-to-r from-white/10 via-transparent to-black/5 pointer-events-none" />
            </div>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-slate-400 font-medium mt-2">Compliance errors found in {total} active files.</p>
    </div>
  );
}

export interface DestinationHubsContentProps {
  preferredDestinations?: string[];
  approvedDestinations?: Record<string, number>;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export function DestinationHubsContent({
  preferredDestinations = ['United Kingdom', 'Australia'],
  approvedDestinations = {},
  onMetricClick,
  activeFilter
}: DestinationHubsContentProps) {
  const hubList = useMemo(() => {
    const list = Array.isArray(preferredDestinations) ? preferredDestinations : [];
    if (list.length === 0) return [];

    return list.map((dest) => {
      const normCountry = normalizeCountryName(dest);
      const flag = COUNTRY_FLAGS[normCountry] || COUNTRY_FLAGS[dest] || '🌐';
      
      let count = 0;
      if (approvedDestinations) {
        const targetNorm = normCountry.toLowerCase();
        Object.entries(approvedDestinations).forEach(([key, val]) => {
          const keyNorm = normalizeCountryName(key).toLowerCase();
          if (keyNorm === targetNorm || keyNorm.includes(targetNorm) || targetNorm.includes(keyNorm)) {
            count += val;
          }
        });
      }

      return {
        name: normCountry || dest,
        count,
        flag
      };
    });
  }, [preferredDestinations, approvedDestinations]);

  if (hubList.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4 select-none">
        <Globe size={24} className="text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-700">No Preferred Destinations</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
          Configure your preferred study destinations in Settings &gt; Recruitment Scope.
        </p>
      </div>
    );
  }

  const isMany = hubList.length > 4;

  if (isMany) {
    return (
      <div className="h-full flex flex-col justify-between py-1 select-none">
        <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1 py-0.5 scrollbar-thin">
          {hubList.map((hub) => {
            const isSelected = activeFilter?.type === 'destination' && activeFilter?.value?.toLowerCase() === hub.name.toLowerCase();
            return (
              <div
                key={hub.name}
                onClick={() => onMetricClick?.('destination', hub.name)}
                className={`flex items-center justify-between py-1 px-1 rounded transition-colors ${
                  isSelected
                    ? 'bg-blue-50/90 text-blue-700 font-bold ring-1 ring-blue-300'
                    : 'hover:bg-slate-50 text-slate-700'
                } ${onMetricClick ? 'cursor-pointer' : ''}`}
                title={`${hub.name}: ${hub.count} Approved Students`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs shrink-0">{hub.flag}</span>
                  <span className="text-xs font-medium truncate">{hub.name}</span>
                </div>
                <div className="text-right shrink-0 flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 font-outfit">{hub.count}</span>
                  <span className="text-[10px] text-slate-400">approved</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[9.5px] font-medium text-slate-400 text-center pt-1 border-t border-slate-100/60 truncate">
          Approved student placements across destinations
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 h-full flex flex-col justify-center select-none">
      {hubList.map((hub) => {
        const isSelected = activeFilter?.type === 'destination' && activeFilter?.value?.toLowerCase() === hub.name.toLowerCase();
        return (
          <div
            key={hub.name}
            onClick={() => onMetricClick?.('destination', hub.name)}
            className={`flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 transition-all ${
              isSelected
                ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                : 'hover:bg-slate-100/80'
            } ${onMetricClick ? 'cursor-pointer' : ''}`}
            title={`${hub.name}: ${hub.count} Approved Students`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg shrink-0">{hub.flag}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-700 truncate">{hub.name}</span>
                <span className="text-[9px] font-medium text-slate-400">Preferred Destination</span>
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-1.5">
              <div className="text-sm font-black text-slate-800 font-outfit">{hub.count}</div>
              <span className="text-[8.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/60 uppercase">
                Approved
              </span>
            </div>
          </div>
        );
      })}
      <div className="text-[9.5px] font-medium text-slate-400 text-center pt-1 border-t border-slate-100/60 truncate">
        Approved student placements
      </div>
    </div>
  );
}

export function CommissionForecastContent({ 
  cleared = 0, 
  forecast = 0, 
  onMetricClick, 
  activeFilter 
}: { 
  cleared?: number; 
  forecast?: number; 
  onMetricClick?: (type: string, value: string) => void; 
  activeFilter?: { type: string; value: string } | null;
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'USD' | 'NPR'>('EUR');
  const [currencyRates, setCurrencyRates] = useState<Record<'EUR'|'USD'|'NPR', { label: string, symbol: string, rate: number }>>({
    EUR: { label: 'EUR', symbol: '€', rate: 1.0 },
    USD: { label: 'USD', symbol: '$', rate: 1.08 },
    NPR: { label: 'NPR', symbol: 'Rs. ', rate: 143.50 }
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/currency-rates');
        const data = await response.json();
        const rates = data.data?.payload?.rates || data;
        
        if (Array.isArray(rates)) {
          const usdRate = rates.find((r: any) => r.iso3 === 'USD');
          const eurRate = rates.find((r: any) => r.iso3 === 'EUR');
          
          if (usdRate && eurRate) {
            const eurBuyNpr = parseFloat(eurRate.buy) / eurRate.unit;
            const usdBuyNpr = parseFloat(usdRate.buy) / usdRate.unit;
            
            setCurrencyRates({
              EUR: { label: 'EUR', symbol: '€', rate: 1.0 },
              USD: { label: 'USD', symbol: '$', rate: eurBuyNpr / usdBuyNpr },
              NPR: { label: 'NPR', symbol: 'Rs. ', rate: eurBuyNpr }
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch currency rates via proxy", err);
      }
    };
    fetchRates();
  }, []);

  const convertAndFormatVal = (amountInEuro: number) => {
    const details = currencyRates[selectedCurrency] || currencyRates.EUR;
    const converted = amountInEuro * details.rate;
    return `${details.symbol}${Math.round(converted).toLocaleString()}`;
  };

  const totalComm = (cleared || 0) + (forecast || 0);
  const clearedPercent = totalComm > 0 ? ((cleared || 0) / totalComm) * 100 : (forecast > 0 ? 0 : 100);

  return (
    <div className="flex flex-col justify-between h-full py-0.5 select-none">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <div 
              title="Commission Forecast (Approved Students Only)"
              className="text-2xl font-black text-slate-800 tracking-tight font-outfit truncate max-w-full"
            >
              {convertAndFormatVal(forecast)}
            </div>
            <select
              id="currency-select-shared-forecast"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as 'EUR' | 'USD' | 'NPR')}
              className="text-[10px] font-black text-slate-500 bg-white/50 border border-slate-200 rounded-xl px-2 py-1 outline-none cursor-pointer focus:border-blue-500 hover:bg-white transition-all shadow-sm h-7"
              title="Select Currency"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="NPR">NPR</option>
            </select>
          </div>
          <div className="relative group/tooltip">
            <div 
              title="Total Commission (Settled + Approved Forecast)"
              className="bg-emerald-50 text-emerald-700 font-black text-[9.5px] px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
            >
              {convertAndFormatVal(totalComm)} <span className="font-medium text-[8.5px] opacity-70 tracking-wider">TOTAL</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 my-1 w-full min-h-0">
        <div className="relative flex items-center justify-center my-auto">
          <div 
            className="w-16 h-16 xl:w-18 xl:h-18 rounded-full flex items-center justify-center shadow-inner relative transition-transform hover:scale-105 duration-300 shrink-0"
            style={{
              background: totalComm === 0 
                ? '#E2E8F0' 
                : `conic-gradient(#10B981 0% ${clearedPercent}%, #3B82F6 ${clearedPercent}% 100%)`
            }}
          >
            <div className="w-10 h-10 xl:w-11 xl:h-11 bg-white/95 backdrop-blur-sm rounded-full flex flex-col items-center justify-center shadow-sm">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Settled</span>
              <span className="text-[10px] font-black text-slate-800 font-outfit mt-0.5 leading-none">
                {totalComm > 0 ? `${Math.round(clearedPercent)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-slate-100/60">
          <div 
            onClick={() => onMetricClick?.('commissions', 'cleared')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl bg-slate-50/70 border border-slate-100 cursor-pointer transition-all hover:bg-emerald-50/60 hover:border-emerald-200 ${activeFilter?.type === 'commissions' && activeFilter?.value === 'cleared' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400 font-black' : ''}`}
            title={`Cleared / Settled Commission: ${convertAndFormatVal(cleared)}`}
          >
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
              <span>Cleared</span>
            </div>
            <span className="text-[11.5px] font-black font-outfit text-slate-800 mt-0.5 tracking-tight truncate max-w-full">
              {convertAndFormatVal(cleared)}
            </span>
          </div>

          <div 
            onClick={() => onMetricClick?.('commissions', 'forecast')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl bg-slate-50/70 border border-slate-100 cursor-pointer transition-all hover:bg-blue-50/60 hover:border-blue-200 ${activeFilter?.type === 'commissions' && activeFilter?.value === 'forecast' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400 font-black' : ''}`}
            title={`Forecast (Approved Students Only): ${convertAndFormatVal(forecast)}`}
          >
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-sm" />
              <span>Forecast</span>
            </div>
            <span className="text-[11.5px] font-black font-outfit text-slate-800 mt-0.5 tracking-tight truncate max-w-full">
              {convertAndFormatVal(forecast)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-[8.5px] font-black text-slate-400 text-center border-t border-slate-100/50 pt-1 tracking-[0.1em]">
        Forecast synced for approved students
      </div>
    </div>
  );
}

export function TotalApplicantsContent({ total, growth, statuses = {}, onMetricClick, activeFilter }: { total: number; growth: string; statuses: any; onMetricClick?: any; activeFilter?: any }) {
  const getPct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;
  
  const statusItems = [
    { label: 'Submitted', count: statuses?.submitted || 0, filterVal: 'Submitted', color: '#94a3b8', dot: 'bg-slate-400' },
    { label: 'Interview Pending', count: statuses?.interviewPending || 0, filterVal: 'Interview Pending', color: '#C084FC', dot: 'bg-purple-400' },
    { label: 'Approved', count: statuses?.approved || 0, filterVal: 'Approved', color: '#86EFAC', dot: 'bg-emerald-400' },
    { label: 'Incomplete', count: statuses?.incomplete || 0, filterVal: 'Incomplete', color: '#FCD34D', dot: 'bg-amber-400' },
    { label: 'Withdrawn', count: statuses?.withdrawn || 0, filterVal: 'Withdrawn', color: '#CBD5E1', dot: 'bg-slate-300' },
    { label: 'Rejected', count: statuses?.rejected || 0, filterVal: 'Rejected', color: '#FCA5A5', dot: 'bg-red-400' },
  ];

  const pieData = statusItems.filter(item => item.count > 0).map(item => ({
    name: item.label,
    value: item.count,
    color: item.color,
    filterVal: item.filterVal,
    pct: getPct(item.count)
  }));

  const isPieEmpty = pieData.length === 0;
  const chartData = isPieEmpty
    ? [{ name: 'No Applications', value: 1, color: '#E2E8F0', isZero: true, pct: 0, filterVal: '' }]
    : pieData;

  return (
    <div className="flex flex-col justify-between h-full py-1">
      <ChartEffects />
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl font-black text-[#1E293B] tracking-tight">{total}</span>
          <div className="bg-[#E6F8F0] text-[#00875A] font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-[#B3ECCF] tracking-wide whitespace-nowrap shrink-0">
            {growth}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center flex-1 my-1">
        <div className="sm:col-span-5 h-[130px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {chartData.map((entry, index) => (
                  <linearGradient key={`pie-grad-${index}`} id={`pie-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={entry.color} stopOpacity="0.85" />
                    <stop offset="50%" stopColor={entry.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={entry.color} stopOpacity="0.8" />
                  </linearGradient>
                ))}
              </defs>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={isPieEmpty ? 0 : 4}
            dataKey="value"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1.5}
            onClick={(data: any) => {
              if (isPieEmpty) return;
              if (onMetricClick && data && (data.filterVal || data.name)) {
                onMetricClick('applicant_status', data.filterVal || data.name);
              }
            }}
            className={isPieEmpty ? "" : "cursor-pointer"}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`total-app-cell-${index}`} 
                fill={`url(#pie-grad-${index})`}
                filter="url(#glass3d)"
                style={{
                  cursor: entry.isZero ? 'default' : 'pointer',
                  opacity: !entry.isZero && activeFilter?.type === 'applicant_status' && activeFilter?.value !== entry.filterVal ? 0.35 : 1
                }}
              />
            ))}
          </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  props.payload.isZero ? '0 applicants' : `${value} (${props.payload.pct}%)`, 
                  name
                ]}
                contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-slate-800">{total}</span>
            <span className="text-[9px] font-bold text-slate-400">Total</span>
          </div>
        </div>

        <div className="sm:col-span-7 flex flex-col space-y-1.5 text-xs font-bold text-slate-700">
          {statusItems.map((item) => {
            const filterValStr = typeof activeFilter?.value === 'string' ? activeFilter.value.toLowerCase().trim() : '';
            const isFilterActive = activeFilter?.type === 'applicant_status' && 
              (filterValStr === item.filterVal.toLowerCase().trim() ||
               (item.filterVal === 'Submitted' && filterValStr.includes('submitted')));
            const pct = getPct(item.count);

            return (
              <div 
                key={item.filterVal}
                onClick={() => onMetricClick?.('applicant_status', item.filterVal)}
                title={item.label}
                className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer transition-all border ${
                  isFilterActive 
                    ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-xs' 
                    : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/90 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.dot} shrink-0 shadow-xs`} />
                  <span className="text-[11px] font-bold text-slate-700 truncate">{item.label}</span>
                </div>
                <div className="text-right shrink-0 flex items-center gap-1 ml-1">
                  <span className="text-[11px] font-black text-slate-900">{item.count}</span>
                  <span className="text-[9px] font-semibold text-slate-400">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TotalAgentsContent({ 
  total, 
  growth = "+2.4% vs last month", 
  breakdown,
  onMetricClick,
  activeFilter
}: { 
  total: number; 
  growth?: string; 
  breakdown?: { approved: number; pending: number; rejected: number };
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}) {
  const safeBreakdown = breakdown || { approved: 0, pending: 0, rejected: 0 };
  const activePct = total > 0 ? Math.round(((safeBreakdown.approved || 0) / total) * 100) : 0;

  const getIsSelected = (statusName: string) => {
    if (!activeFilter || activeFilter.type !== 'agent_status' || typeof activeFilter.value !== 'string') return false;
    return activeFilter.value.toLowerCase().trim().includes(statusName.toLowerCase());
  };

  return (
    <div className="flex flex-col justify-between h-full py-2">
      <ChartEffects />
      <div className="flex items-center gap-3">
        <div className="text-4xl font-black text-slate-800 tracking-tight">{total}</div>
        <div className="bg-blue-50 text-blue-600 font-extrabold text-[10px] px-2.5 py-1 rounded-md border border-blue-100 tracking-wide whitespace-nowrap shrink-0">
          {growth}
        </div>
      </div>
      
      {breakdown ? (
        <div className="space-y-3 mt-4 flex-1 flex flex-col justify-center">
          <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200/50 shadow-inner relative">
            <div 
              style={{ width: `${total > 0 ? Math.round((breakdown.approved / total) * 100) : 0}%` }} 
              className="bg-emerald-500 h-full relative shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => onMetricClick?.('agent_status', 'Approved')}
              title="Filter by Approved Agents"
            >
              <div className="absolute inset-0 bg-linear-to-b from-white/50 to-transparent" />
            </div>
            <div 
              style={{ width: `${total > 0 ? Math.round((breakdown.pending / total) * 100) : 0}%` }} 
              className="bg-amber-500 h-full relative border-l border-white/20 shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => onMetricClick?.('agent_status', 'Pending')}
              title="Filter by Pending Agents"
            >
              <div className="absolute inset-0 bg-linear-to-b from-white/50 to-transparent" />
            </div>
            <div 
              style={{ width: `${total > 0 ? Math.round((breakdown.rejected / total) * 100) : 0}%` }} 
              className="bg-red-500 h-full relative border-l border-white/20 shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => onMetricClick?.('agent_status', 'Rejected')}
              title="Filter by Rejected Agents"
            >
              <div className="absolute inset-0 bg-linear-to-b from-white/50 to-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <button 
              type="button"
              onClick={() => onMetricClick?.('agent_status', 'Approved')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                getIsSelected('approved') 
                  ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/30 shadow-xs scale-102' 
                  : 'bg-emerald-50/50 border-emerald-100/50 hover:bg-emerald-100/80 hover:border-emerald-200'
              }`}
            >
              <span className="text-[9px] font-bold text-emerald-600 block tracking-wider uppercase">Approved</span>
              <span className="text-sm font-black text-slate-800">{breakdown.approved}</span>
            </button>

            <button 
              type="button"
              onClick={() => onMetricClick?.('agent_status', 'Pending')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                getIsSelected('pending') 
                  ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/30 shadow-xs scale-102' 
                  : 'bg-amber-50/50 border-amber-100/50 hover:bg-amber-100/80 hover:border-amber-200'
              }`}
            >
              <span className="text-[9px] font-bold text-amber-600 block tracking-wider uppercase">Pending</span>
              <span className="text-sm font-black text-slate-800">{breakdown.pending}</span>
            </button>

            <button 
              type="button"
              onClick={() => onMetricClick?.('agent_status', 'Rejected')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                getIsSelected('rejected') 
                  ? 'bg-red-100 border-red-400 ring-2 ring-red-400/30 shadow-xs scale-102' 
                  : 'bg-red-50/50 border-red-100/50 hover:bg-red-100/80 hover:border-red-200'
              }`}
            >
              <span className="text-[9px] font-bold text-red-600 block tracking-wider uppercase">Rejected</span>
              <span className="text-sm font-black text-slate-800">{breakdown.rejected}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 tracking-widest">Active Recruiting</span>
            <span className="text-[11px] font-black text-slate-800">{activePct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
            <div style={{ width: `${activePct}%` }} className="h-full bg-blue-500 rounded-full relative">
              <div className="absolute inset-0 bg-linear-to-b from-white/40 to-transparent" />
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 font-medium leading-tight mt-2">
        Agents synchronized across globally distributed sourcing hubs.
      </p>
    </div>
  );
}