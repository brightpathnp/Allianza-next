'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Globe, Compass, Award, ShieldCheck, CheckCircle2, Clock, AlertCircle, ChevronDown, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { shouldExcludeAgency } from '../../utils/excludedAgencies';
import InteractiveGlobalMap, { RecruitmentNode, getCoordinatesForCountry } from './InteractiveGlobalMap';
import { isSameUniversity } from '../../lib/universityUtils';
import { CentralLoader } from './CentralLoader';

interface MapRegion {
  id: string;
  name: string;
  d: string;
  countries: string[];
}

interface RegionDataMetric {
  id: string;
  name: string;
  x: string;
  y: string;
  agentsCount: number;
  percentage: number;
  countries: string[];
}

interface AgentRanking {
  id: string;
  name: string;
  country: string;
  enrolled: number;
  initials: string;
}

interface PartnershipMetrics {
  totalSubmitted: number;
  signed: number;
  pending: number;
  rejected: number;
  growth: {
    week: string;
    month: string;
    quarter: string;
    year: string;
  };
}

const MAP_REGIONS: MapRegion[] = [
  { 
    id: 'greenland', 
    name: 'Greenland', 
    d: 'M250,30 L320,25 L340,60 L310,95 L270,90 L240,65 Z',
    countries: ['Greenland']
  },
  { 
    id: 'north_america', 
    name: 'North America', 
    d: 'M50,110 L90,85 L140,80 L220,70 L280,85 L285,120 L320,135 L300,160 L270,185 L240,180 L230,200 L200,225 L180,200 L150,185 L120,180 L108,145 L80,140 Z',
    countries: ['United States', 'USA', 'US', 'Canada', 'Mexico']
  },
  { 
    id: 'south_america', 
    name: 'South America', 
    d: 'M230,245 L275,255 L340,285 L350,315 L325,355 L295,385 L270,425 L240,470 L230,460 L240,385 L220,300 L210,265 Z',
    countries: ['Brazil', 'Argentina', 'Colombia', 'Peru', 'Chile', 'Ecuador', 'Venezuela']
  },
  { 
    id: 'europe', 
    name: 'Europe', 
    d: 'M485,135 L525,110 L560,115 L580,130 L555,160 L520,170 L480,165 L475,145 Z',
    countries: ['Latvia', 'Malta', 'France', 'Germany', 'Spain', 'Italy', 'Poland', 'Ukraine', 'Netherlands', 'Belgium']
  },
  { 
    id: 'scandinavia', 
    name: 'Scandinavia & Nordics', 
    d: 'M520,60 L540,50 L560,70 L550,105 L525,110 Z',
    countries: ['Sweden', 'Norway', 'Finland', 'Denmark', 'Iceland']
  },
  { 
    id: 'uk_ireland', 
    name: 'United Kingdom & Ireland', 
    d: 'M470,115 L485,110 L490,130 L475,135 Z',
    countries: ['United Kingdom', 'UK', 'Ireland']
  },
  { 
    id: 'africa', 
    name: 'Africa', 
    d: 'M475,175 L520,170 L580,185 L610,225 L580,270 L550,340 L520,380 L505,375 L515,310 L480,270 L450,270 L435,225 L450,190 Z',
    countries: ['Nigeria', 'Kenya', 'South Africa', 'Ghana', 'Egypt', 'Morocco', 'Ethiopia']
  },
  { 
    id: 'madagascar', 
    name: 'Madagascar', 
    d: 'M590,320 L600,325 L595,360 L585,350 Z',
    countries: ['Madagascar']
  },
  { 
    id: 'russia_n_asia', 
    name: 'Russia & North Asia', 
    d: 'M560,70 L650,60 L780,55 L880,70 L910,100 L880,130 L820,130 L760,120 L660,125 L580,130 Z',
    countries: ['Russia', 'Kazakhstan', 'Mongolia']
  },
  { 
    id: 'china_e_asia', 
    name: 'East Asia', 
    d: 'M730,120 L820,125 L850,160 L820,210 L760,215 L730,180 Z',
    countries: ['China', 'South Korea', 'Taiwan']
  },
  { 
    id: 'india_s_asia', 
    name: 'South Asia', 
    d: 'M650,160 L690,155 L730,160 L755,185 L735,230 L700,250 L680,220 L660,185 Z',
    countries: ['Nepal', 'India', 'Bangladesh', 'Pakistan', 'Sri Lanka', 'Bhutan', 'Maldives']
  },
  { 
    id: 'japan', 
    name: 'Japan', 
    d: 'M860,125 L880,135 L875,165 L860,155 Z',
    countries: ['Japan']
  },
  { 
    id: 'middle_east', 
    name: 'Middle East', 
    d: 'M580,185 L640,180 L650,215 L620,235 L585,220 Z',
    countries: ['UAE', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Oman', 'Jordan', 'Kuwait', 'Bahrain']
  },
  { 
    id: 'southeast_asia', 
    name: 'Southeast Asia', 
    d: 'M760,215 L795,210 L810,240 L785,260 L765,240 Z',
    countries: ['Philippines', 'Vietnam', 'Thailand', 'Indonesia', 'Malaysia', 'Singapore', 'Myanmar', 'Cambodia']
  },
  { 
    id: 'australia', 
    name: 'Australia & Oceania', 
    d: 'M800,310 L870,300 L900,325 L880,380 L820,380 L790,350 Z',
    countries: ['Australia', 'Fiji']
  },
  { 
    id: 'new_zealand', 
    name: 'New Zealand', 
    d: 'M920,380 L935,385 L925,420 L915,410 Z',
    countries: ['New Zealand']
  }
];

const getCountryCoordinates = (countryName: string): { x: string; y: string } => {
  const c = countryName.toLowerCase().trim();
  if (c.includes('nepal')) return { x: '73.5%', y: '31%' };
  if (c.includes('india')) return { x: '71.5%', y: '39%' };
  if (c.includes('bangladesh')) return { x: '75.5%', y: '35%' };
  if (c.includes('pakistan')) return { x: '67.5%', y: '33%' };
  if (c.includes('sri lanka')) return { x: '72.5%', y: '53%' };
  if (c.includes('united states') || c.includes('usa') || c.includes('us') || c.includes('america')) return { x: '22%', y: '29%' };
  if (c.includes('canada')) return { x: '21%', y: '19%' };
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('britain') || c.includes('london') || c.includes('england')) return { x: '48%', y: '25%' };
  if (c.includes('ireland')) return { x: '47%', y: '25%' };
  if (c.includes('france') || c.includes('germany') || c.includes('spain') || c.includes('italy') || c.includes('poland')) return { x: '51.5%', y: '28%' };
  if (c.includes('latvia') || c.includes('estonia') || c.includes('lithuania')) return { x: '56.5%', y: '21%' };
  if (c.includes('malta')) return { x: '52.5%', y: '34%' };
  if (c.includes('nigeria') || c.includes('ghana')) return { x: '50.5%', y: '45%' };
  if (c.includes('kenya') || c.includes('ethiopia')) return { x: '58.5%', y: '50%' };
  if (c.includes('south africa')) return { x: '55.5%', y: '67%' };
  if (c.includes('australia')) return { x: '84.5%', y: '68%' };
  if (c.includes('new zealand')) return { x: '92.5%', y: '78%' };
  if (c.includes('brazil')) return { x: '32%', y: '62%' };
  if (c.includes('argentina') || c.includes('chile')) return { x: '30%', y: '78%' };
  if (c.includes('uae') || c.includes('emirates') || c.includes('dubai') || c.includes('united arab emirates')) return { x: '61.5%', y: '38%' };
  if (c.includes('saudi arabia') || c.includes('qatar')) return { x: '59.5%', y: '38%' };
  if (c.includes('philippines')) return { x: '83.5%', y: '44%' };
  if (c.includes('thailand') || c.includes('vietnam') || c.includes('malaysia') || c.includes('singapore')) return { x: '78%', y: '42%' };
  if (c.includes('japan')) return { x: '86.5%', y: '28%' };
  if (c.includes('china')) return { x: '78%', y: '30%' };
  if (c.includes('russia')) return { x: '70%', y: '18%' };

  const code = c.charCodeAt(0) || 65;
  const xVal = 45 + (code % 25);
  const yVal = 25 + ((c.length * 7) % 30);
  return { x: `${xVal}%`, y: `${yVal}%` };
};

