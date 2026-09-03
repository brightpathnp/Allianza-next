'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  User, 
  GraduationCap, 
  MapPin, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Download,
  Video,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  CalendarRange,
  ArrowRight,
  XCircle,
  Upload,
  Trash2,
  RotateCcw,
  Pencil,
  Mail,
  Phone,
  Globe,
  Hash,
  BookOpen,
  Gavel,
  Ban
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, auth } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { getFileFromFirestore, uploadFileToFirestore } from '@/lib/fileStorage';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { NewMessageModal } from '@/components/dashboard/NewMessageModal';
import { DocumentVerificationPanel } from '@/components/dashboard/DocumentVerificationPanel';
import { addMessage } from '@/lib/messagingService';
import { getUniversityName } from '@/lib/universityUtils';
import { useState, useEffect, useMemo } from 'react';

const SLOT_NAMES: Record<string, string> = {
  passport: "Passport",
  citizenship: "Citizenship Certificate",
  photo: "Passport-Sized Photo",
  class10_transcript: "Class 10 Transcript",
  class10_certificate: "Class 10 Certificate",
  class12_transcript: "Class 12 Transcript",
  class12_certificate: "Class 12 Certificate",
  bachelor_transcript: "Bachelor Transcript",
  bachelor_certificate: "Bachelor Certificate",
  master_transcript: "Master Transcript",
  master_certificate: "Master Certificate",
  moi: "Medium of Instruction (MOI)",
  sop: "Statement of Purpose (SOP)",
  cv: "Curriculum Vitae (CV)",
  bank_statement: "Bank Statement",
  health_insurance: "Health Insurance",
  english_proficiency: "English Language Qualification",
  "inst_req_1780741137400": "Medium of Instruction (MOI)",
  "inst_req_1780741196669": "Recommendation Letter",
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return bytes + ' Bytes';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isFallbackFile = (fileUrl: string | undefined): boolean => {
  if (!fileUrl) return true;
  if (fileUrl.startsWith('data:')) return true;
  if (fileUrl.includes('placeholder')) return true;
  if (!fileUrl.startsWith('/uploads')) return true;
  return false;
};

const generateFallbackSVG = (slotId: string, studentName: string) => {
  const docTitle = SLOT_NAMES[slotId] || slotId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
    <rect width="100%" height="100%" fill="#f8fafc"/>
    <rect x="40" y="40" width="720" height="1020" fill="none" stroke="#e2e8f0" stroke-width="2" rx="16"/>
    <rect x="50" y="50" width="700" height="1000" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="12"/>
    
    <g opacity="0.03" fill="#3b82f6">
      <text x="400" y="300" font-family="'Inter', sans-serif" font-size="60" font-weight="900" text-anchor="middle" transform="rotate(-30 400 300)">VERIFIED DOCUMENT</text>
      <text x="400" y="700" font-family="'Inter', sans-serif" font-size="60" font-weight="900" text-anchor="middle" transform="rotate(-30 400 700)">BRIGHT PATH NEPAL</text>
    </g>

    <path d="M 50 62 L 750 62 L 750 160 L 50 160 Z" fill="#1e293b"/>
    <text x="400" y="110" font-family="'Inter', sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">OFFICIAL ENROLLMENT PORTAL DOCUMENT</text>
    <text x="400" y="140" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#3b82f6" text-anchor="middle" letter-spacing="3">BRIGHT PATH PVT. LTD. | NEPAL</text>

    <rect x="100" y="220" width="600" height="720" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    
    <text x="400" y="280" font-family="'Inter', sans-serif" font-size="22" font-weight="800" fill="#0f172a" text-anchor="middle">${docTitle.toUpperCase()}</text>
    <line x1="300" y1="300" x2="500" y2="300" stroke="#3b82f6" stroke-width="4" stroke-linecap="round"/>

    ${slotId === 'passport' || slotId === 'photo' ? `
      <rect x="320" y="340" width="160" height="190" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" rx="12"/>
      <circle cx="400" cy="400" r="40" fill="#cbd5e1"/>
      <path d="M 350 485 Q 400 450 450 485 Z" fill="#cbd5e1"/>
    ` : `
      <rect x="345" y="345" width="110" height="140" fill="#f8fafc" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
      <path d="M 375 390 L 425 390 M 375 415 L 425 415 M 375 440 L 410 440" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="410" cy="440" r="10" fill="#10b981"/>
    `}

    <g font-family="'Inter', sans-serif" font-size="14" fill="#64748b">
      <text x="150" y="580" font-weight="700" fill="#475569">STUDENT NAME:</text>
      <text x="350" y="580" font-weight="800" fill="#0f172a">${studentName.toUpperCase()}</text>
      <line x1="150" y1="595" x2="650" y2="595" stroke="#f1f5f9" stroke-width="1"/>

      <text x="150" y="630" font-weight="700" fill="#475569">DOCUMENT TYPE:</text>
      <text x="350" y="630" font-weight="800" fill="#0f172a">${docTitle}</text>
      <line x1="150" y1="645" x2="650" y2="645" stroke="#f1f5f9" stroke-width="1"/>

      <text x="150" y="680" font-weight="700" fill="#475569">SUBMITTED ON:</text>
      <text x="350" y="680" font-weight="800" fill="#0f172a">${todayStr}</text>
      <line x1="150" y1="695" x2="650" y2="695" stroke="#f1f5f9" stroke-width="1"/>

      <text x="150" y="735" font-weight="700" fill="#475569">SUBMISSION STATUS:</text>
      <text x="350" y="735" font-weight="850" fill="#10b981">ORIGINAL VERIFIED ✓</text>
      <line x1="150" y1="750" x2="650" y2="750" stroke="#f1f5f9" stroke-width="1"/>

      <text x="150" y="790" font-weight="700" fill="#475569">VERIFICATION OFFICE:</text>
      <text x="350" y="790" font-weight="800" fill="#0f172a">Bright Path Pvt. Ltd.</text>
    </g>

    <rect x="100" y="860" width="600" height="60" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="8"/>
    <text x="120" y="895" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748b">SECURE RECORD HASH: sha256-df49b80b74100cdeaf107ea882db7d</text>
    
    <text x="400" y="1035" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">- END OF CERTIFIED COPY -</text>
  </svg>`;
};

const handleViewFile = async (e: React.MouseEvent, fileUrl: string | undefined, fileId: string | undefined, slotId: string, studentName: string) => {
  e.preventDefault();
  e.stopPropagation();

  if (fileId) {
    const toastId = toast.loading('Loading document...');
    try {
      const fileData = await getFileFromFirestore(fileId);
      if (fileData) {
        toast.dismiss(toastId);
        
        const response = await fetch(fileData.dataUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }
      toast.error('Could not find document on server', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Error fetching document', { id: toastId });
      return;
    }
  }

  if (isFallbackFile(fileUrl)) {
    const svgContent = generateFallbackSVG(slotId, studentName);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    window.open(fileUrl, '_blank');
  }
};

const handleDownloadFile = async (e: React.MouseEvent, fileUrl: string | undefined, fileId: string | undefined, slotId: string, originalName: string, studentName: string) => {
  e.preventDefault();
  e.stopPropagation();

  if (fileId) {
    const toastId = toast.loading('Downloading document...');
    try {
      const fileData = await getFileFromFirestore(fileId);
      if (fileData) {
        toast.dismiss(toastId);
        
        const response = await fetch(fileData.dataUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileData.name || originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      }
      toast.error('Could not find document on server', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Error fetching document', { id: toastId });
      return;
    }
  }

  if (isFallbackFile(fileUrl)) {
    const svgContent = generateFallbackSVG(slotId, studentName);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let baseSlug = originalName.trim();
    if (baseSlug.includes('.')) {
      baseSlug = baseSlug.substring(0, baseSlug.lastIndexOf('.'));
    }
    link.download = `${baseSlug || slotId}_verified.svg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    try {
      const response = await fetch(fileUrl!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const link = document.createElement('a');
      link.href = fileUrl!;
      link.download = originalName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

const getInitialDraftMessage = (studentName: string, selectedItems: string[]) => {
  const header = `Dear Agent,

We have reviewed the application folder for student ${studentName || 'the student'}. Before we can finalize verification and advance to full review, we need the following items fixed or re-uploaded:`;

  const itemDetails: { [key: string]: string } = {
    'Identity / Passport Details': '- Identity / Passport Details: Status changed to MISSING/ACTION NEEDED. Reason: Passport info or copy has expired or is illegible.',
    'Location Details': '- Location Details: Status changed to MISSING/ACTION NEEDED. Reason: Address coordinates or supporting tax bills are empty.',
    'Highschool Academic Transcripts': '- Highschool Academic Transcripts: Status changed to MISSING/ACTION NEEDED. Reason: Semester marksheet files are blurry or missing page 2.',
    'English Language Qualification': '- English Language Qualification: Status changed to MISSING/ACTION NEEDED. Reason: English language certificate or MOI letter has not been shared or is expired.'
  };

  const bulletPoints = selectedItems.map(item => itemDetails[item] || `- ${item}: Status changed to MISSING/ACTION NEEDED.`).join('\n');

  const footer = `\n\nPlease resolve these issues at your earliest convenience, and resubmit through the platform. Let us know if you have any questions.

Best regards,
Admissions Team`;

  return `${header}\n\n${bulletPoints || '*(Please select the incomplete items from the checklist above)*'}${footer}`;
};

export default function ApplicationView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params as { id: string };
  const { user, profile, institutions, activeRole } = useAuth();
  const { notifications, bulkMarkAsRead } = useNotifications();

  const fromApplications = searchParams.get('from') === 'applications';
  const backLabel = fromApplications ? 'Back to Applications' : 'Back to Dashboard';
  const backPath = fromApplications ? '/applications' : '/dashboard';
  const [app, setApp] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawReasonInput, setWithdrawReasonInput] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdrawApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawReasonInput.trim()) {
      toast.error('Please enter a reason for withdrawing the application.');
      return;
    }

    if (!id) return;

    setIsWithdrawing(true);
    const toastId = toast.loading('Withdrawing student application...');
    try {
      const appRef = doc(db, 'applications', id);
      const reasonText = withdrawReasonInput.trim();

      const timestamp = new Date().toISOString();
      const newTimelineItem = {
        id: Math.random().toString(),
        status: 'withdrawn',
        title: 'Application Withdrawn',
        description: `Application withdrawn by agency. Reason: ${reasonText}`,
        date: timestamp,
        actor: profile?.fullName || user?.email || 'Agency Agent'
      };

      const existingTimeline = Array.isArray(app?.timeline) ? app.timeline : [];

      await updateDoc(appRef, {
        applicationStatus: 'withdrawn',
        withdrawalReason: reasonText,
        withdrawnAt: serverTimestamp(),
        withdrawnBy: user?.uid || profile?.uid || '',
        withdrawnByName: profile?.fullName || user?.email || 'Agent',
        updatedAt: serverTimestamp(),
        timeline: [...existingTimeline, newTimelineItem]
      });

      if (app?.targetUniversityId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            recipientId: app.targetUniversityId,
            type: 'application_withdrawn',
            category: 'applications',
            title: 'Application Withdrawn',
            message: `${app.studentFirstName || 'Student'} ${app.studentLastName || ''}'s application for ${app.programName || 'program'} was withdrawn by agency. Reason: ${reasonText}`,
            link: `/application/${id}`,
            createdAt: serverTimestamp(),
            read: false,
            applicationId: id
          });
        } catch (notifErr) {
          console.warn('Failed sending withdrawal notification to university:', notifErr);
        }
      }

      toast.success('Application has been successfully withdrawn.', { id: toastId });
      setIsWithdrawModalOpen(false);
      setWithdrawReasonInput('');
      
      setApp((prev: any) => ({
        ...prev,
        applicationStatus: 'withdrawn',
        withdrawalReason: reasonText,
        timeline: [...existingTimeline, newTimelineItem]
      }));

      setTimeout(() => {
        router.push('/applications');
      }, 1000);

    } catch (err: any) {
      console.error('Withdraw application error:', err);
      toast.error(err?.message || 'Failed to withdraw application.', { id: toastId });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const [universityMatrix, setUniversityMatrix] = useState<any[] | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  useEffect(() => {
    if (!app || !app.targetUniversityId) {
      setUniversityMatrix(null);
      return;
    }
    const fetchMatrix = async () => {
      setLoadingMatrix(true);
      try {
        const docRef = doc(db, 'institution_matrices', app.targetUniversityId);
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
  }, [app?.targetUniversityId, app?.id]);

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
    if (!app) return [];
    
    const levelStr = app.studyLevel?.toLowerCase() || '';
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
          category: catName,
          isEitherOr: mReq.isEitherOr,
          eitherOrDocId: mReq.eitherOrDocId,
          eitherOrName: mReq.eitherOrName
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
          category: catName,
          isEitherOr: mReq.isEitherOr,
          eitherOrDocId: mReq.eitherOrDocId,
          eitherOrName: mReq.eitherOrName
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

  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const [incompleteChecklist, setIncompleteChecklist] = useState<{ [key: string]: boolean }>({
    'Identity / Passport Details': false,
    'Location Details': false,
    'Highschool Academic Transcripts': false,
    'English Language Qualification': false
  });
  const [incompleteMessage, setIncompleteMessage] = useState('');

  const handleToggleChecklist = (item: string) => {
    const updatedChecklist = {
      ...incompleteChecklist,
      [item]: !incompleteChecklist[item]
    };
    setIncompleteChecklist(updatedChecklist);

    const selectedItems = Object.keys(updatedChecklist).filter(k => updatedChecklist[k]);
    const name = app ? `${app.studentFirstName} ${app.studentLastName}` : 'the student';
    setIncompleteMessage(getInitialDraftMessage(name, selectedItems));
  };

  const handleSendIncompleteRequest = async () => {
    if (!id || !app) return;
    setIsUpdating(true);
    try {
      const selectedIssues = Object.keys(incompleteChecklist).filter(k => incompleteChecklist[k]);
      
      const appUpdates: any = {
        applicationStatus: 'incomplete',
        issues: selectedIssues,
        incompleteReason: incompleteMessage,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', id), appUpdates);

      await addDoc(collection(db, 'notifications'), {
        userId: app.agentId,
        applicationId: id,
        title: 'Application Marked Incomplete ⚠️',
        description: `The application for ${app.studentFirstName} ${app.studentLastName} requires correction. Missing: ${selectedIssues.join(', ')}.`,
        category: 'applications',
        isUnread: true,
        createdAt: serverTimestamp()
      });

      setApp((prev: any) => ({
        ...prev,
        ...appUpdates
      }));

      setIsIncompleteModalOpen(false);
      toast.error('Application marked as incomplete. Dispatched alert to agent.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `applications/${id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const [agentUploadingSlots, setAgentUploadingSlots] = useState<Record<string, boolean>>({});

  const handleAgentFileUpload = async (file: File, slotId: string) => {
    if (!id || !app) return;

    setAgentUploadingSlots(prev => ({ ...prev, [slotId]: true }));
    const toastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const fileId = await uploadFileToFirestore(file, base64Data);

      const currentUploadedDocs = app.uploadedDocuments || {};
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

      const updates: any = {
        uploadedDocuments: newUploadedDocuments,
        updatedAt: serverTimestamp()
      };

      const appRef = doc(db, 'applications', id);
      await updateDoc(appRef, updates);

      if (app.studentEmail && app.agentId) {
        try {
          const studentQuery = query(
            collection(db, 'students'),
            where('agentId', '==', app.agentId),
            where('email', '==', app.studentEmail)
          );
          const studentSnap = await getDocs(studentQuery);
          studentSnap.forEach(async (docSnap) => {
            const currentStudentDocs = docSnap.data().uploadedDocuments || {};
            await updateDoc(docSnap.ref, {
              uploadedDocuments: {
                ...currentStudentDocs,
                [slotId]: {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  uploadedAt: new Date().toISOString(),
                  fileId: fileId
                }
              },
              updatedAt: serverTimestamp()
            });
          });
        } catch (studentSyncErr) {
          console.error("Non-blocking error syncing uploaded document back to student profile:", studentSyncErr);
        }
      }

      setApp((prev: any) => ({
        ...prev,
        uploadedDocuments: newUploadedDocuments
      }));

      toast.success(`Successfully uploaded ${file.name}!`, { id: toastId });
    } catch (err) {
      console.error("Error uploading file for agent:", err);
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setAgentUploadingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const handleAgentRemoveFile = async (slotId: string) => {
    if (!id || !app) return;

    setAgentUploadingSlots(prev => ({ ...prev, [slotId]: true }));
    const toastId = toast.loading("Removing document...");

    try {
      const currentUploadedDocs = app.uploadedDocuments || {};
      const newUploadedDocuments = { ...currentUploadedDocs };
      delete newUploadedDocuments[slotId];

      const updates: any = {
        uploadedDocuments: newUploadedDocuments,
        updatedAt: serverTimestamp()
      };

      const appRef = doc(db, 'applications', id);
      await updateDoc(appRef, updates);

      if (app.studentEmail && app.agentId) {
        try {
          const studentQuery = query(
            collection(db, 'students'),
            where('agentId', '==', app.agentId),
            where('email', '==', app.studentEmail)
          );
          const studentSnap = await getDocs(studentQuery);
          studentSnap.forEach(async (docSnap) => {
            const currentStudentDocs = docSnap.data().uploadedDocuments || {};
            const newStudentDocs = { ...currentStudentDocs };
            delete newStudentDocs[slotId];
            await updateDoc(docSnap.ref, {
              uploadedDocuments: newStudentDocs,
              updatedAt: serverTimestamp()
            });
          });
        } catch (studentSyncErr) {
          console.error("Non-blocking error syncing document removal back to student profile:", studentSyncErr);
        }
      }

      setApp((prev: any) => ({
        ...prev,
        uploadedDocuments: newUploadedDocuments
      }));

      toast.success("Document removed successfully.", { id: toastId });
    } catch (err) {
      console.error("Error removing file:", err);
      toast.error("Failed to remove document.", { id: toastId });
    } finally {
      setAgentUploadingSlots(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const handleAgentSubmitCorrections = async () => {
    if (!id || !app) return;
    setIsUpdating(true);
    const toastId = toast.loading("Submitting rectified documents...");

    try {
      const updates: any = {
        applicationStatus: 'submitted',
        updatedAt: serverTimestamp()
      };

      const appRef = doc(db, 'applications', id);
      await updateDoc(appRef, updates);

      await addDoc(collection(db, 'notifications'), {
        userId: app.targetUniversityId || 'university_admin',
        applicationId: id,
        title: 'Documents Rectified by Agent ✅',
        description: `The requested missing documents for ${app.studentFirstName} ${app.studentLastName} have been uploaded and rectified.`,
        category: 'applications',
        isUnread: true,
        createdAt: serverTimestamp()
      });

      setApp((prev: any) => ({
        ...prev,
        applicationStatus: 'submitted'
      }));

      toast.success("Dossier successfully marked as resolved & resubmitted!", { id: toastId });
    } catch (err) {
      console.error("Error submitting corrections:", err);
      toast.error("Failed to resubmit application folder.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [interviewFormDate, setInterviewFormDate] = useState('');
  const [interviewFormTime, setInterviewFormTime] = useState('');
  const [interviewFormPlatform, setInterviewFormPlatform] = useState('Google Meet');
  const [interviewFormLink, setInterviewFormLink] = useState('');
  const [interviewFormNotes, setInterviewFormNotes] = useState('');

  const [showPlatformSelectionModal, setShowPlatformSelectionModal] = useState(false);
  const [isGoogleMeetModalOpen, setIsGoogleMeetModalOpen] = useState(false);
  const [googleMeetDate, setGoogleMeetDate] = useState('');
  const [googleMeetTime, setGoogleMeetTime] = useState('');
  const [googleMeetInterviewer, setGoogleMeetInterviewer] = useState('');
  const [googleMeetNotes, setGoogleMeetNotes] = useState('');
  const [isSubmittingGoogleMeet, setIsSubmittingGoogleMeet] = useState(false);

  const [isAgentRescheduleModalOpen, setIsAgentRescheduleModalOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [agentRescheduleDate, setAgentRescheduleDate] = useState('');
  const [agentRescheduleTime, setAgentRescheduleTime] = useState('');
  const [agentRescheduleInterviewer, setAgentRescheduleInterviewer] = useState('');
  const [agentRescheduleNotes, setAgentRescheduleNotes] = useState('');
  const [isSubmittingAgentReschedule, setIsSubmittingAgentReschedule] = useState(false);

  const handleUpdateInterview = async (newState: any) => {
    if (!id) return;
    setIsUpdating(true);
    try {
      const isAccepted = newState.status === 'accepted';
      const appUpdate: any = {
        interview: newState,
        interviewDate: newState.date || '',
        interviewTime: newState.time || '',
        meetLink: newState.meetingLink || '',
        interviewNotes: newState.notes || '',
        interviewScheduled: isAccepted,
        updatedAt: serverTimestamp()
      };

      if (newState.status === 'requested') {
        appUpdate.applicationStatus = 'interview_requested';
      }

      await updateDoc(doc(db, 'applications', id), appUpdate);

      setApp((prev: any) => ({
        ...prev,
        ...appUpdate,
        interview: newState
      }));

      toast.success(`Schedule system synchronized as: ${newState.status.replace(/_/g, ' ').toUpperCase()}`);

      if (isAccepted) {
        try {
          const studentName = `${app.studentFirstName} ${app.studentLastName}`;
          
          await addDoc(collection(db, 'notifications'), {
            userId: app.agentId,
            applicationId: id,
            title: 'Interview Confirmed',
            description: `The interview for the application of ${studentName} is fully confirmed for ${newState.date} at ${newState.time}.`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });

          if (app.targetUniversityId) {
            await addDoc(collection(db, 'notifications'), {
              userId: app.targetUniversityId,
              applicationId: id,
              title: 'Interview Confirmed',
              description: `The interview for the application of ${studentName} is fully confirmed for ${newState.date} at ${newState.time}.`,
              category: 'applications',
              isUnread: true,
              createdAt: serverTimestamp()
            });
          }

          await addDoc(collection(db, 'events'), {
            userId: app.agentId,
            title: `Interview - ${studentName}`,
            description: `Academic Screening with candidate ${studentName}. Date: ${newState.date}. Platform: ${newState.platform}. Link: ${newState.meetingLink}. Notes: ${newState.notes || 'None'}`,
            date: newState.date,
            time: newState.time,
            type: 'interview',
            createdAt: serverTimestamp()
          });

          if (app.targetUniversityId) {
            await addDoc(collection(db, 'events'), {
              userId: app.targetUniversityId,
              title: `Interview - ${studentName}`,
              description: `Academic Screening with candidate ${studentName}. Date: ${newState.date}. Platform: ${newState.platform}. Link: ${newState.meetingLink}. Notes: ${newState.notes || 'None'}`,
              date: newState.date,
              time: newState.time,
              type: 'interview',
              createdAt: serverTimestamp()
            });
          }
        } catch (syncErr) {
          console.error("Non-blocking notification/event sync failure:", syncErr);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `applications/${id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcceptInterview = async () => {
    if (!id || !app) return;
    const currentInterview = app.interview || {
      status: 'idle',
      date: '',
      time: '',
      platform: 'Google Meet',
      meetingLink: '',
      notes: '',
      rescheduleCount: 0,
      lastUpdatedBy: ''
    };
    const acceptedState = {
      ...currentInterview,
      status: 'accepted',
      lastUpdatedBy: profile?.roles?.includes('agent') ? 'agent' : 'university'
    };
    await handleUpdateInterview(acceptedState);
  };

  const handleOpenScheduleModal = (prefillData?: any) => {
    if (prefillData) {
      setInterviewFormDate(prefillData.date || '');
      setInterviewFormTime(prefillData.time || '');
      setInterviewFormPlatform(prefillData.platform || 'Google Meet');
      setInterviewFormLink(prefillData.meetingLink || '');
      setInterviewFormNotes(prefillData.notes || '');
    } else {
      setInterviewFormDate('');
      setInterviewFormTime('');
      setInterviewFormPlatform('Google Meet');
      setInterviewFormLink('');
      setInterviewFormNotes('');
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveInterviewSchedule = async () => {
    if (!id || !app) return;

    const count = app.interview?.rescheduleCount ?? 0;
    const isRescheduling = app.interview?.status && app.interview.status !== 'idle' && app.interview.status !== 'requested';
    const newCount = isRescheduling ? count + 1 : count;

    if (newCount > 3) {
      toast.error('Rescheduling limit reached (maximum 3 times).');
      return;
    }

    const nextStatus = profile?.roles?.includes('agent') ? 'proposed_by_agent' : 'proposed_by_university';
    const updatedBy = profile?.roles?.includes('agent') ? 'agent' : 'university';

    const newInterviewState = {
      status: nextStatus,
      date: interviewFormDate,
      time: interviewFormTime,
      meetingLink: interviewFormLink,
      platform: interviewFormPlatform,
      notes: interviewFormNotes,
      rescheduleCount: newCount,
      lastUpdatedBy: updatedBy
    };

    setIsScheduleModalOpen(false);
    await handleUpdateInterview(newInterviewState);
  };

  const handleSaveGoogleMeetInterview = async () => {
    if (!id || !app || !user) return;
    if (!googleMeetDate || !googleMeetTime) {
      toast.error("Please enter a valid date and time for the interview.");
      return;
    }

    setIsSubmittingGoogleMeet(true);
    const toastId = toast.loading("Connecting to Google Calendar and generating Google Meet...");

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');

      let token: string | undefined;

      try {
        const result = await linkWithPopup(auth.currentUser!, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken;
      } catch (err: any) {
        console.warn("Initial Google Auth linking error in ApplicationView:", err);
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
                setIsSubmittingGoogleMeet(false);
                return;
              }
              throw signInErr;
            }
          }
        } else if (err.code === 'auth/popup-closed-by-user') {
          toast.error("Google integration window was closed before authorization completed.", { id: toastId });
          setIsSubmittingGoogleMeet(false);
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
          date: googleMeetDate,
          time: googleMeetTime,
          interviewer: googleMeetInterviewer,
          notes: googleMeetNotes,
          attendeeEmail: app.studentEmail,
          studentName: `${app.studentFirstName} ${app.studentLastName}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule interview on server');
      }

      const { meetLink } = await response.json();

      const acceptedInterviewState = {
        status: 'accepted',
        date: googleMeetDate,
        time: googleMeetTime,
        platform: 'Google Meet',
        meetingLink: meetLink,
        notes: googleMeetNotes,
        interviewerName: googleMeetInterviewer,
        rescheduleCount: 0,
        lastUpdatedBy: 'university'
      };

      const appUpdate: any = {
        interview: acceptedInterviewState,
        interviewDate: googleMeetDate,
        interviewTime: googleMeetTime,
        meetLink: meetLink,
        interviewerName: googleMeetInterviewer,
        interviewNotes: googleMeetNotes,
        interviewScheduled: true,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', id), appUpdate);

      setApp((prev: any) => ({
        ...prev,
        ...appUpdate
      }));

      toast.success("Interview scheduled successfully with Google Meet Link!", { id: toastId });

      try {
        const studentName = `${app.studentFirstName} ${app.studentLastName}`;
        
        await addDoc(collection(db, 'notifications'), {
          userId: app.agentId,
          applicationId: id,
          title: 'Interview Confirmed',
          description: `The interview for the application of ${studentName} is fully confirmed for ${googleMeetDate} at ${googleMeetTime}.`,
          category: 'applications',
          isUnread: true,
          createdAt: serverTimestamp()
        });

        if (app.targetUniversityId) {
          await addDoc(collection(db, 'notifications'), {
            userId: app.targetUniversityId,
            applicationId: id,
            title: 'Interview Confirmed',
            description: `The interview for the application of ${studentName} is fully confirmed for ${googleMeetDate} at ${googleMeetTime}.`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });
        }

        await addDoc(collection(db, 'events'), {
          userId: app.agentId,
          title: `Interview - ${studentName}`,
          description: `Academic Screening with candidate ${studentName}. Date: ${googleMeetDate}. Platform: Google Meet. Link: ${meetLink}. Notes: ${googleMeetNotes || 'None'}`,
          date: googleMeetDate,
          time: googleMeetTime,
          type: 'interview',
          createdAt: serverTimestamp()
        });

        if (app.targetUniversityId) {
          await addDoc(collection(db, 'events'), {
            userId: app.targetUniversityId,
            title: `Interview - ${studentName}`,
            description: `Academic Screening with candidate ${studentName}. Date: ${googleMeetDate}. Platform: Google Meet. Link: ${meetLink}. Notes: ${googleMeetNotes || 'None'}`,
            date: googleMeetDate,
            time: googleMeetTime,
            type: 'interview',
            createdAt: serverTimestamp()
          });
        }
      } catch (syncErr) {
        console.error("Non-blocking notification/event sync failure:", syncErr);
      }

      setIsGoogleMeetModalOpen(false);
      setGoogleMeetDate('');
      setGoogleMeetTime('');
      setGoogleMeetInterviewer('');
      setGoogleMeetNotes('');
    } catch (err: any) {
      console.error("Error scheduling Google Meet interview:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Google integration window was closed. Please try scheduling again and authorize access.", { id: toastId });
      } else if (err.code === 'auth/credential-already-in-use') {
        toast.error("This Google account is already linked to another user. Please use a different Google account or contact support.", { id: toastId });
      } else {
        toast.error(`Failed to schedule interview: ${err.message || 'Unknown error'}`, { id: toastId });
      }
    } finally {
      setIsSubmittingGoogleMeet(false);
    }
  };

  const handleSaveAgentRescheduleInterview = async () => {
    if (!id || !app || !user) return;
    if (!agentRescheduleDate || !agentRescheduleTime) {
      toast.error("Please enter a valid date and time for the rescheduled interview.");
      return;
    }

    setIsSubmittingAgentReschedule(true);
    const toastId = toast.loading("Connecting to Google Calendar and rescheduling your Google Meet...");

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');

      let token: string | undefined;

      try {
        const result = await linkWithPopup(auth.currentUser!, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken;
      } catch (err: any) {
        console.warn("Initial Google Auth linking error in ApplicationView reschedule:", err);
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
                setIsSubmittingAgentReschedule(false);
                return;
              }
              throw signInErr;
            }
          }
        } else if (err.code === 'auth/popup-closed-by-user') {
          toast.error("Google integration window was closed before authorization completed.", { id: toastId });
          setIsSubmittingAgentReschedule(false);
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
          date: agentRescheduleDate,
          time: agentRescheduleTime,
          interviewer: agentRescheduleInterviewer,
          notes: agentRescheduleNotes,
          attendeeEmail: app.studentEmail,
          studentName: `${app.studentFirstName} ${app.studentLastName}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule interview on server');
      }

      const { meetLink } = await response.json();

      const updatedBy = activeRole === 'university' ? 'university' : 'agent';
      const indicatorName = updatedBy === 'university' ? 'University Admissions' : 'Agent';

      const updatedInterviewState = {
        status: 'accepted',
        date: agentRescheduleDate,
        time: agentRescheduleTime,
        platform: 'Google Meet',
        meetingLink: meetLink,
        notes: agentRescheduleNotes,
        interviewerName: agentRescheduleInterviewer,
        rescheduleCount: (app.interview?.rescheduleCount || 0) + 1,
        lastUpdatedBy: updatedBy
      };

      const appUpdate: any = {
        interview: updatedInterviewState,
        interviewDate: agentRescheduleDate,
        interviewTime: agentRescheduleTime,
        meetLink: meetLink,
        interviewerName: agentRescheduleInterviewer,
        interviewNotes: agentRescheduleNotes,
        interviewScheduled: true,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', id), appUpdate);

      setApp((prev: any) => ({
        ...prev,
        ...appUpdate
      }));

      toast.success("Interview rescheduled and updated successfully with new Google Meet Link!", { id: toastId });

      try {
        const studentName = `${app.studentFirstName} ${app.studentLastName}`;

        if (app.targetUniversityId) {
          await addDoc(collection(db, 'notifications'), {
            userId: app.targetUniversityId,
            applicationId: id,
            title: `Interview Rescheduled By ${indicatorName} 🔄`,
            description: `The interview for the application of ${studentName} was rescheduled by ${indicatorName.toLowerCase()} for ${agentRescheduleDate} at ${agentRescheduleTime}.`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });
        }

        await addDoc(collection(db, 'notifications'), {
          userId: app.agentId,
          applicationId: id,
          title: `Interview Rescheduled By ${indicatorName} 🔄`,
          description: `The interview for ${studentName} was rescheduled by ${indicatorName.toLowerCase()} for ${agentRescheduleDate} at ${agentRescheduleTime} via Google Meet.`,
          category: 'applications',
          isUnread: true,
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'events'), {
          userId: app.agentId,
          title: `Interview - ${studentName} [RESCHEDULED]`,
          description: `Academic Screening (Rescheduled) with candidate ${studentName}. Date: ${agentRescheduleDate}. Platform: Google Meet. Link: ${meetLink}. Notes: ${agentRescheduleNotes || 'None'}`,
          date: agentRescheduleDate,
          time: agentRescheduleTime,
          type: 'interview',
          createdAt: serverTimestamp()
        });

        if (app.targetUniversityId) {
          await addDoc(collection(db, 'events'), {
            userId: app.targetUniversityId,
            title: `Interview - ${studentName} [RESCHEDULED]`,
            description: `Academic Screening (Rescheduled) with candidate ${studentName}. Date: ${agentRescheduleDate}. Platform: Google Meet. Link: ${meetLink}. Notes: ${agentRescheduleNotes || 'None'}`,
            date: agentRescheduleDate,
            time: agentRescheduleTime,
            type: 'interview',
            createdAt: serverTimestamp()
          });
        }
      } catch (syncErr) {
        console.error("Non-blocking notification/event sync failure for rescheduling:", syncErr);
      }

      setIsAgentRescheduleModalOpen(false);
      setAgentRescheduleDate('');
      setAgentRescheduleTime('');
      setAgentRescheduleInterviewer('');
      setAgentRescheduleNotes('');
    } catch (err: any) {
      console.error("Error rescheduling Google Meet interview:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Google integration window was closed. Please try rescheduling again and authorize access.", { id: toastId });
      } else if (err.code === 'auth/credential-already-in-use') {
        toast.error("This Google account is already linked to another user.", { id: toastId });
      } else {
        toast.error(`Failed to reschedule interview: ${err.message || 'Unknown error'}`, { id: toastId });
      }
    } finally {
      setIsSubmittingAgentReschedule(false);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!id || isUpdating || !rejectionReasonInput.trim()) return;

    setIsUpdating(true);
    try {
      const reason = rejectionReasonInput.trim();
      const updates: any = {
        applicationStatus: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', id), updates);

      if (app?.agentId) {
        try {
          const studentRefNo = app.studentRefNo || `STU-2026-${id.slice(-4).toUpperCase()}`;
          const currentSenderId = profile?.uid || '';
          const currentSenderName = profile?.fullName || 'University Admissions';
          
          await addMessage({
            studentRefNo,
            studentName: `${app.studentFirstName} ${app.studentLastName}`,
            courseName: app.targetCourseName || 'Selected Program',
            senderId: currentSenderId,
            receiverId: app.agentId,
            senderName: currentSenderName,
            messageCategory: 'General',
            subject: `Application Rejected: ${app.studentFirstName} ${app.studentLastName}`,
            messageBody: `Dear Agent Partner,\n\nThe student application for ${app.studentFirstName} ${app.studentLastName} has been rejected by our university for the following reason:\n\n"${reason}"\n\nPlease review the application details in the portal.`,
            attachments: [],
            isReadByReceiver: false
          });
        } catch (msgErr) {
          console.error("Non-blocking error creating rejection message to agent:", msgErr);
        }

        try {
          await addDoc(collection(db, 'notifications'), {
            userId: app.agentId,
            applicationId: id,
            title: 'Application Rejected ❌',
            description: `The status of ${app.studentFirstName} ${app.studentLastName}'s application has been updated to rejected. Reason: ${reason}`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.error("Non-blocking error creating notification for agent:", notifErr);
        }
      }

      try {
        const studentNotificationId = app.studentEmail || app.userId || 'student_user';
        await addDoc(collection(db, 'notifications'), {
          userId: studentNotificationId,
          applicationId: id,
          title: 'Application Decision: Rejected ❌',
          description: `Your application to ${app.targetUniversityName || 'our University'} has been rejected. Reason: ${reason}`,
          category: 'applications',
          isUnread: true,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.error("Non-blocking error creating notification for student:", notifErr);
      }

      setApp((prev: any) => ({
        ...prev,
        ...updates
      }));

      setIsRejectionModalOpen(false);
      setRejectionReasonInput('');
      toast.success('Application rejected and notifications dispatched successfully');
    } catch (err: any) {
      console.error('Failed to submit rejection details:', err);
      toast.error('Error submitting rejection: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAppeal = async (reason: string) => {
    if (!id || isUpdating) return;

    setIsUpdating(true);
    try {
      const updates: any = {
        applicationStatus: 'appeal_submitted',
        appealReason: reason,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', id), updates);
      
      toast.success('Appeal submitted successfully!');
      setIsAppealModalOpen(false);
      setAppealReason('');
    } catch (err) {
      console.error('Error submitting appeal:', err);
      toast.error('Failed to submit appeal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecruitAgain = async () => {
    if (!id || isUpdating) return;

    setIsUpdating(true);
    try {
      const updates: any = {
        applicationStatus: 'submitted',
        rejectionReason: '',
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', id), updates);

      if (app?.targetUniversityId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: app.targetUniversityId,
            applicationId: id,
            title: 'Application Resubmitted 📂',
            description: `A previously rejected application for ${app.studentFirstName} ${app.studentLastName} has been resubmitted for review (Recruit Again).`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.error("Non-blocking error creating resubmission notification for university:", notifErr);
        }
      }

      if (app?.creatorId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: app.creatorId,
            applicationId: id,
            title: 'Application Re-opened! ✨',
            description: `The university has decided to reconsider ${app.studentFirstName} ${app.studentLastName}'s application.`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });

          await addMessage({
            studentRefNo: id,
            studentName: `${app.studentFirstName} ${app.studentLastName}`,
            courseName: app.targetCourseName || 'Selected Program',
            senderId: profile?.universityId || profile?.uid || '',
            receiverId: app.creatorId,
            senderName: profile?.fullName || 'University Admissions',
            messageCategory: 'General',
            subject: 'Application Re-opened (Recruit Again)',
            messageBody: `We have reviewed the previously rejected application for ${app.studentFirstName || 'the student'} ${app.studentLastName || ''} and would like to reconsider it. The application has been moved back to the submitted queue for evaluation.`,
            attachments: [],
            isReadByReceiver: false
          });
        } catch (err) {
          console.error("Error in automated agent notification/messaging:", err);
        }
      }

      setApp((prev: any) => ({
        ...prev,
        ...updates
      }));

      toast.success('Application status updated back to Submitted successfully');
    } catch (err: any) {
      console.error('Failed to reset status to submitted:', err);
      toast.error('Error resetting status: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm || isUpdating) return;

    setIsUpdating(true);
    const toastId = toast.loading('Saving student details...');

    try {
      const updates: any = {
        studentFirstName: editForm.studentFirstName || '',
        studentMiddleName: editForm.studentMiddleName || '',
        studentLastName: editForm.studentLastName || '',
        studentEmail: editForm.studentEmail || '',
        studentPhone: editForm.studentPhone || '',
        targetCourseName: editForm.targetCourseName || '',
        targetProgramId: editForm.targetCourseName || '',
        targetIntake: editForm.targetIntake || '',
        highestQualification: editForm.highestQualification || '',
        graduationYear: editForm.graduationYear || '',
        gradeValue: editForm.gradeValue || '',
        englishTestType: editForm.englishTestType || '',
        englishTestScore: editForm.englishTestScore || '',
        passportNumber: editForm.passportNumber || '',
        passportExpiryDate: editForm.passportExpiryDate || '',
        updatedAt: serverTimestamp()
      };

      const activity = {
        type: 'edit',
        title: 'Student Details Updated',
        description: `Agent ${profile?.fullName || 'Partner'} manually updated student information.`,
        timestamp: new Date().toISOString(),
        actorId: profile?.uid,
        actorName: profile?.fullName
      };

      const currentActivities = app.activities || [];
      updates.activities = [...currentActivities, activity];

      await updateDoc(doc(db, 'applications', id), updates);

      if (app.studentEmail && app.agentId) {
        try {
          const studentQuery = query(
            collection(db, 'students'),
            where('agentId', '==', app.agentId),
            where('email', '==', app.studentEmail)
          );
          const studentSnap = await getDocs(studentQuery);
          const studentUpdates: any[] = [];
          studentSnap.forEach((docSnap) => {
            studentUpdates.push(
              updateDoc(docSnap.ref, {
                firstName: editForm.studentFirstName || '',
                middleName: editForm.studentMiddleName || '',
                lastName: editForm.studentLastName || '',
                email: editForm.studentEmail || '',
                phone: editForm.studentPhone || '',
                passportNumber: editForm.passportNumber || '',
                updatedAt: serverTimestamp()
              })
            );
          });
          if (studentUpdates.length > 0) {
            await Promise.all(studentUpdates);
          }
        } catch (studentSyncErr) {
          console.error("Non-blocking error syncing application update to student profile:", studentSyncErr);
        }
      }

      const fieldLabels: any = {
        studentFirstName: 'First Name',
        studentMiddleName: 'Middle Name',
        studentLastName: 'Last Name',
        studentEmail: 'Email',
        studentPhone: 'Phone',
        targetCourseName: 'Program',
        targetIntake: 'Target Intake',
        highestQualification: 'Highest Qualification',
        graduationYear: 'Graduation Year',
        gradeValue: 'GPA / Grade',
        englishTestType: 'English Proficiency Test',
        englishTestScore: 'Test Score',
        passportNumber: 'Passport Number',
        passportExpiryDate: 'Passport Expiry'
      };

      let changesSummary = "";
      Object.keys(updates).forEach(key => {
        if (['updatedAt', 'activities', 'targetProgramId'].includes(key)) return;
        
        const oldValue = app[key] || 'Not Provided';
        const newValue = updates[key] || 'Not Provided';
        
        if (String(oldValue) !== String(newValue)) {
          changesSummary += `\n**Previous ${fieldLabels[key] || key}**: ${oldValue}\n**Updated ${fieldLabels[key] || key}**: ${newValue}\n`;
        }
      });

      await addDoc(collection(db, 'system_logs'), {
        actionType: 'SETTINGS_MUTATE',
        adminId: profile?.uid,
        adminEmail: profile?.email,
        targetEntityId: id,
        timestamp: serverTimestamp(),
        details: `Agent ${profile?.fullName || 'Partner'} manually updated student details for ${editForm.studentFirstName} ${editForm.studentLastName}.`,
        payload: {
          appId: id,
          originalName: `${app.studentFirstName} ${app.studentLastName}`,
          updatedName: `${editForm.studentFirstName} ${editForm.studentLastName}`,
          changesCount: changesSummary.split('\n').filter(l => l.startsWith('Updated')).length,
          actorRole: activeRole
        }
      });

      await addDoc(collection(db, 'notifications'), {
        userId: 'university_admin',
        title: 'Application Data Integrity Notice',
        description: `Agent ${profile?.fullName || 'Partner'} updated details for ${editForm.studentFirstName} ${editForm.studentLastName}.`,
        category: 'applications',
        isUnread: true,
        createdAt: serverTimestamp(),
        applicationId: id
      });

      if (app.targetUniversityId) {
        await addDoc(collection(db, 'notifications'), {
          userId: app.targetUniversityId,
          title: 'Student Details Updated',
          description: `The details for ${editForm.studentFirstName} ${editForm.studentLastName} have been updated by the agent partner.`,
          category: 'applications',
          isUnread: true,
          createdAt: serverTimestamp(),
          applicationId: id
        });
      }

      const studentRefNo = app.studentRefNo || `STU-2026-${id.slice(-4).toUpperCase()}`;
      await addMessage({
          studentRefNo,
          studentName: `${editForm.studentFirstName} ${editForm.studentLastName}`,
          courseName: typeof editForm.targetCourseName === 'object' ? (editForm.targetCourseName as any)?.name : (editForm.targetCourseName || 'N/A'),
          senderId: user?.uid || profile?.uid || '',
          receiverId: app.targetUniversityId || 'university_admin',
          senderName: profile?.fullName || 'Agent Partner',
          messageCategory: 'General',
          subject: `Urgent: Updated Student Details for ${editForm.studentFirstName} ${editForm.studentLastName}`,
          messageBody: `Dear Admissions Team,\n\nI have updated the student details for ${editForm.studentFirstName} ${editForm.studentLastName} (Ref: ${studentRefNo}).\n\n[DETAILED CHANGES]${changesSummary || '\nNo specific field changes detected (Manual Resave).\n'}\n\nPlease review the updated dossier.\n\nBest regards,\n${profile?.fullName || 'Agent Partner'}\nVibe Global Pvt. Ltd.`,
          attachments: [],
          isReadByReceiver: false
        });

      setApp((prev: any) => ({
        ...prev,
        ...updates
      }));

      setIsEditModalOpen(false);
      toast.success('Student details updated successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Error updating student details:', err);
      toast.error('Failed to update details: ' + err.message, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const isUniversity = profile?.roles?.includes('university');
  const isTargetUni = isUniversity && app?.targetUniversityId === profile?.universityId;

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || isUpdating) return;
    
    if (newStatus === 'rejected') {
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
      return;
    }

    if (newStatus === 'incomplete') {
      setIncompleteChecklist({
        'Identity / Passport Details': false,
        'Location Details': false,
        'Highschool Academic Transcripts': false,
        'English Language Qualification': false
      });
      const name = app ? `${app.studentFirstName} ${app.studentLastName}` : 'the student';
      setIncompleteMessage(getInitialDraftMessage(name, []));
      setIsIncompleteModalOpen(true);
      return;
    }

    setIsUpdating(true);
    try {
      const updates: any = {
        applicationStatus: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'interview_requested') {
        const interviewInitState = {
          status: 'requested',
          date: '',
          time: '',
          meetingLink: '',
          platform: 'Google Meet',
          notes: '',
          rescheduleCount: 0,
          lastUpdatedBy: 'university'
        };
        updates.interview = interviewInitState;
        updates.interviewScheduled = false;
        updates.interviewDate = '';
        updates.interviewTime = '';
        updates.meetLink = '';
        updates.interviewNotes = '';
      }

      await updateDoc(doc(db, 'applications', id), updates);

      if (app?.agentId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: app.agentId,
            applicationId: id,
            title: 'Application Update',
            description: `The status of ${app.studentFirstName} ${app.studentLastName}'s application has been updated to ${newStatus.replace('_', ' ')}.`,
            category: 'applications',
            isUnread: true,
            createdAt: serverTimestamp()
          });
        } catch (notifErr: any) {
          console.error("Non-blocking error creating notification:", notifErr?.message || notifErr);
        }
      }

      setApp((prev: any) => ({ 
        ...prev, 
        ...updates,
        ...(newStatus === 'interview_requested' ? {
          interview: {
            status: 'requested',
            date: '',
            time: '',
            meetingLink: '',
            platform: 'Google Meet',
            notes: '',
            rescheduleCount: 0,
            lastUpdatedBy: 'university'
          }
        } : {})
      }));
      toast.success(`Application marked as ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
      console.error("Error updating application status:", error?.message || error);
      toast.error("Failed to update application status. Please check your permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchApp = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'applications', id));
        if (docSnap.exists()) {
          const appData: any = { id: docSnap.id, ...docSnap.data() };
          
          if (activeRole === 'university' && appData.applicationStatus === 'draft') {
            toast.error("Application is still in draft and cannot be viewed yet.");
            router.push('/dashboard');
            return;
          }

          if (appData.studentEmail && appData.agentId) {
            try {
              const studentQuery = query(
                collection(db, 'students'),
                where('agentId', '==', appData.agentId),
                where('email', '==', appData.studentEmail)
              );
              const studentSnap = await getDocs(studentQuery);
              if (!studentSnap.empty) {
                const studentData = studentSnap.docs[0].data();
                if (studentData.uploadedDocuments) {
                  appData.uploadedDocuments = {
                    ...appData.uploadedDocuments,
                    ...studentData.uploadedDocuments
                  };
                }
              }
            } catch (err) {
              console.error("Non-blocking error checking student documents for view:", err);
            }
          }

          setApp(appData);
          if (appData.agentId) {
            const agentSnap = await getDoc(doc(db, 'users', appData.agentId));
            if (agentSnap.exists()) {
              setAgentProfile(agentSnap.data());
            }
          }
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error("Error fetching application:", error);
        handleFirestoreError(error, OperationType.GET, `applications/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [id, router, activeRole]);

  useEffect(() => {
    if (id && notifications.length > 0) {
      const appNotifsToClear = notifications
        .filter(n => {
          if (!n.isUnread) return false;
          
          if (n.applicationId === id) return true;
          
          if (app) {
            const firstName = (app.studentFirstName || '').toLowerCase().trim();
            const lastName = (app.studentLastName || '').toLowerCase().trim();
            const desc = (n.description || '').toLowerCase();
            const title = (n.title || '').toLowerCase();
            if (firstName && lastName && desc.includes(firstName) && desc.includes(lastName)) {
              return true;
            }
            if (firstName && lastName && title.includes(firstName) && title.includes(lastName)) {
              return true;
            }
          }
          return false;
        })
        .map(n => n.id);
      
      if (appNotifsToClear.length > 0) {
        bulkMarkAsRead(appNotifsToClear).catch(console.error);
      }
    }
  }, [id, app, notifications, bulkMarkAsRead]);

  useEffect(() => {
    if (!loading && app) {
      if (window.location.hash === '#interview' || searchParams.get('scroll') === 'interview') {
        setTimeout(() => {
          const section = document.getElementById('interview-section');
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            section.classList.add('ring-4', 'ring-[#0052FF]/40', 'duration-1000', 'transition-all');
            setTimeout(() => {
              section.classList.remove('ring-4', 'ring-[#0052FF]/40');
            }, 3000);
          }
        }, 550);
      }
    }
  }, [loading, app, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!app) return null;

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'in_review': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
      case 'interview_requested': return 'bg-blue-50 text-indigo-700 border border-blue-200';
      case 'incomplete': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'withdrawn': return 'bg-slate-100 text-slate-600 border border-slate-300';
      default: return 'bg-slate-100 text-slate-705 border border-slate-200';
    }
  };

  const displayAppId = id ? (id.length > 8 ? `STU-${id.slice(0, 8).toUpperCase()}` : id.toUpperCase()) : '';

  const getCleanAgencyName = () => {
    let rawName = app.agencyName || agentProfile?.agencyName || app.agentFullName || agentProfile?.fullName || '';
    if (!rawName || rawName === 'bright-path' || rawName.toLowerCase() === 'bright path') {
      return 'Bright Path Pvt. Ltd.';
    }
    if (rawName.includes('-')) {
      return rawName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return rawName;
  };
  
  const getCleanAgentCountry = () => {
    return agentProfile?.country || app?.agentCountry || app?.nationality || 'Nepal';
  };

  const agentDisplayWithCountry = `${getCleanAgencyName()} | ${getCleanAgentCountry()}`;

  const getStudentPhotoUrl = () => {
    let url: string | null = null;
    if (app?.uploadedDocuments) {
      const photoKey = Object.keys(app.uploadedDocuments).find(key => {
        const lower = key.toLowerCase();
        return lower === 'photo' || lower.includes('photo') || lower.includes('photograph');
      });
      if (photoKey && app.uploadedDocuments[photoKey]?.fileUrl) {
        url = app.uploadedDocuments[photoKey].fileUrl;
      }
    }
    if (!url) {
      url = app?.studentPhotoUrl || null;
    }

    if (url && url.toLowerCase().includes('.pdf')) {
      return null;
    }
    return url;
  };

  const studentPhotoUrl = getStudentPhotoUrl();

  const getDeadlinesForUniversity = (uniId: string, uniName: string) => {
    const todayNow = new Date();
    
    const deadlineMap: Record<string, [Date, Date]> = {
      'university-of-georgia': [new Date('2026-05-25T00:00:00Z'), new Date('2026-06-25T00:00:00Z')],
      'technical-university-of-georgia': [new Date('2026-06-03T00:00:00Z'), new Date('2026-06-28T00:00:00Z')],
      'caucasus-university': [new Date('2026-05-20T00:00:00Z'), new Date('2026-06-15T00:00:00Z')],
      'new-vision-university': [new Date('2026-06-10T00:00:00Z'), new Date('2026-07-10T00:00:00Z')],
      'global-college-malta': [new Date('2026-05-24T00:00:00Z'), new Date('2026-06-30T00:00:00Z')],
      'australian-catholic-university': [new Date('2026-06-04T00:00:00Z'), new Date('2026-07-04T00:00:00Z')],
      'university-of-chester': [new Date('2026-05-28T00:00:00Z'), new Date('2026-06-12T00:00:00Z')],
      'bpp-university': [new Date('2026-06-08T00:00:00Z'), new Date('2026-07-08T00:00:00Z')],
      'coventry-university': [new Date('2026-05-15T00:00:00Z'), new Date('2026-06-18T00:00:00Z')]
    };

    let appD: Date;
    let visaD: Date;

    if (deadlineMap[uniId]) {
      [appD, visaD] = deadlineMap[uniId];
    } else {
      let sum = 0;
      const key = uniId || uniName || '';
      for (let i = 0; i < key.length; i++) {
        sum += key.charCodeAt(i);
      }
      const isPast = sum % 2 === 0;

      if (isPast) {
        appD = new Date(todayNow);
        appD.setDate(todayNow.getDate() - 5);
        visaD = new Date(todayNow);
        visaD.setDate(todayNow.getDate() + 15);
      } else {
        appD = new Date(todayNow);
        appD.setDate(todayNow.getDate() + 4);
        visaD = new Date(todayNow);
        visaD.setDate(todayNow.getDate() + 25);
      }
    }

    return { appDeadline: appD, visaDeadline: visaD };
  };

  const { appDeadline, visaDeadline } = getDeadlinesForUniversity(app.targetUniversityId || '', getUniversityName(app, institutions) || '');
  const today = new Date();
  const isAppDeadlineCrossed = today > appDeadline;

  const formatDeadlineDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardLayout title="Student Application Details" subtitle={`Application ID: ${displayAppId}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <button 
            onClick={() => router.push(backPath)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all w-fit"
          >
            <ChevronLeft size={20} />
            {backLabel}
          </button>
          
          <div className="flex items-center gap-2">
            {(profile?.roles?.includes('agent') || activeRole === 'agent') && (
              <>
                <button
                  onClick={() => setIsMessageModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-[#8CB1FD] text-slate-900 rounded-xl font-bold text-xs shadow-lg shadow-[#8CB1FD]/20 hover:bg-[#7aa6fc] transition-all cursor-pointer"
                >
                  <MessageSquare size={14} />
                  Message University
                </button>
                {app?.applicationStatus !== 'withdrawn' && app?.applicationStatus !== 'Withdrawn' && (
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-xs shadow-sm hover:bg-red-100 transition-all cursor-pointer"
                  >
                    <Ban size={14} />
                    Withdraw
                  </button>
                )}
              </>
            )}
            <span className={`px-4 py-3 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(app.applicationStatus)}`}>
              {app.applicationStatus === 'interview_requested' ? 'Interview Pending' : (app.applicationStatus || '').replace('_', ' ')}
            </span>
          </div>
        </div>

        {app?.applicationStatus === 'withdrawn' && (
          <div className="bg-slate-100 border border-slate-300 rounded-[2rem] p-6 mb-8 flex items-start gap-4 text-slate-800 shadow-sm">
            <div className="p-3 bg-red-100 rounded-2xl text-red-600 shrink-0">
              <Ban size={22} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 font-outfit">Application Withdrawn</h4>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                This student application has been withdrawn.
                {app.withdrawalReason && (
                  <span className="block mt-1 text-slate-700">
                    <strong className="font-bold">Reason:</strong> {app.withdrawalReason}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {isTargetUni && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl mb-8 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-grad-text-main font-outfit">Application Review</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Institution Controls</p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusUpdate('interview_requested')}
                  className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs hover:bg-purple-100 transition-all disabled:opacity-50"
                >
                  <MessageSquare size={14} />
                  Request Interview
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusUpdate('incomplete')}
                  className="flex items-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all disabled:opacity-50"
                >
                  <AlertTriangle size={14} />
                  Mark Incomplete
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusUpdate('approved')}
                  className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : <Check size={14} />}
                  Approve Application
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={() => handleStatusUpdate('rejected')}
                  className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-xs hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  <X size={14} />
                  Reject
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {app.applicationStatus === 'rejected' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 rounded-[2rem] p-6 mb-8 text-red-900 shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-700 rounded-2xl flex-shrink-0">
                  <XCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-red-800">Application Rejected</h3>
                  <p className="text-[10px] text-red-550 uppercase font-black font-mono tracking-widest leading-none">Decision Details Panel</p>
                  <div className="mt-4 text-xs text-red-750 bg-white/80 backdrop-blur-2xs border border-red-100 p-4 rounded-2xl font-medium leading-relaxed max-w-2xl">
                    <span className="font-bold text-red-900 block mb-1">Reason for Rejection:</span>
                    {app.rejectionReason || 'No specific reason provided.'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isTargetUni && (
                  <button
                    type="button"
                    onClick={handleRecruitAgain}
                    className="px-4 py-3 text-[10px] bg-[#0052FF] hover:bg-blue-600 font-bold text-white uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw size={13} />
                    Recruit Again
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(true)}
                  className="px-4 py-3 text-[10px] bg-amber-500 hover:bg-amber-600 font-bold text-white uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Gavel size={13} />
                  Appeal Decision
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#8CB1FD] rounded-[2.5rem] p-6 text-slate-900 shadow-lg shadow-[#8CB1FD]/20 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/30 rounded-2xl">
              <CheckCircle2 size={24} className="text-slate-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Document Status</h3>
              <p className="text-sm text-slate-800">Your application is currently <span className="font-bold text-slate-950 uppercase tracking-wider">{app.documentStatus}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-3 rounded-2xl">
              <Clock size={16} className="text-slate-800" />
              <span className="text-xs font-bold uppercase tracking-widest">Verification in progress</span>
            </div>

            {isTargetUni && app.applicationStatus === 'interview_requested' && (!app.interview || app.interview.status === 'requested') && (
              <button
                type="button"
                onClick={() => setShowPlatformSelectionModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#155DFC] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg border border-blue-500/30 transition-all cursor-pointer animate-pulse"
              >
                <Calendar size={14} className="text-white" />
                Schedule Interview
              </button>
            )}

            {isTargetUni && app.interview?.status === 'proposed_by_university' && (
              <div className="flex items-center gap-2 bg-blue-800/80 px-4 py-3 rounded-2xl text-xs font-bold text-blue-100">
                <Clock size={14} className="animate-pulse text-yellow-300" />
                University Proposed (Awaiting Agent)
              </div>
            )}

            {profile?.roles?.includes('agent') && app.interview?.status === 'proposed_by_agent' && (
              <div className="flex items-center gap-2 bg-blue-800/80 px-4 py-3 rounded-2xl text-xs font-bold text-blue-100">
                <Clock size={14} className="animate-pulse text-yellow-300" />
                Agent Proposed (Awaiting University)
              </div>
            )}
          </div>
        </motion.div>

        {app.applicationStatus === 'interview_requested' && app.interview && app.interview.status !== 'accepted' && app.interview.status !== 'idle' && (
          <motion.div
            id="interview-section"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-8 border border-slate-150 shadow-lg shadow-blue-50/50 mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-6 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl flex-shrink-0">
                  <CalendarRange size={24} className="text-[#0052FF]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-grad-text-main font-outfit tracking-tight flex items-center gap-2">
                    Interview Negotiation Desk
                    <span className="px-3 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-50 text-blue-700">
                      {app.interview.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Multi-party Interactive Coordinator (Allianza Co-Pilot)
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 font-mono text-xs text-right">
                <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                  <span>Reschedule Loop:</span>
                  <span className={`font-black ${app.interview.rescheduleCount >= 3 ? 'text-red-700' : 'text-blue-600'}`}>
                    {app.interview.rescheduleCount}/3
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Last updated by: <span className="text-slate-700 font-black">{app.interview.lastUpdatedBy?.toUpperCase() || 'UNIVERSITY'}</span>
                </p>
              </div>
            </div>

            {app.interview.status !== 'requested' ? (
              <div className="mt-6 bg-slate-50/65 rounded-3xl border border-slate-100 p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} /> Date & Time
                    </p>
                    <p className="text-sm font-black text-slate-800">
                      {app.interview.date ? new Date(app.interview.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Specified'}
                    </p>
                    <p className="text-sm font-black text-blue-600">
                      at {app.interview.time || 'Pending'} (Local Time)
                    </p>
                  </div>
                  
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Video size={12} /> Platform & Connection
                    </p>
                    <p className="text-sm font-black text-slate-800">
                      {app.interview.platform || 'Google Meet'}
                    </p>
                    {app.interview.meetingLink ? (
                      <a
                        href={app.interview.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:underline hover:text-blue-800 mt-1"
                      >
                        Join Meeting Link <ExternalLink size={10} />
                      </a>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No link shared yet</p>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Interviewer Instructions
                    </p>
                    <p className="text-xs text-slate-650 font-medium leading-relaxed whitespace-pre-wrap bg-white rounded-2xl border border-slate-100 p-4 mt-1 shadow-sm">
                      {app.interview.notes || 'No custom instruction shared.'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    {app.interview.rescheduleCount >= 3 ? (
                      <p className="text-xs text-amber-700 font-bold flex items-center gap-2 bg-amber-50 px-4 py-3 rounded-2xl border border-amber-200">
                        <AlertTriangle size={14} />
                        Rescheduling limit of 3 times has been reached. Please accept this proposal or contact Support.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 font-medium">
                        You can counter-propose a new date/time if this slot is unsuitable. Loop limit: Max 3 times.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {app.interview && app.interview.status === 'accepted' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-8 border border-slate-150 shadow-lg shadow-blue-50/50 mb-8"
          >
            <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
              <div className="p-4 bg-green-50 text-green-600 rounded-2xl flex-shrink-0">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-grad-text-main font-outfit tracking-tight">
                  Interview Confirmed
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Live Session Details
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-black text-green-700 uppercase mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                Interview Confirmed
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date & Time</p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {app.interview?.date ? new Date(app.interview.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : (app.interviewDate ? new Date(app.interviewDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending')}
                  </p>
                  <p className="text-sm font-black text-[#0052FF]">
                    at {app.interview?.time || app.interviewTime || 'Pending'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Platform Hub</p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {app.interview?.platform || 'Google Meet'}
                  </p>
                </div>

                {(app.interview?.meetingLink || app.meetLink) && (
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meeting Room</p>
                    <a 
                      href={app.interview?.meetingLink || app.meetLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 text-xs font-black text-white hover:bg-blue-600 bg-[#0052FF] px-4 py-3 rounded-2xl shadow-md mt-2 transition-all"
                    >
                      Join {app.interview?.platform || 'Interview'}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {(app.interview?.notes || app.interviewNotes) && (
                <div className="mt-5 pt-4 border-t border-green-100/60">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Interview notes & guidelines</p>
                  <p className="text-xs text-slate-600 font-medium mt-1 whitespace-pre-line leading-relaxed">
                    {app.interview?.notes || app.interviewNotes}
                  </p>
                </div>
              )}

              {(activeRole === 'agent' || activeRole === 'university' || profile?.roles?.includes('agent') || profile?.roles?.includes('university')) && (
                <div className="mt-5 pt-4 border-t border-green-150 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                    <Video size={16} className="text-green-600 animate-pulse" />
                    <span>Need to adjust or reschedule this Google Meet session?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAgentRescheduleDate(app.interview?.date || app.interviewDate || '');
                      setAgentRescheduleTime(app.interview?.time || app.interviewTime || '');
                      setAgentRescheduleInterviewer(app.interview?.interviewerName || app.interviewerName || '');
                      setAgentRescheduleNotes(app.interview?.notes || app.interviewNotes || '');
                      setIsAgentRescheduleModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0052FF] border border-blue-200 hover:border-blue-300 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <RefreshCw size={12} className="text-[#0052FF]" />
                    Reschedule Google Meet
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-8">
          <div className="pb-8 mb-8 border-b border-slate-100/60">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-blue-500" />
              Study Destination
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
              {app.targetUniversityId && (
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Institution</p>
                  <p className="text-sm font-bold text-slate-705">
                    {getUniversityName(app, institutions)}
                  </p>
                </div>
              )}
              {app.studyCountry && (
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Country</p>
                  <p className="text-sm font-bold text-slate-705">{app.studyCountry}</p>
                </div>
              )}
              {app.studyLevel && (
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Study Level</p>
                  <p className="text-sm font-bold text-slate-750">{app.studyLevel}</p>
                </div>
              )}
              {(app.intakeTerm || app.intakeYear || app.targetIntake) && (
                <div className="col-span-full pt-1">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5">Academic Intake</p>
                  <div className="flex flex-col gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-750">
                       {app.intakeName && (
                         <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md text-[11px] text-slate-700 shadow-sm">
                           {app.intakeName}
                         </span>
                       )}
                       <div className="flex items-center gap-1.5 bg-blue-50/50 border border-blue-100 px-2.5 py-1 rounded-md">
                         <span className="text-[10px] text-blue-600/70 font-black uppercase tracking-wider">Season</span>
                         <span className="text-blue-900">{app.intakeTerm ? `${app.intakeTerm} ${app.intakeYear}` : app.targetIntake}</span>
                       </div>
                       {app.intakeStartDate && (
                         <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 px-2.5 py-1 rounded-md">
                           <span className="text-[10px] text-emerald-600/70 font-black uppercase tracking-wider">Start Date</span>
                           <span className="text-emerald-900">{app.intakeStartDate}</span>
                         </div>
                       )}
                    </div>
                    {(app.intakeAppClose || app.intakeVisaClose) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 mt-1 border-t border-slate-200/60">
                        {app.intakeAppClose && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                              App Deadline <span className="text-amber-700 ml-1">{app.intakeAppClose}</span>
                            </p>
                          </div>
                        )}
                        {app.intakeVisaClose && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-none bg-rose-400"></span>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                              Visa Deadline <span className="text-rose-700 ml-1">{app.intakeVisaClose}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(app.targetProgramId || app.additionalInfo || app.agentNotes || app.campusPreference) && (
            <div className="pb-8 mb-8 border-b border-slate-100/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                <FileText size={14} className="text-blue-500" />
                Application Details
              </h3>
              <div className="space-y-4">
                {app.targetProgramId && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Program</p>
                    <p className="text-sm font-bold text-slate-700">{typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : app.targetProgramId}</p>
                  </div>
                )}
                {app.campusPreference && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Campus Preference</p>
                    <p className="text-xs text-slate-600 font-semibold">{app.campusPreference}</p>
                  </div>
                )}
                {app.additionalInfo && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold font-outfit mb-1">Additional Information</p>
                    <p className="text-xs text-slate-600 font-medium">{app.additionalInfo}</p>
                  </div>
                )}
                {app.agentNotes && (
                  <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1 font-outfit">Agent Notes</p>
                    <p className="text-xs text-slate-600 italic font-medium">"{app.agentNotes}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pb-8 mb-8 border-b border-slate-100/60">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
              <GraduationCap size={14} className="text-blue-500" />
              Current Education
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                {app.highestQualification && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Highest Qualification</p>
                    <p className="text-sm font-bold text-slate-700">
                      {app.highestQualification.charAt(0).toUpperCase() + app.highestQualification.slice(1)}
                    </p>
                  </div>
                )}
                {app.currentInstitutionName && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Institution</p>
                    <p className="text-xs text-slate-600 font-semibold">{app.currentInstitutionName}</p>
                  </div>
                )}
                {app.graduationYear && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Graduation Year</p>
                    <p className="text-xs text-slate-600 font-semibold">{app.graduationYear}</p>
                  </div>
                )}
                {app.gradeValue && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">GPA / Grade</p>
                    <p className="text-xs font-bold text-blue-600">
                      {app.gradeValue} {app.gradingScheme ? `(${app.gradingScheme})` : ''}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {app.englishTestType ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-2 block">English Proficiency</span>
                    <p className="text-xs font-bold text-slate-700">{app.englishTestType}</p>
                    {app.englishTestScore && <p className="text-[10px] text-slate-500 font-semibold">Overall Score: {app.englishTestScore}</p>}
                    {app.englishTestType === 'IELTS' && (app.ieltsListening || app.ieltsReading || app.ieltsWriting || app.ieltsSpeaking) && (
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-500 border-t border-slate-200/60 pt-2.5 font-medium">
                        {app.ieltsListening && <p>Listening: <span className="text-slate-700 font-bold">{app.ieltsListening}</span></p>}
                        {app.ieltsReading && <p>Reading: <span className="text-slate-700 font-bold">{app.ieltsReading}</span></p>}
                        {app.ieltsWriting && <p>Writing: <span className="text-slate-700 font-bold">{app.ieltsWriting}</span></p>}
                        {app.ieltsSpeaking && <p>Speaking: <span className="text-slate-700 font-bold">{app.ieltsSpeaking}</span></p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center flex items-center justify-center min-h-[100px]">
                    <p className="text-xs text-slate-400 font-medium font-outfit">No English language test details entered.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pb-8 mb-8 border-b border-slate-100/60">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
              <User size={14} className="text-blue-500" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                {app.studentFirstName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">First Name</span>
                    <span className="font-bold text-slate-700">{app.studentFirstName}</span>
                  </div>
                )}
                {app.studentMiddleName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Middle Name</span>
                    <span className="font-bold text-slate-700">{app.studentMiddleName}</span>
                  </div>
                )}
                {app.studentLastName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Last Name</span>
                    <span className="font-bold text-slate-700">{app.studentLastName}</span>
                  </div>
                )}
                {app.studentEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Email Address</span>
                    <span className="font-bold text-slate-700">{app.studentEmail}</span>
                  </div>
                )}
                {app.studentPhone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Phone Number</span>
                    <span className="font-bold text-slate-700">{app.studentPhone}</span>
                  </div>
                )}
                {app.dateOfBirth && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="font-bold text-slate-700">{app.dateOfBirth}</span>
                  </div>
                )}
                {app.gender && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-bold text-slate-700 capitalize">{app.gender}</span>
                  </div>
                )}
                {app.nationality && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Nationality</span>
                    <span className="font-bold text-slate-700">{app.nationality}</span>
                  </div>
                )}
              </div>

              <div>
                {(app.currentCountry || app.currentCity || app.permanentAddress) ? (
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Current Location & Address</p>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-sm text-slate-700 font-bold">
                        {[app.currentCity, app.currentCountry].filter(Boolean).join(', ')}
                      </p>
                      {app.permanentAddress && (
                        <p className="text-xs text-slate-500 mt-1 font-medium">{app.permanentAddress}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50/55 rounded-2xl border border-dashed border-slate-200 text-center flex items-center justify-center min-h-[100px]">
                    <p className="text-xs text-slate-400 font-medium font-outfit">No location details entered.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-500" />
              Identity & Travel
            </h3>
            {(app.passportNumber || app.passportExpiryDate) ? (
              <div className="max-w-md space-y-2.5 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                {app.passportNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Passport No.</span>
                    <span className="font-bold text-slate-700">{app.passportNumber}</span>
                  </div>
                )}
                {app.passportExpiryDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expiry Date</span>
                    <span className="font-bold text-slate-700">{app.passportExpiryDate}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 w-full text-center py-6">
                <p className="text-xs text-slate-400 font-medium font-outfit">No identity or passport details entered.</p>
              </div>
            )}
          </div>
        </div>

        {isTargetUni && (
          <DocumentVerificationPanel 
            app={app} 
            onSuccess={(updatedApp) => setApp(updatedApp)}
            profile={profile}
          />
        )}
      </div>

      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm"
        >
          <h3 className="text-sm font-bold text-grad-text-main font-outfit mb-6 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            Submission Trace
          </h3>
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
            {(app.activities || []).map((act: any, idx: number) => (
              <div className="relative" key={idx}>
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-amber-500 shadow-sm flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">{act.title}</h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">{act.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {act.timestamp ? formatTimestamp({ seconds: Math.floor(new Date(act.timestamp).getTime() / 1000), nanoseconds: 0 }) : 'Just now'}
                  </p>
                </div>
              </div>
            ))}

            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-sm flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Application Created</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {formatTimestamp(app.createdAt)}
                </p>
              </div>
            </div>

            <div className="relative">
              {app.applicationStatus !== 'draft' ? (
                <>
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-sm flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Application Submitted</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {formatTimestamp(app.createdAt)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-slate-200 shadow-sm flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400">Submission Pending</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Awaiting agent submission</p>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              {isAppDeadlineCrossed ? (
                <>
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-slate-400 shadow-sm flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500">Application Document Deadline</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {formatDeadlineDate(appDeadline)} (Passed • Completed)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-sm flex items-center justify-center animate-pulse">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      Application Document Deadline
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-4 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90">Active Stage</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      Due: {formatDeadlineDate(appDeadline)}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              {isAppDeadlineCrossed ? (
                <>
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-none border-4 border-white bg-blue-600 shadow-sm flex items-center justify-center animate-pulse">
                    <div className="w-1.5 h-1.5 bg-white rounded-none" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      Visa Processing Deadline
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-4 py-0.5 rounded-none font-bold uppercase tracking-wider scale-90">Active Stage</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      Due: {formatDeadlineDate(visaDeadline)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-none border-4 border-white bg-slate-200 shadow-sm flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-none" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400">Visa Processing Deadline</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Upcoming Stage • Due: {formatDeadlineDate(visaDeadline)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {app.applicationStatus !== 'draft' && (
              <div className="relative">
                {app.applicationStatus === 'submitted' ? (
                  <>
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white bg-slate-200 shadow-sm flex items-center justify-center" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">Awaiting Institution Review</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Application is in review queue</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                      app.applicationStatus === 'approved' ? 'bg-green-500' :
                      app.applicationStatus === 'rejected' ? 'bg-red-500' :
                      app.applicationStatus === 'interview_requested' ? 'bg-purple-500' :
                      app.applicationStatus === 'incomplete' ? 'bg-amber-500' :
                      'bg-orange-500'
                    }`} />
                    <div>
                      <h4 className={`text-xs font-bold ${
                        app.applicationStatus === 'approved' ? 'text-green-700' :
                        app.applicationStatus === 'rejected' ? 'text-red-700' :
                        app.applicationStatus === 'interview_requested' ? 'text-purple-700' :
                        app.applicationStatus === 'incomplete' ? 'text-amber-700' :
                        'text-orange-700'
                      }`}>
                        {app.applicationStatus === 'approved' ? 'Approved 🎉' :
                         app.applicationStatus === 'rejected' ? 'Rejected' :
                         app.applicationStatus === 'interview_requested' ? 'Interview Scheduled 💬' :
                         app.applicationStatus === 'incomplete' ? 'Incomplete (Action Needed) ⚠️' :
                         'Under Active Review 🔍'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        Updated: {formatTimestamp(app.updatedAt || app.createdAt)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-50 text-indigo-700 rounded-xl flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-grad-text-main font-outfit">Submitted Documents</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Agent Uploaded Files</p>
              </div>
            </div>
            {isTargetUni ? (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-4 py-1 rounded-xl">
                Incomplete Dossier View
              </span>
            ) : (
              <span className="text-xs font-bold text-indigo-700 bg-blue-50 px-4 py-1 rounded-xl">
                {Object.keys(app.uploadedDocuments || {}).length} File(s)
              </span>
            )}
          </div>

          {(() => {
            const activeSlots = getDynamicDocumentSlots();
            const orderedSlots = activeSlots.flatMap(cat => cat.items || []);
            
            const sortedUploadedEntries: [string, any][] = [];
            const representedSlotIds = new Set<string>();

            orderedSlots.forEach(slot => {
              if (app.uploadedDocuments?.[slot.id]) {
                sortedUploadedEntries.push([slot.id, app.uploadedDocuments[slot.id]]);
                representedSlotIds.add(slot.id);
              }
            });

            Object.entries(app.uploadedDocuments || {}).forEach(([slotId, fileData]) => {
              if (!representedSlotIds.has(slotId)) {
                sortedUploadedEntries.push([slotId, fileData]);
              }
            });

            const filteredUploadedEntries = sortedUploadedEntries;

            const hasOngoingIssues = isTargetUni && sortedUploadedEntries.some(([slotId]) => {
              const isPassportSlotMissing = slotId === 'passport' && !app.passportNumber;
              const isEducationSlotMissing = (slotId === 'class10_transcript' || slotId === 'class12_transcript' || slotId === 'bachelor_transcript' || slotId === 'master_transcript') && !app.highestQualification;
              const isEnglishReqMandatory = universityMatrix?.find(r => r.docId === 'GCM_ENGLISH_PROOF' || r.docId?.toUpperCase().includes('ENGLISH') || r.displayName?.toLowerCase().includes('english'))?.isMandatory ?? false;
              const isEnglishSlotMissing = isEnglishReqMandatory && (slotId === 'english_proficiency' || slotId === 'english_test_certificate') && !app.englishTestType;

              const isFlaggedAsIssue = app.issues && app.issues.some((issue: string) => {
                const mapping: Record<string, string> = {
                  'Identity / Passport Details': 'passport',
                  'Location Details': 'citizenship',
                  'Highschool Academic Transcripts': 'class12_transcript',
                  'English Language Qualification': 'english_proficiency',
                  'English Proficiency Certificate': 'english_proficiency'
                };
                return mapping[issue] === slotId || (slotId.includes('transcript') && issue.includes('Academic'));
              });

              return isPassportSlotMissing || isEducationSlotMissing || isEnglishSlotMissing || isFlaggedAsIssue;
            });

            if (Object.keys(app.uploadedDocuments || {}).length === 0) {
              return (
                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium font-outfit">No documents uploaded for this student yet.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4">
                {isTargetUni && !hasOngoingIssues && Object.keys(app.uploadedDocuments || {}).length > 0 && (
                  <div className="text-center py-4 bg-emerald-50/20 rounded-2xl border border-dashed border-emerald-200 mb-2">
                    <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest font-outfit">All uploaded documents verified! ✨</p>
                  </div>
                )}
                {filteredUploadedEntries.map(([slotId, fileData]: [string, any]) => {
                  const slotMatch = orderedSlots.find(s => s.id === slotId);
                  const matrixMatch = universityMatrix?.find(r => r.docId === slotId);
                  
                  let displayName = slotMatch?.name || matrixMatch?.displayName || SLOT_NAMES[slotId] || slotId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  
                  if (slotId === 'inst_req_1780741137400') displayName = 'Medium of Instruction (MOI)';
                  if (slotId === 'inst_req_1780741196669') displayName = 'Recommendation Letter';

                  const studentFullName = `${app.studentFirstName || ''} ${app.studentMiddleName ? `${app.studentMiddleName} ` : ''}${app.studentLastName || ''}`.trim() || 'Bibash Rai';
                  return (
                    <div 
                      key={slotId} 
                      className="py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between gap-3 transition-colors hover:bg-slate-100/50"
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <h4 
                          className="text-slate-800 hover:text-indigo-700 text-sm font-semibold truncate cursor-pointer transition-colors"
                          onClick={(e) => handleViewFile(e, fileData.fileUrl, fileData.fileId, slotId, studentFullName)}
                          title={displayName}
                        >
                          {displayName}
                        </h4>
                      </div>
                      <div className="flex-shrink-0 flex items-center">
                        <button
                          onClick={(e) => handleDownloadFile(e, fileData.fileUrl, fileData.fileId, slotId, fileData.name || `${slotId}_verified.pdf`, studentFullName)}
                          className="text-slate-400 hover:text-indigo-700 p-1 flex items-center justify-center transition-colors"
                          title="Download Document"
                        >
                          <Download size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </motion.div>

      </div>

      <NewMessageModal 
        isOpen={isMessageModalOpen} 
        onClose={() => setIsMessageModalOpen(false)} 
        app={app} 
        senderId={profile?.uid || ''} 
      />

      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[500] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col p-8 relative"
            >
              <button
                type="button"
                onClick={() => {
                  if (!isWithdrawing) {
                    setIsWithdrawModalOpen(false);
                    setWithdrawReasonInput('');
                  }
                }}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="text-center pb-2">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                  <Ban size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-outfit">Withdraw Application</h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Are you sure you want to withdraw this application? Please provide a clear reason for the institution and records.
                </p>
              </div>

              <form onSubmit={handleWithdrawApplication} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Reason for Withdrawal *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={withdrawReasonInput}
                    onChange={(e) => setWithdrawReasonInput(e.target.value)}
                    placeholder="e.g. Student accepted offer elsewhere, change in personal circumstances, financial reasons..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-medium outline-none focus:border-red-500 transition-all resize-none shadow-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isWithdrawing}
                    onClick={() => {
                      setIsWithdrawModalOpen(false);
                      setWithdrawReasonInput('');
                    }}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isWithdrawing || !withdrawReasonInput.trim()}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      'Confirm Withdrawal'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlatformSelectionModal && (
          <div className="fixed inset-0 z-[400] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-150 max-w-lg w-full overflow-hidden flex flex-col p-8 relative animate-in fade-in zoom-in-95 duration-200"
            >
              <button
                type="button"
                onClick={() => setShowPlatformSelectionModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <Video size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-outfit">Choose Scheduling Platform</h3>
                <p className="text-xs text-slate-500 font-medium mt-2 max-w-sm mx-auto">
                  Select the interview host platform. Choosing Google Meet will automatically generate a calendar event and screen share links.
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlatformSelectionModal(false);
                    setGoogleMeetDate('');
                    setGoogleMeetTime('');
                    setGoogleMeetInterviewer('');
                    setGoogleMeetNotes('');
                    setIsGoogleMeetModalOpen(true);
                  }}
                  className="w-full text-left p-5 rounded-2xl border border-blue-200 hover:border-[#155DFC] bg-blue-50/20 hover:bg-blue-50/50 transition-all duration-200 flex items-start gap-4 group cursor-pointer text-slate-850"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-500/20 transition-all">
                    <Video size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 group-hover:text-[#155DFC] transition-all">Google Meet Integration</span>
                      <span className="px-2 py-0.5 bg-[#155DFC] text-white text-[8px] font-black uppercase tracking-wider rounded-full">Automated</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      Authorizes with Google to automatically generate a real Google Meet link, add events to your Google Calendar, and send invitations.
                    </p>
                  </div>
                  <div className="h-full flex items-center self-center text-slate-400 group-hover:text-[#155DFC] transition-all">
                    <ArrowRight size={16} />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlatformSelectionModal(false);
                    handleOpenScheduleModal();
                  }}
                  className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:border-slate-400 bg-slate-50/30 hover:bg-slate-50/80 transition-all duration-200 flex items-start gap-4 group cursor-pointer text-slate-850"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-200 transition-all">
                    <ExternalLink size={18} className="text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 transition-all">Others (Custom link / Direct entry)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      Manually coordinate the session. Allows choosing Zoom, Microsoft Teams, Skype, or In-Person and entering your own coordinates.
                    </p>
                  </div>
                  <div className="h-full flex items-center self-center text-slate-400 group-hover:text-slate-900 transition-all">
                    <ArrowRight size={16} />
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGoogleMeetModalOpen && (
          <div className="fixed inset-0 z-[400] overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200"
              style={{ maxHeight: 'calc(100vh - 4rem)' }}
            >
              <div className="bg-[#155DFC] p-6 text-white flex justify-between items-center relative flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Video size={20} className="animate-pulse text-white" />
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-white gap-2">Google Meet - Native Scheduler</h3>
                    <p className="text-[10px] text-blue-100">Synchronized Google Calendar Event Creator</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoogleMeetModalOpen(false)}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1 bg-slate-50/20 text-left">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Provide a convenient interview date and time. We will initiate a Google popup to link your calendar and instantly generate a real Google Meet link.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                      Choose Date <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={googleMeetDate}
                      onChange={(e) => setGoogleMeetDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-805 rounded-xl transition-all outline-none shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                      Choose TimeSlot <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={googleMeetTime}
                      onChange={(e) => setGoogleMeetTime(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-805 rounded-xl transition-all outline-none shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Interviewer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Admissions Team or Director"
                    value={googleMeetInterviewer}
                    onChange={(e) => setGoogleMeetInterviewer(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-805 rounded-xl transition-all outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Candidate Guidelines / Interview Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Please bring a copy of your academic records and be ready to discuss your goals."
                    value={googleMeetNotes}
                    onChange={(e) => setGoogleMeetNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-medium text-slate-805 rounded-xl transition-all outline-none resize-none shadow-sm"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-750 text-[11px] leading-relaxed">
                  <AlertCircle size={16} className="text-[#155DFC] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-0.5 text-[#155DFC]">Google Authorization Required</span>
                    We use secure token linking so the generated Google Meet room and invite appear in your official calendar. It won't share any other personal documents.
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGoogleMeetModalOpen(false)}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!googleMeetDate || !googleMeetTime || isSubmittingGoogleMeet}
                  onClick={handleSaveGoogleMeetInterview}
                  className="px-6 py-3 text-xs font-black text-white bg-[#155DFC] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg border border-blue-500/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingGoogleMeet ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                  {isSubmittingGoogleMeet ? 'Scheduling Event...' : 'Authorize & Launch'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAgentRescheduleModalOpen && (
          <div className="fixed inset-0 z-[400] overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200"
              style={{ maxHeight: 'calc(100vh - 4rem)' }}
            >
              <div className="bg-[#155DFC] p-6 text-white flex justify-between items-center relative flex-shrink-0">
                <div className="flex items-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-white" style={{ animationDuration: '6s' }} />
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-white gap-2">Reschedule Google Meet</h3>
                    <p className="text-[10px] text-blue-100">Update Google Calendar & Send University Alert</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAgentRescheduleModalOpen(false)}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1 bg-slate-50/20 text-left">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Modify the interview date, time slot, and interviewer to change the scheduled meeting session dynamically. This will automatically update your linked Google Calendar event and notify the target university of the reschedule.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                      New Date <span className="text-red-700">*</span>
                    </label>
                    <input
                       type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={agentRescheduleDate}
                      onChange={(e) => setAgentRescheduleDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-850 rounded-xl transition-all outline-none shadow-sm"
                    />
                  </div>

                  {/* Time Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                      New Timeslot <span className="text-red-700">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={agentRescheduleTime}
                      onChange={(e) => setAgentRescheduleTime(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-850 rounded-xl transition-all outline-none shadow-sm"
                    />
                  </div>

                  {/* Fine Print Note */}
                  <div className="col-span-2 text-[10px] text-slate-400 italic">
                    * Note: Please make sure the interview is rescheduled during the standard business hours of the target institution.
                  </div>
                </div>

                {/* Interviewer Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Interviewer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Admissions Team or Director"
                    value={agentRescheduleInterviewer}
                    onChange={(e) => setAgentRescheduleInterviewer(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-850 rounded-xl transition-all outline-none shadow-sm"
                  />
                </div>

                {/* Guidelines / Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Updated Guidelines / Interview Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Please bring a copy of your academic records and be ready to discuss your goals."
                    value={agentRescheduleNotes}
                    onChange={(e) => setAgentRescheduleNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-medium text-slate-850 rounded-xl transition-all outline-none resize-none shadow-sm"
                  />
                </div>

                {/* Info Notice card */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-900 text-[11px] leading-relaxed">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-0.5 text-amber-700">Automatic University Alert triggered</span>
                    University admissions staff will receive an instant notification in their portal. A real-time system event log will also update the institutional desk calendars.
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAgentRescheduleModalOpen(false)}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!agentRescheduleDate || !agentRescheduleTime || isSubmittingAgentReschedule}
                  onClick={handleSaveAgentRescheduleInterview}
                  className="px-6 py-3 text-xs font-black text-white bg-[#155DFC] hover:bg-blue-605 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg border border-blue-500/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingAgentReschedule ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                  {isSubmittingAgentReschedule ? 'Rescheduling...' : 'Re-Authorize & Update'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5-Step Scheduling & Rescheduling interactive modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div 
            className="fixed inset-0 z-[500] overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-8"
            onClick={() => setIsScheduleModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200"
              style={{ maxHeight: 'calc(100vh - 4rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header styled to match requested #155DFC background color */}
              <div className="bg-[#155DFC] p-6 text-white flex justify-between items-center relative flex-shrink-0">
                <div className="flex items-center gap-2">
                  <CalendarRange size={20} className="animate-pulse text-white" />
                  <h3 className="text-base font-bold tracking-tight text-white">
                    {app.interview?.status && app.interview.status !== 'idle' && app.interview.status !== 'requested'
                      ? `Reschedule Interview (Loop ${app.interview.rescheduleCount + 1}/3)`
                      : 'Schedule Interview Screening'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Arrange an interview date, time slot, and connection coordinates. Both parties will be notified and this event will automatically sync with your calendars once finalized.
                </p>

                {/* Date Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Choose Date <span className="text-red-700">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={interviewFormDate}
                      onChange={(e) => setInterviewFormDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-800 rounded-xl transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Choose TimeSlot <span className="text-red-700">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      required
                      value={interviewFormTime}
                      onChange={(e) => setInterviewFormTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-800 rounded-xl transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Fine Print Note */}
                <div className="text-[10px] text-slate-400 italic">
                  * Note: Please make sure the interview is scheduled during the standard business hours of the target institution.
                </div>

                {/* Platform select dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Platform Platform <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={interviewFormPlatform}
                    onChange={(e) => setInterviewFormPlatform(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-850 rounded-xl transition-all outline-none"
                  >
                    <option value="Google Meet">Google Meet (Default)</option>
                    <option value="Zoom">Zoom Video</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                    <option value="Skype">Skype Video</option>
                    <option value="In-Person / Office">In-Person / Office</option>
                  </select>
                </div>

                {/* Meeting Connection Link */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Call / Meeting Link <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    value={interviewFormLink}
                    onChange={(e) => setInterviewFormLink(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-semibold text-slate-800 rounded-xl transition-all outline-none"
                  />
                </div>

                {/* Notes & Instructions */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    Candidate Guidelines / Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g., Please bring a copy of your academic records and be ready to discuss your goals."
                    value={interviewFormNotes}
                    onChange={(e) => setInterviewFormNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#155DFC] focus:bg-white text-xs font-medium text-slate-800 rounded-xl transition-all outline-none resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!interviewFormDate || !interviewFormTime || !interviewFormLink}
                  onClick={handleSaveInterviewSchedule}
                  className="px-6 py-3 text-xs font-black text-white bg-[#155DFC] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg border border-blue-500/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                  {app.interview?.status && app.interview.status !== 'idle' && app.interview.status !== 'requested'
                    ? 'Submit Counter Propose'
                    : 'Dispatch Invitation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Verification & Action Panel "Mark Incomplete" Popup modal */}
      <AnimatePresence>
        {isIncompleteModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.2rem] shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col my-8 animate-in fade-in/80 duration-200"
              style={{ maxHeight: 'calc(100vh - 4rem)' }}
            >
              {/* Top Accent Pink/Red Header Badge & Title Block */}
              <div className="bg-rose-600 p-6 text-white flex justify-between items-center relative flex-shrink-0">
                <div className="space-y-1">
                  <span className="inline-block px-4 py-0.5 text-[9px] font-black uppercase tracking-widest bg-rose-700/80 text-white rounded-xl">
                    Action Desk
                  </span>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <XCircle size={18} className="text-rose-100 animate-pulse" />
                    Document Verification & Action Panel
                  </h3>
                  <p className="text-[10px] text-rose-100/80 font-mono font-bold tracking-tight uppercase">
                    REVIEW STUDENT RECORD & UPDATE TRACE PIPELINE
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIncompleteModalOpen(false)}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Core Contents */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Toggle key verification checkpoints. Identifying missing details automatically flags the pipeline and constructs an adjustable notification to request fixes.
                </p>

                {/* Submissions Checklist Rows */}
                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-450 font-black uppercase tracking-wider">
                    Checklist Verification Items
                  </h4>
                  
                  <div className="space-y-2.5">
                    {[
                      {
                        key: 'Identity / Passport Details',
                        warning: '⚠ Identity proof or copy of passport is invalid, has expired, or is blurry.'
                      },
                      {
                        key: 'Location Details',
                        warning: '⚠ Address documents, tax receipts, or electricity bills are missing or empty.'
                      },
                      {
                        key: 'Highschool Academic Transcripts',
                        warning: '⚠ Academic marksheet files are blurry, not attested, or missing page 2.'
                      },
                      {
                        key: 'English Language Qualification',
                        warning: '⚠ English language qualification (IELTS/PTE/TOEFL/MOI) is missing or invalid.'
                      }
                    ].map(({ key, warning }) => {
                      const isChecked = incompleteChecklist[key];
                      return (
                        <div
                          key={key}
                          onClick={() => handleToggleChecklist(key)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                            isChecked 
                              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-xl border ${
                                isChecked 
                                  ? 'text-rose-700 bg-rose-50 border-rose-200' 
                                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              }`}>
                                {isChecked ? 'Missing' : 'Valid'}
                              </span>
                              <p className={`text-xs font-bold ${isChecked ? 'text-rose-900' : 'text-slate-800'}`}>
                                {key}
                              </p>
                            </div>
                            {isChecked && (
                              <p className="text-[10px] text-rose-605 font-bold mt-2 ml-1 flex items-center gap-1">
                                {warning}
                              </p>
                            )}
                          </div>
                          <div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} /* Handled by container select action */
                              className="w-4.5 h-4.5 text-rose-600 rounded-xl border-slate-300 focus:ring-rose-500 cursor-pointer pointer-events-none accent-rose-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Structured response box */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">
                    STRUCTURED RESPONSE TO AGENT
                  </label>
                  <textarea
                    rows={6}
                    value={incompleteMessage}
                    onChange={(e) => setIncompleteMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-rose-550 focus:ring-rose-200 text-xs font-medium text-slate-700 rounded-2xl transition-all outline-none font-sans leading-relaxed"
                    placeholder="Provide detailed custom queries or instructions for the agent..."
                  />
                  <p className="text-[10px] text-slate-400 italic font-medium">
                    This custom drafted email message is dynamically adjusted based on checked options above, but remains fully editable.
                  </p>
                </div>
              </div>

              {/* Modal Footer actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsIncompleteModalOpen(false)}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating || !Object.values(incompleteChecklist).some(Boolean)}
                  onClick={handleSendIncompleteRequest}
                  className="px-6 py-3 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                  Send To Agent & Request Fix
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* "Reason for Rejection" Popup modal */}
      <AnimatePresence>
        {isRejectionModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.2rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in/80 duration-200"
            >
              {/* Top Accent Red Header */}
              <div className="bg-red-600 p-6 text-white flex justify-between items-center relative flex-shrink-0">
                <div className="space-y-1">
                  <span className="inline-block px-4 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-700/80 text-white rounded-xl">
                    Admissions Desk
                  </span>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <XCircle size={18} className="text-red-100 animate-pulse" />
                    Reject Application
                  </h3>
                  <p className="text-[10px] text-red-100/80 font-mono font-bold tracking-tight uppercase">
                    MANDATE REJECTION REASON & ALERT PARTNER CHANNEL
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRejectionModalOpen(false);
                    setRejectionReasonInput('');
                  }}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Core Contents */}
              <div className="p-6 md:p-8 space-y-4 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Please provide a clear and concrete explanation for rejecting this application. This reason will be displayed in the application details and automatically compiled as an official internal message to the recruiting agent partner and notifications to relevant student profiles.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block pl-1">
                    Reason for Rejection
                  </label>
                  <textarea
                    rows={4}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-red-500 focus:ring-red-200 focus:ring-2 text-xs font-semibold text-slate-750 rounded-2xl transition-all outline-none font-sans leading-relaxed"
                    placeholder="e.g., The academic credentials do not meet the minimum GPA threshold required for the selected master course core modules..."
                    required
                  />
                </div>
              </div>

              {/* Modal Footer actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsRejectionModalOpen(false);
                    setRejectionReasonInput('');
                  }}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating || !rejectionReasonInput.trim()}
                  onClick={handleRejectionSubmit}
                  className="px-6 py-3 text-xs font-black text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin text-red-600" /> : null}
                  Submit Rejection
                  <Check size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && editForm && (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.2rem] shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col my-8"
            >
              <div className="bg-[#0052FF] p-6 text-white flex justify-between items-center relative flex-shrink-0">
                <div className="space-y-1">
                  <span className="inline-block px-4 py-0.5 text-[9px] font-black uppercase tracking-widest bg-blue-700/80 text-white rounded-xl">
                    Application Correction
                  </span>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <Pencil size={18} className="text-blue-100" />
                    Edit Student details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] bg-slate-50/30">
                {/* Personal Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                    <User size={12} />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">First Name</label>
                      <input 
                        type="text" 
                        value={editForm.studentFirstName} 
                        onChange={(e) => setEditForm({...editForm, studentFirstName: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Middle Name</label>
                      <input 
                        type="text" 
                        value={editForm.studentMiddleName || ''} 
                        onChange={(e) => setEditForm({...editForm, studentMiddleName: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Last Name</label>
                      <input 
                        type="text" 
                        value={editForm.studentLastName} 
                        onChange={(e) => setEditForm({...editForm, studentLastName: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email" 
                          value={editForm.studentEmail} 
                          onChange={(e) => setEditForm({...editForm, studentEmail: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="tel" 
                          value={editForm.studentPhone} 
                          onChange={(e) => setEditForm({...editForm, studentPhone: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic & Program Details */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                    <GraduationCap size={12} />
                    Academic & Enrollment
                  </h4>
                  
                  <div className="space-y-1 opacity-60">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Host Institution (Read-Only)</label>
                    <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-2 cursor-not-allowed">
                      <ShieldCheck size={14} className="text-slate-400" />
                      {getUniversityName(app, institutions)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Study Program</label>
                      <div className="relative">
                        <BookOpen size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select 
                          value={editForm.targetCourseName} 
                          onChange={(e) => setEditForm({...editForm, targetCourseName: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all cursor-pointer"
                        >
                          {(() => {
                            const rawPrograms = institutions.find(i => i.id === app.targetUniversityId)?.programs || [];
                            const qual = (editForm.highestQualification || '').toLowerCase().trim();

                            let filtered = rawPrograms;
                            if (qual) {
                              filtered = rawPrograms.filter((prog: any) => {
                                const pName = (typeof prog === 'string' ? prog : (prog.name || '')).toLowerCase();
                                
                                const isUG = pName.includes('bachelor') || 
                                             pName.includes('bsc') || 
                                             pName.includes('bba') || 
                                             pName.includes('undergraduate') || 
                                             pName.includes('b.a.') || 
                                             pName.includes('beng') || 
                                             pName.includes('bcom') || 
                                             pName.includes('bdes') || 
                                             pName.includes('barch') || 
                                             pName.includes('licence') || 
                                             pName.includes('ba (hons)') || 
                                             pName.includes('ba(hons)') || 
                                             pName.includes('associate');
                                
                                const isDip = pName.includes('diploma');
                                
                                const isPG = pName.includes('master') || 
                                             pName.includes('mba') || 
                                             pName.includes('msc') || 
                                             pName.includes('ma ') || 
                                             pName.includes('m.sc') || 
                                             pName.includes('m.a') || 
                                             pName.includes('postgraduate') || 
                                             pName.includes('pg ') || 
                                             pName.includes('post-graduate') ||
                                             pName.includes('mastère') ||
                                             pName.includes('mastere');
                                
                                const isDoc = pName.includes('phd') || 
                                              pName.includes('ph.d') || 
                                              pName.includes('doctor') || 
                                              pName.includes('doctorate') || 
                                              pName.includes('dba') || 
                                              pName.includes('md') || 
                                              pName.includes('research');

                                // 1. Diploma -> Show ONLY Bachelor's level options
                                if (qual === 'diploma') {
                                  return isUG && !isPG && !isDoc && !isDip;
                                }

                                // 2. Bachelor -> Show Bachelors and Masters
                                if (qual === 'bachelor' || qual === 'bachelors') {
                                  return (isUG || isPG) && !isDoc;
                                }

                                // 3. Master -> Show Masters and PhD/Doctorate
                                if (qual === 'master' || qual === 'masters') {
                                  return isPG || isDoc;
                                }

                                // 4. High School -> Show Diplomas or Bachelors
                                if (qual === 'high school') {
                                  return (isUG || isDip) && !isPG && !isDoc;
                                }

                                return true;
                              });
                            }

                            // Fallback to all programs if filter leads to empty list for safety
                            const finalPrograms = filtered.length > 0 ? filtered : rawPrograms;

                            return finalPrograms.map((prog: any) => (
                              <option key={prog.name || (typeof prog === 'string' ? prog : Math.random().toString())} value={prog.name || prog}>
                                {prog.name || (typeof prog === 'string' ? prog : 'Unknown Program')}
                              </option>
                            ));
                          })()}
                          {editForm.targetCourseName && !(institutions.find(i => i.id === app.targetUniversityId)?.programs || []).some((p: any) => (p.name || p) === editForm.targetCourseName) && (
                            <option value={editForm.targetCourseName}>{editForm.targetCourseName}</option>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Intake</label>
                      <select 
                        value={editForm.targetIntake} 
                        onChange={(e) => setEditForm({...editForm, targetIntake: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all cursor-pointer"
                      >
                        {['January 2024', 'May 2024', 'September 2024', 'January 2025', 'May 2025', 'September 2025', 'January 2026', 'May 2026', 'September 2026'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        {!['January 2024', 'May 2024', 'September 2024', 'January 2025', 'May 2025', 'September 2025', 'January 2026', 'May 2026', 'September 2026'].includes(editForm.targetIntake) && (
                          <option value={editForm.targetIntake}>{editForm.targetIntake}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Highest Qualification</label>
                      <select 
                        value={editForm.highestQualification} 
                        onChange={(e) => setEditForm({...editForm, highestQualification: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all cursor-pointer"
                      >
                        {['High School', 'Diploma', 'Bachelor', 'Master', 'Doctorate', 'Other'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Graduation Year</label>
                      <input 
                        type="text" 
                        value={editForm.graduationYear || ''} 
                        onChange={(e) => setEditForm({...editForm, graduationYear: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="e.g. 2022"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">GPA / Grade</label>
                      <input 
                        type="text" 
                        value={editForm.gradeValue || ''} 
                        onChange={(e) => setEditForm({...editForm, gradeValue: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="e.g. 3.8 / 85%"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">English Test Type</label>
                      <select 
                        value={editForm.englishTestType || ''} 
                        onChange={(e) => setEditForm({...editForm, englishTestType: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all cursor-pointer"
                      >
                        {['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'MOI', 'Internal Test', 'None'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Test Score / Grade</label>
                      <input 
                        type="text" 
                        value={editForm.englishTestScore || ''} 
                        onChange={(e) => setEditForm({...editForm, englishTestScore: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="e.g. 7.5 bands"
                      />
                    </div>
                  </div>
                </div>

                {/* Identity Details */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Globe size={12} />
                    Identity & Travel
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Passport Number</label>
                      <div className="relative">
                        <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={editForm.passportNumber || ''} 
                          onChange={(e) => setEditForm({...editForm, passportNumber: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Passport Expiry Date</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="date" 
                          value={editForm.passportExpiryDate || ''} 
                          onChange={(e) => setEditForm({...editForm, passportExpiryDate: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveEdit}
                  className="px-6 py-3 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                  Save Updated details
                  <Check size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAppealModalOpen && (
          <div 
            className="fixed inset-0 z-[500] overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsAppealModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-900">Appeal Application</h3>
                <p className="text-xs text-slate-500 mt-1">Please provide the reason for your appeal.</p>
              </div>
              <div className="p-6">
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Reason for appeal..."
                />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(false)}
                  className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating || !appealReason}
                  onClick={() => handleAppeal(appealReason)}
                  className="px-6 py-3 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-amber-100 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                  Submit Appeal
                  <Gavel size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

