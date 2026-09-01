'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Globe, 
  GripVertical,
  Plus, 
  Trash2, 
  Edit3, 
  Copy,
  Filter,
  Search, 
  BookOpen, 
  Clock, 
  BadgePercent, 
  Sparkles, 
  Check, 
  HelpCircle,
  TrendingUp,
  Award,
  AlertCircle,
  FileCheck2,
  ListRestart,
  Save,
  Loader2,
  Calendar,
  Layers,
  GraduationCap,
  Upload,
  Download,
  X,
  Coins,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { CentralLoader } from './CentralLoader';
import { handleFirestoreError, OperationType } from '../../lib/authUtils';
import { CURRENCIES } from '../../types';
import { getCourseIntakes } from '../../lib/intakeUtils';

interface Program {
  name: string;
  fee?: string | null;
  discount?: string | null;
  scholarship?: string | null;
  level?: string | null;
  duration?: string | null;
  credit?: string | null;
  visaFee?: string | null;
  collegeApplicationDeadline?: string | null;
  visaSubmissionDeadline?: string | null;
  intake?: string | null;
  rncpNo?: string | null;
  totalTuitionFee?: string | null;
  firstYearFee?: string | null;
  firstYearFeeAfterDiscount?: string | null;
  adminCost?: string | null;
  accommodationFee?: string | null;
}

interface Institution {
  id: string;
  name: string;
  country: string;
  website: string;
  location: string;
  fee: string;
  currency: string;
  applicationFee: string;
  scholarship: string;
  notes: string[];
  programs: Program[];
  levels: string[];
  intakes: string[];
  intakeSchedules?: {
    ug: { name: string; startDate: string; appClose: string; visaClose: string }[];
    pg: { name: string; startDate: string; appClose: string; visaClose: string }[];
  };
  updatedAt?: any;
}

const DEFAULT_GCM_PROGRAMS: Program[] = [
  { 
    name: "Master in Business Administration (MBA)", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "9000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "20 Oct 2025", 
    visaSubmissionDeadline: "31 Oct 2025" 
  },
  { 
    name: "MBA (Logistic and Supply Chain Management)", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "15 Dec 2025", 
    visaSubmissionDeadline: "2 Jan 2026" 
  },
  { 
    name: "Masters of Science Leadership and Change Management", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "19 Apr 2025*", 
    visaSubmissionDeadline: "1 May 2026" 
  },
  { 
    name: "Master Science Management", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "19 Jun 2026", 
    visaSubmissionDeadline: "3 Jul 2026" 
  },
  { 
    name: "MSc in Management with Human Resources", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "4 Sep 2026", 
    visaSubmissionDeadline: "25 Sep 2026" 
  },
  { 
    name: "MSc in Marketing Management", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "24 Oct 2025", 
    visaSubmissionDeadline: "14 Nov 2025" 
  },
  { 
    name: "MSC in Tourism and Event Management", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "15 Dec 2025", 
    visaSubmissionDeadline: "2 Jan 2026" 
  },
  { 
    name: "MSC in Health and Social Care Management", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "10000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "9 Jan 2026", 
    visaSubmissionDeadline: "30 Jan 2026" 
  },
  { 
    name: "Post Graduate Diploma In Management with Pathways", 
    level: "Postgraduate Diploma (Level 7)", 
    duration: "12 Months", 
    credit: "64", 
    fee: "8000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6 Feb 2026", 
    visaSubmissionDeadline: "27 Feb 2026" 
  },
  { 
    name: "Executive Masters in Business Administration", 
    level: "Masters (Level 7)", 
    duration: "12 Months", 
    credit: "90", 
    fee: "8500", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "20 Mar 2026", 
    visaSubmissionDeadline: "10 Apr 2026" 
  },
  { 
    name: "Doctor of Business Administration", 
    level: "Doctorate/ PhD (Level 8)", 
    duration: "36 Months", 
    credit: "270", 
    fee: "9500", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "17 Apr 2026", 
    visaSubmissionDeadline: "8 May 2026" 
  },
  { 
    name: "Bachelors of Arts in Management", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "6100", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "22 May 2026", 
    visaSubmissionDeadline: "12 Jun 2026" 
  },
  { 
    name: "BA in Marketing", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "6100", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "26 Jun 2026", 
    visaSubmissionDeadline: "17 Jul 2026" 
  },
  { 
    name: "BA in Management with Psychology", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "6100", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "31 Jul 2026", 
    visaSubmissionDeadline: "21 Aug 2026" 
  },
  { 
    name: "BA in Management with Human Resources Management", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "6100", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "4 Sep 2026", 
    visaSubmissionDeadline: "25 Sep 2026" 
  },
  { 
    name: "BA in Accountancy and Finance", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "6100", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  },
  { 
    name: "BA Information Technology for Business", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "6100", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  },
  { 
    name: "Bachelors of Arts in Tourism and Events Management", 
    level: "Bachelors (Level 6)", 
    duration: "36 Months", 
    credit: "180", 
    fee: "7500", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  },
  { 
    name: "BA Top Up Degree in Business and Management", 
    level: "Bachelors (Level 6)", 
    duration: "12 Months", 
    credit: "60", 
    fee: "6500", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  },
  { 
    name: "Undergraduate Diploma in Management", 
    level: "Undergraduate Diploma (Level 5)", 
    duration: "12 Months", 
    credit: "60", 
    fee: "7000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  },
  { 
    name: "Undergraduate Diploma in Foundation Medical Science", 
    level: "Undergraduate Diploma (Level 5)", 
    duration: "12 Months", 
    credit: "60", 
    fee: "14000", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  },
  { 
    name: "Diploma in Financial Crime Compliance, Anti Money Laundering", 
    level: "Undergraduate Diploma (Level 5)", 
    duration: "12 Months", 
    credit: "60", 
    fee: "6500", 
    scholarship: "500", 
    discount: "Scholarship: Scholarship/Discount", 
    visaFee: "700",
    collegeApplicationDeadline: "6-8 Weeks Before", 
    visaSubmissionDeadline: "After 11 days of Application submission" 
  }
];

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString.replace('*', ''));
  if (isNaN(date.getTime())) return dateString;
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const DatePickerInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const dateObj = value ? new Date(value.replace('*', '')) : null;
  const isValidDate = dateObj && !isNaN(dateObj.getTime());
  
  let dateValue = '';
  if (isValidDate && dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    dateValue = `${year}-${month}-${day}`;
  }

  return (
    <input 
      type="date"
      value={dateValue}
      style={{ colorScheme: 'light' }}
      onChange={(e) => {
        if (!e.target.value) {
           onChange('');
           return;
        }
        const [y, m, d] = e.target.value.split('-');
        const tempDate = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
        const formatted = `${tempDate.getDate()} ${tempDate.toLocaleString('en-GB', { month: 'short' }).toUpperCase()} ${tempDate.getFullYear()}`;
        onChange(formatted);
      }}
      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
    />
  );
};

