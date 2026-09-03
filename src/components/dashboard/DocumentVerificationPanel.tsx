'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Clock, 
  Send, 
  Loader2, 
  FileText, 
  Code, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface DocumentVerificationPanelProps {
  app: any;
  onSuccess: (updatedApp: any) => void;
  profile: any;
}

export function DocumentVerificationPanel({ app, onSuccess, profile }: DocumentVerificationPanelProps) {
  const [matrixRequirements, setMatrixRequirements] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);

  const defaultRequirements = [
    { docId: 'GCM_IDENT_PROOF', displayName: 'Identity / Passport Details', isMandatory: true },
    { docId: 'GCM_ACAD_CREDENTIALS', displayName: 'Highschool Academic Transcripts', isMandatory: true },
    { docId: 'GCM_ENGLISH_PROOF', displayName: 'English Language Qualification', isMandatory: false }
  ];

  useEffect(() => {
    const fetchMatrix = async () => {
      const targetUniId = app?.targetUniversityId || profile?.universityId || 'global-college-malta';
      try {
        const docRef = doc(db, 'institution_matrices', targetUniId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().requirements && docSnap.data().requirements.length > 0) {
          setMatrixRequirements(docSnap.data().requirements);
        } else {
          setMatrixRequirements(defaultRequirements);
        }
      } catch (err) {
        console.error('Failed fetching institution matrix for verification panel:', err);
        setMatrixRequirements(defaultRequirements);
      } finally {
        setLoadingMatrix(false);
      }
    };
    fetchMatrix();
  }, [app?.targetUniversityId, profile?.universityId]);

  const isRequirementMandatory = (docKey: string): boolean => {
    const activeReqs = matrixRequirements.length > 0 ? matrixRequirements : defaultRequirements;
    
    if (docKey === 'English Language Qualification' || docKey.toLowerCase().includes('english')) {
      const match = activeReqs.find(r => 
        r.docId === 'GCM_ENGLISH_PROOF' || 
        r.docId?.toUpperCase().includes('ENGLISH') || 
        r.displayName?.toLowerCase().includes('english')
      );
      return match ? !!match.isMandatory : false;
    }

    if (docKey === 'Identity / Passport Details' || docKey.toLowerCase().includes('passport') || docKey.toLowerCase().includes('ident')) {
      const match = activeReqs.find(r => 
        r.docId === 'GCM_IDENT_PROOF' || 
        r.docId?.toUpperCase().includes('IDENT') || 
        r.displayName?.toLowerCase().includes('passport') ||
        r.displayName?.toLowerCase().includes('identity')
      );
      return match ? !!match.isMandatory : true;
    }

    if (docKey === 'Highschool Academic Transcripts' || docKey.toLowerCase().includes('transcript') || docKey.toLowerCase().includes('academic')) {
      const match = activeReqs.find(r => 
        r.docId === 'GCM_ACAD_CREDENTIALS' || 
        r.docId === 'GCM_CLASS_12_CERT' || 
        r.docId?.toUpperCase().includes('ACAD') || 
        r.displayName?.toLowerCase().includes('transcript') ||
        r.displayName?.toLowerCase().includes('academic')
      );
      return match ? !!match.isMandatory : true;
    }

    return true;
  };

  const isPassportMandatory = isRequirementMandatory('Identity / Passport Details');
  const isPassportMissing = isPassportMandatory && !app?.passportNumber && !app?.uploadedDocuments?.passport && !app?.uploadedDocuments?.GCM_IDENT_PROOF;

  const isEducationMandatory = isRequirementMandatory('Highschool Academic Transcripts');
  const isEducationMissing = isEducationMandatory && !app?.highestQualification && !app?.uploadedDocuments?.class12_transcript && !app?.uploadedDocuments?.transcripts && !app?.uploadedDocuments?.GCM_ACAD_CREDENTIALS;

  const isEnglishMandatory = isRequirementMandatory('English Language Qualification');
  const hasEnglishProof = !!(app?.englishTestType || app?.uploadedDocuments?.english_proficiency || app?.uploadedDocuments?.GCM_ENGLISH_PROOF || app?.uploadedDocuments?.moi || app?.uploadedDocuments?.english_test_certificate);
  const isEnglishTestMissing = isEnglishMandatory && !hasEnglishProof;

  const [checkedDocs, setCheckedDocs] = useState<{ [key: string]: boolean }>({
    'Identity / Passport Details': false,
    'Highschool Academic Transcripts': false,
    'English Language Qualification': false,
  });

  const [docStatuses, setDocStatuses] = useState<{ [key: string]: 'Valid' | 'Pending Review' }>({
    'Identity / Passport Details': 'Valid',
    'Highschool Academic Transcripts': 'Valid',
    'English Language Qualification': 'Valid',
  });

  useEffect(() => {
    setCheckedDocs({
      'Identity / Passport Details': isPassportMissing,
      'Highschool Academic Transcripts': isEducationMissing,
      'English Language Qualification': isEnglishTestMissing,
    });

    setDocStatuses({
      'Identity / Passport Details': isPassportMissing ? 'Pending Review' : 'Valid',
      'Highschool Academic Transcripts': isEducationMissing ? 'Pending Review' : 'Valid',
      'English Language Qualification': isEnglishTestMissing ? 'Pending Review' : 'Valid',
    });
  }, [isPassportMissing, isEducationMissing, isEnglishTestMissing]);

  const [reviewerNote, setReviewerNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  const allValid = Object.keys(checkedDocs).every((docName) => {
    const isFlagged = checkedDocs[docName];
    const currentBadge = isFlagged ? 'Missing' : docStatuses[docName];
    return currentBadge === 'Valid';
  });

  useEffect(() => {
    const flaggedList = Object.keys(checkedDocs).filter(k => checkedDocs[k]);
    const agentName = app?.agencyName || 'bright-path';
    const studentName = `${app?.studentFirstName || 'Upendra'} ${app?.studentLastName || 'Nepal'}`;
    const studyTarget = app?.targetProgramId || 'UG Diploma at Global College Malta';

    if (flaggedList.length > 0) {
      setReviewerNote(
        `Dear ${agentName},\n\nWe have reviewed the application of student ${studentName} for the ${studyTarget}. The following document(s) require your immediate correction before we can issue an offer:\n\n` +
        flaggedList.map(docName => `• ${docName}: Status changed to MISSING/ACTION NEEDED. Please re-upload/validate.`).join('\n') +
        `\n\nKindly update these files on your dashboard to resume the verification process.\n\nBest regards,\n${profile?.fullName || 'University Admissions'}`
      );
    } else {
      setReviewerNote(
        `Dear ${agentName},\n\nAll submitted credentials for ${studentName} appear correct and are currently undergoing final administrative validation. We will notify you as soon as further progress is registered.\n\nBest regards,\n${profile?.fullName || 'University Admissions'}`
      );
    }
  }, [checkedDocs, app, profile]);

  const handleCheckboxChange = (docName: string) => {
    setCheckedDocs(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  const toggleManualStatus = (docName: string) => {
    if (checkedDocs[docName]) return;
    setDocStatuses(prev => ({
      ...prev,
      [docName]: prev[docName] === 'Valid' ? 'Pending Review' : 'Valid'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    setIsSending(true);
    const flaggedList = Object.keys(checkedDocs).filter(k => checkedDocs[k]);

    try {
      const studentId = app?.studentId || "upendra_nepal_20010521";
      const agentId = app?.agentId || "bright-path";
      const studentName = `${app?.studentFirstName || 'Upendra'} ${app?.studentLastName || 'Nepal'}`;
      const courseName = app?.targetProgramId || 'UG Diploma (Global College Malta)';

      const appRef = doc(db, 'applications', app.id);
      await updateDoc(appRef, {
        applicationStatus: 'incomplete',
        documentStatus: 'incomplete',
        document_status: 'incomplete',
        issues: flaggedList,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, `conversations/${app.studentRefNo || `STU-2026-${app.id.slice(-4).toUpperCase()}`}/messages`), {
        studentRefNo: app.studentRefNo || `STU-2026-${app.id.slice(-4).toUpperCase()}`,
        studentName,
        courseName,
        senderId: profile?.uid || 'fallback_uid',
        receiverId: app.agentId || 'bright-path',
        senderName: profile?.institutionName || profile?.fullName || 'Malta Admissions Office',
        messageCategory: 'Pending Documents',
        subject: `ACTION NEEDED: Document Verification Incomplete (${studentName})`,
        messageBody: reviewerNote.trim(),
        attachments: [],
        isReadByReceiver: false,
        timestamp: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: app.agentId || 'bright-path',
        applicationId: app.id,
        title: 'Action Needed: Document Rejection',
        description: `Admissions flagged ${flaggedList.length} invalid items on ${studentName}'s application.`,
        category: 'applications',
        isUnread: true,
        createdAt: serverTimestamp()
      });

      toast.success('Document audit logged! Feedback dispatched to agent.');
      onSuccess({
        ...app,
        applicationStatus: 'incomplete',
        documentStatus: 'incomplete',
        issues: flaggedList
      });
    } catch (err: any) {
      console.error('Error during document verification submit:', err);
      toast.error('Sync failed: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-grad-text-main font-outfit tracking-tight">Document Verification & Action Panel</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Review student records & update trace pipeline</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
          Submission Checklist
        </label>
        
        <div className="grid grid-cols-1 gap-2">
          {(() => {
            const visibleDocs = Object.keys(checkedDocs).filter((docName) => {
              const isFlagged = checkedDocs[docName];
              const currentBadge = isFlagged ? 'Missing' : docStatuses[docName];
              return currentBadge !== 'Valid';
            });

            if (visibleDocs.length === 0) {
              return (
                <div className="text-center py-6 bg-emerald-50/20 rounded-2xl border border-dashed border-emerald-200">
                  <p className="text-xs text-emerald-600 font-semibold font-outfit">All required documents in checklist are verified! ✨</p>
                </div>
              );
            }

            return visibleDocs.map((docName) => {
              const isFlagged = checkedDocs[docName];
              const currentBadge = isFlagged ? 'Missing' : docStatuses[docName];

              return (
                <div 
                  key={docName}
                  onClick={() => handleCheckboxChange(docName)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    isFlagged 
                      ? 'bg-rose-50/20 border-rose-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox"
                        checked={isFlagged}
                        onChange={() => {}}
                        className="peer h-5 w-5 rounded-xl border-2 border-slate-200 text-rose-500 focus:ring-rose-500 checked:bg-rose-500 transition-all cursor-pointer"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{docName}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {docName === 'Identity / Passport Details' && (isPassportMissing ? '⚠️ Missing in passport trace' : 'Passport detail populated')}
                        {docName === 'Highschool Academic Transcripts' && (isEducationMissing ? '📝 Graduation mark sheet pending review' : 'School file attached')}
                        {docName === 'English Language Qualification' && (!isEnglishMandatory ? 'Optional requirement (ENGLISH_PROOF) - No action required' : isEnglishTestMissing ? '📝 English language qualification proof missing' : 'English qualification listed')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleManualStatus(docName);
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                      currentBadge === 'Missing' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : currentBadge === 'Pending Review'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500'
                    }`}
                  >
                    {currentBadge}
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
          Structured Response to Agent
        </label>
        
        <textarea
          disabled={allValid || isSending}
          value={reviewerNote}
          onChange={(e) => setReviewerNote(e.target.value)}
          rows={6}
          placeholder="Detailed reviewer instructions for the registered agent..."
          className={`w-full p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-medium leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all resize-none ${allValid ? 'opacity-60 cursor-not-allowed' : ''}`}
        />

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <p className="text-[10px] font-medium text-slate-400 max-w-[280px]">
            {allValid ? 'All documents are valid. No further action needed here.' : <>Updating marks state to <span className="font-bold text-amber-700">Incomplete</span>. This publishes real-time message feeds to the agent.</>}
          </p>
          
          <button
            type="submit"
            disabled={allValid || isSending}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-xs rounded-xl transition-all cursor-pointer ${
              allValid 
                ? 'bg-slate-50 text-slate-400 border border-slate-100 shadow-none cursor-not-allowed' 
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50'
            }`}
          >
            {isSending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Dispatching Feedback...
              </>
            ) : (
              <>
                <Send size={13} />
                Send to Agent & Request Fix
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}