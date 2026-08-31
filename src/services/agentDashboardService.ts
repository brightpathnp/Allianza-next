import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface AgentDashboardData {
  companyName: string;
  totalApplications: number;
  monthlyApplications: { month: string; students: number }[];
  pipeline: {
    incomplete: number;
    requestInterview: number;
    approved: number;
    rejected: number;
  };
  missingDocs: {
    passport: number;
    englishProof: number;
    transcripts: number;
    sop: number;
  };
  destinations: {
    malta: number;
    georgia: number;
    [key: string]: number;
  };
  commissions: {
    cleared: number;
    forecast: number;
  };
}

export const fetchAgentDashboardMetrics = async (agentId: string, agentCompanyNameParam?: string): Promise<AgentDashboardData> => {
  // Use passed company name from profile, fallback if missing
  let agentCompanyName = agentCompanyNameParam || "Bright Path Education"; 
  const allMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const cacheKey = `agent_dashboard_metrics_${agentId}`;

  const defaultData: AgentDashboardData = {
    companyName: agentCompanyName,
    totalApplications: 0,
    monthlyApplications: allMonths.map(m => ({ month: m, students: 0 })),
    pipeline: { incomplete: 0, requestInterview: 0, approved: 0, rejected: 0 },
    missingDocs: { passport: 0, englishProof: 0, transcripts: 0, sop: 0 },
    destinations: { malta: 0, georgia: 0 },
    commissions: { cleared: 0, forecast: 0 }
  };

  try {
    const appsRef = collection(db, 'applications');
    const q = query(appsRef, where('agentId', '==', agentId));
    const querySnapshot = await getDocs(q);

    const monthlyCounts: Record<string, number> = {};
    
    const data: AgentDashboardData = {
      companyName: agentCompanyName,
      totalApplications: 0,
      monthlyApplications: [],
      pipeline: { incomplete: 0, requestInterview: 0, approved: 0, rejected: 0 },
      missingDocs: { passport: 0, englishProof: 0, transcripts: 0, sop: 0 },
      destinations: { malta: 0, georgia: 0 },
      commissions: { cleared: 0, forecast: 0 }
    };

    querySnapshot.forEach((doc) => {
      const item = doc.data();
      const status = (item.applicationStatus || item.status || '').toLowerCase().trim();

      // Skip withdrawn applications
      if (status === 'withdrawn') return;

      data.totalApplications += 1;
      
      // Monthly aggregation
      if (item.createdAt) {
        let date: Date;
        if (item.createdAt.toDate) {
          date = item.createdAt.toDate();
        } else {
          date = new Date(item.createdAt);
        }
        const monthSource = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        monthlyCounts[monthSource] = (monthlyCounts[monthSource] || 0) + 1;
      }

      // Normalize status mapping 
      const normalizedStatus = item.applicationStatus || item.status || '';

      // 1. Pipeline Matching Unified Platform Taxonomy
      if (normalizedStatus === 'incomplete') data.pipeline.incomplete += 1;
      if (normalizedStatus === 'interview_requested') data.pipeline.requestInterview += 1;
      if (normalizedStatus === 'approved') data.pipeline.approved += 1;
      if (normalizedStatus === 'rejected') data.pipeline.rejected += 1;

      // 2. Aggregate Document Flags from Incomplete Files
      if ((status === 'incomplete' || status === 'Incomplete') && Array.isArray(item.missingDocuments)) {
        item.missingDocuments.forEach((docName: string) => {
          if (docName === 'Passport / ID Scan' || docName === 'Passport Scan') data.missingDocs.passport += 1;
          if (docName === 'English Proof Pending' || docName === 'English Proof / MOI') data.missingDocs.englishProof += 1;
          if (docName === 'Missing Transcripts' || docName === 'Academic Transcripts') data.missingDocs.transcripts += 1;
          if (docName === 'Statement of Purpose') data.missingDocs.sop += 1;
        });
      } else if (status !== 'approved' && status !== 'rejected') {
        const isMissingTranscript = !item.docs_transcripts;
        const isMissingPassport = !item.docs_passport;
        const isMissingProof = !item.docs_lor; // Actually missing proof of english in your data structure

        if (isMissingTranscript) data.missingDocs.transcripts += 1;
        if (isMissingPassport) data.missingDocs.passport += 1;
        if (isMissingProof) data.missingDocs.englishProof += 1; // Assuming lor maps here, or logic needs adjustment.
      }

      // 3. Destinational Metric Split
      const destination = item.destination || item.targetUniversityId || '';
      if (destination.toLowerCase().includes('malta')) {
        data.destinations.malta += 1;
      } else if (destination.toLowerCase().includes('georgia')) {
        data.destinations.georgia += 1;
      } else {
        const dKey = destination.trim().toLowerCase();
        if (dKey) {
          data.destinations[dKey] = (data.destinations[dKey] || 0) + 1;
        }
      }

      // 4. Financial Projections
      // Only count commissions from specific statuses
      // Cleared: enrolled, paid, cleared
      // Forecast (Projection): approved
      let val = 1200; // default average commission per student
      if (item.commissionValue) {
        if (typeof item.commissionValue === 'string') {
          const parsed = Number(item.commissionValue.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) val = parsed;
        } else if (typeof item.commissionValue === 'number' && !isNaN(item.commissionValue)) {
          val = item.commissionValue;
        }
      }
      
      if (status === 'enrolled' || status === 'paid' || status === 'cleared') {
        data.commissions.cleared += val;
      } else if (status === 'approved') {
        data.commissions.forecast += val;
      }
    });

    data.monthlyApplications = allMonths.map(m => ({ month: m, students: monthlyCounts[m] || 0 }));
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
      // ignore localStorage write errors
    }

    return data;
  } catch (err) {
    console.warn("Notice: fetchAgentDashboardMetrics encountered fetch issue, attempting cached data fallback:", err);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore parse errors
    }
    return defaultData;
  }
};

export const fetchGlobalProgramDemand = async (): Promise<{ courseName: string; count: number }[]> => {
  try {
    const appsRef = collection(db, 'applications');
    // For site-wide, we fetch all non-withdrawn applications to compute the real site-wide demand
    const querySnapshot = await getDocs(appsRef);
    const courseCounts: Record<string, number> = {};

    querySnapshot.forEach((doc) => {
      const item = doc.data();
      const status = (item.applicationStatus || item.status || '').toLowerCase().trim();
      if (status === 'withdrawn') return;

      let prog = item.targetProgramId || item.programName || '';
      if (typeof prog === 'object') prog = prog.name || '';

      // Normalize common program names
      const p = prog.toLowerCase();
      if (p.includes('mba') || p.includes('business admin')) {
        prog = 'MBA';
      } else if (p.includes('management') || p.includes('ba ')) {
        prog = 'BA in Management';
      } else if (p.includes('tourism') || p.includes('event')) {
        prog = 'MSc Tourism & Events';
      } else {
        prog = prog || 'Other Programs';
      }

      courseCounts[prog] = (courseCounts[prog] || 0) + 1;
    });

    return Object.entries(courseCounts)
      .map(([courseName, count]) => ({ courseName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  } catch (err) {
    console.error("Error fetching global program demand:", err);
    return [];
  }
};