export default function AcademicSettingsView({ profile }: { profile: any }) {
  const [institution, setInstitution] = useState<Institution | null>(null);

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || '€';
  };
  const currencySymbol = getCurrencySymbol(institution?.currency || profile?.currency || 'EUR');

  const [selectedUniId, setSelectedUniId] = useState<string>(
    profile?.universityId || 'global-college-malta'
  );
  const universityId = selectedUniId;
  const isSuperAdmin = profile?.roles?.includes('superadmin') || profile?.email === 'bec.edu.ktm@gmail.com' || profile?.email === 'bec.edu.nep@gmail.com';
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMigratingAll, setIsMigratingAll] = useState(false);
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);

  const [tempImportedPrograms, setTempImportedPrograms] = useState<Program[] | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [isSavingImport, setIsSavingImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, levelFilter, universityId]);

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showIntakeSettingsModal, setShowIntakeSettingsModal] = useState(false);
  const [intakeSchedulesForm, setIntakeSchedulesForm] = useState<{
    sections: {
      id: string;
      title: string;
      intakes: { name: string; startDate: string; appClose: string; visaClose: string }[];
    }[];
  }>({ sections: [] });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);
  const [courseForm, setCourseForm] = useState<Program>({
    name: '',
    level: 'Bachelors (Level 6)',
    duration: '36 Months',
    credit: '180',
    fee: '',
    discount: '',
    scholarship: '',
    visaFee: '700',
    collegeApplicationDeadline: '',
    visaSubmissionDeadline: '',
    intake: String(new Date().getFullYear())
  });

  const hasInitializedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!universityId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'institutions', universityId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Institution;
        setInstitution({ ...data, id: snapshot.id });
        setLoading(false);
      } else {
        if (hasInitializedRef.current[universityId]) {
          setLoading(false);
          return;
        }
        hasInitializedRef.current[universityId] = true;

        if (universityId === 'global-college-malta' || universityId === 'gcm') {
          seedDefaultGCM();
        } else if (universityId === 'paris-business-academy') {
          seedDefaultPBA();
        } else {
          initializeEmptyInstitution();
        }
      }
    }, (error) => {
      console.error("Firestore loading error:", error);
      handleFirestoreError(error, OperationType.GET, `institutions/${universityId}`);
      toast.error("Failed to load academic settings. Please check security rules.");
      setLoading(false);
    });

    return () => unsub();
  }, [universityId]);

  const seedDefaultGCM = async () => {
    setIsSeeding(true);
    const initialGcm: Institution = {
      id: 'global-college-malta',
      name: profile?.institutionName || 'Global College Malta',
      country: 'Malta',
      website: 'https://gcm.edu.mt/',
      location: 'SmartCity Malta, Kalkara, Malta',
      fee: 'UG: 6,100 - 7,500 EUR/year; PG: 8,000 - 10,000 EUR/year; DBA: 9,500 EUR/year',
      currency: 'EUR',
      applicationFee: '100 EUR Application Fee + 250 EUR Registration Fee',
      scholarship: '500 EUR Scholarship/Discount available',
      notes: [
        'IELTS 5.5 required for Undergraduate admissions',
        'IELTS 6.0 required for Postgraduate studies',
        'Evening/Part-time study modes are available for major cohorts',
        'Directly linked with international recruiters and agent network'
      ],
      programs: DEFAULT_GCM_PROGRAMS.map(prog => ({ ...prog, intake: prog.intake || '2026' })),
      levels: ['Undergraduate Diploma (Level 5)', 'Bachelors (Level 6)', 'Postgraduate Diploma (Level 7)', 'Masters (Level 7)', 'Doctorate/ PhD (Level 8)'],
      intakes: ['January', 'March', 'July', 'September', 'December']
    };

    try {
      await setDoc(doc(db, 'institutions', 'global-college-malta'), initialGcm);
      toast.success("Successfully initialized Global College Malta Academic data of 22 courses!");
    } catch (err) {
      console.error("Error seeding:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `institutions/global-college-malta`);
      } catch (logErr) {}
    } finally {
      setIsSeeding(false);
    }
  };

  const seedDefaultPBA = async () => {
    setIsSeeding(true);
    const initialPba: Institution = {
      id: 'paris-business-academy',
      name: 'Paris Business Academy',
      country: 'France',
      website: 'https://www.oliasi.fr/',
      location: 'Paris, France',
      fee: 'Tuition €10,000 - €18,000/year',
      currency: 'EUR',
      applicationFee: '250 EUR',
      scholarship: '25% Scholarship available',
      notes: [
        'Study in the historical core of Paris',
        'RNCP Certified Degrees mapped'
      ],
      programs: [
        { 
          name: "Bachelor in Digital Project Management", 
          duration: "36 Months",
          level: "Bachelor",
          rncpNo: "RNCP34152",
          totalTuitionFee: "18000",
          firstYearFee: "10000",
          firstYearFeeAfterDiscount: "7900",
          adminCost: "290",
          accommodationFee: "400"
        },
        { 
          name: "Bachelor in Web Development", 
          duration: "36 Months",
          level: "Bachelor",
          rncpNo: "RNCP34152",
          totalTuitionFee: "18000",
          firstYearFee: "10000",
          firstYearFeeAfterDiscount: "7900",
          adminCost: "290",
          accommodationFee: "400"
        },
        { 
          name: "Bachelor in Web Marketing", 
          duration: "36 Months",
          level: "Bachelor",
          rncpNo: "RNCP34152",
          totalTuitionFee: "18000",
          firstYearFee: "10000",
          firstYearFeeAfterDiscount: "7900",
          adminCost: "290",
          accommodationFee: "400"
        },
        { 
          name: "Global MBA", 
          duration: "12 Months",
          level: "Master",
          rncpNo: "RNCP35118",
          totalTuitionFee: "18000",
          firstYearFee: "10000",
          firstYearFeeAfterDiscount: "7900",
          adminCost: "290",
          accommodationFee: "400"
        }
      ],
      levels: ['Bachelor', 'Master'],
      intakes: ['September', 'January']
    };

    try {
      await setDoc(doc(db, 'institutions', 'paris-business-academy'), initialPba);
      toast.success("Successfully initialized Paris Business Academy Academic data!");
    } catch (err) {
      console.error("Error seeding PBA:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `institutions/paris-business-academy`);
      } catch (logErr) {}
    } finally {
      setIsSeeding(false);
    }
  };

  const initializeEmptyInstitution = async () => {
    const emptyInst: Institution = {
      id: universityId,
      name: profile?.institutionName || 'My University Portal',
      country: profile?.country || 'Malta',
      website: profile?.website || '',
      location: profile?.address || '',
      fee: 'UG: 5,000 - 8,000 EUR/year',
      currency: 'EUR',
      applicationFee: '150 EUR',
      scholarship: 'Up to 10% merit based discounts',
      notes: ['No IELTS required for native English speakers'],
      programs: [],
      levels: ['Undergraduate', 'Postgraduate'],
      intakes: ['January', 'September']
    };

    try {
      await setDoc(doc(db, 'institutions', universityId), emptyInst);
      toast.success("Initialized new university setting profile on Firestore!");
    } catch (err) {
      console.error("Error setting up empty institution Doc:", err);
    }
  };

  const openIntakeSettingsModal = () => {
    if (institution) {
      const dbSchedules: any = (institution as any).intakeSchedules || {};
      const dbSections = dbSchedules._sections || [
        { id: 'ug', title: 'UGs, Foundation & BA Top-up Intakes' },
        { id: 'pg_masters_dba', title: 'PG, Master, DBA Intakes' }
      ];

      const mappedSections = dbSections.map((sec: any) => ({
        id: sec.id,
        title: sec.title || (sec.id === 'ug' ? 'UGs, Foundation & BA Top-up Intakes' : 'PG, Master, DBA Intakes'),
        intakes: Array.isArray(dbSchedules[sec.id]) ? dbSchedules[sec.id] : []
      }));

      const hasUg = mappedSections.some((s: any) => s.id === 'ug');
      if (!hasUg && Array.isArray(dbSchedules.ug) && dbSchedules.ug.length > 0) {
        mappedSections.unshift({
          id: 'ug',
          title: 'UGs, Foundation & BA Top-up Intakes',
          intakes: dbSchedules.ug
        });
      }
      const hasPg = mappedSections.some((s: any) => s.id === 'pg');
      if (!hasPg && Array.isArray(dbSchedules.pg) && dbSchedules.pg.length > 0) {
        const ugIdx = mappedSections.findIndex((s: any) => s.id === 'ug');
        const insertIdx = ugIdx !== -1 ? ugIdx + 1 : 0;
        mappedSections.splice(insertIdx, 0, {
          id: 'pg',
          title: 'PG, Master & DBA Intakes',
          intakes: dbSchedules.pg
        });
      }

      setIntakeSchedulesForm({
        sections: mappedSections
      });
      setShowIntakeSettingsModal(true);
    }
  };

  const saveIntakeSettings = async () => {
    if (!institution) return;
    try {
      const updatedRef = doc(db, 'institutions', universityId);
      const payload: any = {
        _sections: intakeSchedulesForm.sections.map(sec => ({ id: sec.id, title: sec.title }))
      };
      
      intakeSchedulesForm.sections.forEach(sec => {
        payload[sec.id] = sec.intakes;
      });

      await updateDoc(updatedRef, {
        intakeSchedules: payload,
        updatedAt: serverTimestamp()
      });
      toast.success("Intake settings successfully updated in Firestore!");
      setShowIntakeSettingsModal(false);
    } catch (err) {
      console.error("Error updating intake settings:", err);
      handleFirestoreError(err, OperationType.UPDATE, `institutions/${universityId}`);
      toast.error("Permission denied. Failed to update intake settings.");
    }
  };

  const downloadSpreadsheetTemplate = () => {
    const headers = ["Level (UG or PG)", "Intake Name", "Start Date", "Application Close", "Visa Close"];
    const rows = [
      ["UG Foundation", "Spring Intake 2026", "05 Jan 2026", "20 Oct 2025", "31 Oct 2025"],
      ["BA Top-up", "Summer Intake 2026", "02 Mar 2026", "15 Dec 2025", "02 Jan 2026"],
      ["Masters", "Fall Intake PG 2026", "14 Sep 2026", "19 Jun 2026", "03 Jul 2026"],
      ["DBA", "Winter Intake DBA 2026", "07 Dec 2026", "04 Sep 2026", "25 Sep 2026"]
    ];
    
    try {
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Intake Template");
      XLSX.writeFile(wb, "University_Intake_Schedules_Template.xlsx");
      toast.success("Downloaded Intake Settings Spreadsheet Template successfully!");
    } catch (err) {
      console.error("Error generating Excel template:", err);
      toast.error("Failed to download template spreadsheet.");
    }
  };

  const addNewSection = () => {
    const newId = `custom_${Date.now()}`;
    const newTitle = ``;
    setIntakeSchedulesForm(prev => ({
      sections: [
        ...prev.sections,
        {
          id: newId,
          title: newTitle,
          intakes: []
        }
      ]
    }));
    setEditingSectionId(newId);
    toast.success("Created new intake section! Select a level category and add intakes.");
  };

  const removeSection = (sectionId: string) => {
    setIntakeSchedulesForm(prev => ({
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    toast.info("Intake section removed.");
  };

  const duplicateSection = (sectionId: string) => {
    const sectionToCopy = intakeSchedulesForm.sections.find(s => s.id === sectionId);
    if (!sectionToCopy) return;

    const newId = `section-${Date.now()}`;
    const newSection = {
      ...sectionToCopy,
      id: newId,
      title: `${sectionToCopy.title} (Copy)`,
      intakes: sectionToCopy.intakes.map(intake => ({ ...intake }))
    };

    const sectionIndex = intakeSchedulesForm.sections.findIndex(s => s.id === sectionId);
    const updatedSections = [...intakeSchedulesForm.sections];
    updatedSections.splice(sectionIndex + 1, 0, newSection);
    
    setIntakeSchedulesForm({ sections: updatedSections });
    setEditingSectionId(newId);
    toast.success(`Duplicated "${sectionToCopy.title}"`);
  };

  const handleIntakeSpreadsheetUpload = (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
        
        const importedItems: any[] = [];

        data.forEach((row: any) => {
          const keys = Object.keys(row);
          let level = '';
          let name = '';
          let startDate = '';
          let appClose = '';
          let visaClose = '';

          keys.forEach(k => {
            const kl = k.toLowerCase().replace(/[\s_-]/g, '');
            const val = String(row[k] || '').trim();
            if (!val) return;

            if (kl.includes('level') || kl.includes('tier') || kl.includes('degree') || kl.includes('category') || kl.includes('type')) {
              level = val;
            } else if (kl.includes('name') || kl.includes('intake') || kl === 'term' || kl === 'session') {
              name = val;
            } else if (kl.includes('start') || kl.includes('commence') || kl === 'date') {
              startDate = val;
            } else if (kl.includes('close') && (kl.includes('app') || kl.includes('appl') || kl.includes('dead'))) {
              appClose = val;
            } else if (kl.includes('close') && k.toLowerCase().includes('visa')) {
              visaClose = val;
            }
          });

          if (!name) {
            name = row.name || row.Name || row.Intake || row.intake || row['Intake Name'] || row['intake name'] || '';
          }
          if (!startDate) {
            startDate = row.startDate || row.StartDate || row['Start Date'] || row['start date'] || '';
          }
          if (!appClose) {
            appClose = row.appClose || row.AppClose || row['App Close'] || row['app close'] || row.applicationClose || row['Application Close'] || '';
          }
          if (!visaClose) {
            visaClose = row.visaClose || row.VisaClose || row['Visa Close'] || row['visa close'] || '';
          }

          const formatExcelVal = (v: any) => {
            if (!v) return '';
            if (typeof v === 'number' || (!isNaN(v) && !isNaN(parseFloat(v)))) {
              try {
                const date = XLSX.SSF.parse_date_code(Number(v));
                if (date) {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return `${date.d} ${months[date.m - 1]} ${date.y}`;
                }
              } catch (e) {
                console.warn(e);
              }
            }
            return String(v).trim();
          };

          const formattedStart = formatExcelVal(startDate);
          const formattedApp = formatExcelVal(appClose);
          const formattedVisa = formatExcelVal(visaClose);
          const termName = String(name || '').trim();

          if (!termName) return;

          const newItem = { name: termName, startDate: formattedStart, appClose: formattedApp, visaClose: formattedVisa };
          importedItems.push(newItem);
        });

        if (importedItems.length === 0) {
          toast.error("No valid intake schedules were found in the uploaded document. Please check headers & data.");
          return;
        }

        setIntakeSchedulesForm(prev => {
          const updatedSections = prev.sections.map(sec => {
            if (sec.id === sectionId) {
              return { ...sec, intakes: [...sec.intakes, ...importedItems] };
            }
            return sec;
          });
          return { sections: updatedSections };
        });

        const targetSectionName = intakeSchedulesForm.sections.find(s => s.id === sectionId)?.title || "the section";
        toast.success(`Spreadsheet loaded! Loaded all ${importedItems.length} intakes into "${targetSectionName}".`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse the file. Please ensure it is a valid Excel or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const openCourseModal = (index: number | null = null) => {
    const currentYearStr = String(new Date().getFullYear());
    if (index !== null && institution) {
      const target = institution.programs[index];
      setEditingCourseIndex(index);
      setCourseForm({
        name: target.name || '',
        level: target.level || 'Bachelors (Level 6)',
        duration: target.duration || '36 Months',
        credit: target.credit || '180',
        fee: target.fee || '',
        discount: target.discount || '',
        scholarship: target.scholarship || '',
        visaFee: target.visaFee || '700',
        collegeApplicationDeadline: target.collegeApplicationDeadline || '',
        visaSubmissionDeadline: target.visaSubmissionDeadline || '',
        intake: target.intake || currentYearStr,
        rncpNo: target.rncpNo || '',
        totalTuitionFee: target.totalTuitionFee || '',
        firstYearFee: target.firstYearFee || '',
        firstYearFeeAfterDiscount: target.firstYearFeeAfterDiscount || '',
        adminCost: target.adminCost || (universityId === 'paris-business-academy' ? '290' : ''),
        accommodationFee: target.accommodationFee || (universityId === 'paris-business-academy' ? '400' : '')
      });
    } else {
      setEditingCourseIndex(null);
      setCourseForm({
        name: '',
        level: universityId === 'paris-business-academy' ? 'Bachelor' : 'Bachelors (Level 6)',
        duration: '36 Months',
        credit: '180',
        fee: '',
        discount: '',
        scholarship: '',
        visaFee: '700',
        collegeApplicationDeadline: '',
        visaSubmissionDeadline: '',
        intake: currentYearStr,
        rncpNo: '',
        totalTuitionFee: '',
        firstYearFee: '',
        firstYearFeeAfterDiscount: '',
        adminCost: universityId === 'paris-business-academy' ? '290' : '',
        accommodationFee: universityId === 'paris-business-academy' ? '400' : ''
      });
    }
    setShowCourseModal(true);
  };

  const handleSaveCourseForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;

    let updatedPrograms = [...institution.programs];
    
    if (editingCourseIndex !== null) {
      updatedPrograms[editingCourseIndex] = { ...courseForm };
    } else {
      updatedPrograms.push({ ...courseForm });
    }

    const updatedRef = doc(db, 'institutions', universityId);
    
    try {
      await updateDoc(updatedRef, {
        programs: updatedPrograms,
        updatedAt: serverTimestamp()
      });
      toast.success(editingCourseIndex !== null ? "Program modified successfully in Firestore!" : "New program added successfully to Firestore!");
      setShowCourseModal(false);
    } catch (err) {
      console.error("Error saving program item:", err);
      handleFirestoreError(err, OperationType.UPDATE, `institutions/${universityId}`);
      toast.error("Permission denied. Failed to update course listings.");
    }
  };

  const handleDeleteCourse = (program: Program) => {
    setProgramToDelete(program);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCourse = async () => {
    if (!institution || !programToDelete) return;
    
    const updatedPrograms = institution.programs.filter((p) => p !== programToDelete);
    const updatedRef = doc(db, 'institutions', universityId);

    try {
      await updateDoc(updatedRef, {
        programs: updatedPrograms,
        updatedAt: serverTimestamp()
      });
      toast.success("Program removed successfully from Firestore!");
      setShowDeleteConfirm(false);
      setProgramToDelete(null);
    } catch (err) {
      console.error("Error deleting course item:", err);
      handleFirestoreError(err, OperationType.UPDATE, `institutions/${universityId}`);
      toast.error("Permission denied. Failed to remove course.");
    }
  };

  const downloadTemplate = () => {
    try {
      const table = document.createElement('table');
      if (universityId === 'paris-business-academy') {
        table.innerHTML = `
          <table>
            <thead>
              <tr style="background-color: #4f46e5; color: #ffffff; font-weight: bold; font-family: 'Outfit', sans-serif;">
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Programs</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Duration</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Level</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">RNCP No.</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Total Tuition Fees</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">1st Year Fees</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">1st Year Fees After 25% Scholarship + Other Expenses</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Administrative Cost</th>
                <th style="background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Accommodation Certificate</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        `;
      } else {
        table.innerHTML = `
          <table>
            <thead>
              <tr style="background-color: #ea580c; color: #ffffff; font-weight: bold; font-family: 'Outfit', sans-serif;">
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Course Name</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Level</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Duration</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">ECTS / Credit</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Annual Fee (${currencySymbol})</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Scholarship</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Visa Fee</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Application Deadline</th>
                <th style="background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 11pt;">Visa Submission Deadline</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        `;
      }

      const worksheet = XLSX.utils.table_to_sheet(table);

      if (universityId === 'paris-business-academy') {
        worksheet['!cols'] = [
          { wch: 40 },
          { wch: 15 },
          { wch: 15 },
          { wch: 15 },
          { wch: 22 },
          { wch: 18 },
          { wch: 55 },
          { wch: 24 },
          { wch: 28 }
        ];
      } else {
        worksheet['!cols'] = [
          { wch: 45 },
          { wch: 15 },
          { wch: 15 },
          { wch: 15 },
          { wch: 18 },
          { wch: 15 },
          { wch: 12 },
          { wch: 28 },
          { wch: 28 }
        ];
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Academic Core Template");

      const rawName = institution?.name || (universityId === 'paris-business-academy' ? "Paris Business Academy" : "Global College Malta");
      const sanitizedName = rawName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      const fileName = `${sanitizedName}_courses_template.xlsx`;

      XLSX.writeFile(workbook, fileName);
      toast.success(`Colorful Excel Template for ${rawName} downloaded!`);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while building the Excel template.");
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          toast.error("The uploaded Excel file appears to be empty.");
          return;
        }

        const headers = jsonData[0] as string[];
        if (!headers || headers.length === 0) {
          toast.error("Could not locate columns headers in the uploaded excel.");
          return;
        }

        const rows = jsonData.slice(1);
        const parsedPrograms: Program[] = [];

        const normalize = (s: any) => s?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';

        const mapping: Record<string, keyof Program> = {
          'coursename': 'name',
          'programname': 'name',
          'program': 'name',
          'programs': 'name',
          'course': 'name',
          'name': 'name',
          
          'mqflevel': 'level',
          'level': 'level',
          'mqf': 'level',
          
          'duration': 'duration',
          'durationmonths': 'duration',
          
          'ectscredit': 'credit',
          'ects': 'credit',
          'credit': 'credit',
          'credits': 'credit',
          
          'annualfee': 'fee',
          'fee': 'fee',
          
          'scholarship': 'scholarship',
          'scholarshipamount': 'scholarship',
          
          'visafeeeur': 'visaFee',
          'visafee': 'visaFee',
          'visasfee': 'visaFee',
          
          'applicationdeadline': 'collegeApplicationDeadline',
          'collegeapplicationdeadline': 'collegeApplicationDeadline',
          'deadline': 'collegeApplicationDeadline',
          
          'visasubmissiondeadline': 'visaSubmissionDeadline',
          'visasubmission': 'visaSubmissionDeadline',

          'rncpno': 'rncpNo',
          'rncpnum': 'rncpNo',
          'rncp': 'rncpNo',
          'totaltuitionfee': 'totalTuitionFee',
          'totaltuitionfees': 'totalTuitionFee',
          '1styearfee': 'firstYearFee',
          '1styearfees': 'firstYearFee',
          'firstyearfee': 'firstYearFee',
          'firstyearfees': 'firstYearFee',
          '1styearfeesafter25scholarshipotherexpenses': 'firstYearFeeAfterDiscount',
          'firstyearfeeafterdiscount': 'firstYearFeeAfterDiscount',
          'administrativecost': 'adminCost',
          'administrativefee': 'adminCost',
          'administrativefees': 'adminCost',
          'admincost': 'adminCost',
          'accommodationcertificate': 'accommodationFee',
          'accommodationfee': 'accommodationFee',
          'accommodationfees': 'accommodationFee',
          'accommodation': 'accommodationFee'
        };

        const colIndices: Record<string, number> = {};
        headers.forEach((h, idx) => {
          if (!h) return;
          const norm = normalize(h);
          for (const [key, field] of Object.entries(mapping)) {
            if (norm.includes(key)) {
              colIndices[field] = idx;
              break;
            }
          }
        });

        if (colIndices.name === undefined) {
          colIndices.name = 0;
        }

        rows.forEach((row: any[]) => {
          if (!row || row.length === 0) return;
          
          const courseNameVal = colIndices.name !== undefined && colIndices.name < row.length ? row[colIndices.name]?.toString()?.trim() : '';
          if (!courseNameVal) return;

          const p: Program = {
            name: courseNameVal,
          };

          if (colIndices.level !== undefined && colIndices.level < row.length) p.level = row[colIndices.level]?.toString()?.trim() || null;
          if (colIndices.duration !== undefined && colIndices.duration < row.length) p.duration = row[colIndices.duration]?.toString()?.trim() || null;
          if (colIndices.credit !== undefined && colIndices.credit < row.length) p.credit = row[colIndices.credit]?.toString()?.trim() || null;
          
          if (colIndices.fee !== undefined && colIndices.fee < row.length) {
            const val = row[colIndices.fee]?.toString()?.trim() || '';
            p.fee = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.scholarship !== undefined && colIndices.scholarship < row.length) {
            const val = row[colIndices.scholarship]?.toString()?.trim() || '';
            p.scholarship = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.visaFee !== undefined && colIndices.visaFee < row.length) {
            const val = row[colIndices.visaFee]?.toString()?.trim() || '';
            p.visaFee = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.collegeApplicationDeadline !== undefined && colIndices.collegeApplicationDeadline < row.length) {
            p.collegeApplicationDeadline = row[colIndices.collegeApplicationDeadline]?.toString()?.trim() || null;
          }
          if (colIndices.visaSubmissionDeadline !== undefined && colIndices.visaSubmissionDeadline < row.length) {
            p.visaSubmissionDeadline = row[colIndices.visaSubmissionDeadline]?.toString()?.trim() || null;
          }

          if (colIndices.rncpNo !== undefined && colIndices.rncpNo < row.length) {
            p.rncpNo = row[colIndices.rncpNo]?.toString()?.trim() || '';
          }
          if (colIndices.totalTuitionFee !== undefined && colIndices.totalTuitionFee < row.length) {
            const val = row[colIndices.totalTuitionFee]?.toString()?.trim() || '';
            p.totalTuitionFee = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.firstYearFee !== undefined && colIndices.firstYearFee < row.length) {
            const val = row[colIndices.firstYearFee]?.toString()?.trim() || '';
            p.firstYearFee = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.firstYearFeeAfterDiscount !== undefined && colIndices.firstYearFeeAfterDiscount < row.length) {
            const val = row[colIndices.firstYearFeeAfterDiscount]?.toString()?.trim() || '';
            p.firstYearFeeAfterDiscount = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.adminCost !== undefined && colIndices.adminCost < row.length) {
            const val = row[colIndices.adminCost]?.toString()?.trim() || '';
            p.adminCost = val.replace(/[^0-9.]/g, '') || val;
          }
          if (colIndices.accommodationFee !== undefined && colIndices.accommodationFee < row.length) {
            const val = row[colIndices.accommodationFee]?.toString()?.trim() || '';
            p.accommodationFee = val.replace(/[^0-9.]/g, '') || val;
          }

          parsedPrograms.push(p);
        });

        if (parsedPrograms.length === 0) {
          toast.error("No valid program courses were parsing successfully. Please check the template format.");
          return;
        }

        setTempImportedPrograms(parsedPrograms);
        toast.success(`Successfully parsed ${parsedPrograms.length} courses! Review the dynamic catalog below.`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse the file. Please ensure standard .xlsx/CSV structure.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitImport = async () => {
    if (!institution || !tempImportedPrograms) return;
    setIsSavingImport(true);

    let updatedPrograms: Program[] = [];
    if (importMode === 'append') {
      updatedPrograms = [...institution.programs, ...tempImportedPrograms];
    } else {
      updatedPrograms = [...tempImportedPrograms];
    }

    const updatedRef = doc(db, 'institutions', universityId);
    try {
      await updateDoc(updatedRef, {
        programs: updatedPrograms,
        updatedAt: serverTimestamp()
      });
      toast.success(`Excel Import Complete! Synthesized ${tempImportedPrograms.length} courses seamlessly.`);
      setTempImportedPrograms(null);
    } catch (err) {
      console.error("Error setting bulk import items:", err);
      handleFirestoreError(err, OperationType.UPDATE, `institutions/${universityId}`);
      toast.error("Failed to commit imported courses to Firestore database.");
    } finally {
      setIsSavingImport(false);
    }
  };

  if (loading) {
    return <CentralLoader minHeight="min-h-[400px]" />;
  }

  const totalPrograms = institution?.programs?.length || 0;
  const avgFee = totalPrograms > 0 
    ? Math.round(institution!.programs.reduce((acc, p) => acc + (Number(p.fee?.replace(/[^0-9]/g, '')) || 0), 0) / totalPrograms) 
    : 0;
  const levelsCount = institution?.levels?.length || 0;

  const filteredPrograms = (institution?.programs || []).filter(p => {
    const query = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (query) {
      const pName = p.name || '';
      matchesSearch = pName.toLowerCase().startsWith(query) || 
                      !!pName.split(' ').find(w => w.toLowerCase().startsWith(query)) ||
                      p.level?.toLowerCase().includes(query) ||
                      p.duration?.toLowerCase().includes(query);
    }
    
    if (levelFilter === 'All' || levelFilter === 'All Levels') return matchesSearch;
    return matchesSearch && p.level === levelFilter;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrograms.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);

  return (
    <div className="space-y-8 font-outfit w-full">
      <div className="border-b border-slate-100 pb-6 mb-6">
        <h3 className="text-xl font-bold text-slate-800">Academic Settings & Catalog</h3>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Realtime program catalog, registration fees, deadlines, and parameters for <strong className="text-slate-800 font-bold">{institution?.name || 'Global College Malta'}</strong>.
        </p>
      </div>

      <div>
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-3.5">
                <div className="p-3.5 bg-blue-50 text-grad-blue rounded-xl shrink-0">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-grad-blue font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-blue-100">
                      Excel Suite
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-slate-200">
                      Bulk Sync
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800">Bulk Catalog Import & Export</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl leading-relaxed">
                    Download and complete our pre-formatted Excel spreadsheet template with your course matrix details, then upload to synchronize the core catalog instantly.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Download size={14} className="text-grad-blue" />
                  Download Template
                </button>

                <label className="flex items-center gap-2 px-5 py-2.5 bg-grad-blue hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer">
                  <Upload size={14} />
                  Upload Excel
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleExcelUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {tempImportedPrograms && (
              <div className="mt-6 border-t border-slate-800/80 pt-6 animate-fade-in">
                <div className="bg-slate-950/65 rounded-2xl border border-slate-800 p-6 space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-wider">Spreadsheet Parsed Successfully</p>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                        Detected {tempImportedPrograms.length} courses to import
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setImportMode('append')}
                        className={`px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                          importMode === 'append'
                            ? 'bg-[#0059E7] text-white shadow-md shadow-[#0059E7]/25'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Append ({institution?.programs?.length || 0} + {tempImportedPrograms.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('overwrite')}
                        className={`px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                          importMode === 'overwrite'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                      >
                        Overwrite (Keep Only Imported)
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-60 border border-slate-850 rounded-xl bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-black tracking-wider text-[9px] sticky top-0">
                        {universityId === 'paris-business-academy' ? (
                          <tr>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Programs</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Duration</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Level</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">RNCP No.</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Total Tuition Fees</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">1st Year Fees</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">1st Year Fees After 25% Scholarship + Other Expenses</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Administrative Cost</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Accommodation Certificate</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Course Name</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Level</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Duration</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Credit</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Fee ({currencySymbol})</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Scholarship</th>
                            <th className="px-4 py-3 bg-slate-900 border-b border-slate-850">Visa Fee</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {tempImportedPrograms.map((p, idx) => {
                          if (universityId === 'paris-business-academy') {
                            return (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="px-4 py-3 font-bold text-white max-w-xs truncate">{p.name}</td>
                                <td className="px-4 py-3 text-indigo-300 font-semibold">{p.duration || '-'}</td>
                                <td className="px-4 py-3 text-indigo-300 font-semibold">{p.level || '-'}</td>
                                <td className="px-4 py-3 font-mono">{p.rncpNo || '-'}</td>
                                <td className="px-4 py-3 text-status-success-border font-bold">{currencySymbol}{p.totalTuitionFee || '-'}</td>
                                <td className="px-4 py-3 text-status-success-border font-bold">{currencySymbol}{p.firstYearFee || '-'}</td>
                                <td className="px-4 py-3 text-orange-400 font-bold">{currencySymbol}{p.firstYearFeeAfterDiscount || '-'}</td>
                                <td className="px-4 py-3 text-indigo-200 font-semibold">{currencySymbol}{p.adminCost || '-'}</td>
                                <td className="px-4 py-3 text-indigo-200 font-semibold">{currencySymbol}{p.accommodationFee || '-'}</td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="px-4 py-3 font-bold text-white max-w-xs truncate">{p.name}</td>
                              <td className="px-4 py-3 text-indigo-300 font-semibold">{p.level || '-'}</td>
                              <td className="px-4 py-2">{p.duration || '-'}</td>
                              <td className="px-4 py-2">{p.credit || '-'}</td>
                              <td className="px-4 py-3 text-status-success-border font-bold">{currencySymbol}{p.fee || '0'}</td>
                              <td className="px-4 py-3 text-orange-400">{currencySymbol}{p.scholarship || '0'}</td>
                              <td className="px-4 py-2">{currencySymbol}{p.visaFee || '700'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setTempImportedPrograms(null)}
                      className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all"
                    >
                      <X size={14} /> Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSavingImport}
                      onClick={handleCommitImport}
                      className={`flex items-center gap-2 px-6 py-3 font-bold text-xs rounded-xl transition-all text-white cursor-pointer ${
                        importMode === 'overwrite'
                          ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/10'
                          : 'bg-[#0059E7] hover:bg-[#004BCB] shadow-lg shadow-[#0059E7]/10'
                      }`}
                    >
                      {isSavingImport ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Saving Bulk Data...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Confirm and Write to Firestore
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
            
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-end items-center mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search catalog by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue outline-none transition-all text-sm font-medium text-slate-800"
              />
            </div>

            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue outline-none transition-all text-sm appearance-none cursor-pointer font-bold text-slate-800"
              >
                <option value="All">All Levels</option>
                <option value="Undergraduate Diploma (Level 5)">Undergraduate Diploma (Level 5)</option>
                <option value="Bachelors (Level 6)">Bachelors (Level 6)</option>
                <option value="Postgraduate Diploma (Level 7)">Postgraduate Diploma (Level 7)</option>
                <option value="Masters (Level 7)">Masters (Level 7)</option>
                <option value="Doctorate/ PhD (Level 8)">Doctorate/ PhD (Level 8)</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none w-4 h-4" />
            </div>

            <button 
              onClick={openIntakeSettingsModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-grad-blue hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Calendar size={16} />
              Intake Settings
            </button>
            
            <button 
              onClick={() => openCourseModal(null)}
              className="flex items-center gap-2 px-5 py-2.5 bg-grad-blue hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Plus size={16} />
              Add New Course
            </button>

            <button 
              onClick={seedDefaultGCM}
              disabled={isSeeding}
              title="Reset of GCM data schema with 22 courses"
              className="flex items-center gap-2 px-5 py-2.5 border border-blue-200 bg-blue-50/50 text-grad-blue rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-100/50 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSeeding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ListRestart size={16} />
              )}
              Refresh Data
            </button>
          </div>

          <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {universityId === 'paris-business-academy' ? (
                      <>
                        <th className="px-6 py-4 rounded-l-xl">Programs</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Level</th>
                        <th className="px-6 py-4">RNCP No.</th>
                        <th className="px-6 py-4">Total Tuition Fees</th>
                        <th className="px-6 py-4">1st Year Fees</th>
                        <th className="px-6 py-4">1st Year Fees After 25% Scholarship</th>
                        <th className="px-6 py-4">Administrative Cost</th>
                        <th className="px-6 py-4">Accommodation Cert</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 rounded-l-xl">Course Name</th>
                        <th className="px-6 py-4">Level</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">ECTS / Credit</th>
                        <th className="px-6 py-4">Annual Fee ({currencySymbol})</th>
                        <th className="px-6 py-4">Scholarship</th>
                        <th className="px-6 py-4">Visa Fee</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                  {currentItems.length > 0 ? (
                    currentItems.map((course, idx) => {
                      const originalIdx = institution?.programs?.indexOf(course) ?? idx;

                      if (universityId === 'paris-business-academy') {
                        return (
                          <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {course.name}
                            </td>

                            <td className="px-6 py-4">
                              <span className="font-semibold text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={12} />
                                {course.duration || '36 Months'}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex px-2.5 py-1 bg-blue-50 text-grad-blue rounded-lg text-[10px] font-bold uppercase border border-blue-100">
                                {course.level || 'Bachelor'}
                              </span>
                            </td>

                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                              {course.rncpNo || '-'}
                            </td>

                            <td className="px-6 py-4 font-bold text-slate-800">
                              {currencySymbol}{Number(course.totalTuitionFee) ? Number(course.totalTuitionFee).toLocaleString() : (course.totalTuitionFee || '18,500')}
                            </td>

                            <td className="px-6 py-4 font-bold text-emerald-600">
                              {currencySymbol}{Number(course.firstYearFee) ? Number(course.firstYearFee).toLocaleString() : (course.firstYearFee || '10,000')}
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-grad-blue font-bold text-xs rounded-full border border-blue-100">
                                {currencySymbol}{Number(course.firstYearFeeAfterDiscount) ? Number(course.firstYearFeeAfterDiscount).toLocaleString() : (course.firstYearFeeAfterDiscount || '7,900')}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-slate-600 font-semibold">
                              {currencySymbol}{Number(course.accommodationFee) ? Number(course.accommodationFee).toLocaleString() : (course.accommodationFee || '400')}
                            </td>

                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => openCourseModal(originalIdx)}
                                  className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-grad-blue rounded-xl transition-colors cursor-pointer"
                                  title="Edit course definitions"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(course)}
                                  className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                                  title="Delete course from database"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {course.name}
                          </td>
                          
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2.5 py-1 bg-blue-50 text-grad-blue border border-blue-100 rounded-lg text-[10px] font-bold uppercase">
                              {course.level || 'Bachelors (Level 6)'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-semibold text-xs text-slate-500 flex items-center gap-1">
                              <Clock size={12} />
                              {course.duration || '36 Months'}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                            {course.credit || '180'}
                          </td>

                          <td className="px-6 py-4 font-bold text-slate-800">
                            {currencySymbol}{Number(course.fee) ? Number(course.fee).toLocaleString() : (course.fee || '6,100')}
                          </td>

                          <td className="px-6 py-4 text-xs font-bold text-emerald-600">
                            {course.scholarship ? `${currencySymbol}${course.scholarship}` : 'None'}
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                            {currencySymbol}{course.visaFee || '700'}
                          </td>

                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => openCourseModal(originalIdx)}
                                className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-grad-blue rounded-xl transition-colors cursor-pointer"
                                title="Edit course definitions"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(course)}
                                className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                                title="Delete course from database"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                          <BookOpen size={30} />
                        </div>
                        <h4 className="text-slate-800 font-bold mb-1">No matches found</h4>
                        <p className="text-sm">No courses matching "{searchQuery}" under filter "{levelFilter}".</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col p-4 space-y-4 bg-slate-50/50">
              {currentItems.length > 0 ? (
                currentItems.map((course, idx) => {
                  const originalIdx = institution?.programs?.indexOf(course) ?? idx;
                  const isParis = universityId === 'paris-business-academy';
                  const displayFee = isParis 
                    ? (Number(course.firstYearFee) ? Number(course.firstYearFee).toLocaleString() : (course.firstYearFee || '10,000'))
                    : (Number(course.fee) ? Number(course.fee).toLocaleString() : (course.fee || '0'));
                  
                  const feeLabel = isParis ? "Annual Fee (1st Year)" : "Annual Fee";

                  return (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-[1.25rem] shadow-sm p-5 space-y-4 relative group">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course Name</span>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{course.name}</h4>
                      </div>
                      
                      <div className="flex flex-col gap-1 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{feeLabel}</span>
                        <span className="font-bold text-lg text-slate-800">{currencySymbol}{displayFee}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCourseIndex(originalIdx);
                            setCourseForm({ ...course });
                            setShowCourseModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-grad-blue hover:bg-blue-100 rounded-xl transition-all text-xs font-bold cursor-pointer"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all text-xs font-bold cursor-pointer"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <BookOpen size={30} />
                  </div>
                  <h4 className="text-slate-800 font-bold mb-1">No matches found</h4>
                  <p className="text-sm">No courses matching "{searchQuery}" under filter "{levelFilter}".</p>
                </div>
              )}
            </div>

            {filteredPrograms.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/80 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-500">Items per page:</p>
                  <div className="relative">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 cursor-pointer appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" size={12} />
                  </div>
                  <p className="text-xs font-medium text-slate-400 ml-2">
                    Showing {Math.min(indexOfFirstItem + 1, filteredPrograms.length)}–{Math.min(indexOfLastItem, filteredPrograms.length)} of {filteredPrograms.length}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer select-none"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center select-none cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-grad-blue text-white shadow-md shadow-blue-500/20'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer select-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    {editingCourseIndex !== null ? 'Modify Course Definition' : 'Introduce New Course Offering'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Direct write triggers secure updates on Firebase Firestore</p>
                </div>
                <button 
                  onClick={() => setShowCourseModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveCourseForm} className="p-8 space-y-5 overflow-y-auto flex-1">
                {universityId === 'paris-business-academy' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Official Program Name</label>
                      <input
                        type="text"
                        required
                        value={courseForm.name || ''}
                        placeholder="e.g. MSc International Business"
                        onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
                        <input
                          type="text"
                          required
                          value={courseForm.duration || ''}
                          placeholder="e.g. 1 Year [or] 12 Months"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, duration: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Level</label>
                        <input
                          type="text"
                          required
                          value={courseForm.level || ''}
                          placeholder="e.g. Bachelor [or] Master"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">RNCP No.</label>
                        <input
                          type="text"
                          value={courseForm.rncpNo || ''}
                          placeholder="e.g. RNCP34752"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, rncpNo: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Tuition Fees ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.totalTuitionFee || ''}
                          placeholder="e.g. 18500"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, totalTuitionFee: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold text-orange-600"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1st Year Fees ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.firstYearFee || ''}
                          placeholder="e.g. 10000"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, firstYearFee: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold text-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1st Year Fees After 25% Scholarship + Other Expenses ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.firstYearFeeAfterDiscount || ''}
                          placeholder="e.g. 7900"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, firstYearFeeAfterDiscount: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold text-indigo-700"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Administrative Cost ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.adminCost || ''}
                          placeholder="e.g. 290"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, adminCost: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Accommodation Certificate ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.accommodationFee || ''}
                          placeholder="e.g. 400"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, accommodationFee: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Official Program Name</label>
                      <input
                        type="text"
                        required
                        value={courseForm.name || ''}
                        placeholder="e.g. Master Science Management"
                        onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-sm font-medium"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">MQF standard Level</label>
                        <select
                          value={courseForm.level || 'Bachelors (Level 6)'}
                          onChange={(e) => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold"
                        >
                          <option value="Undergraduate Diploma (Level 5)">Undergraduate Diploma (Level 5)</option>
                          <option value="Bachelors (Level 6)">Bachelors (Level 6)</option>
                          <option value="Postgraduate Diploma (Level 7)">Postgraduate Diploma (Level 7)</option>
                          <option value="Masters (Level 7)">Masters (Level 7)</option>
                          <option value="Doctorate/ PhD (Level 8)">Doctorate/ PhD (Level 8)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
                        <input
                          type="text"
                          required
                          value={courseForm.duration || ''}
                          placeholder="e.g. 12 Months"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, duration: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Credit ECTS</label>
                        <input
                          type="text"
                          required
                          value={courseForm.credit || ''}
                          placeholder="e.g. 90 [or] 180"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, credit: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Annual Fee ({institution?.currency || 'EUR'}/{currencySymbol})</label>
                        <input
                          type="text"
                          required
                          value={courseForm.fee || ''}
                          placeholder="e.g. 10000"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, fee: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-bold text-orange-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scholarship ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.scholarship || ''}
                          placeholder="e.g. 500"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, scholarship: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-semibold text-green-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Visa Admin Fee ({currencySymbol})</label>
                        <input
                          type="text"
                          value={courseForm.visaFee || '700'}
                          placeholder="700"
                          onChange={(e) => setCourseForm(prev => ({ ...prev, visaFee: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="px-6 py-3 bg-slate-100 font-bold hover:bg-slate-200 text-slate-600 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-grad-blue hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    {editingCourseIndex !== null ? 'Save Changes' : 'Append Course'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntakeSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[450] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[1.75rem] w-full max-w-4xl overflow-hidden border border-slate-200/80 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    Intake Settings
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">Manage intake schedules and deadlines</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    type="button"
                    onClick={downloadSpreadsheetTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-slate-700 cursor-pointer"
                  >
                    <Download size={13} />
                    Download Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowIntakeSettingsModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Intake Groups</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Add custom sections to group intakes</p>
                  </div>
                  <button
                    type="button"
                    onClick={addNewSection}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-grad-blue border border-blue-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus size={13} />
                    Add Intake Section
                  </button>
                </div>

                <Reorder.Group 
                  axis="y" 
                  values={intakeSchedulesForm.sections} 
                  onReorder={(newOrder) => setIntakeSchedulesForm({ sections: newOrder })}
                  className="space-y-6"
                >
                  {intakeSchedulesForm.sections.map((section, sIdx) => {
                    return (
                      <Reorder.Item 
                        value={section} 
                        key={section.id} 
                        className="space-y-4 pt-6 border-t border-slate-200 first:border-0 first:pt-0 bg-white"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors"
                              title="Drag to reorder"
                            >
                              <GripVertical size={16} />
                            </div>
                            <div className="w-[4px] h-[20px] bg-grad-blue rounded-full shrink-0"></div>
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                              <select
                                value={section.title}
                                onChange={(e) => {
                                  const updated = [...intakeSchedulesForm.sections];
                                  updated[sIdx].title = e.target.value;
                                  setIntakeSchedulesForm({ sections: updated });
                                }}
                                className="px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue outline-none w-full cursor-pointer transition-all"
                              >
                                <option value="">Select Intake Level Category</option>
                                {[
                                  "Undergraduate Diploma (Level 5)",
                                  "Bachelors (Level 6)",
                                  "Postgraduate Diploma (Level 7)",
                                  "Masters (Level 7)",
                                  "Doctorate/ PhD (Level 8)"
                                ].map((lvl: string) => (
                                  <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                                {![
                                  "Undergraduate Diploma (Level 5)",
                                  "Bachelors (Level 6)",
                                  "Postgraduate Diploma (Level 7)",
                                  "Masters (Level 7)",
                                  "Doctorate/ PhD (Level 8)"
                                ].includes(section.title) && section.title && (
                                  <option value={section.title}>{section.title}</option>
                                )}
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <label className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95">
                              <Upload size={13} />
                              Upload Excel
                              <input 
                                type="file" 
                                className="hidden" 
                                accept=".xlsx,.xls,.csv" 
                                onChange={(e) => handleIntakeSpreadsheetUpload(e, section.id)}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => duplicateSection(section.id)}
                              className="p-1.5 text-slate-400 hover:text-grad-blue rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Duplicate Section"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSection(section.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto min-w-full bg-white border border-slate-200/60 rounded-2xl shadow-sm pb-4">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                              <tr className="border-b border-slate-200/60 bg-slate-50/50">
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[20%]">Intake Name</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[25%]">Start Date</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[25%]">App Close</th>
                                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[30%]">Visa Close</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {section.intakes.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-medium">
                                    No intakes scheduled. Click "Add Intake" below to get started.
                                  </td>
                                </tr>
                              ) : (
                                section.intakes.map((item, idx) => (
                                  <tr key={`${section.id}-intake-${idx}`} className="hover:bg-slate-50/30">
                                    <td className="p-2">
                                      <input 
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => {
                                          const updated = [...intakeSchedulesForm.sections];
                                          updated[sIdx].intakes[idx].name = e.target.value;
                                          setIntakeSchedulesForm({ sections: updated });
                                        }}
                                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue outline-none"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <DatePickerInput
                                        value={item.startDate || ''}
                                        onChange={(val) => {
                                          const updated = [...intakeSchedulesForm.sections];
                                          updated[sIdx].intakes[idx].startDate = val;
                                          setIntakeSchedulesForm({ sections: updated });
                                        }}
                                      />
                                    </td>
                                    <td className="p-2">
                                      <DatePickerInput
                                        value={item.appClose || ''}
                                        onChange={(val) => {
                                          const updated = [...intakeSchedulesForm.sections];
                                          updated[sIdx].intakes[idx].appClose = val;
                                          setIntakeSchedulesForm({ sections: updated });
                                        }}
                                      />
                                    </td>
                                    <td className="p-2 flex gap-2">
                                      <DatePickerInput
                                        value={item.visaClose || ''}
                                        onChange={(val) => {
                                          const updated = [...intakeSchedulesForm.sections];
                                          updated[sIdx].intakes[idx].visaClose = val;
                                          setIntakeSchedulesForm({ sections: updated });
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...intakeSchedulesForm.sections];
                                          updated[sIdx].intakes.splice(idx, 1);
                                          setIntakeSchedulesForm({ sections: updated });
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-200 hover:bg-red-50 cursor-pointer"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                          <div className="flex flex-wrap items-center gap-3 ml-4 mt-4">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...intakeSchedulesForm.sections];
                                updated[sIdx].intakes.push({
                                  name: `Intake ${updated[sIdx].intakes.length + 1}`,
                                  startDate: '',
                                  appClose: '',
                                  visaClose: ''
                                });
                                setIntakeSchedulesForm({ sections: updated });
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold bg-white hover:bg-slate-50 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-slate-200/50 uppercase tracking-wider"
                            >
                              <Plus size={14} /> Add Intake
                            </button>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowIntakeSettingsModal(false)}
                  className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-white transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={saveIntakeSettings}
                  className="px-6 py-3 bg-grad-blue hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save size={16} /> Save Configurations
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[1.75rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={32} />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 font-outfit mb-2 tracking-tight">Delete Course?</h3>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                  Are you sure you want to delete <strong className="font-bold text-slate-800">"{programToDelete?.name}"</strong>? 
                  This action is permanent and changes will be reflected immediately in the database.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setProgramToDelete(null);
                    }}
                    className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs uppercase tracking-wider cursor-pointer"
                  >
                    No, Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCourse}
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md shadow-red-500/20 transition-all text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}