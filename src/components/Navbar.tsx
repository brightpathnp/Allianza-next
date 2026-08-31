"use client";

import { motion } from 'motion/react';
import { ChevronDown, Menu, X, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, logout, hideLandingPages } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Successfully logged out');
      router.push('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex-shrink-0 flex items-center cursor-pointer group"
          >
            <span className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-custom-rainbow rounded-xl flex items-center justify-center text-white group-hover:opacity-95 transition-colors shadow-lg shadow-slate-200">
                <GraduationCap className="w-6 h-6" strokeWidth={2.5} />
              </div>
              Allianza.io
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!hideLandingPages && (
            <div className="hidden lg:flex items-center space-x-8">
              <Link href="/" className="text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-outfit">
                Home
              </Link>
              <Link href="/universities" className="text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-outfit">
                Academic
              </Link>
              <Link href="/agencies" className="text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-outfit">
                Agencies
              </Link>
              <Link href="/about" className="text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-outfit">
                Ecosystem
              </Link>
              <Link href="/quality" className="text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-outfit">
                Quality
              </Link>
            </div>
          )}

          {/* Right side actions */}
          <div className="hidden lg:flex items-center space-x-6">
            {user ? (
              <div className="flex items-center space-x-6">
                <Link href="/dashboard" className="text-slate-900 font-black text-[11px] uppercase tracking-widest px-3 py-2 hover:text-[#0059E7] cursor-pointer font-outfit">
                  Terminal
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-slate-50 text-slate-900 px-6 py-2.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer font-outfit shadow-sm"
                >
                  Terminate
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-slate-900 font-black text-[10px] uppercase tracking-widest px-3 py-2 hover:text-[#0059E7] cursor-pointer font-outfit">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#0059E7] text-white px-7 py-3 rounded-xl text-[10px] font-bold shadow-xl shadow-slate-200 hover:bg-[#0047b3] transition-all cursor-pointer font-outfit uppercase tracking-[0.2em]"
                >
                  Signup
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-[#f58220]"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-white border-t border-gray-100 absolute top-full left-0 right-0 max-h-[calc(100vh-80px)] overflow-y-auto shadow-xl z-50"
        >
          <div className="px-4 pt-2 pb-8 space-y-2">
            {!hideLandingPages && (
              <>
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-4 text-xs font-bold text-slate-800 font-outfit uppercase tracking-widest border-b border-slate-50 flex justify-between items-center"
                >
                  Home
                </Link>
                <Link
                  href="/universities"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-4 text-xs font-bold text-slate-800 font-outfit uppercase tracking-widest border-b border-slate-50 flex justify-between items-center"
                >
                  Universities
                </Link>
                <Link
                  href="/agencies"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-4 text-xs font-bold text-slate-800 font-outfit uppercase tracking-widest border-b border-slate-50 flex justify-between items-center"
                >
                  Agencies
                </Link>
                <Link
                  href="/about"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-4 text-xs font-bold text-slate-800 font-outfit uppercase tracking-widest border-b border-slate-50 flex justify-between items-center"
                >
                  About
                </Link>
                <Link
                  href="/quality"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-4 text-xs font-bold text-slate-800 font-outfit uppercase tracking-widest border-b border-slate-50 flex justify-between items-center"
                >
                  Quality
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-4 text-xs font-bold text-slate-800 font-outfit uppercase tracking-widest border-b border-slate-50 flex justify-between items-center"
                >
                  Contact
                </Link>
              </>
            )}
            <div className="pt-6 space-y-4 px-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-[#0059E7] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center shadow-lg shadow-blue-100"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full bg-[#F8F9FA] text-slate-700 font-outfit py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center border border-slate-200"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-[#F8F9FA] text-slate-700 font-outfit py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center border border-slate-200"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-[#0059E7] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center justify-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;