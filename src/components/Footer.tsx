"use client";

import { Globe, GraduationCap, ShieldCheck, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const Footer = () => {
  const { hideLandingPages } = useAuth();

  return (
    <footer className="bg-white pt-16 pb-10 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-8">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-custom-rainbow rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:opacity-90 transition-all">
                <GraduationCap className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 font-outfit">Allianza.io</span>
            </Link>
            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">
              The sovereign infrastructure for global academic recruitment. Connecting validated institutions and elite agencies via unified digital protocols.
            </p>
            <div className="flex items-center gap-4">
              {/* {[Facebook, Linkedin, Youtube].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-100 shadow-sm">
                  <Icon size={18} strokeWidth={2.5} />
                </a>
              ))} */}
            </div>
          </div>

          {!hideLandingPages ? (
            <>
              {/* Links Column 1 */}
              <div className="md:col-span-2 space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] font-outfit">Architecture</h4>
                <ul className="space-y-4 text-[13px] font-bold text-slate-600">
                  <li><Link href="/universities" className="hover:text-slate-900 transition-colors">Academic Hub</Link></li>
                  <li><Link href="/agencies" className="hover:text-slate-900 transition-colors">Agency Hub</Link></li>
                  <li><Link href="/resources" className="hover:text-slate-900 transition-colors">Services & Intelligence</Link></li>
                  <li><Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link></li>
                  <li><Link href="/signup" className="hover:text-slate-900 transition-colors">Integration</Link></li>
                </ul>
              </div>

              {/* Links Column 2 */}
              <div className="md:col-span-2 space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] font-outfit">Organization</h4>
                <ul className="space-y-4 text-[13px] font-bold text-slate-600">
                  <li><Link href="/about" className="hover:text-slate-900 transition-colors">Ecosystem</Link></li>
                  <li><Link href="/contact" className="hover:text-slate-900 transition-colors">Terminals</Link></li>
                  <li><Link href="/quality" className="hover:text-slate-900 transition-colors">Quality Assurance</Link></li>
                  <li><a href="#" className="hover:text-slate-900 transition-colors">Governance</a></li>
                </ul>
              </div>
            </>
          ) : (
            /* When landing pages are disabled */
            <div className="md:col-span-4 space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] font-outfit">Resources</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-[13px] font-bold text-slate-600">
                <li><Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link></li>
              </ul>
            </div>
          )}

          {/* Contact Info Column */}
          <div className="md:col-span-4 space-y-8">
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Direct Terminal</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm font-bold text-slate-900">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#0059E7] shadow-sm">
                    <Mail size={16} strokeWidth={2.5} />
                  </div>
                  <span>ops@allianza.io</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-emerald-100 w-fit shadow-sm">
                <ShieldCheck size={14} strokeWidth={3} /> System Active
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <p>&copy; 2026 Allianza Inc.</p>
            <Link href="/privacy-policy" className="hover:text-[#1B2B49]">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-[#1B2B49]">Terms of Service</Link>
            <a href="#" className="hover:text-[#1B2B49]">Security</a>
          </div>
          <button className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#1B2B49] bg-white border border-slate-200 px-6 py-3 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            <Globe size={16} className="text-blue-500" />
            Global / English
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;