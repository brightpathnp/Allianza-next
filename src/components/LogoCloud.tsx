"use client";

import React from 'react';
import { motion } from 'motion/react';
import { 
  GraduationCap, 
  ShieldCheck, 
  LayoutDashboard, 
  Activity, 
  Award 
} from 'lucide-react';

const stats = [
  {
    id: 'built-admissions',
    value: 'Dedicated',
    label: 'ADMISSIONS',
    Icon: GraduationCap,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    id: 'zero-guesswork',
    value: 'Zero',
    label: 'Guesswork Pipelines',
    Icon: ShieldCheck,
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    id: 'role-dashboards',
    value: 'Unified',
    label: 'DASHBOARDS',
    Icon: LayoutDashboard,
    bgColor: 'bg-emerald-50',
    textColor: 'text-[#2852EB]',
  },
  {
    id: 'live-status',
    value: 'Live',
    label: 'Application Status',
    Icon: Activity,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    id: 'years-expertise',
    value: '7+',
    label: 'Years of Innovation',
    Icon: Award,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  }
];

const LogoCloud: React.FC = () => {
  return (
    <section id="stats-section" className="py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight font-outfit mb-4">
              Infrastructure for Global <br /> Educational Mobility
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              We provide the tools and network for institutions to manage complex recruitment cycles with absolute transparency and higher conversion rates.
            </p>
          </div>
          <div className="hidden md:block h-[1px] flex-1 bg-slate-200 mx-12 mb-6" />
          <div className="pb-2">
            <div className="text-3xl font-black text-[#0059E7] font-outfit">Future-Ready</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">TECH DEPLOYED</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {stats.map((stat, index) => {
            const IconComponent = stat.Icon;
            return (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                id={`stat-card-${stat.id}`}
                className="bg-white p-10 flex flex-col items-start hover:bg-slate-50 transition-colors duration-300"
              >
                <div className={`w-10 h-10 ${stat.bgColor} ${stat.textColor} rounded-xl flex items-center justify-center mb-6`}>
                  <IconComponent size={20} strokeWidth={2.5} />
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit leading-none">
                    {stat.value}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LogoCloud;