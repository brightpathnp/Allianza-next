'use client';

import { useState, useEffect } from 'react';
import { fetchAgentAppPageMetrics, AgentAppMetrics } from '@/services/agentAppMetricsService';
import { IntakeTermSpreadContent, StagnationRiskContent } from '@/components/analytics/IntakeStagnationComponents';
import { ApplicationFunnelContent, TopProgramDemandContent, ProcessingVelocityContent, ComplianceDocumentContent, DestinationHubsContent, CommissionForecastContent } from '@/components/analytics/AnalyticsSharedComponents';
import { CustomizableAnalyticsCard, AnalyticsOption } from '@/components/analytics/CustomizableAnalyticsCard';
import { useAuth } from '@/contexts/AuthContext';

interface ComponentProps {
  agentId: string;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
}

export default function AgentAppMetricsGrid({ agentId, onMetricClick, activeFilter }: ComponentProps) {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<AgentAppMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const aggregatedData = await fetchAgentAppPageMetrics(agentId);
        setMetrics(aggregatedData);
      } catch (err) {
        console.error("Telemetry failed on application view:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [agentId]);

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-pulse p-1">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-[20px] p-6 h-[410px]" />
        ))}
      </div>
    );
  }

  const { 
    totalActive, 
    funnel, 
    topPrograms = [], 
    avgProcessingDays, 
    blockedFilesCount, 
    missingDocsBreakdown, 
    intakes, 
    stagnation,
    approvedDestinations = {},
    commissions = { cleared: 0, forecast: 0 }
  } = metrics;

  const currentYear = new Date().getFullYear();
  const targetTermsRaw = [
    `Fall ${currentYear}`,
    `Winter ${currentYear}`,
    `Spring ${currentYear + 1}`,
    `Summer ${currentYear + 1}`
  ];

  const chartColors = ['#f59e0b', '#ec4899', '#0ea5e9', '#0059e7'];
  const intakeData = targetTermsRaw.map((term, index) => {
    let count = 0;
    const parts = term.toLowerCase().split(' ');
    const season = parts[0];
    const year = parts[1];

    Object.keys(intakes).forEach(key => {
      const kLow = key.toLowerCase().trim();
      if (kLow.includes(season) && (year ? kLow.includes(year) : true)) {
        count += intakes[key];
      }
    });
    return { name: term, value: count, color: chartColors[index] };
  });

  const agentOptions: AnalyticsOption[] = [
    { id: 'velocity', label: 'Processing Velocity', component: <ProcessingVelocityContent avgDays={avgProcessingDays} totalActive={totalActive} /> },
    { id: 'intake', label: 'Intake Term Spread', component: <IntakeTermSpreadContent intakeData={intakeData} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'stagnation', label: 'Pipeline Stagnation Risk', component: <StagnationRiskContent stagnation={stagnation} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'compliance', label: 'Compliance Document Distribution', component: <ComplianceDocumentContent breakdown={missingDocsBreakdown} total={blockedFilesCount} /> },
    { 
      id: 'hubs', 
      label: 'Destination Sourcing Hubs', 
      component: (
        <DestinationHubsContent 
          preferredDestinations={profile?.preferredDestinations || ['United Kingdom', 'Australia']} 
          approvedDestinations={approvedDestinations} 
          onMetricClick={onMetricClick}
          activeFilter={activeFilter}
        />
      ) 
    },
    { 
      id: 'commission', 
      label: 'Commission Forecast', 
      component: (
        <CommissionForecastContent 
          cleared={commissions.cleared}
          forecast={commissions.forecast}
          onMetricClick={onMetricClick} 
          activeFilter={activeFilter} 
        />
      ) 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1 font-sans antialiased select-none">
      
      <div className="bg-white border border-slate-200 rounded-[20px] p-6 flex flex-col justify-between h-[340px] shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-500 tracking-tight">Application Funnel</h3>
          <div className="text-4xl font-black text-[#1E293B] tracking-tight mt-1">{totalActive}</div>
          <p className="text-[11px] font-medium text-slate-400 mt-1 truncate" title="Total active files currently in processing status.">Total active files currently in processing status.</p>
        </div>
        <div className="flex-1">
          <ApplicationFunnelContent 
            funnel={{ 
              ...funnel, 
              interviewPending: funnel.requestInterview,
              total: totalActive 
            }} 
            onMetricClick={onMetricClick} 
            activeFilter={activeFilter} 
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[20px] p-6 flex flex-col justify-between h-[340px] shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-500 tracking-tight">Top Program Demand</h3>
          <p className="text-[11px] font-medium text-slate-400 mt-1 truncate" title="Real-time enrollment application counts per track.">Real-time enrollment application counts per track.</p>
        </div>
        <div className="flex-1">
          <TopProgramDemandContent programs={topPrograms} totalActive={totalActive} onMetricClick={onMetricClick} activeFilter={activeFilter} />
        </div>
        <div className="text-[11px] font-bold text-slate-400 leading-normal border-t border-slate-50 pt-2 truncate">
          Specializations determine marketing allocations.
        </div>
      </div>

      <CustomizableAnalyticsCard 
        id="agent_dashboard_last_card"
        options={agentOptions}
        defaultOptionId="velocity"
        className="h-[340px] rounded-[20px] shadow-sm border-slate-200"
      />

    </div>
  );
}