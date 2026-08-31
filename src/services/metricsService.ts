import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface ApplicationDoc {
  id: string;
  intakeTerm: string; // e.g., "October 2026 Intake"
  status: 'Interview Pending' | 'Approved' | 'Incomplete' | 'Rejected';
  updatedAt: Timestamp;
}

export interface AggregatedMetrics {
  totalCount: number;
  intakes: { [key: string]: number };
  stagnation: {
    active: number;  // < 7 days
    warning: number; // 7-14 days
    stale: number;   // > 14 days
  };
  statuses: {
    submitted: number;
    interviewPending: number;
    approved: number;
    incomplete: number;
    rejected: number;
    withdrawn: number;
  };
  createdPeriods?: {
    week: number;
    month: number;
    quarter: number;
    year: number;
  };
  programs?: { name: string; count: number }[];
  avgProcessingDays?: number;
  missingDocsBreakdown?: {
    transcripts: number;
    passport: number;
    englishProof: number;
  };
  tierSpread?: {
    diploma: number;
    bachelor: number;
    master: number;
    phd: number;
  };
}

export const createDefaultMetrics = (): AggregatedMetrics => ({
  totalCount: 0,
  intakes: {},
  stagnation: { active: 0, warning: 0, stale: 0 },
  statuses: {
    submitted: 0,
    interviewPending: 0,
    approved: 0,
    incomplete: 0,
    rejected: 0,
    withdrawn: 0
  },
  createdPeriods: { week: 0, month: 0, quarter: 0, year: 0 },
  programs: [],
  avgProcessingDays: 3,
  missingDocsBreakdown: { transcripts: 0, passport: 0, englishProof: 0 },
  tierSpread: { diploma: 0, bachelor: 0, master: 0, phd: 0 }
});

const metricsCache: { [key: string]: { data: AggregatedMetrics; timestamp: number } } = {};
const CACHE_TTL = 30000; // 30 seconds

