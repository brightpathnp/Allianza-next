'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface MarketSourcingCardProps {
  agentId: string;
  institutions: any[];
}

const isAgreementActive = (status: string) => {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'signed' || s === 'approved' || s === 'active';
};

const CHART_COLORS = ['#FF5B5C', '#8C57FF', '#FFBB33', '#0059E7', '#10B981', '#F43F5E', '#F59E0B', '#0EA5E9'];

export function MarketSourcingCard({ agentId, institutions }: MarketSourcingCardProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeCountries, setActiveCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;

    const loadData = async () => {
      try {
        const agreementsQuery = query(collection(db, 'agreements'), where('agentId', '==', agentId));
        const agreementsSnap = await getDocs(agreementsQuery);
        
        const signedInstitutionIds = new Set<string>();
        agreementsSnap.forEach(doc => {
          const data = doc.data();
          if (isAgreementActive(data.status)) {
            signedInstitutionIds.add(data.institutionId || data.universityId);
          }
        });

        const normalizeCountryName = (name: string): string => {
          if (!name) return '';
          const norm = name.trim().toLowerCase();
          if (norm === 'uk' || norm === 'united kingdom' || norm === 'u.k.') return 'UK';
          if (norm === 'uae' || norm === 'united arab emirates' || norm === 'u.a.e.') return 'UAE';
          if (norm === 'australia') return 'Australia';
          if (norm === 'france') return 'France';
          if (norm === 'georgia') return 'Georgia';
          if (norm === 'malta') return 'Malta';
          return name.trim();
        };

        const signedCountries = new Set<string>();
        institutions.forEach(inst => {
          if (signedInstitutionIds.has(inst.id) && inst.country) {
            signedCountries.add(normalizeCountryName(inst.country));
          }
        });
        
        const countries = Array.from(signedCountries);
        setActiveCountries(countries);

        const appsQuery = query(collection(db, 'applications'), where('agentId', '==', agentId));
        const appsSnap = await getDocs(appsQuery);

        const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData: Record<string, Record<string, number>> = {};
        allMonths.forEach(m => {
          monthlyData[m] = {};
          countries.forEach(c => {
            monthlyData[m][c] = 0;
          });
        });

        appsSnap.forEach(doc => {
          const item = doc.data();
          const status = (item.applicationStatus || item.status || '').toLowerCase().trim();
          
          if (status === 'withdrawn') return;

          if (item.createdAt) {
            let date: Date;
            if (item.createdAt.toDate) {
              date = item.createdAt.toDate();
            } else {
              date = new Date(item.createdAt);
            }
            const monthSource = date.toLocaleString('default', { month: 'short' });
            
            if (monthlyData[monthSource]) {
              const dest = (item.destination || item.targetUniversityId || '').trim();
              
              let itemCountry = '';
              const inst = institutions.find(i => i.id === item.targetUniversityId || i.name === item.targetUniversityId);
              if (inst && inst.country) {
                itemCountry = normalizeCountryName(inst.country);
              } else {
                const matchedCountry = countries.find(c => 
                  c.toLowerCase() === dest.toLowerCase() || 
                  dest.toLowerCase().includes(c.toLowerCase()) ||
                  c.toLowerCase().includes(dest.toLowerCase())
                );
                if (matchedCountry) {
                  itemCountry = matchedCountry;
                }
              }

              if (itemCountry && countries.includes(itemCountry)) {
                monthlyData[monthSource][itemCountry] += 1;
              }
            }
          }
        });

        const formattedData = allMonths.map(m => {
          const row: any = { name: m };
          countries.forEach(c => {
            row[c] = monthlyData[m][c] || 0;
          });
          return row;
        });

        setChartData(formattedData);
      } catch (err) {
        console.error("Failed to load market sourcing data", err);
      } finally {
        setLoading(false);
      }
    };

    if (institutions.length > 0) {
      loadData();
    }
  }, [agentId, institutions]);

  const totalStudents = chartData.reduce((sum, row) => {
    let rowTotal = 0;
    activeCountries.forEach(c => rowTotal += (row[c] || 0));
    return sum + rowTotal;
  }, 0);

  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-[340px] flex flex-col group hover:translate-y-[-2px] transition-all duration-300 overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-outfit leading-tight">Student Destinations</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Signed countries</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-slate-800 font-outfit leading-none">{totalStudents}</div>
          <div className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black border border-emerald-100 mt-1 shadow-sm">
            <ArrowUpRight size={10} strokeWidth={3} /> Students
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-4 overflow-x-auto hide-scrollbar pb-1">
        {activeCountries.length > 0 ? activeCountries.map((country, idx) => (
          <div key={country} className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{country}</span>
          </div>
        )) : (
           <span className="text-[10px] font-black text-slate-400 tracking-wide">No active destinations</span>
        )}
      </div>

      <div className="flex-1 -mx-2 -mb-2">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse flex gap-2 items-center">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" vertical={true} stroke="#F1F5F9" strokeOpacity={0.8} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }}
                dy={5}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: '1px solid #F1F5F9', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  fontFamily: 'Outfit'
                }}
                cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
              />
              {activeCountries.map((country, idx) => (
                <Line 
                  key={country}
                  type="monotone" 
                  dataKey={country} 
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 4, strokeWidth: 0, fill: CHART_COLORS[idx % CHART_COLORS.length] }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="text-[9px] font-black text-slate-400 text-center border-t border-slate-100/50 pt-3 tracking-[0.1em] mt-2">
        Market intelligence synced
      </div>
    </div>
  );
}