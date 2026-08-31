"use client";

import { motion } from 'motion/react';
import Link from 'next/link';
import { 
  Globe, 
  IdCard, 
  Sparkles, 
  Coins, 
  GraduationCap, 
  Users,
  ArrowRight,
  ShieldCheck,
  Building2,
  Zap
} from 'lucide-react';

const FeatureSections = () => {
  return (
    <div className="font-outfit">
      {/* Channel Partners Section */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16">
          
          <div className="space-y-32">
            {/* Row 1: Partners Institutions */}
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              
              {/* Left Visual Column */}
              <div className="relative group">
                <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl aspect-[4/3] bg-slate-50">
                  <img 
                    src="https://images.pexels.com/photos/9490632/pexels-photo-9490632.jpeg?auto=compress&cs=tinysrgb&w=1200" 
                    alt="Institutional Partnership"
                    className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="text-white text-lg font-bold leading-tight">Academic Portal</div>
                        <div className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">Scalable Enrollment OS</div>
                      </div>
                    </div>
                    <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                      <div className="bg-white text-slate-900 p-3.5 rounded-lg shadow-lg">
                        <div className="text-xs font-bold mb-1">Global Reach</div>
                        <div className="text-[11px] text-slate-500 font-medium leading-snug">Manage recruitment from 110+ markets in real-time.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Text Column */}
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest">For Institutions</span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                    Centralize Your <br /> <span className="text-[#0059E7]">Global Recruitment</span>
                  </h3>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                    Build a resilient, high-quality international funnel through Allianza's end-to-end recruitment architecture.
                  </p>
                </div>
                
                <div className="grid gap-8">
                  {[
                    { icon: Globe, title: 'Extreme Market Diversity', text: 'Instantly broaden your campus with students from over 110+ vetted origin markets.' },
                    { icon: ShieldCheck, title: 'Verified Application Flow', text: 'Receive pre-screened applications that exceed institutional compliance standards.' },
                    { icon: Zap, title: 'Algorithmic Efficiency', text: 'Achieve 40% reduction in processing time through our AI-integrated workflow.' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-5">
                      <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                        <item.icon size={20} strokeWidth={2.5} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link 
                    href="/universities"
                    className="inline-flex items-center gap-3 bg-custom-rainbow hover:opacity-95 text-white font-bold text-[11px] px-10 py-5 rounded-2xl uppercase tracking-widest shadow-xl transition-all"
                  >
                    Partner Portal <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Row 2: Agencies */}
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              
              {/* Left Text Column */}
              <div className="order-2 lg:order-1 space-y-12">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest">For Agencies</span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                    The Modern Standard <br /> <span className="text-amber-600">for Recruitment</span>
                  </h3>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                    Scale your agency with access to world-class institutions and the industry's most advanced management tools.
                  </p>
                </div>
                
                <div className="grid gap-8">
                  {[
                    { icon: IdCard, title: 'Premium Program Inventory', text: 'Access academic options across top global study destinations.' },
                    { icon: Sparkles, title: 'AI-Assisted Placement', text: 'Reduce rejections with real-time eligibility checks and counselor support.' },
                    { icon: Coins, title: 'Commission Tracking & Forecast', text: 'Real-time visibility into your earnings with automated settlement cycles and predictive payout forecasting.' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-5">
                      <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                        <item.icon size={20} strokeWidth={2.5} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link 
                    href="/agencies"
                    className="inline-flex items-center gap-3 bg-custom-rainbow hover:opacity-95 text-white font-bold text-[11px] px-10 py-5 rounded-2xl uppercase tracking-widest shadow-xl transition-all"
                  >
                    Agent Onboarding <ArrowRight size={18} />
                  </Link>
                </div>
              </div>

              {/* Right Visual Column */}
              <div className="order-1 lg:order-2 relative group w-full max-w-sm lg:max-w-md mx-auto">
                <div className="relative rounded-[2.25rem] overflow-hidden border border-slate-200 shadow-2xl aspect-[4/3] bg-slate-50">
                  <img 
                    src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80" 
                    alt="Agency Specialists"
                    className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white shrink-0">
                        <Users size={20} />
                      </div>
                      <div>
                        <div className="text-white text-lg font-bold leading-tight">Partner Dashboard</div>
                        <div className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">End-to-End Visibility</div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-0.5">Weekly Commissions</div>
                          <div className="text-white text-xl font-black font-outfit leading-none">$14,240.00</div>
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-500 text-white text-[9px] font-bold rounded-md animate-pulse">SETTLED</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Stats Section Bar */}
      <section className="py-24 bg-custom-rainbow relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 items-center">
            {[
              { label: 'INSTITUTIONAL TIES', value: 'Curated' },
              { label: 'SOURCE MARKETS', value: 'Active' },
              { label: 'STUDENT ONBOARDING', value: 'Seamless' },
              { label: 'COMPLIANCE VAULTS', value: 'Fail-Safe' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-3"
              >
                <p className="text-2xl md:text-3xl font-black text-white font-outfit tracking-tight leading-none">{stat.value}</p>
                <p className="text-white text-[10px] font-bold uppercase tracking-[0.25em]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeatureSections;