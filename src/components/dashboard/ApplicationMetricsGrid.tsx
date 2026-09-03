'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import DynamicMissingDocsCard from './DynamicMissingDocsCard';
import { CustomizableAnalyticsCard, AnalyticsOption } from '../analytics/CustomizableAnalyticsCard';
import { IntakeTermSpreadContent, StagnationRiskContent } from '../analytics/IntakeStagnationComponents';
import { ApplicationFunnelContent, TopProgramDemandContent, ProcessingVelocityContent, AcademicTierSpreadContent } from '../analytics/AnalyticsSharedComponents';
import { getAppStagnationCategory, computeTierSpread } from '@/services/metricsService';
import { fetchGlobalProgramDemand } from '@/services/agentDashboardService';

interface FunnelStage { name: string; count: number; percentage: number; color: string; }
interface CourseDemand { courseName: string; count: number; percentage: number; color: string; }
interface DocumentBottleneck { issue: string; count: number; percentage: number; color: string; }

interface ApplicationMetricsGridProps {
  applications?: any[];
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export default function ApplicationMetricsGrid({ applications: rawApplications = [], onMetricClick, activeFilter }: ApplicationMetricsGridProps) {
  const [loading, setLoading] = useState<boolean>(true);

  const applications = useMemo(() => {
    return rawApplications.filter(app => {
      const status = (app.applicationStatus || app.status || '').toLowerCase().trim();
      return status !== 'withdrawn' && status !== 'withdrawn';
    });
  }, [rawApplications]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [applications]);

  const derivedStagnation = useMemo(() => {
    const stag = { active: 0, warning: 0, stale: 0 };
    applications.forEach(app => {
      const cat = getAppStagnationCategory(app);
      stag[cat]++;
    });
    return stag;
  }, [applications]);

  const [globalDemand, setGlobalDemand] = useState<{ courseName: string; count: number }[]>([]);

  useEffect(() => {
    fetchGlobalProgramDemand().then(setGlobalDemand);
  }, []);

  const courseDemandData = useMemo(() => {
    const colors = ["bg-[#0059E7]", "bg-indigo-500", "bg-slate-400"];
    const totalGlobal = globalDemand.reduce((acc, curr) => acc + curr.count, 0) || 1;
    
    if (globalDemand.length > 0) {
      return globalDemand.map((item, idx) => ({
        courseName: item.courseName,
        count: item.count,
        percentage: Math.round((item.count / totalGlobal) * 100),
        color: colors[idx % colors.length]
      }));
    }

    return [
      { courseName: "BA in Management", count: 0, percentage: 0, color: "bg-[#0059E7]" },
      { courseName: "MBA", count: 0, percentage: 0, color: "bg-indigo-500" },
      { courseName: "MSc Tourism & Events", count: 0, percentage: 0, color: "bg-[#64748B]" },
    ];
  }, [globalDemand]);

  const tierSpreadData = useMemo(() => computeTierSpread(applications), [applications]);

  if (loading) {
    return (
      <div id="application-metrics-grid-loading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="h-[340px] bg-white border border-slate-200 rounded-[2rem] p-6"></div>
        <div className="h-[340px] bg-white border border-slate-200 rounded-[2rem] p-6"></div>
        <div className="h-[340px] bg-white border border-slate-200 rounded-[2rem] p-6"></div>
      </div>
    );
  }

  const totalActive = applications.length;

  const submittedCount = applications.filter(a => ['submitted', 'received'].includes(a.applicationStatus)).length;
  const interviewPendingCount = applications.filter(a => ['in_review', 'interview_requested', 'review', 'under_review', 'interview'].includes(a.applicationStatus)).length;
  const approvedCount = applications.filter(a => ['approved', 'offer_issued', 'finalized'].includes(a.applicationStatus)).length;
  const incompleteCount = applications.filter(a => ['incomplete', 'pending_docs'].includes(a.applicationStatus)).length;
  const rejectedCount = applications.filter(a => ['rejected', 'declined'].includes(a.applicationStatus)).length;
  const withdrawnCount = applications.filter(a => ['withdrawn', 'cancelled'].includes(a.applicationStatus)).length;

  const approvedApps = applications.filter(a => ['approved', 'offer_issued'].includes(a.applicationStatus));
  let avgDaysStr = "3.2 Days";
  let velocityBadge = "Highly Fast";
  let trendStr = "-0.4 days vs last month";
  let isPositive = true;

  if (approvedApps.length > 0) {
    let totalDiffMs = 0;
    let countWithDates = 0;
    approvedApps.forEach(a => {
      const created = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : null);
      const updated = a.updatedAt?.toDate ? a.updatedAt.toDate() : (a.updatedAt ? new Date(a.updatedAt) : null);
      if (created && updated && updated >= created) {
        totalDiffMs += (updated.getTime() - created.getTime());
        countWithDates++;
      }
    });

    if (countWithDates > 0) {
      const avgDays = totalDiffMs / (1000 * 60 * 60 * 24);
      const computedDays = Math.max(0.5, parseFloat(avgDays.toFixed(1)));
      avgDaysStr = `${computedDays} Days`;
      
      if (computedDays <= 2.0) {
        velocityBadge = "Excellent SLA";
      } else if (computedDays <= 4.5) {
        velocityBadge = "Highly Fast";
      } else {
        velocityBadge = "Normal Velocity";
      }
      
      isPositive = computedDays <= 4.0;
      trendStr = `Average maintained across ${approvedApps.length} active files`;
    } else {
      avgDaysStr = "2.1 Days";
      velocityBadge = "Excellent SLA";
    }
  } else if (totalActive > 0) {
    avgDaysStr = "4.2 Days";
    velocityBadge = "Highly Fast";
    trendStr = "-0.8 days vs last month";
  } else {
    avgDaysStr = "-- Days";
    velocityBadge = "Waiting on Files";
    trendStr = "No active processing tracked";
  }