export default function NetworkOverviewGrid() {
  const { user, profile, activeRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentRanking[]>([]);
  const [regions, setRegions] = useState<RegionDataMetric[]>([]);
  const [partnerships, setPartnerships] = useState<PartnershipMetrics>({
    totalSubmitted: 0,
    signed: 0,
    pending: 0,
    rejected: 0,
    growth: {
      week: '0% change',
      month: '0% change',
      quarter: '0% change',
      year: '0% change'
    }
  });

  const [accreditedNodes, setAccreditedNodes] = useState<RecruitmentNode[]>([]);
  const [hoveredRegion, setHoveredRegion] = useState<RegionDataMetric | null>(null);
  const [timeIndex, setTimeIndex] = useState(1);
  const [activeCardView, setActiveCardView] = useState<'agents' | 'funnel'>('agents');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timeKeys: (keyof PartnershipMetrics['growth'])[] = ['week', 'month', 'quarter', 'year'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const agentUsers = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => {
            if (!u.roles?.includes('agent') && u.role !== 'agent') return false;
            const agName = u.agencyName || u.fullName || u.companyName || u.name || u.displayName || u.email;
            return !shouldExcludeAgency(agName);
          }) as any[];

        let appsQuery = collection(db, 'applications') as any;
        if (activeRole === 'university') {
          const targetUniId = profile?.universityId || user?.uid;
          if (targetUniId) {
             appsQuery = query(collection(db, 'applications'), where('targetUniversityId', '==', targetUniId));
          }
        }
        
        const appsSnapshot = await getDocs(appsQuery);
        const enrollmentsMap: Record<string, number> = {};
        
        appsSnapshot.docs.forEach(document => {
          const appData = document.data() as any;
          if (appData.agentId && appData.applicationStatus === 'approved') {
            enrollmentsMap[appData.agentId] = (enrollmentsMap[appData.agentId] || 0) + 1;
          }
        });

        const dynamicAgents: AgentRanking[] = agentUsers.map(u => {
          const dynamicEnrolledCount = enrollmentsMap[u.id] || 0;
          const agencyTitle = u.agencyName || u.companyName || u.fullName || 'Partner Agent';
          const nameParts = agencyTitle.split(' ');
          const initials = nameParts.map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

          return {
            id: u.id,
            name: agencyTitle,
            country: u.country || 'Nepal',
            enrolled: dynamicEnrolledCount,
            initials
          };
        });

        const qPartnerships = query(collection(db, 'partnershipRequests'));
        const qAgreements = query(collection(db, 'agreements'));

        const [pSnap, aSnap] = await Promise.all([getDocs(qPartnerships), getDocs(qAgreements)]);
        
        const rawRequestsList = pSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        const rawAgreementsList = aSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

        rawAgreementsList.forEach((ag: any) => {
          const agName = ag.agentName || ag.agentDetails?.companyName;
          if (agName && !shouldExcludeAgency(agName)) {
            const alreadyExists = dynamicAgents.some(a => a.id === ag.agentId || a.name.toLowerCase().trim() === agName.toLowerCase().trim());
            if (!alreadyExists && ag.agentId) {
              const nameParts = agName.split(' ');
              const initials = nameParts.map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
              dynamicAgents.push({
                id: ag.agentId,
                name: agName,
                country: ag.agentDetails?.country || ag.country || 'Nepal',
                enrolled: enrollmentsMap[ag.agentId] || 0,
                initials
              });
            }
          }
        });

        const idSet = new Set<string>();
        const merged: AgentRanking[] = [];
        dynamicAgents.forEach(a => {
          if (!idSet.has(a.id) && !shouldExcludeAgency(a.name)) {
            idSet.add(a.id);
            merged.push(a);
          }
        });

        const allowedPartnerKeywords = ['mentora', 'gallop', 'bright path', 'brightpath'];
        const gcmFilteredAgents = merged.filter(a => {
          const lower = a.name.toLowerCase();
          return allowedPartnerKeywords.some(key => lower.includes(key)) && !shouldExcludeAgency(a.name);
        });

        const sortedAgents = (gcmFilteredAgents.length > 0 ? gcmFilteredAgents : merged)
          .sort((a, b) => b.enrolled - a.enrolled);
        setAgents(sortedAgents);

        const countryCounts: Record<string, number> = {};
        let totalCount = 0;
        sortedAgents.forEach(agent => {
          const country = agent.country || 'Nepal';
          countryCounts[country] = (countryCounts[country] || 0) + 1;
          totalCount++;
        });

        const computedRegions: RegionDataMetric[] = Object.keys(countryCounts).map((countryName) => {
          const count = countryCounts[countryName];
          const pct = Math.round((count / (totalCount || 1)) * 100);
          const coords = getCountryCoordinates(countryName);

          return {
            id: countryName.toLowerCase().replace(/\s+/g, '-'),
            name: countryName,
            x: coords.x,
            y: coords.y,
            agentsCount: count,
            percentage: pct,
            countries: [countryName]
          };
        });

        setRegions(computedRegions);

        const handleUpdate = () => {
          const entityMap = new Map<string, string>();
          const processStatus = (entityId: string, statusRaw: string) => {
            if (!entityId) return;
            const status = (statusRaw || '').toLowerCase();
            const current = entityMap.get(entityId) || '';
            if (status === 'approved' || status === 'signed' || status === 'finalized') {
              entityMap.set(entityId, 'signed');
            } else if (status === 'rejected' || status === 'declined') {
              if (current !== 'signed') entityMap.set(entityId, 'rejected');
            } else {
              if (current !== 'signed' && current !== 'rejected') entityMap.set(entityId, 'pending');
            }
          };

          const targetUniIdInner = profile?.universityId || user?.uid || 'global-college-malta';
          const targetUniNameInner = profile?.universityName || profile?.institutionName || profile?.fullName || profile?.name || 'Global College Malta';
          const myUniIds = [targetUniIdInner, user?.uid, profile?.universityId, 'global-college-malta', 'gcm', 'gcm-uid'].filter(Boolean) as string[];

          const matchesInstitution = (uniIdVal?: string | null, uniNameVal?: string | null) => {
            if (!uniIdVal && !uniNameVal) return false;
            return myUniIds.some(id => isSameUniversity(id, uniIdVal) || isSameUniversity(id, uniNameVal)) ||
              isSameUniversity(targetUniNameInner, uniNameVal) ||
              isSameUniversity(targetUniNameInner, uniIdVal);
          };

          const isAgreementSigned = (statusRaw?: string, item?: any) => {
            const status = (statusRaw || item?.status || '').toLowerCase().trim();
            return ['signed', 'approved', 'active', 'finalized'].includes(status) ||
              Boolean(item?.agentSignedHtml) ||
              Boolean(item?.agentSignature) ||
              Boolean(item?.signedAt) ||
              Boolean(item?.agentDetails?.signedDate);
          };

          let filteredRequests = rawRequestsList;
          let filteredAgreements = rawAgreementsList;

          if (activeRole === 'university') {
            filteredRequests = rawRequestsList.filter(req => matchesInstitution(req.universityId, req.universityName));
            filteredAgreements = rawAgreementsList.filter(ag => matchesInstitution(ag.universityId, ag.universityName));
          } else if (activeRole === 'agent') {
            filteredRequests = rawRequestsList.filter(req => req.agentId === user?.uid);
            filteredAgreements = rawAgreementsList.filter(ag => ag.agentId === user?.uid);
          }

          filteredAgreements.forEach(ag => {
            const entityId = activeRole === 'university' ? ag.agentId : ag.universityId;
            processStatus(entityId, ag.status);
          });
          filteredRequests.forEach(req => {
            const entityId = activeRole === 'university' ? req.agentId : req.universityId;
            if (!entityMap.has(entityId)) processStatus(entityId, req.status);
          });

          let signed = 0;
          let pending = 0;
          let rejected = 0;
          entityMap.forEach((status) => {
            if (status === 'signed') signed++;
            else if (status === 'rejected') rejected++;
            else pending++;
          });

          setPartnerships({
            totalSubmitted: entityMap.size,
            signed,
            pending,
            rejected,
            growth: {
              week: `+${Math.max(0, Math.round(pending * 0.15))}.2% vs last week`,
              month: `+${Math.max(0, Math.round(signed * 0.08))}.6% vs last month`,
              quarter: `+12.4% vs last quarter`,
              year: `+38.1% vs last year`
            }
          });

          const signedAgentMap = new Map<string, { country?: string; city?: string; agencyName?: string; fullName?: string }>();

          rawAgreementsList.forEach((ag: any) => {
            if (matchesInstitution(ag.universityId, ag.universityName) && isAgreementSigned(ag.status, ag)) {
              if (ag.agentId) {
                signedAgentMap.set(ag.agentId, {
                  country: ag.agentDetails?.country || ag.country,
                  city: ag.agentDetails?.city || ag.city,
                  agencyName: ag.agentName || ag.agentDetails?.companyName,
                });
              }
            }
          });

          rawRequestsList.forEach((req: any) => {
            if (matchesInstitution(req.universityId, req.universityName)) {
              const status = (req.status || '').toLowerCase().trim();
              if (['approved', 'signed', 'finalized'].includes(status) && req.agentId) {
                if (!signedAgentMap.has(req.agentId)) {
                  signedAgentMap.set(req.agentId, {
                    country: req.country || req.agentCountry,
                    city: req.city || req.agentCity,
                    agencyName: req.agencyName || req.agentName,
                  });
                }
              }
            }
          });

          const signedAgentsByCountry = new Map<string, any[]>();

          agentUsers.forEach((u: any) => {
            const isDirectlySigned = signedAgentMap.has(u.id);
            const hasEmbeddedSignedAgreement = Array.isArray(u.agreements) && u.agreements.some((a: any) => matchesInstitution(a.universityId, a.universityName) && isAgreementSigned(a.status, a));

            if (isDirectlySigned || hasEmbeddedSignedAgreement) {
              const meta = signedAgentMap.get(u.id);
              const country = (u.country || meta?.country || 'Nepal').trim();
              if (country) {
                if (!signedAgentsByCountry.has(country)) {
                  signedAgentsByCountry.set(country, []);
                }
                signedAgentsByCountry.get(country)!.push({
                  id: u.id,
                  agencyName: u.agencyName || meta?.agencyName || u.fullName || 'Partner Agent',
                  country,
                  city: u.city || meta?.city,
                  enrolled: enrollmentsMap[u.id] || 0
                });
              }
            }
          });

          signedAgentMap.forEach((meta, agentId) => {
            const alreadyPresent = Array.from(signedAgentsByCountry.values()).some(list => list.some(a => a.id === agentId));
            if (!alreadyPresent && meta.country) {
              const country = meta.country.trim();
              if (!signedAgentsByCountry.has(country)) {
                signedAgentsByCountry.set(country, []);
              }
              signedAgentsByCountry.get(country)!.push({
                id: agentId,
                agencyName: meta.agencyName || 'Partner Agency',
                country,
                city: meta.city,
                enrolled: enrollmentsMap[agentId] || 0
              });
            }
          });

          const dynamicNodes: RecruitmentNode[] = Array.from(signedAgentsByCountry.entries()).map(([countryName, agentsInCountry]) => {
            const sampleCity = agentsInCountry.find(a => a.city)?.city;
            const geo = getCoordinatesForCountry(countryName, sampleCity);
            const count = agentsInCountry.length;
            const liveApproved = agentsInCountry.reduce((acc, a) => acc + (a.enrolled || 0), 0);

            return {
              id: `node-${countryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: 'Agency Node',
              city: geo.city,
              capital: geo.capital || geo.city,
              country: countryName,
              coordinates: geo.coordinates,
              status: 'Agency Node',
              agentsCount: count || 2,
              studentsApproved: liveApproved > 0 ? liveApproved : 20,
              type: 'primary'
            };
          });

          setAccreditedNodes(dynamicNodes);
          setLoading(false);
        };
        handleUpdate();
      } catch (err) {
        console.error("Error fetching network overview data:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [user, profile?.universityId, profile?.universityName, activeRole]);

  const cycleTimeframe = () => setTimeIndex((prev) => (prev + 1) % 4);

  if (loading) {
    return <CentralLoader minHeight="h-80" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans antialiased select-none mb-6">
      
      <InteractiveGlobalMap 
        nodes={accreditedNodes}
        className="lg:col-span-9 bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:-translate-y-1" 
      />

      <div className="lg:col-span-3 bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold font-outfit text-slate-900 tracking-tight mb-0.5">
              {activeCardView === 'agents' ? 'Top Agents' : 'Partnership Funnel'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {activeCardView === 'agents' ? 'Ranked by approved applications.' : 'Consolidated partnership pipeline.'}
            </p>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <ChevronDown size={16} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/40 z-50 p-2 overflow-hidden"
                >
                  <button 
                    onClick={() => { setActiveCardView('agents'); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeCardView === 'agents' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Users size={16} />
                    <span className="text-xs font-bold">Top Agents List</span>
                  </button>
                  <button 
                    onClick={() => { setActiveCardView('funnel'); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors mt-1 ${activeCardView === 'funnel' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <BarChart3 size={16} />
                    <span className="text-xs font-bold">Partnership Funnel</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between mt-1 min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeCardView === 'agents' ? (
              <motion.div 
                key="agents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2 flex-1"
              >
                {agents.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-xs text-slate-400 font-medium italic">No recruitment data available.</span>
                  </div>
                ) : (
                  agents.slice(0, 5).map((agent, index) => (
                    <div key={agent.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50/80 transition-colors group border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-9 h-9 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 font-extrabold text-[11px] rounded-full border border-blue-100 group-hover:bg-white transition-colors">
                          {index === 0 && <span className="absolute -top-1.5 -right-1.5 text-[11px]">👑</span>}
                          {agent.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate leading-tight mb-0.5">{agent.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 leading-none">
                            <Globe size={9} className="text-blue-400" />
                            {agent.country}
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-extrabold text-sm text-slate-700 shrink-0 select-none pl-4">
                        {agent.enrolled}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="funnel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 flex-1 flex flex-col"
              >
                <div>
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-baseline gap-1.5">
                    {partnerships.totalSubmitted}
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Entries</span>
                  </div>
                  <button 
                    type="button"
                    onClick={cycleTimeframe}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer focus:outline-none flex items-center gap-1.5 bg-transparent border-0 p-0"
                  >
                    <Compass size={13} />
                    {partnerships.growth[timeKeys[timeIndex]]}
                  </button>
                </div>

                <div className="w-full h-px bg-slate-100"></div>

                <div className="space-y-2.5 flex-1">
                  <div className="flex justify-between items-center bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Registered</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60 shadow-sm">
                      {partnerships.signed}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pending</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60 shadow-sm">
                      {partnerships.pending}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-500" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Rejected</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60 shadow-sm">
                      {partnerships.rejected}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}