export const getAppStagnationCategory = (app: any): 'active' | 'warning' | 'stale' => {
  const rawDate = app?.updatedAt || app?.createdAt || null;
  let date = new Date();
  if (rawDate) {
    if (typeof rawDate.toDate === 'function') {
      date = rawDate.toDate();
    } else if (rawDate.seconds !== undefined) {
      date = new Date(rawDate.seconds * 1000);
    } else {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  }
  const diffDays = Math.max(0, (Date.now() - date.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 7) return 'active';
  if (diffDays <= 14) return 'warning';
  return 'stale';
};

export interface TierSpreadResult {
  diploma: number;
  bachelor: number;
  master: number;
  phd: number;
  dominantText: string;
}

export const computeTierSpread = (applications: any[]): TierSpreadResult => {
  const validApps = (applications || []).filter(a => {
    const status = (a.applicationStatus || a.status || '').toLowerCase().trim();
    return status !== 'withdrawn' && status !== 'cancelled' && status !== 'draft';
  });

  const tierCounts = { diploma: 0, bachelor: 0, master: 0, phd: 0 };

  validApps.forEach(a => {
    const level = (
      a.targetDegreeLevel || 
      a.studyLevel || 
      a.degreeLevel || 
      a.level || 
      a.targetProgramName || 
      a.targetProgramId || 
      a.courseName || 
      a.programName || 
      a.program || 
      ''
    ).toString().toLowerCase();

    if (level.includes('diploma') || level.includes('cert')) {
      tierCounts.diploma++;
    } else if (
      level.includes('master') || 
      level.includes('msc') || 
      level.includes('mba') || 
      level.includes('ma ') || 
      level.includes('postgraduate') || 
      level.includes('pg')
    ) {
      tierCounts.master++;
    } else if (
      level.includes('phd') || 
      level.includes('doctor') || 
      level.includes('research')
    ) {
      tierCounts.phd++;
    } else if (
      level.includes('bachelor') || 
      level.includes('undergraduate') || 
      level.includes('bsc') || 
      level.includes('ba ') || 
      level.includes('bba') || 
      level.includes('ug')
    ) {
      tierCounts.bachelor++;
    } else {
      // Default to master if program has MBA/MSc indicators else bachelor
      if (level.includes('mba') || level.includes('msc')) {
        tierCounts.master++;
      } else {
        tierCounts.bachelor++;
      }
    }
  });

  const total = validApps.length;
  if (total === 0) {
    return {
      diploma: 0,
      bachelor: 0,
      master: 0,
      phd: 0,
      dominantText: 'No application tiers recorded yet.'
    };
  }

  const diploma = Math.round((tierCounts.diploma / total) * 100);
  const bachelor = Math.round((tierCounts.bachelor / total) * 100);
  const master = Math.round((tierCounts.master / total) * 100);
  const phd = Math.round((tierCounts.phd / total) * 100);

  const tierList = [
    { name: "Bachelor's tier", val: bachelor, count: tierCounts.bachelor },
    { name: "Master's tier", val: master, count: tierCounts.master },
    { name: "Diploma tier", val: diploma, count: tierCounts.diploma },
    { name: "Doctorate tier", val: phd, count: tierCounts.phd },
  ];

  tierList.sort((a, b) => b.count - a.count);

  let dominantText = 'No application tiers recorded yet.';
  if (tierList[0].count > 0) {
    if (tierList[0].count === tierList[1]?.count && tierList[0].val === tierList[1]?.val) {
      dominantText = `${tierList[0].name} and ${tierList[1].name} tied at ${tierList[0].val}% of volume.`;
    } else {
      dominantText = `${tierList[0].name} dominant at ${tierList[0].val}% of volume.`;
    }
  }

  return {
    diploma,
    bachelor,
    master,
    phd,
    dominantText
  };
};

export const fetchTotalApplicantMetrics = async (universityId?: string): Promise<AggregatedMetrics> => {
  const cacheKey = universityId || 'all';
  const nowTime = Date.now();
  if (metricsCache[cacheKey] && (nowTime - metricsCache[cacheKey].timestamp < CACHE_TTL)) {
    return metricsCache[cacheKey].data;
  }

  const path = 'applications';
  try {
    const applicationsRef = collection(db, path);
    let q;
    if (universityId) {
      const uIdLow = universityId.toLowerCase();
      const isGCM = uIdLow === 'global-college-malta' || uIdLow === 'gcm' || uIdLow === 'gcm-uid' || uIdLow.includes('gcm') || uIdLow.includes('malta');
      if (isGCM) {
        q = query(applicationsRef, where('targetUniversityId', 'in', ['global-college-malta', 'gcm', 'gcm-uid', universityId]));
      } else {
        q = query(applicationsRef, where('targetUniversityId', '==', universityId));
      }
    } else {
      q = query(applicationsRef);
    }
    const querySnapshot = await getDocs(q);

    const metrics: AggregatedMetrics = {
      totalCount: 0,
      intakes: {},
      stagnation: { active: 0, warning: 0, stale: 0 },
      statuses: {
        submitted: 0,
        interviewPending: 0,
        approved: 0,
        incomplete: 0,
        rejected: 0,
        withdrawn: 0
      },
      createdPeriods: { week: 0, month: 0, quarter: 0, year: 0 },
      programs: [],
      avgProcessingDays: 3,
      missingDocsBreakdown: { transcripts: 0, passport: 0, englishProof: 0 },
      tierSpread: { diploma: 0, bachelor: 0, master: 0, phd: 0 }
    };

    const programMap: { [key: string]: number } = {};
    const validAppsForTier: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as any;
      const rawStatus = (data.applicationStatus || '').toLowerCase();
      const statusVal = data.status || '';

      // Skip drafts for specific university so metrics match university applications list
      if (universityId && rawStatus === 'draft') {
        return;
      }

      validAppsForTier.push(data);
      metrics.totalCount += 1;

      // 1. Programs
      const progName = data.targetProgramName || data.targetProgramId || data.courseName || data.program || 'General Program';
      programMap[progName] = (programMap[progName] || 0) + 1;

      // 3. Missing Docs
      if (rawStatus === 'incomplete' || statusVal === 'Incomplete') {
        if (!data.docs_transcripts) metrics.missingDocsBreakdown!.transcripts++;
        if (!data.docs_passport) metrics.missingDocsBreakdown!.passport++;
        if (!data.docs_lor) metrics.missingDocsBreakdown!.englishProof++;
      }

      // 4. Intakes
      let termVal = data.intakeTerm;
      const termYear = data.intakeYear || '';
      if (termVal) {
        if (termYear && !termVal.includes(termYear)) termVal = `${termVal} ${termYear}`;
      } else {
        termVal = 'October 2026 Intake';
      }
      metrics.intakes[termVal] = (metrics.intakes[termVal] || 0) + 1;

      // 5. Stagnation
      const stagCat = getAppStagnationCategory(data);
      metrics.stagnation[stagCat]++;

      // Status breakdown
      if (rawStatus === 'submitted' || rawStatus === 'in_review' || rawStatus === 'under_review' || statusVal === 'Submitted') {
        metrics.statuses.submitted++;
      } else if (statusVal === 'Interview Pending' || rawStatus === 'interview_requested' || rawStatus === 'interview_pending' || rawStatus === 'interview_scheduled') {
        metrics.statuses.interviewPending++;
      } else if (statusVal === 'Approved' || rawStatus === 'approved' || rawStatus === 'offer_issued') {
        metrics.statuses.approved++;
      } else if (statusVal === 'Rejected' || rawStatus === 'rejected') {
        metrics.statuses.rejected++;
      } else if (rawStatus === 'incomplete' || rawStatus === 'pending_documents' || statusVal === 'Incomplete') {
        metrics.statuses.incomplete++;
      } else if (rawStatus === 'withdrawn' || rawStatus === 'cancelled' || statusVal === 'Withdrawn') {
        metrics.statuses.withdrawn++;
      } else {
        metrics.statuses.submitted++;
      }
    });

    metrics.programs = Object.entries(programMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Dynamic Tier Spread calculation
    const computedSpread = computeTierSpread(validAppsForTier);
    metrics.tierSpread = {
      diploma: computedSpread.diploma,
      bachelor: computedSpread.bachelor,
      master: computedSpread.master,
      phd: computedSpread.phd
    };

    metricsCache[cacheKey] = { data: metrics, timestamp: Date.now() };
    return metrics;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return metricsCache[cacheKey]?.data || createDefaultMetrics();
  }
};
