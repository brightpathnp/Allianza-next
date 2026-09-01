import React, { useState, useEffect } from 'react';
import { fetchAgentDashboardMetrics, AgentDashboardData } from '../../services/agentDashboardService';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardErrorHandler } from '../../utils/dashboardError';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { FunnelChart } from '@/components/analytics/FunnelChart';
import { MarketSourcingCard } from '@/components/analytics/MarketSourcingCard';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Compass, 
  GraduationCap, 
  MapPin, 
  Sparkles, 
  Calendar, 
  FileText, 
  Globe, 
  ArrowUpRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  agentId: string;
  agencyName?: string;
  actionComponent?: React.ReactNode;
  onMetricClick?: (type: string, value: string) => void;
  activeFilter?: { type: string; value: string } | null;
  hasSubmittedApps?: boolean;
}

export default function AgentOverview({ agentId, agencyName, actionComponent, onMetricClick, activeFilter, hasSubmittedApps }: Props) {
  const normalizeCountryName = (name: string): string => {
    if (!name) return '';
    const norm = name.trim().toLowerCase();
    if (norm === 'uk' || norm === 'united kingdom' || norm === 'u.k.') return 'UK';
    if (norm === 'uae' || norm === 'united arab emirates' || norm === 'u.a.e.') return 'UAE';
    if (norm === 'australia') return 'Australia';
    if (norm === 'france') return 'France';
    if (norm === 'georgia') return 'Georgia';
    if (norm === 'malta') return 'Malta';
    return name;
  };

  const { profile, institutions, hideSupportCenter } = useAuth();
  const { handleFirestoreError } = useDashboardErrorHandler();
  const navigate = useNavigate();
  const [data, setData] = useState<AgentDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'USD' | 'NPR'>('USD');
  const [applicantChangeIdx, setApplicantChangeIdx] = useState(0);
  const [commissionChangeIdx, setCommissionChangeIdx] = useState(0);
  const [currencyRates, setCurrencyRates] = useState<Record<'EUR'|'USD'|'NPR', { label: string, symbol: string, rate: number }>>({
    EUR: { label: 'EUR', symbol: '€', rate: 1.0 },
    USD: { label: 'USD', symbol: '$', rate: 1.08 },
    NPR: { label: 'NPR', symbol: 'Rs. ', rate: 143.50 }
  });

  const timePeriods = ['last week', 'last month', 'last quarter', 'last year'];

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/currency-rates');
        const data = await response.json();
        const rates = data.data?.payload?.rates || data;
        
        if (Array.isArray(rates)) {
          const usdRate = rates.find((r: any) => r.iso3 === 'USD');
          const eurRate = rates.find((r: any) => r.iso3 === 'EUR');
          
          if (usdRate && eurRate) {
            const eurBuyNpr = parseFloat(eurRate.buy) / eurRate.unit;
            const usdBuyNpr = parseFloat(usdRate.buy) / usdRate.unit;
            
            setCurrencyRates({
              EUR: { label: 'EUR', symbol: '€', rate: 1.0 },
              USD: { label: 'USD', symbol: '$', rate: eurBuyNpr / usdBuyNpr },
              NPR: { label: 'NPR', symbol: 'Rs. ', rate: eurBuyNpr }
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch currency rates via proxy", err);
      }
    };
    fetchRates();
  }, []);

  const convertAndFormatVal = (amountInEuro: number) => {
    const details = currencyRates[selectedCurrency];
    const converted = amountInEuro * details.rate;
    return `${details.symbol}${Math.round(converted).toLocaleString()}`;
  };

  const countriesWithInstitutions = new Set((institutions || []).map(u => normalizeCountryName(u.country as string)));
  const rawPreferredDestinations = (profile?.preferredDestinations || ['UK', 'Australia']) as string[];
  
  const preferredDestinations: string[] = Array.from(new Set(
    rawPreferredDestinations.map(normalizeCountryName)
  )).filter(country => countriesWithInstitutions.has(country));

  const getDestinationCount = (destName: string) => {
    if (!data) return 0;
    const key = destName.toLowerCase().trim();
    if (key === 'united kingdom' || key === 'gb') return data.destinations['uk'] || 0;
    if (key === 'united states' || key === 'us') return data.destinations['usa'] || 0;
    
    if (data.destinations[key] !== undefined) {
      return data.destinations[key];
    }
    // Try substring matching
    let count = 0;
    Object.keys(data.destinations).forEach(dKey => {
      if (dKey.includes(key) || key.includes(dKey)) {
        count += data.destinations[dKey];
      }
    });
    return count;
  };

  const dotColors = [
    'bg-blue-600',
    'bg-rose-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-sky-500',
    'bg-indigo-500',
    'bg-pink-500'
  ];

  const textColors = [
    'text-blue-700',
    'text-rose-700',
    'text-amber-700',
    'text-emerald-700',
    'text-purple-700',
    'text-sky-700',
    'text-indigo-700',
    'text-pink-700'
  ];

  const colorHexes = [
    '#2563EB', // blue-600
    '#F43F5E', // rose-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#0059E7', // Allianza blue
    '#0EA5E9', // sky-500
    '#6366F1', // indigo-500
    '#EC4899'  // pink-500
  ];

  const gradientSegments = React.useMemo(() => {
    if (preferredDestinations.length === 0) return '';
    const segments: string[] = [];
    let cumulatedPercent = 0;

    const totalOfDestinations = preferredDestinations.reduce((acc: number, dest: string) => acc + getDestinationCount(dest), 0);

    preferredDestinations.forEach((dest: string, idx: number) => {
      const rawCount = getDestinationCount(dest);
      const weight = totalOfDestinations === 0 ? 1 : rawCount;
      const totalWeight = totalOfDestinations === 0 ? preferredDestinations.length : totalOfDestinations;

      const percent = (weight / totalWeight) * 100;
      const color = colorHexes[idx % colorHexes.length];
      
      segments.push(`${color} ${cumulatedPercent}% ${cumulatedPercent + percent}%`);
      cumulatedPercent += percent;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [preferredDestinations, data]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const metrics = await fetchAgentDashboardMetrics(agentId, agencyName);
        setData(metrics);
      } catch (err) {
        handleFirestoreError(err);
        // Fallback default metrics to prevent blank screen
        setData({
          companyName: agencyName || "Agent Partner",
          totalApplications: 0,
          monthlyApplications: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map(m => ({ month: m, students: 0 })),
          pipeline: { incomplete: 0, requestInterview: 0, approved: 0, rejected: 0 },
          missingDocs: { passport: 0, englishProof: 0, transcripts: 0, sop: 0 },
          destinations: { malta: 0, georgia: 0 },
          commissions: { cleared: 0, forecast: 0 }
        });
      } finally {
        setLoading(false);
      }
    }
    if (agentId) {
      loadDashboard();
    }
  }, [agentId, agencyName]);

  // Clean suffix strings like "Pvt. Ltd.", "LLC", "Education", etc. from Company names
  const cleanCompanyName = (name: string) => {
    if (!name) return 'Agent';
    return name
      .replace(/\s*(Pvt\b\.?\s*Ltd\b\.?|Pty\b\.?\s*Ltd\b\.?|Ltd\b\.?|LLC\b|Inc\b\.?|Co\b\.?|Education\b)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getPct = (val: number, total: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  if (loading || !data) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-[120px] bg-slate-200 rounded-[20px] w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-[20px] h-[340px] border border-slate-200" />)}
        </div>
      </div>
    );
  }

  const cleanedGreetingName = cleanCompanyName(data.companyName);
  const totalMissingDocs = data.missingDocs.passport + data.missingDocs.englishProof + data.missingDocs.transcripts + data.missingDocs.sop;

  const showOnboarding = hasSubmittedApps === false || (hasSubmittedApps === undefined && data.totalApplications === 0);

  if (showOnboarding) {
    return (
      <div className="w-full font-sans antialiased select-none selection:bg-blue-600/10 space-y-12">
        {/* 🟦 LAUNCHPAD GREETING BANNER - UNCHANGED AS REQUESTED */}
        <div className="w-full bg-gradient-to-r from-[#0B1528] via-[#0F1E36] to-[#0D59E7] rounded-[20px] p-4 sm:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg shadow-blue-900/5 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />
          </div>
          <div className="space-y-1 relative z-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Welcome, {cleanedGreetingName}!</h1>
            <p className="text-slate-300 text-xs font-semibold">
              Let's get you ready to recruit. Complete your onboarding checklist below to unlock your analytics dashboard.
            </p>
          </div>
        </div>

        {/* 🚀 REDESIGNED ONBOARDING EXPERIENCE */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* LEFT COLUMN: GUIDED SETUP (Col-span 7) */}
            <div className="lg:col-span-7 space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                  <Sparkles size={12} className="animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.2em] font-outfit text-slate-400">Your Journey Starts Here</span>
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight font-outfit leading-tight">
                  Setup your portal to <br />
                  <span className="text-[#0059E7]">start earning.</span>
                </h2>
                <p className="text-slate-500 text-lg max-w-xl font-medium">
                  Follow our professional integration roadmap to verify your agency and access the global university network.
                </p>
              </div>

              {/* ROADMAP MODULES */}
              <div className="grid gap-6">
                {/* MODULE 1: COMPLETED */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 flex items-start gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-inner">
                    <CheckCircle2 size={28} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-800 font-outfit">Institutional Profile</h3>
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-lg border border-emerald-200">Verified</span>
                    </div>
                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                      Your base credentials and representative details have been securely logged.
                    </p>
                  </div>
                </motion.div>

                {/* MODULE 2: ACTION REQUIRED */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group relative bg-white border-2 border-blue-500/10 rounded-[2rem] p-8 shadow-2xl shadow-blue-900/10 flex items-start gap-6 ring-8 ring-blue-500/5 transition-all hover:shadow-blue-900/20 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#0059E7] text-white flex items-center justify-center shrink-0 shadow-xl shadow-blue-200">
                    <FileText size={28} />
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold text-slate-900 font-outfit">Compliance Document Vault</h3>
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-lg border border-amber-200">Action Required</span>
                    </div>
                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                      Upload your Recruitment License, PAN Certificate, and Business Registration to clear our global audit protocols.
                    </p>
                    <button 
                      onClick={() => {
                        window.location.hash = '#settings-compliance';
                        navigate('/dashboard?tab=Settings&sub=compliance');
                      }}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#0059E7] text-white rounded-2xl font-bold text-[11px] tracking-widest hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
                    >
                      Enter Vault <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>

                {/* MODULE 3: PENDING */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group relative bg-white/30 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 flex items-start gap-6 opacity-60"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 border border-slate-300 shadow-inner">
                    <Compass size={28} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-800 font-outfit">Define Recruitment Scope</h3>
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-lg">Locked</span>
                    </div>
                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                      Configure your source markets and preferred study destinations to feed our smart filters.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* RIGHT COLUMN: ECOSYSTEM PREVIEW (Col-span 5) */}
            <div className="lg:col-span-5 space-y-8">
              {/* VISUAL PREVIEW CARD */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-market-trends-gradient rounded-[2.5rem] p-8 overflow-hidden text-white shadow-2xl shadow-blue-900/20"
              >
                {/* Decorative mesh */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[80px] -ml-32 -mb-32" />
                
                <div className="relative z-10 space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold font-outfit">Ecosystem Insights</h3>
                    <p className="text-slate-400 text-sm">Real-time data from the Allianza network.</p>
                  </div>

                  {/* MINI WIDGETS */}
                  <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-default">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400">Malta Hub</span>
                        <span className="text-[10px] font-bold text-emerald-400">98% Visa Success</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        High volume detected in Business and Management tracks this intake.
                      </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-default">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400">UK Spotlight</span>
                        <span className="text-[10px] font-bold text-blue-400">Active Intake</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        Explore regional campuses and automated document checklists for the UK.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <img key={i} src={`https://i.pravatar.cc/100?img=${i + 20}`} className="w-8 h-8 rounded-full border-2 border-slate-900" alt="Partner" />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-400">1.6k agents active today</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* SECONDARY INFO CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Expert Resources</h4>
                    <p className="text-xs text-slate-500">Need help scaling up?</p>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "Most agents clear their first enrollment within 45 days of completing their compliance vault."
                </p>

                {!hideSupportCenter && (
                  <button 
                    onClick={() => navigate('/help-support')}
                    className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Contact Integration Support <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans antialiased select-none selection:bg-blue-600/10 space-y-8">
      
      {/* 🟦 TOP BANNER MODULE (Ref: Uni Dashboard Top Bar and Cards.png) */}
      <div className="w-full bg-gradient-to-r from-[#0B1528] via-[#0F1E36] to-[#0D59E7] rounded-[20px] p-5 sm:p-7 text-white flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-lg shadow-blue-900/5 relative gap-4 lg:gap-6">
        <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />
        </div>
        <div className="space-y-1 relative z-10 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Welcome, {cleanedGreetingName}!</h1>
          <p className="text-slate-400 text-xs font-semibold">
            You have <span className="text-white font-extrabold">{data.pipeline.incomplete} incomplete items</span>, 
            {" "}<span className="text-white font-extrabold">{data.pipeline.requestInterview} pending interviews</span>, and 
            {" "}<span className="text-white font-extrabold">0 new messages</span> today
          </p>
        </div>
        <div className="relative z-[100] mt-2 lg:mt-0 w-full lg:w-auto flex justify-start lg:justify-end shrink-0">
          {actionComponent || (
            <button className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 relative z-10 shrink-0 cursor-pointer">
              View Analytics <span className="text-xs">→</span>
            </button>
          )}
        </div>
      </div>

      {/* 📊 CORE 4-CARD METRIC GRID (Ref: Uni Dashboard Top Bar and Cards.png) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 md:grid-cols-2 gap-6 items-start">
        
        {/* CARD 1: TOTAL APPLICANTS STYLE PROFILE WITH CIRCULAR PIE CHART */}
        {(() => {
          const pipelinePieData = [
            { name: 'Incomplete', value: data.pipeline.incomplete || 0, color: '#F59E0B', key: 'incomplete' },
            { name: 'Req. Interview', value: data.pipeline.requestInterview || 0, color: '#A855F7', key: 'requestInterview' },
            { name: 'Approved', value: data.pipeline.approved || 0, color: '#10B981', key: 'approved' },
            { name: 'Rejected', value: data.pipeline.rejected || 0, color: '#EF4444', key: 'rejected' },
          ].filter(item => item.value > 0);

          const isPipelinePieEmpty = pipelinePieData.length === 0;
          const pipelineChartData = isPipelinePieEmpty
            ? [{ name: 'No Applications', value: 1, color: '#E2E8F0', isZero: true, key: '' }]
            : pipelinePieData;

          const funnelData = [
            { label: 'Submitted', value: Math.max(0, data.totalApplications - (data.pipeline.incomplete || 0)), color: '#1D4ED8' },
            { label: 'Incomplete', value: data.pipeline.incomplete || 0, color: '#B45309' },
            { label: 'Interview Pending', value: data.pipeline.requestInterview || 0, color: '#7E22CE' },
            { label: 'Withdrawn', value: 0, color: '#475569' },
            { label: 'Rejected', value: data.pipeline.rejected || 0, color: '#B91C1C' },
            { label: 'Approved', value: data.pipeline.approved || 0, color: '#15803D' },
          ];

          return (
            <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-[340px] flex flex-col justify-between group hover:translate-y-[-2px] transition-all duration-300">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Application Funnel</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Cross-institutional funnel health</p>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center my-1 w-full min-h-0">
                <FunnelChart 
                  data={funnelData} 
                  onItemClick={(item) => onMetricClick?.('pipeline', item.label.toLowerCase())} 
                />
              </div>

              <div className="text-[9px] font-black text-slate-400 text-center border-t border-slate-100/50 pt-1.5 tracking-[0.1em]">
                Live synchronization active
              </div>
            </div>
          );
        })()}

        {/* CARD 2: ACADEMIC TIER STACKED PROGRESS PATTERN */}
        <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-[340px] flex flex-col justify-between group hover:translate-y-[-2px] transition-all duration-300">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em]">Compliance Health Index</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1">Outstanding documentary requirements</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-5">
            <div 
              onClick={() => onMetricClick?.('missingDocs', 'passport')}
              className={`space-y-1.5 cursor-pointer group/item ${activeFilter?.type === 'missingDocs' && activeFilter?.value === 'passport' ? 'opacity-100' : (activeFilter ? 'opacity-50' : '')}`}
            >
              <div className="flex justify-between text-[10px] font-black tracking-wide text-slate-600 group-hover/item:text-slate-900 transition-colors">
                <span className="truncate">Passport Scan</span>
                <span className="font-outfit">{getPct(data.missingDocs.passport, totalMissingDocs)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${getPct(data.missingDocs.passport, totalMissingDocs)}%` }} className="h-full bg-slate-800 rounded-full transition-all duration-700" />
              </div>
            </div>
            <div 
              onClick={() => onMetricClick?.('missingDocs', 'englishProof')}
              className={`space-y-1.5 cursor-pointer group/item ${activeFilter?.type === 'missingDocs' && activeFilter?.value === 'englishProof' ? 'opacity-100' : (activeFilter ? 'opacity-50' : '')}`}
            >
              <div className="flex justify-between text-[10px] font-black tracking-wide text-slate-600 group-hover/item:text-slate-900 transition-colors">
                <span className="truncate">English Proof / MOI</span>
                <span className="font-outfit">{getPct(data.missingDocs.englishProof, totalMissingDocs)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${getPct(data.missingDocs.englishProof, totalMissingDocs)}%` }} className="h-full bg-blue-600 rounded-full transition-all duration-700" />
              </div>
            </div>
            <div 
              onClick={() => onMetricClick?.('missingDocs', 'transcripts')}
              className={`space-y-1.5 cursor-pointer group/item ${activeFilter?.type === 'missingDocs' && activeFilter?.value === 'transcripts' ? 'opacity-100' : (activeFilter ? 'opacity-50' : '')}`}
            >
              <div className="flex justify-between text-[10px] font-black tracking-wide text-slate-600 group-hover/item:text-slate-900 transition-colors">
                <span className="truncate">Academic Transcripts</span>
                <span className="font-outfit">{getPct(data.missingDocs.transcripts, totalMissingDocs)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div style={{ width: `${getPct(data.missingDocs.transcripts, totalMissingDocs)}%` }} className="h-full bg-amber-500 rounded-full transition-all duration-700" />
              </div>
            </div>
          </div>
          <div className="text-[9px] font-black text-slate-400 text-center border-t border-slate-100/50 pt-2 tracking-[0.1em]">Verification matrix synced</div>
        </div>

        {/* CARD 3: REFACTORED MARKET SOURCING CARD */}
        <MarketSourcingCard agentId={agentId} institutions={institutions} />

        {/* CARD 4: TOTAL AGENTS STYLE LAYOUT MODIFIED FOR COMMISSIONS */}

        {/* CARD 4: TOTAL AGENTS STYLE LAYOUT MODIFIED FOR COMMISSIONS */}
        <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-5 xl:p-6 shadow-xl shadow-slate-200/40 h-[340px] flex flex-col justify-between group hover:translate-y-[-2px] transition-all duration-300">
          <div>
            <div className="flex justify-between items-center relative z-10">
              <div className="relative group/tooltip max-w-full">
                <h3 
                  title="Commission Forecast & Commission Pipeline"
                  className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase truncate mr-1 cursor-pointer hover:text-slate-600 transition-colors"
                >
                  Commission Forecast
                </h3>
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/tooltip:flex items-center px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                  Commission Forecast & Commission Pipeline
                  <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <div className="flex items-baseline gap-2">
                <div 
                  title="Commission Forecast (Projection from Approved Students)"
                  className="text-2xl xl:text-3xl font-black text-slate-800 tracking-tight font-outfit truncate max-w-full"
                >
                  {convertAndFormatVal(data.commissions.forecast)}
                </div>
                <select
                  id="currency-select-overview"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value as 'EUR' | 'USD' | 'NPR')}
                  className="text-[10px] font-black text-slate-500 bg-white/50 border border-slate-100 rounded-xl px-2 py-1 outline-none cursor-pointer focus:border-blue-500 hover:bg-white transition-all shadow-sm h-8"
                  title="Select Currency"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="NPR">NPR</option>
                </select>
              </div>
              <div className="relative group/tooltip">
                <div 
                  title="Total Including Cleared"
                  className="bg-emerald-50 text-emerald-700 font-black text-[10px] px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
                >
                  {convertAndFormatVal(data.commissions.cleared + data.commissions.forecast)} <span className="font-medium text-[9px] opacity-70 tracking-wider">TOTAL</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:flex items-center px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                  Total Projected + Cleared
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
          </div>

          {/* CIRCULAR DIAGRAM WITH CLEARED & FORECAST PLACED BELOW */}
          {(() => {
            const totalComm = (data.commissions.cleared || 0) + (data.commissions.forecast || 0);
            const clearedPercent = totalComm > 0 ? ((data.commissions.cleared || 0) / totalComm) * 100 : 50;

            return (
              <div className="flex flex-col items-center justify-center flex-1 my-1 w-full min-h-0">
                {/* Circular Donut Diagram */}
                <div className="relative flex items-center justify-center my-auto">
                  <div 
                    className="w-16 h-16 xl:w-20 xl:h-20 rounded-full flex items-center justify-center shadow-inner relative transition-transform hover:scale-105 duration-300 shrink-0"
                    style={{
                      background: totalComm === 0 
                        ? '#E2E8F0' 
                        : `conic-gradient(#10B981 0% ${clearedPercent}%, #3B82F6 ${clearedPercent}% 100%)`
                    }}
                  >
                    <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white/95 backdrop-blur-sm rounded-full flex flex-col items-center justify-center shadow-sm">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Settled</span>
                      <span className="text-[10.5px] font-black text-slate-800 font-outfit mt-0.5 leading-none">
                        {totalComm > 0 ? `${Math.round(clearedPercent)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cleared and Forecast Currency placed below the circular diagram */}
                <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100/60">
                  <div 
                    onClick={() => onMetricClick?.('commissions', 'cleared')}
                    className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl bg-slate-50/70 border border-slate-100 cursor-pointer transition-all hover:bg-emerald-50/60 hover:border-emerald-200 ${activeFilter?.type === 'commissions' && activeFilter?.value === 'cleared' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400 font-black' : ''}`}
                    title={`Cleared Amount: ${convertAndFormatVal(data.commissions.cleared)}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                      <span>Cleared</span>
                    </div>
                    <span className="text-xs font-black font-outfit text-slate-800 mt-0.5 tracking-tight truncate max-w-full">
                      {convertAndFormatVal(data.commissions.cleared)}
                    </span>
                  </div>

                  <div 
                    onClick={() => onMetricClick?.('commissions', 'forecast')}
                    className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl bg-slate-50/70 border border-slate-100 cursor-pointer transition-all hover:bg-blue-50/60 hover:border-blue-200 ${activeFilter?.type === 'commissions' && activeFilter?.value === 'forecast' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400 font-black' : ''}`}
                    title={`Forecast Amount: ${convertAndFormatVal(data.commissions.forecast)}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm" />
                      <span>Forecast</span>
                    </div>
                    <span className="text-xs font-black font-outfit text-slate-800 mt-0.5 tracking-tight truncate max-w-full">
                      {convertAndFormatVal(data.commissions.forecast)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="text-[9px] font-black text-slate-400 text-center border-t border-slate-100/50 pt-1.5 tracking-[0.1em]">
            Commission pipeline synced
          </div>
        </div>

      </div>

    </div>
  );
}