'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { processDynamicBlockers } from '../../utils/complianceMetrics';

interface DynamicMissingDocsCardProps {
  applications: any[];
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
  embedded?: boolean;
}

export default function DynamicMissingDocsCard({ applications, onMetricClick, activeFilter, embedded = false }: DynamicMissingDocsCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const metrics = useMemo(() => {
    const allMissingDocs: string[] = [];
    applications.forEach(app => {
      if (Array.isArray(app.missingDocuments) && app.missingDocuments.length > 0) {
        app.missingDocuments.forEach((doc: string) => {
           let name = doc;
           if (name.toLowerCase().includes('transcript')) name = 'Academic Transcript';
           else if (name.toLowerCase().includes('english')) name = 'English Language Qualification';
           allMissingDocs.push(name);
        });
      } 
      if (app.applicationStatus === 'incomplete') {
        if (!app.docs_transcripts) allMissingDocs.push('Academic Transcript');
        if (!app.docs_passport) allMissingDocs.push('Passport / ID Scan');
        if (!app.docs_lor) allMissingDocs.push('Recommendation Letter');
        if (!app.docs_english && app.docs_english_required) allMissingDocs.push('English Language Qualification');
      }
    });
    return processDynamicBlockers(allMissingDocs);
  }, [applications]);
  
  const { topThree, overflowTotalFiles, overflowUniqueTypesCount, allSortedDocs } = metrics;
  const totalBlockedFiles = applications.filter(a => a.applicationStatus === 'incomplete').length;
  
  const maxRelativeScale = topThree[0]?.count || 1;

  if (topThree.length === 0) {
    if (embedded) {
      return (
        <div className="flex flex-col justify-center h-full">
          <p className="text-[11px] text-slate-400">All documentation is currently compliant.</p>
        </div>
      );
    }
    return (
      <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col justify-center h-full">
        <h3 className="text-[14px] font-semibold text-slate-500 tracking-wide mb-1">Missing Documentation</h3>
        <p className="text-[11px] text-slate-400">All documentation is currently compliant.</p>
      </div>
    );
  }

  const chartColors = ['#FF1E56', '#475569', '#F59E0B'];
  const chartData = topThree.map((doc, idx) => ({
    name: doc.name,
    value: doc.count || 0,
    color: chartColors[idx] || '#64748B',
    actualCount: doc.count
  }));

  const totalMissingCount = topThree.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="relative font-sans antialiased h-full">
      
      <div className={embedded ? "flex flex-col justify-between h-full select-none" : "bg-white border border-slate-200 rounded-[24px] p-6 flex flex-col justify-between h-full shadow-sm select-none hover:border-slate-300 transition-all"}>
        <div>
          {!embedded && <h3 className="text-base font-bold text-[#1E293B] tracking-tight">Missing Documentation</h3>}
          <p className={`text-[11px] font-medium text-slate-400 leading-normal ${embedded ? '-mt-2 mb-1' : 'mt-1'}`}>
            Applications delayed waiting on agent compliance corrections.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-2 items-center flex-1 my-1">
          <div className="col-span-6 h-[130px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="83%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} files missing`, name]}
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[18px] font-black text-rose-600">{totalMissingCount}</span>
              <span className="text-[8px] font-bold text-slate-400 tracking-widest leading-none">Files</span>
            </div>
          </div>

          <div className="col-span-6 space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
            {topThree.map((doc, idx) => {
              const hexColor = chartColors[idx] || '#64748B';
              const isSelected = activeFilter?.type === 'missing_doc' && activeFilter?.value === doc.name;

              return (
                <div 
                  key={doc.name} 
                  onClick={() => onMetricClick && onMetricClick('missing_doc', doc.name)}
                  className={`p-1 rounded-lg border border-transparent cursor-pointer transition-colors flex items-start gap-1.5 ${
                    isSelected ? 'bg-slate-50 border-slate-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: hexColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-700 leading-tight truncate tracking-tight">{doc.name}</p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{doc.count} cases</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 mt-1">
          {overflowUniqueTypesCount > 0 && (
            <div 
              onClick={() => setIsDrawerOpen(true)}
              className="group flex items-center justify-between p-2 bg-slate-50/80 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all cursor-pointer active:scale-[0.99]"
            >
              <span className="text-[9px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center px-1 py-0.5 bg-slate-200 text-[#1E293B] font-black rounded text-[8px]">
                  +{overflowUniqueTypesCount}
                </span>
                Other Document Requirements
              </span>
              <span className="text-[10px] font-black text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                {overflowTotalFiles} files viewable →
              </span>
            </div>
          )}

          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="w-full text-center text-xs font-black py-2.5 rounded-xl border tracking-wide bg-rose-50/60 text-[#EF4444] border-rose-100/70 hover:bg-rose-100/80 transition-all active:scale-[0.98]"
          >
            ⚠️ Action Needed: {totalBlockedFiles} Files Blocked
          </button>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/40 backdrop-blur-sm animate-fade-in">
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between border-l border-slate-100">
            <div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-lg font-black text-[#1E293B] tracking-tight">System Documentation Logs</h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Comprehensive review of pipeline missing properties</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 scrollbar-thin">
                {allSortedDocs.map((doc, index) => (
                  <div 
                    key={doc.name} 
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors cursor-pointer"
                    onClick={() => {
                      if (onMetricClick) onMetricClick('missing_doc', doc.name);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400 w-4 text-right">#{index + 1}</span>
                      <span className="text-xs font-extrabold text-[#334155] tracking-tight">{doc.name}</span>
                    </div>
                    <span className="bg-white border border-slate-200 text-[#1E293B] font-black text-xs px-2.5 py-1 rounded-lg shadow-sm">
                      {doc.count} cases
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="w-full bg-[#1E293B] text-white font-bold text-sm py-3 rounded-xl hover:bg-[#0F172A] transition-all"
            >
              Dismiss Log Viewer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}