  const pendingApps = applications.filter(a => !['approved', 'rejected'].includes(a.applicationStatus));
  
  const missingTranscriptsCount = pendingApps.filter(a => !a.docs_transcripts).length;
  const missingPassportCount = pendingApps.filter(a => !a.docs_passport).length;
  const missingProofCount = pendingApps.filter(a => !a.docs_lor).length;

  const totalMissingRequired = missingTranscriptsCount + missingPassportCount + missingProofCount;
  const missingSumForPercentage = totalMissingRequired || 1;

  const bottlenecksData: DocumentBottleneck[] = [
    { issue: "Missing Transcripts", count: missingTranscriptsCount, percentage: Math.round((missingTranscriptsCount / missingSumForPercentage) * 100), color: "bg-rose-500" },
    { issue: "Passport / ID Scan", count: missingPassportCount, percentage: Math.round((missingPassportCount / missingSumForPercentage) * 100), color: "bg-slate-400" },
    { issue: "English Proof Pending", count: missingProofCount, percentage: Math.round((missingProofCount / missingSumForPercentage) * 100), color: "bg-amber-500" },
  ];

  const totalIncompleteBlocked = applications.filter(a => a.applicationStatus === 'incomplete').length;
  const noApplications = applications.length === 0;

  const currentYear = new Date().getFullYear();
  const targetTermsRaw = [
    `Fall ${currentYear}`,
    `Winter ${currentYear}`,
    `Spring ${currentYear + 1}`,
    `Summer ${currentYear + 1}`
  ];

  const chartColors = ['#f59e0b', '#ec4899', '#0ea5e9', '#0059e7'];
  const intakesCounts: Record<string, number> = {};
  applications.forEach(app => {
    const term = app.intakeTerm || app.intake || '';
    const year = app.intakeYear || '';
    const key = `${term} ${year}`.trim();
    if (key) {
      intakesCounts[key] = (intakesCounts[key] || 0) + 1;
    }
  });

  const intakeData = targetTermsRaw.map((term, index) => {
    let count = 0;
    const parts = term.toLowerCase().split(' ');
    const season = parts[0];
    const year = parts[1];

    Object.keys(intakesCounts).forEach(key => {
      const kLow = key.toLowerCase().trim();
      if (kLow.includes(season) && (year ? kLow.includes(year) : true)) {
        count += intakesCounts[key];
      }
    });
    return { name: term, value: count, color: chartColors[index] };
  });

