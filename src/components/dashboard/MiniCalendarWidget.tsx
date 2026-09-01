'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toTitleCase } from '../../utils/textUtils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDocFromServer,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'deadline' | 'interview' | 'cutoff';
  time?: string;
  isDb?: boolean;
}

const capitalizeWords = (str?: string | null): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export function MiniCalendarWidget() {
  const { user, profile, activeRole, institutions } = useAuth();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(() => {
    const systemDate = new Date();
    if (systemDate.getFullYear() < 2026) {
      return new Date(2026, 5, 2);
    }
    return systemDate;
  });

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const systemDate = new Date();
    if (systemDate.getFullYear() < 2026) {
      return new Date(2026, 5, 2);
    }
    return systemDate;
  });

  const [customPins, setCustomPins] = useState<CalendarEvent[]>([]);
  const [dbApplications, setDbApplications] = useState<any[]>([]);
  const [dbAgreements, setDbAgreements] = useState<any[]>([]);
  const [dbPartnershipReqs, setDbPartnershipReqs] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'deadline' | 'interview' | 'cutoff'>('deadline');
  const [newTime, setNewTime] = useState('12:00');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test-connection-probe', 'probe'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Firestore reports client is offline. Verify configuration settings.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('allianza_calendar_custom_pins');
    if (stored) {
      try {
        setCustomPins(JSON.parse(stored));
      } catch (e) {
        console.warn('Error reading local custom pins:', e);
      }
    }
  }, []);

  const saveCustomPins = (updated: CalendarEvent[]) => {
    setCustomPins(updated);
    localStorage.setItem('allianza_calendar_custom_pins', JSON.stringify(updated));
  };

  const activeYear = currentDate.getFullYear();
  const activeMonth = currentDate.getMonth();

  const parseToISODateString = (val: any): string | null => {
    if (!val) return null;
    
    if (val instanceof Timestamp) {
      const d = val.toDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof val === 'object' && val.seconds !== undefined) {
      const d = new Date(val.seconds * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
      }
      const parsedMs = Date.parse(trimmed);
      if (!isNaN(parsedMs)) {
        const d = new Date(parsedMs);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      try {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
          const day = parseInt(parts[0], 10);
          const monthWord = parts[1].toLowerCase();
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && !isNaN(year)) {
            const months: Record<string, number> = {
              jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
              may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
              oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
            };
            const matchedMonth = Object.keys(months).find(k => monthWord.startsWith(k));
            if (matchedMonth !== undefined) {
              const m = String(months[matchedMonth] + 1).padStart(2, '0');
              const d = String(day).padStart(2, '0');
              return `${year}-${m}-${d}`;
            }
          }
        }
      } catch (err) {
      }
    }
    return null;
  };

  useEffect(() => {
    if (!user?.uid) return;

    const startOfMonth = new Date(activeYear, activeMonth, 1);
    const endOfMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59);

    const targetUniversityId = profile?.universityId || profile?.institutionId || '';

    let appQuery = query(collection(db, 'applications'));
    if (activeRole === 'agent') {
      appQuery = query(
        collection(db, 'applications'),
        where('agentId', '==', user.uid)
      );
    } else if (activeRole === 'university' && targetUniversityId) {
      appQuery = query(
        collection(db, 'applications'),
        where('targetUniversityId', '==', targetUniversityId)
      );
    }

    const unsubApps = onSnapshot(appQuery, (snapshot) => {
      let apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (activeRole === 'university') {
        apps = apps.filter((app: any) => app.applicationStatus !== 'draft');
      }
      setDbApplications(apps);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'applications');
    });

    let agreementQuery = query(collection(db, 'agreements'));
    if (activeRole === 'agent') {
      agreementQuery = query(
        collection(db, 'agreements'),
        where('agentId', '==', user.uid)
      );
    } else if (activeRole === 'university' && targetUniversityId) {
      agreementQuery = query(
        collection(db, 'agreements'),
        where('universityId', '==', targetUniversityId)
      );
    }

    const unsubAgreements = onSnapshot(agreementQuery, (snapshot) => {
      const agrees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDbAgreements(agrees);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'agreements');
    });

    let partQuery = query(collection(db, 'partnershipRequests'));
    if (activeRole === 'agent') {
      partQuery = query(
        collection(db, 'partnershipRequests'),
        where('agentId', '==', user.uid)
      );
    } else if (activeRole === 'university' && targetUniversityId) {
      partQuery = query(
        collection(db, 'partnershipRequests'),
        where('universityId', '==', targetUniversityId)
      );
    }

    const unsubPartnerships = onSnapshot(partQuery, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDbPartnershipReqs(reqs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'partnershipRequests');
    });

    return () => {
      unsubApps();
      unsubAgreements();
      unsubPartnerships();
    };
  }, [user?.uid, activeRole, activeMonth, activeYear, profile?.universityId, profile?.institutionId]);

  const resolvedEvents = useMemo(() => {
    const records: CalendarEvent[] = [];

    records.push(...customPins);

    if (institutions && institutions.length > 0) {
      institutions.forEach(inst => {
        if (inst.programs && inst.programs.length > 0) {
          inst.programs.forEach((prog, idx) => {
            if (prog.collegeApplicationDeadline) {
              const dateStr = parseToISODateString(prog.collegeApplicationDeadline);
              if (dateStr) {
                const standardizedIntake = capitalizeWords(prog.intake) || 'Current';
                const standardizedLevel = capitalizeWords(prog.level) || 'Bachelor Level 6';
                records.push({
                  id: `inst-dl-${inst.id}-${idx}`,
                  title: `Application Deadline - Intake(${standardizedIntake}) - Level (${standardizedLevel})`,
                  description: `Program: ${prog.name || 'Academic Program'}. Registration cutoff for custom campus enrollment at ${inst.name}.`,
                  date: dateStr,
                  type: 'cutoff',
                  time: '23:59',
                  isDb: true
                });
              }
            }
            if (prog.visaSubmissionDeadline) {
              const dateStr = parseToISODateString(prog.visaSubmissionDeadline);
              if (dateStr) {
                const standardizedIntake = capitalizeWords(prog.intake) || 'Current';
                const standardizedLevel = capitalizeWords(prog.level) || 'Bachelor / Level 6';
                records.push({
                  id: `inst-visa-${inst.id}-${idx}`,
                  title: `Visa Deadline - Intake(${standardizedIntake}) - Level (${standardizedLevel})`,
                  description: `Program: ${prog.name || 'Academic Program'}. Mandatory VISA verification checkpoint relative to ${inst.name} enrollment cycle.`,
                  date: dateStr,
                  type: 'deadline',
                  time: '17:00',
                  isDb: true
                });
              }
            }
          });
        }
      });
    }

    dbApplications.forEach(app => {
      const appDate = parseToISODateString(app.createdAt) || parseToISODateString(app.updatedAt);
      const studentName = toTitleCase(`${app.studentFirstName || 'Student'} ${app.studentLastName || ''}`.trim());
      const stat = app.applicationStatus;
      const uniName = app.targetUniversityName || 'Partner Institution';

      const scheduledDate = parseToISODateString(app.interview?.date || app.interviewDate);
      if (scheduledDate) {
        records.push({
          id: `db-app-scheduled-interview-${app.id}`,
          title: `Interview - ${studentName}`,
          description: `Official Interview for student ${studentName || 'candidate'} for entry into ${app.targetCourseName || 'selected program'}. Notes: ${app.interviewNotes || app.interview?.notes || 'None'}`,
          date: scheduledDate,
          type: 'interview',
          time: app.interviewTime || app.interview?.time || '14:30',
          isDb: true
        });
      }

      if (appDate) {
        if ((stat === 'interview_requested' || stat === 'interview_pending') && !scheduledDate) {
          records.push({
            id: `db-app-interview-${app.id}`,
            title: `Candidate Assessment: ${studentName}`,
            description: `Scheduled academic admissions screening with enrollment desk for entry.`,
            date: appDate,
            type: 'interview',
            time: '14:30',
            isDb: true
          });
        } else if (stat === 'submitted') {
          records.push({
            id: `db-app-submit-${app.id}`,
            title: `Application Lodged: ${studentName}`,
            description: `Direct application successfully posted to ${uniName} for evaluation.`,
            date: appDate,
            type: 'interview',
            time: '09:00',
            isDb: true
          });
        } else if (stat === 'incomplete') {
          records.push({
            id: `db-app-inc-${app.id}`,
            title: `⚠️ Incomplete Warning: ${studentName}`,
            description: `Lacks required supporting files or passport attachments. Update prompt.`,
            date: appDate,
            type: 'deadline',
            time: '12:00',
            isDb: true
          });
        }
      }
    });

    dbAgreements.forEach(ag => {
      const normStatus = (ag.status || '').toLowerCase();
      if (normStatus === 'signed' || normStatus === 'finalized') {
        return;
      }

      const signDateRaw = ag.agentDetails?.signedDate || ag.agentDetails?.date || ag.createdAt;
      const parsedDate = parseToISODateString(signDateRaw);
      
      if (parsedDate) {
        const partner = ag.agentName || ag.universityName || 'Partner Agent';
        const docStatus = ag.status === 'signed' ? 'Partnership Signed' : 'Agreement Verification';
        records.push({
          id: `db-ag-${ag.id}`,
          title: `🤝 ${docStatus}: ${partner}`,
          description: `Contract terms fully executed and archived in server vault under B2B network rules.`,
          date: parsedDate,
          type: 'cutoff',
          time: '12:00',
          isDb: true
        });
      }
    });

    dbPartnershipReqs.forEach(req => {
      const normStatus = (req.status || '').toLowerCase();
      if (normStatus === 'signed' || normStatus === 'finalized') {
        return;
      }

      const reqDate = parseToISODateString(req.createdAt) || parseToISODateString(req.updatedAt);
      if (reqDate) {
        const initiator = req.agentName || req.universityName || ' recruitment associate';
        records.push({
          id: `db-req-${req.id}`,
          title: `⚡ Partnership Proposal: ${initiator}`,
          description: `B2B network alignment waiting on agreement verification review.`,
          date: reqDate,
          type: 'cutoff',
          time: '11:00',
          isDb: true
        });
      }
    });

    if (records.length === 0) {
      const demoSeed = [
        {
          id: 'seed-1',
          title: 'Application Deadline - Intake(Fall 2026) - Level (Bachelor Level 6)',
          description: 'High priority application cutoff for autumn admissions registration cycle.',
          date: `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-05`,
          type: 'cutoff',
          time: '23:59'
        },
        {
          id: 'seed-2',
          title: 'Candidate Interview: Bibash Rai',
          description: 'Special program screening for BA in Management applicant.',
          date: `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-12`,
          type: 'interview',
          time: '14:30'
        },
        {
          id: 'seed-3',
          title: 'Visa Deadline - Intake(Summer 2026) - Level (Bachelor Level 6)',
          description: 'Final visa documents submission checkpoint for July fast-track intake applicants.',
          date: `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-18`,
          type: 'deadline',
          time: '17:00'
        },
        {
          id: 'seed-4',
          title: 'Application Deadline - Intake(Spring 2027) - Level (Msc Data Science)',
          description: 'MSc Data Science & AI priority selection window closure.',
          date: `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-25`,
          type: 'cutoff',
          time: '12:00'
        }
      ];
      records.push(...demoSeed);
    }

    return records;
  }, [customPins, dbApplications, dbAgreements, dbPartnershipReqs, institutions, activeYear, activeMonth]);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDayIndex = new Date(activeYear, activeMonth, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(activeYear, activeMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(activeYear, activeMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    setSelectedDate(new Date(activeYear, activeMonth, day));
  };

  const getISOStringDate = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const getEventsForDate = (year: number, month: number, day: number) => {
    const dateStr = getISOStringDate(year, month, day);
    return resolvedEvents.filter(e => e.date === dateStr);
  };

  const selectedDateEvents = (() => {
    return getEventsForDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  })();

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === activeMonth && 
           today.getFullYear() === activeYear;
  };

  const isSelected = (day: number) => {
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === activeMonth && 
           selectedDate.getFullYear() === activeYear;
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please specify a title for the event');
      return;
    }

    const dateStr = getISOStringDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const newEvent: CalendarEvent = {
      id: `custom-event-${Date.now()}`,
      title: newTitle,
      description: newDesc || 'Manual check-in added to dashboard.',
      date: dateStr,
      type: newType,
      time: newTime || '12:00',
      isDb: false
    };

    const nextPins = [...customPins, newEvent];
    saveCustomPins(nextPins);
    toast.success('Custom milestone pinned locally!');
    
    setNewTitle('');
    setNewDesc('');
    setNewType('deadline');
    setNewTime('12:00');
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = customPins.filter(e => e.id !== id);
    saveCustomPins(updated);
    toast.success('Milestone removed');
  };

  return (
    <div className="w-full bg-white rounded-[2rem] p-6 md:p-7 border border-[#EAEBEF] shadow-xs space-y-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[120px]">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-outfit flex items-center gap-2">
            <CalendarIcon className="text-[#0059E7] shrink-0" size={18} />
            <span>Key Milestones</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5 font-outfit">Platform Schedule</p>
        </div>
        
        <div className="flex items-center gap-0.5 bg-[#F8F9FA] border border-slate-200 rounded-xl p-1 shadow-xs shrink-0">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-white text-slate-400 hover:text-[#0059E7] rounded-lg transition-all cursor-pointer outline-none border border-transparent hover:border-slate-100 shadow-xs"
            title="Previous Month"
          >
            <ChevronLeft size={14} />
          </button>
          
          <div className="flex items-center select-none overflow-hidden">
            <select
              value={activeMonth}
              onChange={(e) => setCurrentDate(new Date(activeYear, parseInt(e.target.value), 1))}
              className="bg-transparent text-[10px] font-bold text-slate-700 border-none outline-none cursor-pointer uppercase tracking-widest font-outfit py-1 px-1 hover:text-[#0059E7] focus:ring-0 focus:outline-none appearance-none pr-0 text-right bg-none"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx} className="bg-white text-slate-800 font-sans normal-case text-xs">
                  {name.substring(0, 3)}
                </option>
              ))}
            </select>
            <select
              value={activeYear}
              onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), activeMonth, 1))}
              className="bg-transparent text-[10px] font-bold text-slate-700 border-none outline-none cursor-pointer uppercase tracking-widest font-outfit py-1 px-1 hover:text-[#0059E7] focus:ring-0 focus:outline-none appearance-none pr-0 text-left bg-none"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                <option key={yr} value={yr} className="bg-white text-slate-800 font-sans text-xs">
                  {yr}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-white text-slate-400 hover:text-[#0059E7] rounded-lg transition-all cursor-pointer outline-none border border-transparent hover:border-slate-100 shadow-xs"
            title="Next Month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-7 text-center">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-[10px] font-bold text-slate-300 uppercase tracking-widest py-1 select-none font-outfit">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayEvents = getEventsForDate(activeYear, activeMonth, dayNum);
            const isSel = isSelected(dayNum);
            const isTod = isToday(dayNum);
            
            const hasDeadline = dayEvents.some(e => e.type === 'deadline');
            const hasInterview = dayEvents.some(e => e.type === 'interview');
            const hasCutoff = dayEvents.some(e => e.type === 'cutoff');

            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={`aspect-square rounded-xl relative flex flex-col items-center justify-center transition-all cursor-pointer outline-none border border-transparent ${
                  isSel 
                    ? 'bg-[#0059E7] border-[#0059E7] text-white shadow-md shadow-blue-100 font-bold' 
                    : isTod
                    ? 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-100 font-bold'
                    : 'bg-white hover:border-slate-200 hover:bg-[#F8F9FA] text-slate-700 font-bold'
                }`}
              >
                <span className="text-[11px]">{dayNum}</span>
                
                <div className="absolute bottom-1.5 flex gap-0.5 justify-center">
                  {hasDeadline && (
                    <span className={`w-1 h-1 rounded-full ${isSel || isTod ? 'bg-white' : 'bg-rose-500'}`} />
                  )}
                  {hasInterview && (
                    <span className={`w-1 h-1 rounded-full ${isSel || isTod ? 'bg-white' : 'bg-[#0059E7]'}`} />
                  )}
                  {hasCutoff && (
                    <span className={`w-1 h-1 rounded-full ${isSel || isTod ? 'bg-white' : 'bg-amber-500'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 font-outfit">
            <Clock size={12} className="text-slate-400" />
            <span>Schedule for {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </p>
          
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#F8F9FA] border border-slate-200 text-[#0059E7] rounded-lg transition-all text-[9px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:bg-blue-50 shadow-xs font-outfit"
            title="Pin custom milestone"
          >
            <Plus size={10} />
            <span>Pin Event</span>
          </button>
        </div>

        <div className="space-y-2 min-h-[80px]">
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(event => (
              <div 
                key={event.id}
                title={`${event.title}${event.description ? ` - ${event.description}` : ''}${event.time ? ` (${event.time})` : ''}`}
                onClick={() => {
                  if (event.id.startsWith('db-app-')) {
                    const parts = event.id.split('-');
                    const appId = parts[parts.length - 1];
                    const suffix = event.id.includes('-interview-') ? '?scroll=interview' : '';
                    router.push(`/application/${appId}${suffix}`);
                  }
                }}
                className={`p-3 rounded-xl border flex items-start gap-3 relative group transition-all ${
                  event.id.startsWith('db-app-') ? 'cursor-pointer hover:border-slate-300' : ''
                } ${
                  event.type === 'deadline' 
                    ? 'bg-rose-50/30 border-rose-100 text-rose-950' 
                    : event.type === 'interview'
                    ? 'bg-blue-50/30 border-blue-100 text-blue-950'
                    : 'bg-amber-50/30 border-amber-100 text-amber-950'
                }`}
              >
                <span className={`w-1 self-stretch min-h-[1.5rem] shrink-0 ${
                  event.type === 'deadline' 
                    ? (event.title.toLowerCase().includes('visa') ? 'rounded-none bg-rose-500' : 'rounded-full bg-rose-500') 
                    : event.type === 'interview' ? 'rounded-full bg-[#0059E7]' : 'rounded-full bg-amber-500'
                }`} />

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h5 className="text-[11px] font-bold truncate group-hover:whitespace-normal group-hover:break-words tracking-tight transition-all">{event.title}</h5>
                  </div>
                  {event.description && (
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 group-hover:line-clamp-none group-hover:whitespace-normal group-hover:break-words transition-all">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {event.time && (
                      <span className="text-[8px] px-1.5 py-0.5 font-bold uppercase bg-white border border-slate-200/50 rounded-full text-slate-400 whitespace-nowrap tracking-wider font-outfit">
                        {event.time}
                      </span>
                    )}
                    {event.isDb && (
                      <span className="text-[8px] px-1.5 py-0.5 font-extrabold uppercase bg-[#0059E7] text-white rounded-full whitespace-nowrap tracking-wider font-outfit">
                        LIVE SYNC
                      </span>
                    )}
                  </div>
                </div>

                {!event.isDb && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="absolute right-2 top-3 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Remove milestone"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 bg-[#F8F9FA] rounded-xl border border-dashed border-slate-200">
              <Sparkles className="text-slate-200 mb-2" size={18} />
              <p className="text-[10px] font-bold uppercase tracking-widest font-outfit">No critical deadlines</p>
              <button 
                type="button"
                onClick={() => setShowAddModal(true)}
                className="text-[9px] font-bold text-[#0059E7] mt-1 hover:underline tracking-tight uppercase"
              >
                Pin a quick check-in
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-[#F8F9FA]/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200 shadow-2xl max-w-sm w-full space-y-4 sm:space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-outfit">Pin New Milestone</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 font-outfit">
                    Schedule for {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-[#F8F9FA] rounded-xl text-slate-300 hover:text-slate-600 cursor-pointer outline-none transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddEventSubmit} className="space-y-3.5 sm:space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Milestone Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Visa Intake Final Deposit"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0059E7] font-bold text-slate-700 placeholder-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Criteria Description</label>
                  <textarea
                    placeholder="Brief guidelines or required files..."
                    rows={2}
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[#F8F9FA] border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0059E7] font-medium text-slate-700 placeholder-slate-300 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Category</label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value as any)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0059E7] font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="deadline">🔴 Deadline</option>
                      <option value="interview">🔵 Interview</option>
                      <option value="cutoff">🟠 Cutoff</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-outfit">Target Time</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0059E7] font-bold text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 sm:py-4 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all text-center cursor-pointer mt-3 sm:mt-4 font-outfit"
                >
                  Pin Milestone
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}