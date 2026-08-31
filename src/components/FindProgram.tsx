"use client";

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { BookOpen, IdCard, BarChart3, Globe } from 'lucide-react';

const FindProgram: React.FC = () => {
  return (
    <section id="find-program-section" className="py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
          
          {/* Left Column: Info & Features */}
          <div className="lg:col-span-6 flex flex-col space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Global Marketplace</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.1] font-outfit">
                Intelligent Student <br /> Recruitment Architecture
              </h2>
              
              <p className="text-slate-500 text-lg leading-relaxed font-medium max-w-xl">
                We've engineered a precision-driven ecosystem that connects academic excellence with global ambition. Experience a recruitment cycle that is 3x faster, 100% transparent, and fully optimized.
              </p>
            </div>
            
            {/* Features list */}
            <div className="grid sm:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0059E7] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-snug">
                  Multi-Program Aggregator
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Apply to multiple institutions through a single unified profile and document vault.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-emerald-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-snug">
                  Precision Matching
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Our algorithm cross-references eligibility against multiple program criteria in real-time.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Link 
                href="/signup"
                className="inline-flex justify-center items-center px-8 py-4 bg-custom-rainbow text-white text-[11px] font-bold rounded-2xl shadow-xl hover:opacity-95 transition-all uppercase tracking-widest"
              >
                Create Partner Account
              </Link>
              <Link 
                href="/contact"
                className="inline-flex justify-center items-center px-8 py-4 bg-white text-slate-900 text-[11px] font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest"
              >
                Speak to an Expert
              </Link>
            </div>
          </div>

          {/* Right Column: Bento Visual Section */}
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-6 items-stretch">
              {/* Feature Box 1 */}
              <div className="col-span-2 relative group overflow-hidden rounded-3xl border border-slate-200 shadow-sm aspect-[16/9]">
                <img 
                  src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&q=80" 
                  alt="Students Collaborating" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="text-white text-xl font-bold font-outfit mb-2">Advanced Analytics</div>
                  <p className="text-white/70 text-xs font-medium leading-relaxed max-w-sm">
                    Gain deep insights into enrollment trends and partner performance across global territories.
                  </p>
                </div>
              </div>

              {/* Feature Box 2 */}
              <div className="bg-custom-rainbow p-8 rounded-3xl text-white flex flex-col justify-between hover:translate-y-[-4px] transition-transform duration-300">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <IdCard size={20} />
                </div>
                <div className="mt-6">
                  <div className="text-3xl font-black font-outfit mb-1 leading-none tracking-tight">95%</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white">Success Rate</div>
                </div>
              </div>

              {/* Feature Box 3 */}
              <div className="bg-[#0059E7] p-8 rounded-3xl text-white flex flex-col justify-between hover:translate-y-[-4px] transition-transform duration-300 shadow-lg shadow-blue-500/20">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <div className="mt-6">
                  <div className="text-3xl font-black font-outfit mb-1 leading-none tracking-tight">2.4k+</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Global Partners</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default FindProgram;