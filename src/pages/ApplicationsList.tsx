'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  Calendar,
  University,
  User,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Download,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  GraduationCap,
  X,
  Trash2,
  UserX
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardState } from '@/contexts/DashboardStateContext';
import { useDashboardErrorHandler } from '@/utils/dashboardError';
import { mockApplications } from '@/data/mockData';
import { CentralLoader } from '@/components/dashboard/CentralLoader';
import { useNotifications } from '@/contexts/NotificationContext';

import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import ApplicationMetricsGrid from '@/components/dashboard/ApplicationMetricsGrid';
import AgentAppMetricsGrid from '@/components/agent/AgentAppMetricsGrid';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { getUniversityName } from '@/lib/universityUtils';
import { toast } from 'sonner';
import { uploadFileToFirestore } from '@/lib/fileStorage';

const standardizeName = (name?: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

interface WithdrawConfirmModal {
  isOpen: boolean;
  count: number;
}

interface DeleteConfirmModal {
  isOpen: boolean;
  type: 'bulk' | 'single';
  appId?: string;
  studentName?: string;
  count?: number;
}

export default function ApplicationsList() {
  const { user, profile, activeRole, institutions, hideSupportCenter } = useAuth();
  const { notifications } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode } = useDashboardState();
  const { handleFirestoreError } = useDashboardErrorHandler();
  const [applications, setApplications] = useState<any[]>([]);
  const displayApplications = mode === 'quota-standby' ? mockApplications : applications;
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isDeletingDrafts, setIsDeletingDrafts] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawConfirmModal, setWithdrawConfirmModal] = useState<WithdrawConfirmModal | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModal | null>(null);

  const isDraftApp = useCallback((app: any) => {
    if (!app) return false;
    const status = (app.applicationStatus || app.status || '').toLowerCase().trim();
    return status === 'draft';
  }, []);

  const selectedApps = useMemo(() => {
    return displayApplications.filter(app => selectedAppIds.includes(app.id));
  }, [displayApplications, selectedAppIds]);

  const selectedDraftApps = useMemo(() => {
    return selectedApps.filter(isDraftApp);
  }, [selectedApps, isDraftApp]);

  const hasNonDraftSelected = useMemo(() => {
    return selectedApps.some(app => !isDraftApp(app));
  }, [selectedApps, isDraftApp]);

  const selectedDraftCount = selectedDraftApps.length;

  useEffect(() => {
    const scrollToTable = searchParams.get('scrollToTable');
    if (scrollToTable === 'true') {
      const performScroll = () => {
        if (listRef.current) {
          listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          const tableElem = document.getElementById('applications-table-section');
          if (tableElem) {
            tableElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };

      performScroll();
      const timer1 = setTimeout(performScroll, 100);
      const timer2 = setTimeout(performScroll, 400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [searchParams]);

  const handleMetricClick = (type: string, value: string) => {
    if (activeFilter?.type === type && activeFilter?.value === value) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type, value });
    }
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const [uploadSelectedApp, setUploadSelectedApp] = useState<any | null>(null);
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false);
  const [universityMatrix, setUniversityMatrix] = useState<any[] | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  useEffect(() => {
    if (!uploadSelectedApp || !uploadSelectedApp.targetUniversityId) {
      setUniversityMatrix(null);
      return;
    }
    const fetchMatrix = async () => {
      setLoadingMatrix(true);
      try {
        const docRef = doc(db, 'institution_matrices', uploadSelectedApp.targetUniversityId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().requirements) {
          const rawReqs = docSnap.data().requirements || [];
          setUniversityMatrix(rawReqs);
        } else {
          const GCM_REQUIREMENTS = [
            { docId: "GCM_APPLICANT_CV", displayName: "Updated Curriculum Vitae (CV)", description: "A detailed, up-to-date professional résumé outlining your complete academic history, vocational milestones, and relevant employment context to determine eligibility.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_ACAD_CREDENTIALS", displayName: "Academic Qualifications & Transcripts", description: "Scanned color copies of all official academic and vocational qualifications, including comprehensive transcripts of results, showing final grades and completed modules.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_POLICE_CONDUCT", displayName: "Police Conduct Certificate", description: "A scanned copy of a valid, officially issued Police Conduct Certificate verifying a clean criminal record.", isMandatory: false, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_IDENT_PROOF", displayName: "Valid Passport or ID Card", description: "Clear scan of the passport bio-page or national ID card. International passports must retain a validity period of at least two years.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf", ".jpg", ".jpeg"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_ENGLISH_PROOF", displayName: "English Language Qualification", description: "Scanned copy of an approved English Language qualification showing a minimum of 5.5 bands in IELTS, an equivalent test certificate, or an official Medium of Instruction (MOI) Letter from a past institution.", isMandatory: false, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_PERSONAL_STATEMENT", displayName: "Personal Statement", description: "A written essay/motivation letter composed by the applicant outlining their academic interest, commitment, and suitability for the chosen degree program.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_RECOMMENDATION_LETTER", displayName: "Academic or Professional Reference Letter", description: "Exactly one official reference letter issued by a past academic institution (teacher/professor) or a professional employer evaluating the applicant's character and capabilities.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
            { docId: "GCM_ID_PHOTO", displayName: "Passport-Sized Photograph", description: "One high-quality digital scan of a standard passport-sized photograph to be pinned to the active academic profile.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf", ".jpg", ".jpeg"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } }
          ];
          setUniversityMatrix(GCM_REQUIREMENTS);
        }
      } catch (err) {
        console.error("Failed loading matrix of university:", err);
      } finally {
        setLoadingMatrix(false);
      }
    };
    fetchMatrix();
  }, [uploadSelectedApp?.targetUniversityId, uploadSelectedApp?.id]);

  const categorizeMatrixRequirement = (req: any): string => {
    const normId = (req.docId || '').toLowerCase();
    const normName = (req.displayName || '').toLowerCase();

    if (
      normId.includes('passport') || 
      normId.includes('ident') || 
      normId.includes('citizenship') || 
      normId.includes('photo') || 
      normName.includes('passport') || 
      normName.includes('id card') ||
      normName.includes('identity') || 
      normName.includes('citizenship') || 
      normName.includes('photograph')
    ) {
      return 'Identification & Travel/Visa';
    }

    if (
      normId.includes('transcript') || 
      normId.includes('certificate') || 
      normId.includes('acad') || 
      normId.includes('degree') || 
      normId.includes('moi') || 
      normId.includes('class') || 
      normId.includes('academic') ||
      normName.includes('transcript') || 
      normName.includes('certificate') || 
      normName.includes('academic') || 
      normName.includes('degree') || 
      normName.includes('qualification') || 
      normName.includes('medium of instruction') || 
      normName.includes('moi') ||
      normName.includes('class 10') ||
      normName.includes('class 12') ||
      normName.includes('ssc') ||
      normName.includes('hsc') ||
      normName.includes('bachelor') ||
      normName.includes('master')
    ) {
      return 'Academic Documents';
    }

    return 'Supportive & Professional Documents';
  };

  const getDynamicDocumentSlots = () => {
    if (!uploadSelectedApp) return [];
    
    const levelStr = uploadSelectedApp.studyLevel?.toLowerCase() || '';
    let levelKey: 'diploma' | 'bachelor' | 'master' | 'doctorate' = 'bachelor';
    if (levelStr.includes('diploma')) levelKey = 'diploma';
    else if (levelStr.includes('bachelor') || levelStr.includes('undergraduate')) levelKey = 'bachelor';
    else if (levelStr.includes('master') || levelStr.includes('postgraduate')) levelKey = 'master';
    else if (levelStr.includes('phd') || levelStr.includes('doctor') || levelStr.includes('research')) levelKey = 'doctorate';

    const baseRequirements = universityMatrix || [];

    const activeMatrixReqs = baseRequirements.filter((req: any) => {
      if (!req.enabledLevels) return true;
      return req.enabledLevels[levelKey];
    });

    const categoriesMap: Record<string, any[]> = {
      "Identification & Travel/Visa": [],
      "Academic Documents": [],
      "Supportive & Professional Documents": []
    };

    const processedDocTypes = new Set<string>();

    const smartAcademicItems: any[] = [];
    
    smartAcademicItems.push({
      id: "class10_transcript",
      order: 4,
      name: "Class 10 Transcript",
      description: "Official Class 10 grade sheet / mark sheet",
      isMandatory: true,
      category: "Academic Documents"
    });

    smartAcademicItems.push({
      id: "class12_transcript",
      order: 6,
      name: "Class 12 Transcript",
      description: "Official Class 12 transcript or grade sheet",
      isMandatory: true,
      category: "Academic Documents"
    });

    if (levelKey === 'master' || levelKey === 'doctorate') {
      smartAcademicItems.push({
        id: "bachelor_transcript",
        order: 8,
        name: "Bachelor Transcript",
        description: "Official consolidated Bachelor's transcript / mark sheets",
        isMandatory: true,
        category: "Academic Documents"
      });
    }

    if (levelKey === 'doctorate') {
      smartAcademicItems.push({
        id: "master_transcript",
        order: 10,
        name: "Master Transcript",
        description: "Official Master's graduation transcripts showing all semester results",
        isMandatory: true,
        category: "Academic Documents"
      });
    }

    smartAcademicItems.push({
      id: "moi",
      order: 12,
      name: "Medium of Instruction (MOI)",
      description: "Official institution certificate verifying English instruction language (Optional)",
      isMandatory: false,
      category: "Academic Documents"
    });

    smartAcademicItems.push({
      id: "recommendation_letter",
      order: 18,
      name: "Recommendation Letter (LOR)",
      description: "Academic or professional reference letter evaluating applicant capabilities (Optional)",
      isMandatory: false,
      category: "Supportive & Professional Documents"
    });

    activeMatrixReqs.forEach((mReq: any) => {
      const dbId = mReq.docId;
      const dbName = mReq.displayName;
      const dbDesc = mReq.description || "";
      const dbMandatory = mReq.isMandatory ?? true;

      const catName = categorizeMatrixRequirement(mReq);

      const lowerId = dbId.toLowerCase();
      const lowerName = dbName.toLowerCase();

      let targetSmartId = "";
      if (lowerId.includes("class10") || lowerId.includes("class 10") || lowerName.includes("class 10") || lowerName.includes("class10") || lowerName.includes("secondary education")) {
        targetSmartId = "class10_transcript";
      } else if (lowerId.includes("class12") || lowerId.includes("class 12") || lowerName.includes("class 12") || lowerName.includes("class12") || lowerName.includes("higher secondary")) {
        targetSmartId = "class12_transcript";
      } else if (lowerId.includes("bachelor_transcript") || (lowerName.includes("bachelor") && lowerName.includes("transcript"))) {
        targetSmartId = "bachelor_transcript";
      } else if (lowerId.includes("master_transcript") || (lowerName.includes("master") && lowerName.includes("transcript"))) {
        targetSmartId = "master_transcript";
      } else if (lowerId.includes("moi") || lowerName.includes("medium of instruction") || lowerName.includes("moi ")) {
        targetSmartId = "moi";
      } else if (lowerId.includes("recommendation") || lowerId.includes("lor") || lowerName.includes("recommendation") || lowerName.includes("reference letter")) {
        targetSmartId = "recommendation_letter";
      } else if (lowerId.includes("passport") || lowerName.includes("passport")) {
        targetSmartId = "passport";
      } else if (lowerId.includes("sop") || lowerId.includes("personal_statement") || lowerName.includes("sop ") || lowerName.includes("personal statement")) {
        targetSmartId = "sop";
      } else if (lowerId.includes("cv") || lowerName.includes("cv ") || lowerName.includes("curriculum vitae") || lowerName.includes("resume")) {
        targetSmartId = "cv";
      }

      if (targetSmartId) {
        processedDocTypes.add(targetSmartId);
        const smartItem = smartAcademicItems.find(item => item.id === targetSmartId);
        const mergedItem = {
          id: targetSmartId,
          order: smartItem ? smartItem.order : 9,
          name: dbName,
          description: dbDesc,
          isMandatory: dbMandatory,
          category: catName
        };
        categoriesMap[catName].push(mergedItem);
      } else {
        processedDocTypes.add(dbId);
        categoriesMap[catName].push({
          id: dbId,
          order: mReq.order || 99,
          name: dbName,
          description: dbDesc,
          isMandatory: dbMandatory,
          category: catName
        });
      }
    });

    smartAcademicItems.forEach(item => {
      if (!processedDocTypes.has(item.id)) {
        let shouldShow = true;
        if (item.id === 'bachelor_transcript' && (levelKey !== 'master' && levelKey !== 'doctorate')) shouldShow = false;
        if (item.id === 'master_transcript' && levelKey !== 'doctorate') shouldShow = false;

        if (shouldShow) {
          categoriesMap[item.category].push({
            id: item.id,
            order: item.order,
            name: item.name,
            description: item.description,
            isMandatory: item.isMandatory,
            category: item.category
          });
        }
      }
    });

    const defaultFallbacks = [
      { id: "passport", order: 1, name: "Passport", description: "Photo page showing validity & details", isMandatory: true, category: "Identification & Travel/Visa" },
      { id: "photo", order: 3, name: "Photo", description: "Passport-sized with white background", isMandatory: false, category: "Identification & Travel/Visa" },
      { id: "sop", order: 13, name: "Statement of Purpose (SOP)", description: "Academic motivation statement letter", isMandatory: true, category: "Supportive & Professional Documents" },
      { id: "cv", order: 14, name: "Curriculum Vitae (CV)", description: "Detailed academic and professional resume", isMandatory: true, category: "Supportive & Professional Documents" }
    ];

    defaultFallbacks.forEach(item => {
      if (!processedDocTypes.has(item.id)) {
        categoriesMap[item.category].push(item);
      }
    });

    const seenIds = new Set<string>();
    const result = [
      {
        category: "Identification & Travel/Visa",
        icon: ShieldCheck,
        color: "blue",
        bgColor: "bg-blue-50/50",
        borderColor: "border-blue-150",
        textColor: "text-grad-text-main",
        items: categoriesMap["Identification & Travel/Visa"]
          .filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          })
          .sort((a, b) => a.order - b.order)
      },
      {
        category: "Academic Documents",
        icon: GraduationCap,
        color: "indigo",
        bgColor: "bg-blue-50/50",
        borderColor: "border-indigo-150",
        textColor: "text-indigo-700",
        items: categoriesMap["Academic Documents"]
          .filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          })
          .sort((a, b) => a.order - b.order)
      },
      {
        category: "Supportive & Professional Documents",
        icon: FileText,
        color: "emerald",
        bgColor: "bg-emerald-50/50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-700",
        items: categoriesMap["Supportive & Professional Documents"]
          .filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          })
          .sort((a, b) => a.order - b.order)
      }
    ];

    return result;
  };

  const [scheduleSelectedApp, setScheduleSelectedApp] = useState<any | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const handleFileUpload = async (file: File, slotId: string) => {
    if (!uploadSelectedApp) return;

    setUploadingSlots(prev => ({ ...prev, [slotId]: true }));
    const toastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (typeof result === 'string') {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error('Failed to read file as base64 string.'));
          }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      const fileId = await uploadFileToFirestore(file, base64Data);

      const currentUploadedDocs = uploadSelectedApp.uploadedDocuments || {};
      const newUploadedDocuments = {
        ...currentUploadedDocs,
        [slotId]: {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          fileId: fileId
        }
      };

      const isPassport = slotId === 'passport';
      const isTranscript = slotId.includes('transcript');
      const isSOP = slotId === 'sop';
      const isLOR = slotId === 'english_proficiency';

      const updates: any = {
        uploadedDocuments: newUploadedDocuments,
        updatedAt: serverTimestamp()
      };

      if (isPassport) updates.docs_passport = true;
      if (isTranscript) updates.docs_transcripts = true;
      if (isSOP) updates.docs_sop = true;
      if (isLOR) updates.docs_lor = true;

      const appRef = doc(db, 'applications', uploadSelectedApp.id);
      await updateDoc(appRef, updates);

      setUploadSelectedApp(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          uploadedDocuments: newUploadedDocuments
        };
      });

      toast.success(`Successfully uploaded ${file.name}!`, { id: toastId });
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setUploadingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const handleRemoveFile = async (slotId: string) => {
    if (!uploadSelectedApp) return;

    setUploadingSlots(prev => ({ ...prev, [slotId]: true }));
    const toastId = toast.loading("Removing document...");

    try {
      const currentUploadedDocs = uploadSelectedApp.uploadedDocuments || {};
      const newUploadedDocuments = { ...currentUploadedDocs };
      delete newUploadedDocuments[slotId];

      const updates: any = {
        uploadedDocuments: newUploadedDocuments,
        updatedAt: serverTimestamp()
      };

      if (slotId === 'passport') updates.docs_passport = false;
      if (slotId.includes('transcript')) updates.docs_transcripts = false;
      if (slotId === 'sop') updates.docs_sop = false;
      if (slotId === 'english_proficiency') updates.docs_lor = false;

      const appRef = doc(db, 'applications', uploadSelectedApp.id);
      await updateDoc(appRef, updates);

      setUploadSelectedApp(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          uploadedDocuments: newUploadedDocuments
        };
      });

      toast.success("Document removed successfully!", { id: toastId });
    } catch (err) {
      console.error("Error removing file:", err);
      toast.error("Failed to remove document.", { id: toastId });
    } finally {
      setUploadingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const handleFinishUploading = async () => {
    if (!uploadSelectedApp) return;
    setIsSubmittingDocs(true);
    const toastId = toast.loading("Confirming application updates...");

    try {
      const appRef = doc(db, 'applications', uploadSelectedApp.id);
      await updateDoc(appRef, {
        applicationStatus: 'submitted',
        updatedAt: serverTimestamp()
      });

      try {
        await addDoc(collection(db, 'notifications'), {
          userId: uploadSelectedApp.targetUniversityId || 'university_admin',
          applicationId: uploadSelectedApp.id,
          title: 'Documents Rectified by Agent ✅',
          description: `The requested missing documents for ${uploadSelectedApp.studentFirstName} ${uploadSelectedApp.studentLastName} have been uploaded and rectified.`,
          category: 'applications',
          isUnread: true,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.error("Non-blocking notification error:", notifErr);
      }

      toast.success("Application successfully submitted for review!", { id: toastId });
      setUploadSelectedApp(null);
    } catch (err) {
      console.error("Error finalizing uploads:", err);
      toast.error("Failed to update status.", { id: toastId });
    } finally {
      setIsSubmittingDocs(false);
    }
  };

  const handleBulkStatusUpdate = async (status: 'approved' | 'rejected' | 'incomplete' | 'interview_requested') => {
    if (selectedAppIds.length === 0 || isBulkUpdating) return;
    setIsBulkUpdating(true);
    
    const toastId = toast.loading(`Processing bulk status update for ${selectedAppIds.length} applications...`);
    
    try {
      const promises = selectedAppIds.map(async (id) => {
        const appRef = doc(db, 'applications', id);
        const appData = applications.find(a => a.id === id);
        
        const updates: any = {
          applicationStatus: status,
          updatedAt: serverTimestamp()
        };
        
        if (status === 'interview_requested') {
          updates.interview = {
            status: 'requested',
            date: '',
            time: '',
            meetingLink: '',
            platform: 'Google Meet',
            notes: '',
            rescheduleCount: 0,
            lastUpdatedBy: 'university'
          };
          updates.interviewScheduled = false;
          updates.interviewDate = '';
          updates.interviewTime = '';
          updates.meetLink = '';
          updates.interviewNotes = '';
        }
        
        await updateDoc(appRef, updates);
        
        if (appData?.agentId) {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: appData.agentId,
              applicationId: id,
              title: 'Application Bulk Update',
              description: `The status of ${appData.studentFirstName || 'Student'} ${appData.studentLastName || ''}'s application has been updated in bulk to ${status.replace('_', ' ')}.`,
              category: 'applications',
              isUnread: true,
              createdAt: serverTimestamp()
            });
          } catch (notifErr) {
            console.error("Bulk update non-blocking notification error:", notifErr);
          }
        }
      });
      
      await Promise.all(promises);
      
      toast.success(`Successfully updated ${selectedAppIds.length} applications to ${status.replace('_', ' ')}!`, { id: toastId });
      setSelectedAppIds([]);
    } catch (error: any) {
      console.error("Bulk status update failed:", error);
      toast.error(`Error updating applications: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const requestBulkDeleteDrafts = () => {
    if (isDeletingDrafts) return;

    if (hasNonDraftSelected) {
      toast.error("Delete draft is disabled when non-draft applications are selected. Please deselect non-draft applications first.");
      return;
    }

    if (selectedDraftCount === 0) {
      toast.error("No draft applications selected.");
      return;
    }

    setDeleteConfirmModal({
      isOpen: true,
      type: 'bulk',
      count: selectedDraftCount
    });
  };

  const requestSingleDeleteDraft = (e: React.MouseEvent, appId: string, studentName: string) => {
    e.stopPropagation();
    setDeleteConfirmModal({
      isOpen: true,
      type: 'single',
      appId,
      studentName: studentName || 'Untitled Draft'
    });
  };

  const executeDeleteDrafts = async () => {
    if (!deleteConfirmModal || isDeletingDrafts) return;

    setIsDeletingDrafts(true);

    if (deleteConfirmModal.type === 'bulk') {
      const toastId = toast.loading(`Deleting ${selectedDraftCount} draft application(s)...`);
      try {
        const deletedIds = selectedDraftApps.map(app => app.id);

        await Promise.all(selectedDraftApps.map(async (app) => {
          try {
            const appRef = doc(db, 'applications', app.id);
            await deleteDoc(appRef);
          } catch (err) {
            console.warn(`Could not delete doc ${app.id} from Firestore, proceeding with local update:`, err);
          }
        }));

        setApplications(prev => prev.filter(app => !deletedIds.includes(app.id)));
        setSelectedAppIds(prev => prev.filter(id => !deletedIds.includes(id)));

        toast.success(`Successfully deleted ${deletedIds.length} draft application(s)!`, { id: toastId });
      } catch (error: any) {
        console.error("Failed to delete draft applications:", error);
        handleFirestoreError(error);
        toast.error(`Error deleting draft applications: ${error.message || 'Unknown error'}`, { id: toastId });
      } finally {
        setIsDeletingDrafts(false);
        setDeleteConfirmModal(null);
      }
    } else if (deleteConfirmModal.type === 'single' && deleteConfirmModal.appId) {
      const appId = deleteConfirmModal.appId;
      const toastId = toast.loading("Deleting draft application...");
      try {
        try {
          await deleteDoc(doc(db, 'applications', appId));
        } catch (err) {
          console.warn(`Could not delete doc ${appId} from Firestore:`, err);
        }
        setApplications(prev => prev.filter(app => app.id !== appId));
        setSelectedAppIds(prev => prev.filter(id => id !== appId));
        toast.success("Draft application deleted successfully!", { id: toastId });
      } catch (error: any) {
        console.error("Failed to delete draft application:", error);
        handleFirestoreError(error);
        toast.error(`Error deleting draft: ${error.message || 'Unknown error'}`, { id: toastId });
      } finally {
        setIsDeletingDrafts(false);
        setDeleteConfirmModal(null);
      }
    }
  };

  const executeBulkWithdraw = async () => {
    if (!withdrawConfirmModal || isWithdrawing || selectedAppIds.length === 0) return;
    setIsWithdrawing(true);
    const count = selectedAppIds.length;
    const targetIds = [...selectedAppIds];
    const toastId = toast.loading(`Withdrawing ${count} application(s)...`);

    try {
      const promises = targetIds.map(async (id) => {
        const appRef = doc(db, 'applications', id);
        const appData = applications.find(a => a.id === id);

        try {
          await updateDoc(appRef, {
            applicationStatus: 'withdrawn',
            status: 'withdrawn',
            updatedAt: serverTimestamp()
          });
        } catch (docErr) {
          console.warn(`Could not update Firestore document ${id} directly:`, docErr);
        }

        if (appData?.agentId) {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: appData.agentId,
              applicationId: id,
              title: 'Application Withdrawn',
              description: `The application for ${appData.studentFirstName || 'Student'} ${appData.studentLastName || ''} has been withdrawn.`,
              category: 'applications',
              isUnread: true,
              createdAt: serverTimestamp()
            });
          } catch (notifErr) {
            console.error("Withdraw notification error:", notifErr);
          }
        }
      });

      await Promise.all(promises);

      setApplications(prev => prev.map(app => targetIds.includes(app.id) ? { ...app, applicationStatus: 'withdrawn', status: 'withdrawn' } : app));
      setSelectedAppIds(prev => prev.filter(id => !targetIds.includes(id)));

      toast.success(`Successfully withdrawn ${count} application(s)!`, { id: toastId });
    } catch (error: any) {
      console.error("Failed to withdraw applications:", error);
      handleFirestoreError(error);
      toast.error(`Error withdrawing applications: ${error.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsWithdrawing(false);
      setWithdrawConfirmModal(null);
    }
  };

  const handleScheduleInterview = async () => {
    if (!scheduleSelectedApp || !user) return;
    if (!interviewDate || !interviewTime) {
      toast.error("Please enter a valid date and time for the interview.");
      return;
    }

    setIsSubmittingSchedule(true);
    const toastId = toast.loading("Scheduling interview and generating Google Meet...");

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      
      if (!auth.currentUser) {
        throw new Error('User not logged in');
      }

      let token: string | undefined;

      try {
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken;
      } catch (err: any) {
        console.warn("Initial Google Auth linking error:", err);
        if (err.code === 'auth/credential-already-in-use') {
          const credential = GoogleAuthProvider.credentialFromError(err);
          token = credential?.accessToken;

          if (!token) {
            try {
              const signInResult = await signInWithPopup(auth, provider);
              const credentialFromResult = GoogleAuthProvider.credentialFromResult(signInResult);
              token = credentialFromResult?.accessToken;
            } catch (signInErr: any) {
              if (signInErr.code === 'auth/popup-closed-by-user') {
                toast.error("Google integration window was closed. Please keep the window open to authorize calendar access.", { id: toastId });
                setIsSubmittingSchedule(false);
                return;
              }
              throw signInErr;
            }
          }
        } else if (err.code === 'auth/popup-closed-by-user') {
          toast.error("Google integration window was closed before authorization completed.", { id: toastId });
          setIsSubmittingSchedule(false);
          return;
        } else {
          throw err;
        }
      }

      if (!token) {
        throw new Error('Failed to get Google OAuth token');
      }

      const response = await fetch('/api/schedule-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: interviewDate,
          time: interviewTime,
          interviewer: interviewerName,
          notes: interviewNotes,
          attendeeEmail: scheduleSelectedApp.studentEmail,
          studentName: `${scheduleSelectedApp.studentFirstName} ${scheduleSelectedApp.studentLastName}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule interview on server');
      }

      const { meetLink } = await response.json();

      const appRef = doc(db, 'applications', scheduleSelectedApp.id);
      await updateDoc(appRef, {
        interviewDate,
        interviewTime,
        interviewerName,
        interviewNotes,
        meetLink: meetLink,
        interviewScheduled: true,
        updatedAt: serverTimestamp()
      });

      toast.success("Interview scheduled successfully with Google Meet Link!", { id: toastId });
      
      setScheduleSelectedApp(null);
      setInterviewDate('');
      setInterviewTime('');
      setInterviewerName('');
      setInterviewNotes('');
    } catch (err: any) {
      console.error("Error scheduling interview:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Google integration window was closed. Please try scheduling again and authorize access.", { id: toastId });
      } else if (err.code === 'auth/credential-already-in-use') {
        toast.error("This Google account is already linked to another user. Please use a different Google account or contact support.", { id: toastId });
      } else {
        toast.error(`Failed to schedule interview: ${err.message || 'Unknown error'}`, { id: toastId });
      }
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum);
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortField, sortOrder, pageSize]);

  useEffect(() => {
    if (!user || !activeRole) return;

    let q;
    if (activeRole === 'agent') {
      q = query(
        collection(db, 'applications'),
        where('agentId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
    } else if (activeRole === 'university' && profile?.universityId) {
      const uIdLow = (profile.universityId || '').toLowerCase();
      const isGCM = uIdLow === 'global-college-malta' || uIdLow === 'gcm' || uIdLow === 'gcm-uid' || uIdLow.includes('gcm') || uIdLow.includes('malta');
      const uniIds = isGCM
        ? Array.from(new Set(['global-college-malta', 'gcm', 'gcm-uid', profile.universityId]))
        : [profile.universityId];

      q = query(
        collection(db, 'applications'),
        where('targetUniversityId', 'in', uniIds)
      );
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (activeRole === 'university') {
        apps = apps.filter((app: any) => app.applicationStatus !== 'draft');
      }
      apps = apps.filter((app: any) => app.applicationStatus !== 'withdrawn' && app.applicationStatus !== 'Withdrawn');
      apps = apps.sort((a: any, b: any) => {
        const getTs = (item: any) => {
          const d = item.updatedAt || item.createdAt;
          if (d?.toDate) return d.toDate().getTime();
          if (d) return new Date(d).getTime();
          return 0;
        };
        return getTs(b) - getTs(a);
      });
      setApplications(apps);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, activeRole, profile?.universityId]);

  const filteredApps = displayApplications.filter(app => {
    const firstName = (app.studentFirstName || '').toLowerCase();
    const lastName = (app.studentLastName || '').toLowerCase();
    const studentName = `${firstName} ${lastName}`.trim();
    const universityName = getUniversityName(app, institutions).toLowerCase();
    const term = searchQuery.toLowerCase().trim();
    
    if (app.applicationStatus === 'withdrawn' || app.applicationStatus === 'Withdrawn') {
      return false;
    }
    
    let matchesSearch = true;
    if (term) {
      const draftFallbackName = app.applicationStatus === 'draft' ? 'untitled draft' : 'student application';
      matchesSearch = (studentName || draftFallbackName).includes(term) || 
                      firstName.startsWith(term) ||
                      lastName.startsWith(term) ||
                      universityName.includes(term) ||
                      (typeof app.targetProgramId === 'object' ? (app.targetProgramId as any)?.name : (app.targetProgramId || '')).toLowerCase().includes(term);
    }
    
    const matchesStatus = statusFilter === 'all' || app.applicationStatus === statusFilter;
    
    let matchesActiveMetricsFilter = true;
    if (activeFilter) {
      if (activeFilter.type === 'program') {
        const prog = typeof app.targetProgramId === 'object' ? (app.targetProgramId as any)?.name : (app.targetProgramId || '');
        if (prog !== activeFilter.value) matchesActiveMetricsFilter = false;
      } else if (activeFilter.type === 'missing_doc') {
        const rawStatus = (app.applicationStatus || '').toLowerCase();
        if (['approved', 'rejected'].includes(rawStatus)) {
          matchesActiveMetricsFilter = false;
        } else {
          const isMissingTranscript = !app.docs_transcripts;
          const isMissingPassport = !app.docs_passport;
          const isMissingProof = !app.docs_lor;
          
          if (activeFilter.value === "Missing Transcripts" && !isMissingTranscript) matchesActiveMetricsFilter = false;
          if (activeFilter.value === "Passport / ID Scan" && !isMissingPassport) matchesActiveMetricsFilter = false;
          if (activeFilter.value === "English Proof Pending" && !isMissingProof) matchesActiveMetricsFilter = false;
        }
      } else if (activeFilter.type === 'funnel') {
        const rawStatus = (app.applicationStatus || '').toLowerCase();
        const v = (activeFilter.value || '').toLowerCase().trim();
        if (v === 'submitted' && !['submitted', 'received', 'in_review', 'under_review'].includes(rawStatus)) matchesActiveMetricsFilter = false;
        if (v === 'incomplete' && !['incomplete', 'pending_docs', 'pending_documents', 'draft'].includes(rawStatus)) matchesActiveMetricsFilter = false;
        if ((v === 'interview pending' || v === 'requestinterview' || v === 'interview') && !['interview_pending', 'interview_requested', 'interview_scheduled', 'interview'].includes(rawStatus)) matchesActiveMetricsFilter = false;
        if (v === 'withdrawn' && !['withdrawn', 'cancelled'].includes(rawStatus)) matchesActiveMetricsFilter = false;
        if (v === 'rejected' && !['rejected', 'declined'].includes(rawStatus)) matchesActiveMetricsFilter = false;
        if (v === 'approved' && !['approved', 'offer_issued', 'finalized'].includes(rawStatus)) matchesActiveMetricsFilter = false;
      } else if (activeFilter.type === 'programs') {
        const prog = (typeof app.targetProgramId === 'object' ? (app.targetProgramId as any)?.name : (app.targetProgramId || app.programName || '')).toLowerCase().trim();
        const filtValue = activeFilter.value.toLowerCase().trim();
        if (prog !== filtValue) matchesActiveMetricsFilter = false;
      } else if (activeFilter.type === 'missingDocs') {
        const rawStatus = (app.applicationStatus || '').toLowerCase();
        let isMissingTranscript = !app.docs_transcripts;
        let isMissingPassport = !app.docs_passport;
        let isMissingProof = !app.docs_lor;
        
        if (Array.isArray(app.missingDocuments)) {
          isMissingTranscript = app.missingDocuments.some((d: string) => d.toUpperCase().includes('TRANSCRIPT'));
          isMissingPassport = app.missingDocuments.some((d: string) => d.toUpperCase().includes('PASSPORT') || d.toUpperCase().includes('ID'));
          isMissingProof = app.missingDocuments.some((d: string) => d.toUpperCase().includes('ENGLISH') || d.toUpperCase().includes('PROOF'));
        }
        
        if (activeFilter.value === "transcripts" && !isMissingTranscript) matchesActiveMetricsFilter = false;
        if (activeFilter.value === "passport" && !isMissingPassport) matchesActiveMetricsFilter = false;
        if (activeFilter.value === "englishProof" && !isMissingProof) matchesActiveMetricsFilter = false;
      } else if (activeFilter.type === 'intake') {
        const intakeVal = (app.intake || app.targetTerm || '').toLowerCase().trim();
        const filtValue = activeFilter.value.toLowerCase().trim();
        const [year, season] = filtValue.split(' ');
        if (!intakeVal.includes(year) || !intakeVal.includes(season)) matchesActiveMetricsFilter = false;
      } else if (activeFilter.type === 'stagnation') {
        const rawStatus = (app.applicationStatus || '').toLowerCase();
        if (rawStatus === 'approved' || rawStatus === 'rejected') {
          matchesActiveMetricsFilter = false;
        } else {
          const updatedAt = app.updatedAt?.toDate ? app.updatedAt.toDate() : (app.updatedAt ? new Date(app.updatedAt) : new Date());
          const daysSinceUpdate = (new Date().getTime() - updatedAt.getTime()) / (1000 * 3600 * 24);
          if (activeFilter.value === 'active' && daysSinceUpdate >= 7) matchesActiveMetricsFilter = false;
          if (activeFilter.value === 'warning' && (daysSinceUpdate < 7 || daysSinceUpdate > 14)) matchesActiveMetricsFilter = false;
          if (activeFilter.value === 'stale' && daysSinceUpdate <= 14) matchesActiveMetricsFilter = false;
        }
      }
    }
    
    return matchesSearch && matchesStatus && matchesActiveMetricsFilter;
  }).sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'studentName') {
      const nameA = `${a.studentFirstName} ${a.studentLastName}`.toLowerCase();
      const nameB = `${b.studentFirstName} ${b.studentLastName}`.toLowerCase();
      comparison = nameA.localeCompare(nameB);
    } else if (sortField === 'institution') {
      const uniA = getUniversityName(a, institutions);
      const uniB = getUniversityName(b, institutions);
      comparison = uniA.localeCompare(uniB);
    } else if (sortField === 'updatedAt') {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      comparison = timeA - timeB;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalItems = filteredApps.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedApps = filteredApps.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'draft': return 15;
      case 'submitted': return 40;
      case 'incomplete': return 40;
      case 'in_review': return 70;
      case 'interview_requested': return 85;
      case 'approved': return 100;
      case 'rejected': return 100;
      default: return 20;
    }
  };

  const stats = {
    total: applications.length,
    approved: applications.filter(a => a.applicationStatus === 'approved').length,
    processing: applications.filter(a => ['submitted', 'in_review', 'interview_requested'].includes(a.applicationStatus)).length,
    attention: applications.filter(a => ['incomplete', 'rejected'].includes(a.applicationStatus)).length
  };

  const urgentTasks = useMemo(() => {
    return applications
      .filter(app => ['interview_requested', 'rejected', 'incomplete'].includes(app.applicationStatus))
      .filter(app => !(app.applicationStatus === 'interview_requested' && app.interviewScheduled))
      .filter(app => {
        if (app.applicationStatus === 'incomplete' && activeRole === 'university') {
          return false;
        }
        if (app.applicationStatus === 'interview_requested' && activeRole === 'agent') {
          return false;
        }
        return true;
      })
      .map(app => {
        const studentName = `${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim() || 'Student';
        const status = app.applicationStatus;
        const instName = getUniversityName(app, institutions) || 'partner';
        
        let issue = 'Action required on application.';
        let cta = 'Review';
        let iconColor = 'text-amber-700 bg-amber-50';
        
        if (status === 'interview_requested') {
          issue = 'Interview Action Required: Prep candidate or choose schedule.';
          cta = 'Schedule';
          iconColor = 'text-[#155DFC] bg-blue-50';
        } else if (status === 'rejected') {
          issue = `Admission Rejected: Fix policy errors highlighted by ${instName}.`;
          cta = 'Fix Error';
          iconColor = 'text-red-700 bg-red-50';
        } else if (status === 'incomplete') {
          issue = 'Missing Academic Transcript or English Language Qualification.';
          cta = 'Upload Now';
          iconColor = 'text-amber-700 bg-amber-50';
        }
        
        return {
          id: app.id,
          studentName,
          issue,
          cta,
          iconColor,
          status,
          app
        };
      });
  }, [applications, institutions, activeRole]);

  const handleExportToExcel = () => {
    const appsToExport = selectedAppIds.length > 0 
      ? filteredApps.filter(app => selectedAppIds.includes(app.id))
      : filteredApps;

    if (appsToExport.length === 0) {
      toast.error("No application data available to export.");
      return;
    }

    const headers = [
      "Student ID",
      "Student First Name",
      "Student Last Name",
      "Email Address",
      "Phone Number",
      "Date of Birth",
      "Gender",
      "Nationality",
      "Passport Number",
      "Target Institution",
      "Target Program/Course",
      "Intake Term",
      "Intake Year",
      "Application Status",
      "Created At",
      "Last Updated"
    ];

    const formatValue = (value: any) => {
      if (value === null || value === undefined) {
        return '""';
      }
      let stringValue = String(value);
      stringValue = stringValue.replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const csvRows = [
      headers.join(','),
      ...appsToExport.map(app => {
        const uName = getUniversityName(app, institutions) || 'Other';
        const formattedDate = app.updatedAt?.toDate ? new Date(app.updatedAt.toDate()).toLocaleDateString() : 'Recently';
        const formattedCreated = app.createdAt?.toDate ? new Date(app.createdAt.toDate()).toLocaleDateString() : '';
        
        return [
          app.id || '',
          app.studentFirstName || '',
          app.studentLastName || '',
          app.studentEmail || '',
          app.studentPhone || '',
          app.dateOfBirth || '',
          app.gender || '',
          app.nationality || '',
          app.passportNumber || '',
          uName,
          app.targetProgramId || '',
          app.intakeTerm || '',
          app.intakeYear || '2024',
          app.applicationStatus || '',
          formattedCreated,
          formattedDate
        ].map(formatValue).join(',');
      })
    ];

    const csvContent = "\uFEFF" + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bright_Path_Applications_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (selectedAppIds.length > 0) {
      setSelectedAppIds([]);
      toast.success("Export completed for selected applications.");
    }
  };

  return (
    <DashboardLayout title="All Applications" subtitle="Manage and track all student submissions">
      <div className="max-w-7xl mx-auto">
        {activeRole === 'university' ? (
          <div className="mb-8">
            <ApplicationMetricsGrid applications={applications} onMetricClick={handleMetricClick} activeFilter={activeFilter} />
          </div>
        ) : activeRole === 'agent' ? (
          <div className="mb-8">
            <AgentAppMetricsGrid agentId={user?.uid || ''} onMetricClick={handleMetricClick} activeFilter={activeFilter} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Apps', value: stats.total, icon: FileText, color: 'blue' },
              { label: 'In Processing', value: stats.processing, icon: Clock, color: 'orange' },
              { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'green' },
              { label: 'Requires Attention', value: stats.attention, icon: AlertTriangle, color: 'red' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${
                  stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                  stat.color === 'green' ? 'bg-green-50 text-green-600' :
                  'bg-red-50 text-red-700'
                }`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-2xl font-black text-grad-text-main font-outfit">{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {activeRole === 'agent' && (
              <button 
                onClick={() => router.push('/new-application')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0059E7] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:bg-[#0047b3] transition-all shrink-0 w-full sm:w-auto cursor-pointer"
              >
                <PlusCircle size={18} />
                New Application
              </button>
            )}
            <button 
              onClick={handleExportToExcel}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold text-sm shadow-sm transition-all shrink-0 w-full sm:w-auto cursor-pointer"
            >
              <FileSpreadsheet size={18} className="text-emerald-650" style={{ color: '#10b981' }} />
              Export
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search students, programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 ${
                  activeRole === 'university' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
                } outline-none transition-all shadow-sm text-sm`}
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 ${
                  activeRole === 'university' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
                } outline-none transition-all shadow-sm text-sm appearance-none cursor-pointer font-medium`}
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In Review</option>
                <option value="interview_requested">Interview Pending</option>
                <option value="approved">Approved</option>
                <option value="incomplete">Incomplete</option>
                <option value="rejected">Rejected</option>
                {activeRole === 'agent' && <option value="draft">Drafts</option>}
              </select>
            </div>
            
            <div className="relative w-full sm:w-auto">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className={`w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 ${
                  activeRole === 'university' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
                } outline-none transition-all shadow-sm text-sm appearance-none cursor-pointer font-medium`}
              >
                <option value="updatedAt-desc">Newest First</option>
                <option value="updatedAt-asc">Oldest First</option>
                <option value="studentName-asc">Name (A-Z)</option>
                <option value="studentName-desc">Name (Z-A)</option>
                <option value="institution-asc">Institution (A-Z)</option>
                <option value="institution-desc">Institution (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {activeFilter && (
          <div className="flex justify-start mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Filtered by: {activeFilter.value}
              </span>
              <button 
                onClick={() => setActiveFilter(null)}
                className="p-1 hover:bg-blue-100 rounded-md transition-colors"
              >
                <X size={14} className="text-blue-500" />
              </button>
            </div>
          </div>
        )}

        <div ref={listRef} id="applications-table-section" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          {loading ? (
            <CentralLoader minHeight="py-24" />
          ) : filteredApps.length > 0 ? (
            <>
              <div className="hidden lg:block w-full">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-11 text-center">
                        <div className="flex items-center justify-center">
                          <input 
                            id="bulk-select-all"
                            type="checkbox" 
                            checked={paginatedApps.length > 0 && paginatedApps.every(app => selectedAppIds.includes(app.id))}
                            onChange={(e) => {
                              const currentIds = paginatedApps.map(app => app.id);
                              if (e.target.checked) {
                                setSelectedAppIds(prev => {
                                  const next = [...prev];
                                  currentIds.forEach(id => {
                                    if (!next.includes(id)) next.push(id);
                                  });
                                  return next;
                                });
                              } else {
                                setSelectedAppIds(prev => prev.filter(id => !currentIds.includes(id)));
                              }
                            }}
                            className={`rounded border-slate-300 w-4 h-4 cursor-pointer focus:ring-offset-0 ${
                              activeRole === 'university' 
                                ? 'text-orange-500 focus:ring-orange-500' 
                                : 'text-blue-500 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      </th>
                      <th 
                        onClick={() => toggleSort('studentName')}
                        className={`px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer w-[18%] ${
                          activeRole === 'university' ? 'hover:text-orange-500' : 'hover:text-blue-600'
                        } transition-colors`}
                      >
                        <div className="flex items-center gap-1.5">
                          Student
                          {sortField === 'studentName' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                        </div>
                      </th>
                      <th 
                        onClick={() => toggleSort('institution')}
                        className={`px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer w-[20%] ${
                          activeRole === 'university' ? 'hover:text-orange-500' : 'hover:text-blue-600'
                        } transition-colors`}
                      >
                        <div className="flex items-center gap-1.5">
                          Institution & Program
                          {sortField === 'institution' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                        </div>
                      </th>
                      <th className="px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[12%]">Intake</th>
                      <th className="px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[12%]">Journey</th>
                      <th className="px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[20%]">Status</th>
                      <th 
                        onClick={() => toggleSort('updatedAt')}
                        className={`px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer w-[14%] ${
                          activeRole === 'university' ? 'hover:text-orange-500' : 'hover:text-blue-600'
                        } transition-colors`}
                      >
                        <div className="flex items-center gap-1.5">
                          Last Updated
                          {sortField === 'updatedAt' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                        </div>
                      </th>
                      <th className="px-1.5 xl:px-3 py-3 xl:py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedApps.map((app) => {
                      const isNewNotification = notifications.some(n => 
                        n.isUnread && 
                        n.category === 'applications' && 
                        (n.applicationId === app.id || 
                         (n.description && (
                           n.description.toLowerCase().includes((app.studentFirstName || '').toLowerCase()) &&
                           n.description.toLowerCase().includes((app.studentLastName || '').toLowerCase())
                         )))
                      );
                      const isNewSubmission = activeRole === 'university' && app.applicationStatus === 'submitted' && isNewNotification;
                      const isHighlightedNew = isNewNotification;

                      return (
                        <motion.tr 
                          key={app.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${
                            isHighlightedNew ? 'bg-amber-50/[0.15]' : ''
                          }`}
                          onClick={() => router.push(app.applicationStatus === 'draft' ? `/new-application/${app.id}` : `/application/${app.id}`)}
                        >
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 w-11 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <input 
                                id={`bulk-select-${app.id}`}
                                type="checkbox"
                                checked={selectedAppIds.includes(app.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAppIds(prev => [...prev, app.id]);
                                  } else {
                                    setSelectedAppIds(prev => prev.filter(id => id !== app.id));
                                  }
                                }}
                                className={`rounded border-slate-300 w-4 h-4 cursor-pointer focus:ring-offset-0 ${
                                  activeRole === 'university' 
                                    ? 'text-orange-500 focus:ring-orange-500' 
                                    : 'text-blue-500 focus:ring-blue-500'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-9 h-9 shrink-0 ${isHighlightedNew ? 'bg-amber-100/50 text-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500'} rounded-xl flex items-center justify-center ${
                                activeRole === 'university' ? 'group-hover:bg-orange-50 group-hover:text-orange-500' : 'group-hover:bg-blue-50 group-hover:text-blue-600'
                              } transition-all`}>
                                <User size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 min-w-0" title={`${standardizeName(app.studentFirstName)} ${standardizeName(app.studentLastName)}`.trim() || (app.applicationStatus === 'draft' ? 'Untitled Draft' : 'Student Application')}>
                                  <span className="truncate">
                                    {(`${standardizeName(app.studentFirstName)} ${standardizeName(app.studentLastName)}`.trim()) || (app.applicationStatus === 'draft' ? 'Untitled Draft' : 'Student Application')}
                                  </span>
                                  {isHighlightedNew && (
                                    <span className="flex h-2 w-2 relative shrink-0">
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeRole === 'university' ? 'bg-orange-500' : 'bg-blue-500'} opacity-75`}></span>
                                      <span className={`relative inline-flex rounded-full h-2 w-2 ${activeRole === 'university' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                    </span>
                                  )}
                                  {isHighlightedNew && (
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase shrink-0 ${
                                      isNewSubmission ? 'bg-orange-500 text-white' : 'bg-[#0052FF] text-white animate-pulse'
                                    }`}>
                                      {isNewSubmission ? 'New App' : 'New Update'}
                                    </span>
                                  )}
                                </p>
                                <div className="flex flex-col gap-0.5 mt-0.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider min-w-0">
                                  {activeRole === 'university' && (
                                    <span className="truncate block" title={app.agencyName || app.agentFullName || 'Partner Agent'}>{app.agencyName || app.agentFullName || 'Partner Agent'}</span>
                                  )}
                                  {app.studentPhone && <span className="truncate block" title={app.studentPhone}>{app.studentPhone}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 min-w-0">
                              <University size={13} className="text-slate-300 shrink-0" />
                              <p 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (app.targetUniversityId && app.targetUniversityId !== 'other') {
                                    router.push(`/institution/${app.targetUniversityId}`);
                                  }
                                }}
                                className={`text-sm font-bold text-slate-700 truncate block min-w-0 ${
                                  activeRole === 'university' ? 'hover:text-orange-500' : 'hover:text-blue-600'
                                } transition-colors ${app.targetUniversityId && app.targetUniversityId !== 'other' ? 'cursor-pointer hover:underline' : ''}`}
                                title={getUniversityName(app, institutions)}
                              >
                                {getUniversityName(app, institutions)}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 font-medium ml-5 truncate block min-w-0" title={typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : (app.targetProgramId || 'N/A')}>
                              {typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : (app.targetProgramId || 'N/A')}
                            </p>
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 min-w-[90px] xl:min-w-[110px] max-w-[130px]">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold max-w-full border border-slate-200"
                                title={app.intakeStartDate 
                                  ? app.intakeStartDate
                                  : `${app.intakeTerm || ''} ${app.intakeYear || ''}`.trim() || '2026'
                                }
                              >
                                <Calendar size={11} className="shrink-0 text-slate-400" />
                                <span className="truncate min-w-0">
                                  {app.intakeStartDate 
                                    ? app.intakeStartDate
                                    : `${app.intakeTerm || ''} ${app.intakeYear || ''}`.trim() || '2026'
                                  }
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 min-w-[90px] xl:min-w-[105px]">
                            <div className="w-full max-w-[85px] xl:max-w-[100px]">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-slate-400">{getProgressPercentage(app.applicationStatus)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getProgressPercentage(app.applicationStatus)}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={`h-full rounded-full ${
                                    app.applicationStatus === 'approved' ? 'bg-green-500' :
                                    app.applicationStatus === 'rejected' ? 'bg-red-500' :
                                    app.applicationStatus === 'incomplete' ? 'bg-amber-500' :
                                    activeRole === 'university' ? 'bg-orange-500' : 'bg-blue-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 min-w-0">
                            <StatusBadge status={app.applicationStatus} />
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 min-w-0">
                            <p className="text-xs font-bold text-slate-600 truncate">
                              {app.updatedAt?.toDate ? new Date(app.updatedAt.toDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {app.updatedAt?.toDate ? new Date(app.updatedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </td>
                          <td className="px-1.5 xl:px-3 py-3 xl:py-4 w-12 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {app.applicationStatus === 'draft' && (
                                <button
                                  type="button"
                                  onClick={(e) => requestSingleDeleteDraft(e, app.id, `${standardizeName(app.studentFirstName)} ${standardizeName(app.studentLastName)}`.trim() || 'Untitled Draft')}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Draft Application"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <div className={`p-1 text-slate-300 ${
                                activeRole === 'university' ? 'group-hover:text-orange-500' : 'group-hover:text-blue-600'
                              } group-hover:translate-x-0.5 transition-all`}>
                                <ChevronRight size={16} />
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:hidden bg-slate-50/10">
                {paginatedApps.map((app) => {
                  const isNewNotification = notifications.some(n => 
                    n.isUnread && 
                    n.category === 'applications' && 
                    (n.applicationId === app.id || 
                     (n.description && (
                       n.description.toLowerCase().includes((app.studentFirstName || '').toLowerCase()) &&
                       n.description.toLowerCase().includes((app.studentLastName || '').toLowerCase())
                     )))
                  );
                  const isNewSubmission = activeRole === 'university' && app.applicationStatus === 'submitted' && isNewNotification;
                  const isHighlightedNew = isNewNotification;

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative group ${
                        isHighlightedNew ? 'border-amber-200 bg-amber-50/[0.08]' : ''
                      }`}
                      onClick={() => router.push(app.applicationStatus === 'draft' ? `/new-application/${app.id}` : `/application/${app.id}`)}
                    >
                      <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          id={`bulk-select-card-${app.id}`}
                          type="checkbox"
                          checked={selectedAppIds.includes(app.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAppIds(prev => [...prev, app.id]);
                            } else {
                              setSelectedAppIds(prev => prev.filter(id => id !== app.id));
                            }
                          }}
                          className={`rounded border-slate-300 w-4 h-4 cursor-pointer focus:ring-offset-0 ${
                            activeRole === 'university' 
                              ? 'text-orange-500 focus:ring-orange-500' 
                              : 'text-blue-500 focus:ring-blue-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-start gap-3 pl-7">
                        <div className={`w-10 h-10 shrink-0 ${isHighlightedNew ? 'bg-amber-100/50 text-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500'} rounded-xl flex items-center justify-center`}>
                          <User size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                {(`${standardizeName(app.studentFirstName)} ${standardizeName(app.studentLastName)}`.trim()) || (app.applicationStatus === 'draft' ? 'Untitled Draft' : 'Student Application')}
                                {isHighlightedNew && (
                                  <span className="flex h-2 w-2 relative">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeRole === 'university' ? 'bg-orange-500' : 'bg-blue-500'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${activeRole === 'university' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                  </span>
                                )}
                              </h4>
                              {activeRole === 'university' && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{app.agencyName || app.agentFullName || 'Partner Agent'}</p>
                              )}
                              {activeRole !== 'university' && app.studentPhone && (
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{app.studentPhone}</p>
                              )}
                            </div>
                            <div className="shrink-0">
                              <StatusBadge status={app.applicationStatus} />
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                            <div className="flex items-start gap-2">
                              <University size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">
                                  {getUniversityName(app, institutions)}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium truncate">
                                  {typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : (app.targetProgramId || 'N/A')}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200">
                                <Calendar size={11} />
                                {app.intakeStartDate 
                                  ? app.intakeStartDate
                                  : `${app.intakeTerm || ''} ${app.intakeYear || ''}`.trim() || '2026'
                                }
                              </div>

                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                <span>Journey: {getProgressPercentage(app.applicationStatus)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>
                              Updated {app.updatedAt?.toDate ? new Date(app.updatedAt.toDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently'}
                            </span>
                            <div className="flex items-center gap-2">
                              {app.applicationStatus === 'draft' && (
                                <button
                                  type="button"
                                  onClick={(e) => requestSingleDeleteDraft(e, app.id, `${standardizeName(app.studentFirstName)} ${standardizeName(app.studentLastName)}`.trim() || 'Untitled Draft')}
                                  className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Delete Draft"
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </button>
                              )}
                              <div className="flex items-center gap-1 text-slate-500 font-bold group-hover:translate-x-1 transition-all">
                                <span>View Details</span>
                                <ChevronRight size={14} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="px-6 py-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 text-slate-500 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 ${
                      activeRole === 'university' ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
                    } outline-none transition-all shadow-sm text-xs font-bold text-slate-700 cursor-pointer hover:border-slate-300`}
                  >
                    <option value={10}>10 records</option>
                    <option value={20}>20 records</option>
                    <option value={50}>50 records</option>
                  </select>
                  <span className="text-xs text-slate-400 font-bold ml-1">
                    Showing <span className="text-slate-700">{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className="text-slate-700">{Math.min(endIndex, totalItems)}</span> of <span className="text-slate-700">{totalItems}</span> applications
                  </span>
                </div>

                <div className="flex items-center gap-2 select-none w-full md:w-auto justify-between md:justify-end">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-3 text-xs font-black text-slate-600 bg-white border-2 border-slate-100 rounded-xl hover:border-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {getPageNumbers().map((page, idx) => {
                      if (page === '...') {
                        return (
                          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => handlePageChange(Number(page))}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            currentPage === page
                              ? (activeRole === 'university'
                                  ? 'bg-orange-500 text-white shadow-md'
                                  : 'bg-blue-600 text-white shadow-md shadow-blue-100')
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-3 text-xs font-black text-slate-600 bg-white border-2 border-slate-100 rounded-xl hover:border-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                <FileText size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No applications found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">Try adjusting your search query or filters to find what you're looking for.</p>
              {searchQuery || statusFilter !== 'all' ? (
                <button 
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200"
                >
                  Clear all filters
                </button>
              ) : (
                <button 
                  onClick={() => router.push('/new-application')}
                  className="px-6 py-3 bg-[#0059E7] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:bg-[#0047b3] transition-all text-center cursor-pointer"
                >
                  Start New Application
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className={`${hideSupportCenter ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[300px]`}>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">Tasks Requiring Attention</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Real-time alerts requiring human intervention</p>
                  </div>
                </div>
                {urgentTasks.length > 0 && (
                  <div className="self-start sm:self-auto shrink-0">
                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-xl text-[10px] font-black tracking-wider animate-pulse flex items-center gap-1">
                      {urgentTasks.length} {urgentTasks.length === 1 ? 'TASK' : 'TASKS'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                {urgentTasks.length > 0 ? (
                  urgentTasks.map((task) => (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-200 group/task"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${task.iconColor} mt-0.5`}>
                          {task.status === 'interview_requested' ? <MessageSquare size={16} /> : 
                           task.status === 'rejected' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{task.studentName}</p>
                          <p className="text-[11px] text-slate-500 font-medium whitespace-normal break-words line-clamp-2 mt-1" title={task.issue}>
                            {task.issue}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (task.status === 'incomplete' && task.cta === 'Upload Now') {
                            setUploadSelectedApp(task.app);
                          } else if (task.status === 'interview_requested' && task.cta === 'Schedule') {
                            setScheduleSelectedApp(task.app);
                          } else {
                            router.push(task.status === 'draft' ? `/new-application/${task.id}` : `/application/${task.id}`);
                          }
                        }}
                        className={`w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border outline-none cursor-pointer text-center ${
                          task.status === 'rejected' 
                            ? 'bg-red-50 hover:bg-red-500 border-red-200 text-red-700' 
                            : task.status === 'interview_requested'
                            ? 'bg-[#155DFC] hover:bg-[#114ecc] border-[#155DFC] text-white shadow-md font-bold'
                            : 'bg-amber-50 hover:bg-amber-500 border-amber-200 text-amber-700'
                        }`}
                      >
                        {task.cta}
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-green-50/25 rounded-[1.5rem] border border-dashed border-green-150">
                    <CheckCircle2 className="text-green-500 mb-2" size={32} />
                    <p className="text-xs font-extrabold text-slate-800">All caught up!</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">No urgent tasks requiring your attention.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {!hideSupportCenter && (
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">Support Center</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Available 24/7</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">
                  Have questions or need technical assistance with document validation? Connect directly with our admissions and compliance desk.
                </p>
              </div>
              <button 
                onClick={() => router.push('/help-support')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all cursor-pointer outline-none border border-transparent shadow-sm hover:shadow"
              >
                Contact Support
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {uploadSelectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="bg-slate-950 text-white p-6 md:p-8 flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-amber-500/15 border border-amber-500/35 text-amber-400 rounded-full text-[9px] font-black uppercase tracking-wider leading-none">
                    <AlertTriangle size={10} />
                    Required Action
                  </div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight mt-4 font-outfit">
                    Upload Supporting Documents
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Student: <span className="text-white font-bold">{standardizeName(uploadSelectedApp.studentFirstName)} {standardizeName(uploadSelectedApp.studentLastName)}</span>
                    <span className="mx-2 text-slate-650">|</span> 
                    University: <span className="text-slate-200 font-bold">{getUniversityName(uploadSelectedApp, institutions)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setUploadSelectedApp(null)}
                  className="w-10 h-10 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer outline-none border border-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const activeSlots = getDynamicDocumentSlots();
                const totalSlotsCount = activeSlots.reduce((acc, cat) => acc + cat.items.length, 0);
                return (
                  <div className="bg-blue-600 text-white p-4 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-700">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-blue-200">Upload Checklist Progress</h3>
                      <p className="text-[11px] text-blue-100 font-medium mt-0.5">Physical files are automatically securely stored under the student's admission record.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-28 bg-blue-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (Object.keys(uploadSelectedApp.uploadedDocuments || {}).length / Math.max(1, totalSlotsCount)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black font-mono">
                        {Object.keys(uploadSelectedApp.uploadedDocuments || {}).length} / {totalSlotsCount} Uploaded
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1 bg-slate-50/20">
                {getDynamicDocumentSlots().map((cat, catIdx) => {
                  const CategoryIcon = cat.icon || FileText;
                  return (
                    <div key={catIdx} className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <CategoryIcon size={16} className={cat.textColor} />
                        <h4 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
                          {cat.category}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {cat.items.map((slot) => {
                          const fileMeta = uploadSelectedApp.uploadedDocuments?.[slot.id];
                          const isUploaded = !!fileMeta;
                          const isUploading = !!uploadingSlots[slot.id];

                          return (
                            <div key={slot.id} className="relative">
                              <input
                                id={`modal-file-input-${slot.id}`}
                                type="file"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, slot.id);
                                  }
                                }}
                              />

                              {isUploaded ? (
                                <div className="flex items-center justify-between p-4 bg-emerald-50/10 hover:bg-emerald-50/20 border border-emerald-200 rounded-2xl transition-all">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-emerald-700 flex items-center justify-center shrink-0">
                                      <CheckCircle2 size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-800">{slot.name}</p>
                                      <p className="text-[10px] text-emerald-700 font-semibold truncate max-w-[200px] mt-0.5" title={fileMeta.name}>
                                        {fileMeta.name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <button
                                      onClick={() => document.getElementById(`modal-file-input-${slot.id}`)?.click()}
                                      disabled={isUploading}
                                      className="px-3 py-3 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shrink-0"
                                    >
                                      Replace
                                    </button>
                                    <button
                                      onClick={() => handleRemoveFile(slot.id)}
                                      disabled={isUploading}
                                      className="px-3 py-3 bg-red-50 hover:bg-red-500 text-red-700 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shrink-0"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => {
                                    if (!isUploading) {
                                      document.getElementById(`modal-file-input-${slot.id}`)?.click();
                                    }
                                  }}
                                  className={`p-4 border border-dashed rounded-2xl flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                                    isUploading 
                                      ? 'border-blue-200 bg-blue-50/5 animate-pulse' 
                                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-xl bg-slate-100/85 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800 flex items-center justify-center text-[10px] font-mono font-black shrink-0 transition-all">
                                      {slot.order < 10 ? `0${slot.order}` : slot.order}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-800 truncate">
                                        {slot.name} {slot.isMandatory && <span className="text-red-500 ml-0.5">*</span>}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5" title={slot.description}>
                                        {slot.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {isUploading ? (
                                      <Loader2 size={16} className="text-blue-500 animate-spin" />
                                    ) : (
                                      <div className="px-3 py-3 bg-slate-100 group-hover:bg-blue-500 text-slate-650 group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 leading-none select-none">
                                        <Upload size={10} />
                                        Upload
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => setUploadSelectedApp(null)}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Close & Save Changes
                </button>
                <button
                  onClick={handleFinishUploading}
                  disabled={isSubmittingDocs}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-100 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  {isSubmittingDocs ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Mark application as submitted"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scheduleSelectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="bg-[#155DFC] text-white p-6 md:p-8 flex items-center justify-between animate-fade-in">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/15 border border-white/30 text-white rounded-full text-[9px] font-black uppercase tracking-wider leading-none">
                    <Calendar size={10} />
                    Schedule Interview
                  </div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight mt-4 font-outfit">
                    Google Meet Scheduler
                  </h2>
                  <p className="text-[11px] text-blue-100 mt-1">
                    Student: <span className="text-white font-bold">{standardizeName(scheduleSelectedApp.studentFirstName)} {standardizeName(scheduleSelectedApp.studentLastName)}</span>
                    <span className="mx-2 text-blue-200">|</span> 
                    University: <span className="text-white font-bold">{getUniversityName(scheduleSelectedApp, institutions)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setScheduleSelectedApp(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all cursor-pointer outline-none border border-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5 bg-slate-50/30 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Interview Date
                    </label>
                    <input
                      type="date"
                      required
                      value={interviewDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition-all text-xs font-bold text-slate-700 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Interview Time
                    </label>
                    <input
                      type="time"
                      required
                      value={interviewTime}
                      onChange={(e) => setInterviewTime(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition-all text-xs font-bold text-slate-700 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Interviewer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Admissions Team or Director"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition-all text-xs font-bold text-slate-700 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Interview Preparation & Notes for Student
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter any guidance notes for the student, e.g. Be prepared to answer questions on academic background, statement of purpose, and future goals."
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:ring-2 focus:ring-blue-100 rounded-xl outline-none transition-all text-xs font-medium text-slate-700 placeholder:text-slate-405 shadow-sm resize-none"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex gap-2 text-amber-700 text-[11px] leading-relaxed">
                  <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-0.5">Automated Booking Notice</span>
                    This tool generates a dynamic secure Google Meet URL automatically and logs it to the student record for immediate join capability.
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleSelectedApp(null)}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleScheduleInterview}
                  disabled={isSubmittingSchedule}
                  className="w-full sm:w-auto px-6 py-3 bg-[#155DFC] hover:bg-[#114ecc] disabled:bg-blue-300 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-100 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide text-center"
                >
                  {isSubmittingSchedule ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Interview"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedAppIds.length > 0 && (
          <motion.div
            id="bulk-actions-floating-bar"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-[1.75rem] shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6 z-40 w-[95%] max-w-4xl"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                activeRole === 'university' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {selectedAppIds.length}
              </div>
              <div>
                <h4 className="text-xs font-bold font-outfit">Applications Selected</h4>
                <p className="text-[10px] text-slate-400 font-medium">Perform bulk actions below</p>
              </div>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-800" />

            <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto md:flex-1">
              <button
                type="button"
                onClick={() => setSelectedAppIds([])}
                className="px-3.5 py-2.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Clear
              </button>

              {selectedDraftCount > 0 && (
                <button
                  type="button"
                  disabled={isDeletingDrafts}
                  onClick={(e) => {
                    e.stopPropagation();
                    requestBulkDeleteDrafts();
                  }}
                  title={hasNonDraftSelected ? "Deselect non-draft applications to enable draft deletion" : "Delete selected draft applications"}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    hasNonDraftSelected 
                      ? 'bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/80' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <Trash2 size={13} />
                  {selectedDraftCount === 1 ? 'Delete Selected Draft' : `Delete Selected Drafts (${selectedDraftCount})`}
                </button>
              )}

              {activeRole === 'university' ? (
                <>
                  <button
                    type="button"
                    disabled={isBulkUpdating}
                    onClick={() => handleBulkStatusUpdate('interview_requested')}
                    className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    Interview
                  </button>

                  <button
                    type="button"
                    disabled={isBulkUpdating}
                    onClick={() => handleBulkStatusUpdate('incomplete')}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <AlertTriangle size={13} />
                    Incomplete
                  </button>

                  <button
                    type="button"
                    disabled={isBulkUpdating}
                    onClick={() => handleBulkStatusUpdate('approved')}
                    className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={isBulkUpdating}
                    onClick={() => handleBulkStatusUpdate('rejected')}
                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Download size={13} />
                    Export Selected
                  </button>

                  <button
                    type="button"
                    disabled={isBulkUpdating || isWithdrawing}
                    onClick={() => setWithdrawConfirmModal({ isOpen: true, count: selectedAppIds.length })}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <UserX size={13} />
                    Withdraw
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {withdrawConfirmModal?.isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => !isWithdrawing && setWithdrawConfirmModal(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 animate-scale-up" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
              <UserX size={28} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                Withdraw {withdrawConfirmModal.count > 1 ? `${withdrawConfirmModal.count} Applications?` : 'Application?'}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Are you sure you want to withdraw {withdrawConfirmModal.count > 1 ? `these ${withdrawConfirmModal.count} selected applications` : 'this selected application'}? The status will be changed to <span className="font-bold text-rose-600">withdrawn</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={() => setWithdrawConfirmModal(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={executeBulkWithdraw}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isWithdrawing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UserX size={18} />
                )}
                <span>Yes, Withdraw</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmModal?.isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => setDeleteConfirmModal(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 animate-scale-up" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <Trash2 size={28} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                {deleteConfirmModal.type === 'bulk' ? 'Delete Draft Applications?' : 'Delete Draft Application?'}
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                {deleteConfirmModal.type === 'bulk'
                  ? `Are you sure you want to permanently delete ${deleteConfirmModal.count} selected draft application(s)? This action cannot be undone.`
                  : `Are you sure you want to permanently delete the draft application for "${deleteConfirmModal.studentName}"? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingDrafts}
                onClick={executeDeleteDrafts}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeletingDrafts ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}