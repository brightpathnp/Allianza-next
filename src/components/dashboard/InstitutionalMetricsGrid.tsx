'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { fetchTotalApplicantMetrics, AggregatedMetrics, getAppStagnationCategory, computeTierSpread } from '../../services/metricsService';
import { IntakeTermSpreadContent, StagnationRiskContent } from '../analytics/IntakeStagnationComponents';
import { ApplicationFunnelContent, TopProgramDemandContent, ProcessingVelocityContent, ComplianceDocumentContent, TotalApplicantsContent, TotalAgentsContent, AcademicTierSpreadContent } from '../analytics/AnalyticsSharedComponents';
import { CustomizableAnalyticsCard, AnalyticsOption } from '../analytics/CustomizableAnalyticsCard';
import DynamicMissingDocsCard from './DynamicMissingDocsCard';
import { shouldExcludeAgency } from '../../utils/excludedAgencies';

interface OperationalMetricsGridProps {
  universityId?: string;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
  applications?: any[];
}

export default function InstitutionalMetricsGrid({ 
  universityId,
  onMetricClick,
  activeFilter,
  applications = []
}: OperationalMetricsGridProps) {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalAgents, setTotalAgents] = useState<number>(0);
  const [agentBreakdown, setAgentBreakdown] = useState<{ approved: number; pending: number; rejected: number }>({ approved: 0, pending: 0, rejected: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchTotalApplicantMetrics(universityId);
        setMetrics(data);
      } catch (err) {
        console.error("Error fetching university metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [universityId]);

  useEffect(() => {
    let agentsDocs: any[] = [];
    let usersDocs: any[] = [];
    let agreementDocs: any[] = [];
    let partnershipDocs: any[] = [];

    const isSameUni = (id1?: string, id2?: string) => {
      if (!id1 || !id2) return false;
      const a = id1.trim().toLowerCase();
      const b = id2.trim().toLowerCase();
      if (a === b) return true;
      const isGCM = (x: string) => x === 'global-college-malta' || x === 'gcm' || x === 'gcm-uid' || x.includes('gcm') || x.includes('malta');
      return isGCM(a) && isGCM(b);
    };

    const updateAgentsMetrics = () => {
      const agentMap = new Map<string, { id: string; agencyName?: string; fullName?: string; status?: string }>();

      agentsDocs.forEach(a => {
        if (a.id && !a.id.startsWith('agent_') && !a.id.startsWith('uni_')) {
          const name = a.agencyName || a.companyName || a.fullName || a.name;
          if (!shouldExcludeAgency(name)) {
            agentMap.set(a.id, { id: a.id, agencyName: a.agencyName || a.companyName, fullName: a.fullName || a.name, status: a.status || 'approved' });
          }
        }
      });

      usersDocs.forEach(u => {
        if ((u.roles?.includes('agent') || u.role === 'agent') && u.id && !u.id.startsWith('agent_') && !u.id.startsWith('uni_')) {
          const name = u.agencyName || u.companyName || u.fullName || u.name;
          if (!shouldExcludeAgency(name)) {
            if (!agentMap.has(u.id)) {
              agentMap.set(u.id, { id: u.id, agencyName: u.agencyName || u.companyName, fullName: u.fullName || u.name, status: u.status || 'approved' });
            }
          }
        }
      });

      const reqByAgentId = new Map<string, string>();
      const reqByAgencyName = new Map<string, string>();

      const processReq = (item: any) => {
        if (universityId && !isSameUni(item.universityId, universityId) && item.universityId !== universityId) {
          return;
        }
        if (item.agentId) {
          reqByAgentId.set(item.agentId, item.status);
        }
        if (item.agencyName) {
          reqByAgencyName.set(item.agencyName, item.status);
          reqByAgencyName.set(item.agencyName.trim().toLowerCase(), item.status);
        }
      };

      agreementDocs.forEach(processReq);
      partnershipDocs.forEach(processReq);

      let approved = 0;
      let pending = 0;
      let rejected = 0;

      agentMap.forEach((agent, id) => {
        let status = reqByAgentId.get(id);
        if (!status && agent.agencyName) {
          status = reqByAgencyName.get(agent.agencyName) || reqByAgencyName.get(agent.agencyName.trim().toLowerCase());
        }
        if (!status) {
          status = agent.status || 'approved';
        }

        const norm = (status || 'approved').toLowerCase();
        if (norm === 'approved' || norm === 'signed' || norm === 'active' || norm === 'finalized' || norm === 'completed') {
          approved++;
        } else if (norm === 'pending' || norm === 'under_review' || norm === 'draft') {
          pending++;
        } else if (norm === 'rejected' || norm === 'declined' || norm === 'suspended' || norm === 'cancelled') {
          rejected++;
        } else {
          approved++;
        }
      });

      if (agentMap.size === 0 && (agreementDocs.length > 0 || partnershipDocs.length > 0)) {
        const allReqs = [...agreementDocs, ...partnershipDocs];
        allReqs.forEach(item => {
          if (universityId && !isSameUni(item.universityId, universityId) && item.universityId !== universityId) return;
          const norm = (item.status || 'approved').toLowerCase();
          if (norm === 'approved' || norm === 'signed' || norm === 'active' || norm === 'finalized') approved++;
          else if (norm === 'pending' || norm === 'under_review') pending++;
          else if (norm === 'rejected' || norm === 'declined' || norm === 'suspended') rejected++;
          else approved++;
        });
        const calcTotal = approved + pending + rejected;
        setTotalAgents(calcTotal);
        setAgentBreakdown({ approved, pending, rejected });
      } else {
        setTotalAgents(agentMap.size);
        setAgentBreakdown({ approved, pending, rejected });
      }
    };

    const unsub1 = onSnapshot(collection(db, 'agents'), (snap) => {
      agentsDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateAgentsMetrics();
    }, (err) => console.warn("Notice: Error listening agents:", err));

    const unsub2 = onSnapshot(collection(db, 'users'), (snap) => {
      usersDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateAgentsMetrics();
    }, (err) => console.warn("Notice: Error listening users:", err));

    const unsub3 = onSnapshot(collection(db, 'agreements'), (snap) => {
      agreementDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateAgentsMetrics();
    }, (err) => console.warn("Notice: Error listening agreements:", err));

    const unsub4 = onSnapshot(collection(db, 'partnershipRequests'), (snap) => {
      partnershipDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateAgentsMetrics();
    }, (err) => console.warn("Notice: Error listening partnershipRequests:", err));

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [universityId]);

  const derivedStagnation = useMemo(() => {
    if (applications && applications.length > 0) {
      const stag = { active: 0, warning: 0, stale: 0 };
      applications.forEach(app => {
        const cat = getAppStagnationCategory(app);
        stag[cat]++;
      });
      return stag;
    }
    return metrics?.stagnation || { active: 0, warning: 0, stale: 0 };
  }, [applications, metrics?.stagnation]);

  const derivedTierSpread = useMemo(() => {
    if (applications && applications.length > 0) {
      return computeTierSpread(applications);
    }
    if (metrics?.tierSpread) {
      const ts = metrics.tierSpread;
      const tierList = [
        { name: "Bachelor's tier", val: ts.bachelor },
        { name: "Master's tier", val: ts.master },
        { name: "Diploma tier", val: ts.diploma },
        { name: "Doctorate tier", val: ts.phd },
      ];
      tierList.sort((a, b) => b.val - a.val);
      let dominant = 'No application tiers recorded yet.';
      if (tierList[0].val > 0) {
        if (tierList[0].val === tierList[1]?.val) {
          dominant = `${tierList[0].name} and ${tierList[1].name} tied at ${tierList[0].val}% of volume.`;
        } else {
          dominant = `${tierList[0].name} dominant at ${tierList[0].val}% of volume.`;
        }
      }
      return { ...ts, dominantText: dominant };
    }
    return { diploma: 0, bachelor: 0, master: 0, phd: 0, dominantText: 'No application tiers recorded yet.' };
  }, [applications, metrics?.tierSpread]);

  const derivedFunnel = useMemo(() => {
    if (applications && applications.length > 0) {
      const submitted = applications.filter(a => ['submitted', 'received', 'in_review', 'under_review'].includes((a.applicationStatus || a.status || '').toLowerCase())).length;
      const interviewPending = applications.filter(a => ['interview_pending', 'interview_requested', 'interview_scheduled', 'interview'].includes((a.applicationStatus || a.status || '').toLowerCase())).length;
      const approved = applications.filter(a => ['approved', 'offer_issued', 'finalized'].includes((a.applicationStatus || a.status || '').toLowerCase())).length;
      const incomplete = applications.filter(a => ['incomplete', 'pending_docs', 'pending_documents'].includes((a.applicationStatus || a.status || '').toLowerCase())).length;
      const rejected = applications.filter(a => ['rejected', 'declined'].includes((a.applicationStatus || a.status || '').toLowerCase())).length;
      const withdrawn = applications.filter(a => ['withdrawn', 'cancelled'].includes((a.applicationStatus || a.status || '').toLowerCase())).length;
      return { submitted, interviewPending, approved, incomplete, rejected, withdrawn, total: applications.length };
    }
    return metrics?.statuses || { submitted: 0, interviewPending: 0, approved: 0, incomplete: 0, rejected: 0, withdrawn: 0, total: 0 };
  }, [applications, metrics?.statuses]);

  if (loading && (!applications || applications.length === 0) && !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 animate-pulse p-1">
        <div className="lg:col-span-5 h-[380px] bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40" />
        <div className="lg:col-span-3 h-[380px] bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40" />
        <div className="lg:col-span-4 h-[380px] bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40" />
      </div>
    );
  }

  const { totalCount, intakes, stagnation, statuses, programs = [], avgProcessingDays = 0, missingDocsBreakdown = { transcripts: 0, passport: 0, englishProof: 0 } } = metrics || {
    totalCount: applications.length,
    intakes: {},
    stagnation: derivedStagnation,
    statuses: derivedFunnel,
    programs: [],
    avgProcessingDays: 3,
    missingDocsBreakdown: { transcripts: 0, passport: 0, englishProof: 0 }
  };

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

    if (applications && applications.length > 0) {
      applications.forEach(a => {
        const kLow = `${a.intakeTerm || ''} ${a.intakeYear || ''}`.toLowerCase().trim();
        if (kLow.includes(season) && (year ? kLow.includes(year) : true)) {
          count++;
        }
      });
    } else {
      Object.keys(intakes).forEach(key => {
        const kLow = key.toLowerCase().trim();
        if (kLow.includes(season) && (year ? kLow.includes(year) : true)) {
          count += intakes[key];
        }
      });
    }
    return { name: term, value: count, color: chartColors[index] };
  });

  const totalEffectiveCount = applications.length > 0 ? applications.length : totalCount;

  const uniOptions: AnalyticsOption[] = [
    { id: 'applicants', label: 'Status Breakdown', component: <TotalApplicantsContent total={totalEffectiveCount} growth="+4.8% vs last month" statuses={derivedFunnel} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'intake', label: 'Intake Term Spread', component: <IntakeTermSpreadContent intakeData={intakeData} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'total_agents', label: 'Total Agents', component: <TotalAgentsContent total={totalAgents} growth="+2.4% vs last month" breakdown={agentBreakdown} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'programs', label: 'Top Program Demand', component: <TopProgramDemandContent programs={programs} totalActive={totalEffectiveCount} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
    { id: 'velocity', label: 'Processing Velocity', component: <ProcessingVelocityContent avgDays={avgProcessingDays} totalActive={totalEffectiveCount} /> },
    { id: 'missing_docs', label: 'Missing Documentation', component: <DynamicMissingDocsCard applications={applications} onMetricClick={onMetricClick} activeFilter={activeFilter} embedded={true} /> },
    { id: 'stagnation', label: 'Pipeline Stagnation Risk', component: <StagnationRiskContent stagnation={derivedStagnation} onMetricClick={onMetricClick} activeFilter={activeFilter} /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 font-sans antialiased select-none items-stretch">
      
      <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-1 h-full min-h-[380px] transform-gpu">
        <h3 className="text-sm font-bold text-slate-400 tracking-tight mb-4 uppercase tracking-widest text-[10px]">Application Pipeline Funnel</h3>
        <div className="flex-1 flex flex-col justify-center">
          <ApplicationFunnelContent 
            funnel={derivedFunnel} 
            onMetricClick={onMetricClick} 
            activeFilter={activeFilter} 
          />
        </div>
      </div>

      <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40 flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-1 h-full min-h-[380px] transform-gpu">
        <h3 className="text-sm font-bold text-slate-400 tracking-tight mb-4 uppercase tracking-widest text-[10px]">Academic Tier Spread</h3>
        <div className="flex-1 flex flex-col justify-center">
          <AcademicTierSpreadContent 
            data={derivedTierSpread} 
            onMetricClick={onMetricClick} 
            activeFilter={activeFilter} 
          />
        </div>
      </div>

      <div className="lg:col-span-4 h-full min-h-[380px] flex flex-col">
        <CustomizableAnalyticsCard 
          id="university_dashboard_last_card"
          options={uniOptions}
          defaultOptionId="total_agents"
          className="h-full min-h-[380px]"
        />
      </div>

    </div>
  );
}