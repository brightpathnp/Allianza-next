'use client';

interface UniversityWelcomeHeaderProps {
  userName?: string;
  logo?: string;
  newApplicationsCount?: number;
  tasksCount?: number;
  messagesCount?: number;
  onAcademicSettingsClick?: () => void;
}

export default function UniversityWelcomeHeader({
  userName = "Alex",
  logo,
  newApplicationsCount = 12,
  tasksCount = 5,
  messagesCount = 8,
  onAcademicSettingsClick = () => console.log("Navigating to academic settings...")
}: UniversityWelcomeHeaderProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-[22px] bg-gradient-to-r from-[#0F172A] via-[#141E30] to-[#0059E7] px-8 py-7 shadow-lg border border-slate-800/40 select-none font-sans antialiased">
      
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[200%] bg-gradient-to-b from-white via-transparent to-black rounded-[40%] transform rotate-12 animate-[spin_120s_linear_infinite]"></div>
      </div>
      <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        
        <div className="flex items-center gap-5">
          <div className="space-y-1.5">
            <h1 className="text-[26px] font-bold text-white tracking-tight leading-none">
              Welcome, <span className="text-sky-300">Global College Malta!</span>
            </h1>
            
            <p className="text-[12px] text-slate-300 font-normal tracking-wide leading-relaxed">
              You have{' '}
              <span className="font-bold text-white text-[13px]">
                {newApplicationsCount} new applications
              </span>
              ,{' '}
              <span className="font-bold text-white text-[13px]">
                {tasksCount} tasks
              </span>
              , and{' '}
              <span className="font-bold text-white text-[13px]">
                {messagesCount} messages
              </span>{' '}
              today
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={onAcademicSettingsClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-medium text-[12px] tracking-wide border border-white/10 shadow-inner transition-all backdrop-blur-md cursor-pointer group"
          >
            <span>Academic Settings</span>
            <svg 
              className="w-3.5 h-3.5 text-white transform group-hover:translate-x-1 transition-transform ease-out" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}