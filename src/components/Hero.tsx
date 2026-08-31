"use client";

import { motion } from 'motion/react';
import { ArrowRight, Globe, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

const Hero = () => {
  return (
    <div className="relative pt-28 pb-20 lg:pt-36 lg:pb-32 overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[80%] h-[60%] bg-blue-50/40 rounded-full blur-[140px] opacity-40 animate-pulse" />
        <div className="absolute bottom-0 right-[10%] w-[60%] h-[50%] bg-indigo-50/30 rounded-full blur-[140px] opacity-30" />
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 space-y-10"
          >
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-50 rounded-full border border-slate-200">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#0059E7]" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.25em] font-outfit">Enterprise Study Abroad OS</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight font-outfit">
                Empowering <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0059E7] to-indigo-600">
                  Global Education
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl font-medium">
                The unified operating system for universities and recruitment agencies to scale international enrollments with precision and trust.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <Link href="/signup" className="flex items-center justify-center gap-3 px-10 py-5 bg-[#0059E7] text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-custom-rainbow transition-all shadow-xl shadow-blue-100/50 hover:translate-y-[-2px]">
                Deploy Your Portal <ArrowRight size={18} />
              </Link>
              <Link href="/about" className="flex items-center justify-center gap-3 px-10 py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm hover:translate-y-[-2px]">
                Watch Demo
              </Link>
            </div>

            <div className="flex items-center gap-10 pt-10">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-custom-rainbow flex items-center justify-center text-[10px] font-bold text-white">
                  +1k
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Trusted by <span className="text-slate-900 font-bold">1,600+</span> global institutions
              </div>
            </div>
          </motion.div>

          {/* Visual Canvas Element */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 relative w-full max-w-sm lg:max-w-md mx-auto"
          >
            <div className="relative rounded-[1.75rem] bg-slate-50 p-4 border border-slate-200 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-transparent rounded-[1.75rem]" />
              <div className="relative bg-white rounded-2xl shadow-sm border border-slate-100 p-1">
                <img 
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80" 
                  alt="Allianza Collaborative Platform View" 
                  className="rounded-xl w-full h-[260px] object-cover"
                />
              </div>

              {/* Data Overlays */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="absolute top-8 -left-6 bg-white/95 backdrop-blur-sm p-3.5 rounded-xl shadow-xl border border-slate-100/50 z-20 min-w-[160px]"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-[#0059E7] flex items-center justify-center">
                    <Globe size={15} />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">Network Span</div>
                    <div className="text-sm font-black text-[#1B2B49]">92 Countries</div>
                  </div>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-[#0059E7]" />
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute bottom-8 -right-6 bg-white/95 backdrop-blur-sm p-3.5 rounded-xl shadow-xl border border-slate-100/50 z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Compliance Score</div>
                    <div className="text-sm font-extrabold text-[#1B2B49]">99.1% Verified</div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Background Accent */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;