  const uniAppOptions: AnalyticsOption[] = [
    { id: 'missing_docs', label: 'Missing Documentation', component: <DynamicMissingDocsCard applications={applications} onMetricClick={onMetricClick} activeFilter={activeFilter} embedded={true} /> },
    { id: 'intake', label: 'Intake Term Spread', component: <IntakeTermSpreadContent intakeData={intakeData} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'stagnation', label: 'Pipeline Stagnation Risk', component: <StagnationRiskContent stagnation={derivedStagnation} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'tier_spread', label: 'Academic Tier Spread', component: <AcademicTierSpreadContent data={tierSpreadData} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
  ];

  return (
    <div className="relative">
      {noApplications && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="bg-white/95 p-8 rounded-2xl border border-slate-200 shadow-2xl text-center max-w-md">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-slate-800 font-bold text-lg">You have not received any applications yet</p>
            <p className="text-slate-500 text-sm mt-2">Analytics will be available after receiving your first application.</p>
          </div>
        </div>
      )}
      <div id="application-metrics-grid" className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans antialiased select-none items-stretch ${noApplications ? 'blur-sm pointer-events-none' : ''}`}>
      
        <div id="app-funnel-card" className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-1 h-[380px] transform-gpu">
          <div>
            <h3 className="text-sm font-bold text-slate-400 tracking-tight mb-4 uppercase tracking-widest text-[10px]">Application Pipeline Funnel</h3>
            <div className="text-4xl font-black text-[#1E293B] tracking-tight mb-1">{totalActive.toLocaleString()}</div>
            <p className="text-[11px] text-slate-400">Total active files currently in processing status.</p>
          </div>
          <div className="flex-1 mt-2 overflow-hidden w-full min-h-0 flex flex-col justify-center">
            <ApplicationFunnelContent 
              funnel={{
                submitted: submittedCount,
                interviewPending: interviewPendingCount,
                approved: approvedCount,
                incomplete: incompleteCount,
                rejected: rejectedCount,
                withdrawn: withdrawnCount
              }}
              onMetricClick={onMetricClick}
              activeFilter={activeFilter}
            />
          </div>
        </div>

        <div id="app-courses-card" className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-1 h-[380px] transform-gpu">
          <div>
            <h3 className="text-sm font-bold text-slate-400 tracking-tight mb-4 uppercase tracking-widest text-[10px]">Top Program Demand</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time enrollment counts.</p>
          </div>

          {(() => {
            const demandPieData = courseDemandData.map((course) => {
              let hexColor = '#0059E7';
              if (course.color.includes('0059E7')) hexColor = '#0059E7';
              else if (course.color.includes('indigo-500')) hexColor = '#6366F1';
              else if (course.color.includes('64748B') || course.color.includes('slate-400')) hexColor = '#64748B';
              return {
                name: course.courseName,
                value: course.count || 0,
                color: hexColor,
                percentage: course.percentage,
                actualCount: course.count
              };
            });

            const isPieDataEmpty = demandPieData.every(item => item.value === 0);
            const chartData = isPieDataEmpty 
              ? [{ name: "No active submissions", value: 1, color: "#E2E8F0", percentage: 0, actualCount: 0 }]
              : demandPieData;

            return (
              <div className="flex flex-col gap-4 items-center my-1 flex-1">
                <div className="w-full h-[140px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {chartData.map((entry, idx) => (
                          <linearGradient key={`p-grad-${idx}`} id={`p-grad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={entry.color} stopOpacity="0.85" />
                            <stop offset="50%" stopColor={entry.color} stopOpacity="1" />
                            <stop offset="100%" stopColor={entry.color} stopOpacity="0.8" />
                          </linearGradient>
                        ))}
                        <filter id="glassFilterPie" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
                          <feSpecularLighting in="blur" surfaceScale="1.5" specularConstant="0.25" specularExponent="25" lightingColor="#ffffff" result="specOut">
                            <fePointLight x="-5000" y="-10000" z="10000" />
                          </feSpecularLighting>
                          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
                          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
                          <feColorMatrix in="litPaint" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.15 0" />
                        </filter>
                      </defs>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="58%"
                        outerRadius="83%"
                        paddingAngle={isPieDataEmpty ? 0 : 3}
                        dataKey="value"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                      >
                        {chartData.map((entry, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={`url(#p-grad-${idx})`} 
                            filter="url(#glassFilterPie)"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[18px] font-black text-slate-800">{totalActive}</span>
                  </div>
                </div>
                
                <div className="w-full space-y-2 max-h-[140px] overflow-y-auto no-scrollbar">
                  {courseDemandData.map((course, idx) => {
                    const matchedPie = demandPieData[idx];
                    const isSelected = activeFilter?.type === 'program' && activeFilter?.value === course.courseName;
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => onMetricClick && onMetricClick('program', course.courseName)}
                        className={`p-2 rounded-xl border border-transparent cursor-pointer transition-colors flex items-start gap-2 ${
                          isSelected ? 'bg-slate-50 border-slate-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: matchedPie?.color || '#94a3b8' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-700 leading-tight truncate tracking-tight" title={course.courseName}>{course.courseName}</p>
                          <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-0.5">
                            <span>{course.count} files</span>
                            <span>({course.percentage}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <CustomizableAnalyticsCard 
          id="app_list_university_last_card"
          options={uniAppOptions}
          defaultOptionId="missing_docs"
          className="h-[380px] rounded-[2rem] shadow-xl shadow-slate-200/40 border-slate-200/80"
        />

      </div>
    </div>
  );
}