"use client";

import { motion } from 'motion/react';
import { Briefcase, Building2, ArrowRight, ShieldCheck, Globe, Star } from 'lucide-react';
import Link from 'next/link';

const SignUp = () => {
  const options = [
    {
      title: 'Agent',
      description: 'Scale your student pipeline and access global academic infrastructure for your growing consultancy.',
      icon: Briefcase,
      path: '/signup/agent',
      tagline: 'Agent',
      features: ['Access 1,600+ Global Institutions', 'Real-time Commission Analytics', 'Advanced Application Telemetry']
    },
    {
      title: 'Institution',
      description: 'Diversify your campus and automate institutional enrollment with verified international candidates.',
      icon: Building2,
      path: '/signup/institution',
      tagline: 'Institution',
      features: ['180+ Student Geo-Pools', 'Automated Compliance Vetting', 'Deep Recruitment Intelligence']
    }
  ];

  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-outfit relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-5%] w-[500px] h-full bg-[#0059E7] opacity-5 blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-8">
          {options.map((option, index) => {
            const Icon = option.icon;

            return (
              <motion.div
                key={option.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-slate-50 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-sm hover:shadow-xl hover:bg-white hover:border-slate-200 transition-all flex flex-col group relative overflow-hidden"
              >
                <div className="relative z-10 space-y-6 flex-1">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">
                      {option.tagline}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-100 group-hover:bg-[#0059E7] group-hover:text-white group-hover:border-[#0059E7] transition-all shadow-sm">
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>

                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{option.title}</h2>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {option.description}
                  </p>

                  <div className="space-y-3 pt-3 border-t border-slate-200/50">
                    {option.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                          <ShieldCheck size={12} strokeWidth={3} />
                        </div>

                        <span className="text-[12px] font-bold text-slate-600 tracking-tight">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 relative z-10">
                  <Link
                    href={option.path}
                    className="w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all bg-custom-rainbow text-white hover:opacity-95 uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200"
                  >
                    Onboard as {option.title} <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-20 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 py-8 border-y border-slate-100 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="text-amber-400 fill-amber-400 w-3.5 h-3.5" />
                ))}
              </div>

              <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                4.9/5 Mean Partner Satisfaction
              </span>
            </div>

            <div className="flex items-center gap-8">
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-emerald-500" />
                Fully Encrypted
              </span>

              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Globe size={14} className="text-blue-500" />
                Global Protocol
              </span>
            </div>
          </div>

          <p className="text-center text-slate-500 font-bold text-sm">
            Operational Member?{' '}
            <Link
              href="/login"
              className="text-[#0059E7] hover:underline underline-offset-8 decoration-2 transition-all"
            >
              Sign In to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;