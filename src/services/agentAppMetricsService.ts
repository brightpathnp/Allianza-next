import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { normalizeCountryName } from '../lib/countryUtils';

export interface AgentAppMetrics {
  totalActive: number;
  funnel: {
    incomplete: number;
    requestInterview: number;
    approved: number;
    rejected: number;
  };
  programs: {
    management: number;
    mba: number;
    tourism: number;
  };
  topPrograms: {
    name: string;
    count: number;
  }[];
  avgProcessingDays: number;
  blockedFilesCount: number;
  missingDocsBreakdown: {
    transcripts: number;
    passport: number;
    englishProof: number;
  };
  intakes: Record<string, number>;
  stagnation: {
    active: number;
    warning: number;
    stale: number;
  };
  approvedDestinations: Record<string, number>;
  commissions: {
    cleared: number;
    forecast: number;
  };
}

export const fetchAgentAppPageMetrics = async (agentId: string): Promise<AgentAppMetrics> => {
  const appsRef = collection(db, 'applications');
  const q = query(appsRef, where('agentId', '==', agentId));
  const snapshot = await getDocs(q);

  const stats: AgentAppMetrics = {
    totalActive: 0,
    funnel: { incomplete: 0, requestInterview: 0, approved: 0, rejected: 0 },
    programs: { management: 0, mba: 0, tourism: 0 },
    topPrograms: [],
    avgProcessingDays: 0,
    blockedFilesCount: 0,
    missingDocsBreakdown: { transcripts: 0, passport: 0, englishProof: 0 },
    intakes: {},
    stagnation: { active: 0, warning: 0, stale: 0 },
    approvedDestinations: {},
    commissions: { cleared: 0, forecast: 0 }
  };

  const programCounts: Record<string, number> = {};

  let totalDaysSum = 0;
  let calculationEligibleCount = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const status = (data.applicationStatus || data.status || '').toLowerCase().trim();

    // Skip withdrawn applications
    if (status === 'withdrawn') return;

    stats.totalActive += 1;

    // 1. Terminology Status Mapping
    if (status === 'incomplete') stats.funnel.incomplete += 1;
    if (status === 'request interview' || status === 'interview_requested') stats.funnel.requestInterview += 1;
    if (status === 'approved') stats.funnel.approved += 1;
    if (status === 'rejected') stats.funnel.rejected += 1;

    // 2. Approved Destinations & Commission Forecast
    // Commission for ONLY those students whose status is approved
    let commissionVal = 1200; // standard commission
    if (data.commissionValue) {
      if (typeof data.commissionValue === 'string') {
        const parsed = Number(data.commissionValue.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) commissionVal = parsed;
      } else if (typeof data.commissionValue === 'number' && !isNaN(data.commissionValue)) {
        commissionVal = data.commissionValue;
      }
    } else if (data.commissionAmount) {
      if (typeof data.commissionAmount === 'string') {
        const parsed = Number(data.commissionAmount.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) commissionVal = parsed;
      } else if (typeof data.commissionAmount === 'number' && !isNaN(data.commissionAmount)) {
        commissionVal = data.commissionAmount;
      }
    }

    if (status === 'approved') {
      stats.commissions.forecast += commissionVal;

      // Extract Destination Country
      let destination = data.destinationCountry || data.destination || data.country || '';
      if (!destination) {
        const uniIdOrName = (data.targetUniversityId || data.targetUniversityName || data.universityName || '').toLowerCase();
        if (uniIdOrName.includes('malta') || uniIdOrName === 'gcm') destination = 'Malta';
        else if (uniIdOrName.includes('georgia')) destination = 'Georgia';
        else if (uniIdOrName.includes('australia') || uniIdOrName === 'acu' || uniIdOrName === 'cqu' || uniIdOrName === 'ltu' || uniIdOrName === 'cdu' || uniIdOrName === 'csu') destination = 'Australia';
        else if (uniIdOrName.includes('kingdom') || uniIdOrName.includes('uk') || uniIdOrName.includes('coventry') || uniIdOrName.includes('oxford') || uniIdOrName.includes('gbs-uk')) destination = 'United Kingdom';
        else if (uniIdOrName.includes('france') || uniIdOrName.includes('paris')) destination = 'France';
        else if (uniIdOrName.includes('canada') || uniIdOrName.includes('waterloo') || uniIdOrName.includes('toronto')) destination = 'Canada';
        else if (uniIdOrName.includes('usa') || uniIdOrName.includes('united states')) destination = 'USA';
        else if (uniIdOrName.includes('germany')) destination = 'Germany';
        else destination = data.targetUniversityId || 'Other';
      }

      const normalizedDest = normalizeCountryName(destination);
      if (normalizedDest) {
        stats.approvedDestinations[normalizedDest] = (stats.approvedDestinations[normalizedDest] || 0) + 1;
      }
    } else if (status === 'enrolled' || status === 'paid' || status === 'cleared') {
      stats.commissions.cleared += commissionVal;
    }

    const intakeKey = data.targetTerm || data.intake || (data.intakeTerm && data.intakeYear ? `${data.intakeTerm} ${data.intakeYear}` : data.intakeTerm) || 'Unknown';
    if (intakeKey) {
      stats.intakes[intakeKey] = (stats.intakes[intakeKey] || 0) + 1;
    }

    const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date());
    const daysSinceUpdate = (new Date().getTime() - updatedAt.getTime()) / (1000 * 3600 * 24);
    
    if (status !== 'approved' && status !== 'rejected') {
      if (daysSinceUpdate < 7) {
        stats.stagnation.active += 1;
      } else if (daysSinceUpdate <= 14) {
        stats.stagnation.warning += 1;
      } else {
        stats.stagnation.stale += 1;
      }
    }

    // 3. Program Demand Breakdown
    const programName = data.programName || data.targetProgramId || '';
    if (programName) {
      programCounts[programName] = (programCounts[programName] || 0) + 1;
    }
    
    if (programName === 'BA in Management') stats.programs.management += 1;
    else if (programName === 'MBA') stats.programs.mba += 1;
    else if (programName === 'MSc Tourism & Events') stats.programs.tourism += 1;

    // 4. Turnaround SLA calculations
    if (typeof data.processingDays === 'number') {
      totalDaysSum += data.processingDays;
      calculationEligibleCount += 1;
    } else {
      const created = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
      const updated = data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null);
      if (created && updated && updated >= created) {
        const diffMs = updated.getTime() - created.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        totalDaysSum += Math.max(0.5, diffDays);
        calculationEligibleCount += 1;
      }
    }

    // 5. Incomplete/Missing Document Counter
    if (status === 'incomplete') {
      stats.blockedFilesCount += 1;
      if (Array.isArray(data.missingDocuments)) {
        data.missingDocuments.forEach((docType: string) => {
          const upperDoc = docType.toUpperCase();
          if (upperDoc.includes('TRANSCRIPT')) stats.missingDocsBreakdown.transcripts += 1;
          if (upperDoc.includes('PASSPORT') || upperDoc.includes('ID')) stats.missingDocsBreakdown.passport += 1;
          if (upperDoc.includes('ENGLISH') || upperDoc.includes('PROOF')) stats.missingDocsBreakdown.englishProof += 1;
        });
      } else {
         const isMissingTranscript = !data.docs_transcripts;
         const isMissingPassport = !data.docs_passport;
         const isMissingProof = !data.docs_lor; 
 
         if (isMissingTranscript) stats.missingDocsBreakdown.transcripts += 1;
         if (isMissingPassport) stats.missingDocsBreakdown.passport += 1;
         if (isMissingProof) stats.missingDocsBreakdown.englishProof += 1; 
      }
    }
  });

  stats.avgProcessingDays = calculationEligibleCount > 0 ? Math.round(totalDaysSum / calculationEligibleCount) : 1;

  // Calculate top 3 programs
  const entries = Object.entries(programCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  stats.topPrograms = entries.slice(0, 3);

  return stats;
};
