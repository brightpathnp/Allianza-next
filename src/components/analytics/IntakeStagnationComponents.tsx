'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface IntakeData {
  name: string;
  value: number;
  color: string;
}

interface IntakeTermSpreadProps {
  intakeData: IntakeData[];
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export function IntakeTermSpreadContent({ 
  intakeData, 
  onMetricClick, 
  activeFilter 
}: IntakeTermSpreadProps) {
  const totalVal = intakeData.reduce((acc, item) => acc + item.value, 0);
  const getPct = (val: number) => totalVal > 0 ? Math.round((val / totalVal) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-between h-full py-1 space-y-2">
      <div className="h-32 w-full relative flex-shrink-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {intakeData.map((entry, index) => (
                <linearGradient key={`intake-grad-${index}`} id={`intake-grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={entry.color} stopOpacity="0.8" />
                  <stop offset="50%" stopColor={entry.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={entry.color} stopOpacity="0.75" />
                </linearGradient>
              ))}
                <filter id="intakeGlassFilter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
                  <feSpecularLighting in="blur" surfaceScale="3" specularConstant="0.6" specularExponent="35" lightingColor="#ffffff" result="specOut">
                    <fePointLight x="-5000" y="-10000" z="20000" />
                  </feSpecularLighting>
                  <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
                  <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
                  <feColorMatrix in="litPaint" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.1 0" />
                </filter>
            </defs>
            <Pie
              data={(() => {
                const isAllZero = intakeData.every(item => item.value === 0);
                return isAllZero ? [{ name: 'No Applications', value: 1, color: '#e2e8f0' }] : intakeData;
              })()}
              innerRadius={26}
              outerRadius={45}
              paddingAngle={intakeData.every(item => item.value === 0) ? 0 : 4}
              dataKey="value"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              onClick={(data) => {
                const isAllZero = intakeData.every(item => item.value === 0);
                if (!isAllZero && onMetricClick && data && data.name) {
                  onMetricClick('intake', data.name as string);
                }
              }}
              className={intakeData.every(item => item.value === 0) ? "" : "cursor-pointer"}
            >
              {(() => {
                const isAllZero = intakeData.every(item => item.value === 0);
                const chartData = isAllZero ? [{ name: 'No Applications', value: 1, color: '#e2e8f0' }] : intakeData;
                return chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isAllZero ? entry.color : `url(#intake-grad-${index})`} 
                    filter={isAllZero ? undefined : "url(#intakeGlassFilter)"}
                    style={{
                      cursor: isAllZero ? 'default' : 'pointer',
                      opacity: !isAllZero && activeFilter?.type === 'intake' && activeFilter?.value !== entry.name ? 0.3 : 1
                    }} 
                  />
                ));
              })()}
            </Pie>
            <Tooltip 
              formatter={(value: number) => {
                const isAllZero = intakeData.every(item => item.value === 0);
                return isAllZero ? [`0 applicants`, 'Volume'] : [`${value} applicants`, 'Volume'];
              }}
              contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="w-full flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {intakeData.map((term, i) => {
          const isFilterActive = activeFilter?.type === 'intake' && activeFilter?.value === term.name;
          const pct = getPct(term.value);

          return (
            <div 
              key={i} 
              onClick={() => onMetricClick && onMetricClick('intake', term.name)}
              className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all border shrink-0 ${
                isFilterActive 
                  ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-2xs' 
                  : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/90 hover:border-slate-200'
              }`}
              title={`Filter by ${term.name}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: term.color }} />
                <span className={`text-xs font-bold truncate ${isFilterActive ? 'text-blue-700 font-extrabold' : 'text-slate-700'}`}>{term.name}</span>
              </div>
              <div className="text-right shrink-0 flex items-center gap-1">
                <span className="text-xs font-black text-slate-900">{term.value}</span>
                <span className="text-[10px] font-semibold text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StagnationData {
  active: number;
  warning: number;
  stale: number;
}

interface StagnationRiskProps {
  stagnation: StagnationData;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export function StagnationRiskContent({
  stagnation,
  onMetricClick,
  activeFilter
}: StagnationRiskProps) {
  const totalStagnation = stagnation.active + stagnation.warning + stagnation.stale;
  const getPct = (count: number) => totalStagnation > 0 ? Math.round((count / totalStagnation) * 100) : 0;

  const stagnationItems = [
    { key: 'active', label: 'Active (< 7 Days)', val: stagnation.active, color: 'bg-emerald-500' },
    { key: 'warning', label: 'Warning (7–14 Days)', val: stagnation.warning, color: 'bg-amber-500' },
    { key: 'stale', label: 'Stale (> 14 Days)', val: stagnation.stale, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-2.5 h-full flex flex-col justify-center">
      {stagnationItems.map((item) => {
        const isFilterActive = activeFilter?.type === 'stagnation' && activeFilter?.value === item.key;

        return (
          <div 
            key={item.key}
            onClick={() => onMetricClick && onMetricClick('stagnation', item.key)}
            className={`space-y-1 p-1.5 rounded-xl cursor-pointer transition-all border ${
              isFilterActive 
                ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-200 shadow-xs' 
                : 'border-transparent hover:bg-slate-50'
            }`}
            title={item.label}
          >
            <div className="flex justify-between items-center text-[10.5px] font-bold">
              <span className={`truncate mr-1 ${isFilterActive ? 'text-blue-700 font-extrabold' : 'text-slate-600'}`}>{item.label}</span>
              <span className="text-slate-800 font-extrabold shrink-0">{item.val} <span className="text-slate-400 font-medium text-[9px]">({getPct(item.val)}%)</span></span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner relative">
              <div 
                style={{ width: `${getPct(item.val)}%` }} 
                className={`h-full ${isFilterActive ? 'bg-blue-600' : item.color.replace('bg-', 'bg-linear-to-r from-') + ' via-' + item.color.replace('bg-', '') + ' to-' + item.color.replace('bg-', '')} rounded-full transition-all duration-500 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]`}
              >
                <div className="absolute inset-0 bg-linear-to-b from-white/40 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}