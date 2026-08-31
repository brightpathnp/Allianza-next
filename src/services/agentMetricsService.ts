import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface AgentMetrics {
  totalCount: number;
  // Card 1: Pipeline Breakdown
  pipeline: {
    incomplete: number;
    requestInterview: number;
    approved: number;
    rejected: number;
  };
  // Card 2: Compliance Document Flags
  missingDocsBreakdown: {
    passport: number;
    englishProof: number;
    transcripts: number;
    sop: number;
  };
  // Card 3: Regional Allocation
  destinations: {
    malta: number;
    georgia: number;
  };
  // Card 4: Financial Projections
  commissions: {
    accruedUnlocked: number;  // From 'Approved' files
    pipelineForecast: number; // From 'Request Interview' / 'Incomplete' files
    lostRevenue: number;      // From 'Rejected' files
  };
}

export const fetchAgentOverviewMetrics = async (agentId: string): Promise<AgentMetrics> => {
  const appsRef = collection(db, 'applications');
  const q = query(appsRef, where('agentId', '==', agentId));
  const querySnapshot = await getDocs(q);

  const metrics: AgentMetrics = {
    totalCount: 0,
    pipeline: { incomplete: 0, requestInterview: 0, approved: 0, rejected: 0 },
    missingDocsBreakdown: { passport: 0, englishProof: 0, transcripts: 0, sop: 0 },
    destinations: { malta: 0, georgia: 0 },
    commissions: { accruedUnlocked: 0, pipelineForecast: 0, lostRevenue: 0 }
  };

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    metrics.totalCount += 1;

    // 1. Pipeline Counter Aggregation
    const status = data.status || data.applicationStatus; // fallback mapping if needed based on the previous structure
    
    if (status === 'Incomplete' || status === 'incomplete') metrics.pipeline.incomplete += 1;
    if (status === 'Request Interview' || status === 'interview_requested') metrics.pipeline.requestInterview += 1;
    if (status === 'Approved' || status === 'approved') metrics.pipeline.approved += 1;
    if (status === 'Rejected' || status === 'rejected') metrics.pipeline.rejected += 1;

    // 2. Document Alert Mapping (Only parsed if application is marked Incomplete)
    if ((status === 'Incomplete' || status === 'incomplete') && Array.isArray(data.missingDocuments)) {
      data.missingDocuments.forEach((docName: string) => {
        if (docName === 'Passport Scan' || docName === 'Passport / ID Scan') metrics.missingDocsBreakdown.passport += 1;
        if (docName === 'English Proof / MOI' || docName === 'English Proof Pending') metrics.missingDocsBreakdown.englishProof += 1;
        if (docName === 'Academic Transcripts' || docName === 'Missing Transcripts') metrics.missingDocsBreakdown.transcripts += 1;
        if (docName === 'Statement of Purpose') metrics.missingDocsBreakdown.sop += 1;
      });
    }

    // 3. Destination Tracking
    const destination = data.destination || data.targetUniversityId || '';
    if (destination.toLowerCase().includes('malta')) metrics.destinations.malta += 1;
    if (destination.toLowerCase().includes('georgia')) metrics.destinations.georgia += 1;

    // 4. Milestone FinTech Modeling
    const cashVal = Number(data.commissionValue) || 0;
    if (status === 'Approved' || status === 'approved') {
      metrics.commissions.accruedUnlocked += cashVal;
    } else if (status === 'Rejected' || status === 'rejected') {
      metrics.commissions.lostRevenue += cashVal;
    } else {
      metrics.commissions.pipelineForecast += cashVal;
    }
  });

  return metrics;
};
