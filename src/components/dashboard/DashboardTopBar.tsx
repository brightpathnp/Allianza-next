'use client';

import { useState, useRef, useEffect } from 'react';
import { GraduationCap, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserSessionData {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

interface DashboardTopBarProps {
  user?: UserSessionData;
  notificationCount?: number;
  onSignOut?: () => void;
  onNavigate?: (route: string) => void;
  onNotificationClick?: () => void;
  onMobileMenuClick?: () => void;
}

export default function DashboardTopBar({
  user = {
    name: "Aarav Sharma",
    email: "aarav.sharma@brightpath.edu",
    role: "Admin",
    avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026024d"
  },
  notificationCount = 4,
  onSignOut = () => console.log("Executing secure application exit routine..."),
  onNavigate = (route) => console.log(`Routing to client segment: ${route}`),
  onNotificationClick,
  onMobileMenuClick
}: DashboardTopBarProps) {
  
  const { hideSupportCenter } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="w-full h-14 bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between font-sans antialiased select-none relative z-[150]">
      
      <div className="flex items-center gap-3">
        {onMobileMenuClick && (
          <button 
            type="button"
            onClick={onMobileMenuClick}
            className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-[#0059E7] shadow-sm">
            <GraduationCap size={18} />
          </div>
          <span className="font-bold text-slate-800 text-lg font-outfit tracking-tight truncate">Allianza</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        
        <button 
          type="button" 
          onClick={onNotificationClick}
          className="relative p-1.5 text-slate-500 hover:text-slate-800 transition-colors focus:outline-none cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.027 6.027 0 00-4.518-5.834V4.5a1.5 1.5 0 00-3 0v1.666A6.027 6.027 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {notificationCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-[#EF4444] text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
              {notificationCount}
            </span>
          )}
        </button>

        <span className="h-5 w-px bg-slate-200"></span>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 focus:outline-none group cursor-pointer"
          >
            <img 
              src={user.avatarUrl} 
              alt={`${user.name} Profile Frame`} 
              className="w-7 h-7 rounded-full object-cover border border-slate-200 group-hover:border-slate-400 transition-all shadow-inner"
            />
            
            <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors text-[11px] tracking-wide">
              {user.name}
            </span>

            <svg 
              className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-xl shadow-xl z-[200] overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-1 duration-100">
              
              <div className="p-3 bg-white space-y-0.5">
                <h4 className="text-[12px] font-bold text-slate-900 tracking-tight">{user.name}</h4>
                <p className="text-slate-400 text-[9px] font-medium tracking-wide truncate">{user.email}</p>
                
                <div className="pt-1">
                  <span className="inline-block bg-[#E6FFFA] text-[#0D9488] text-[8px] font-bold px-1.5 py-0.5 rounded border border-[#CCFBF1]">
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100"></div>

              <div className="p-1 space-y-0.5 bg-white">
                 <button
                  type="button"
                  onClick={() => { onNavigate('settings'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-medium text-[11px] text-left cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </button>

                {(user.role === 'Institution' || user.role === 'university') && (
                  <>
                    <button
                      type="button"
                      onClick={() => { onNavigate('dashboard?tab=Settings&sub=team'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-medium text-[11px] text-left cursor-pointer"
                    >
                      <Users size={14} className="text-slate-400 shrink-0" />
                      <span>Institution Team</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { onNavigate('dashboard?tab=Settings&sub=account'); setIsDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-medium text-[11px] text-left cursor-pointer"
                    >
                      <ShieldCheck size={14} className="text-slate-400 shrink-0" />
                      <span>Security</span>
                    </button>
                  </>
                )}

                {!hideSupportCenter && (
                  <button
                    type="button"
                    onClick={() => { onNavigate('help-support'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-medium text-[11px] text-left cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Help & Support</span>
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100"></div>

              <div className="p-1 bg-white">
                <button
                  type="button"
                  onClick={() => { onSignOut(); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#EF4444] hover:bg-rose-50 transition-all font-bold text-[11px] text-left cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-[#EF4444] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}