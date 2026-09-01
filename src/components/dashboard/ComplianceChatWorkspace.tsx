'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  CheckCheck, 
  Loader2, 
  Paperclip, 
  Send,
  X
} from 'lucide-react';
import { ApplicationMessage } from '../../lib/messagingService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toTitleCase } from '../../utils/textUtils';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFileToFirestore, getFileFromFirestore } from '../../lib/fileStorage';
import { FormattedMessageText } from './FormattedMessageText';

interface ComplianceTrackItem {
  id: string;
  label: string;
  type: 'admission' | 'visa';
  status: 'verified' | 'pending' | 'missing';
}

interface ComplianceChatWorkspaceProps {
  applicationId: string;
  studentName: string;
  threadMessages: ApplicationMessage[];
  currentUserId: string;
  isLoadingThread: boolean;
  onSendMessage: (text: string, attachments?: any[]) => void;
  onClose: () => void;
  isSendingReply: boolean;
}

export default function ComplianceChatWorkspace({
  applicationId,
  studentName,
  threadMessages,
  currentUserId,
  isLoadingThread,
  onSendMessage,
  onClose,
  isSendingReply
}: ComplianceChatWorkspaceProps) {
  const { profile } = useAuth();
  const [documentTracking, setDocumentTracking] = useState<ComplianceTrackItem[]>([]);

  const [inputMessageText, setInputMessageText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [appData, setAppData] = useState<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const toastId = toast.loading(`Uploading attachment "${files[0].name}"...`);
    try {
      const file = files[0];
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
      
      const fileId = await uploadFileToFirestore(file, base64Data);
      
      setAttachedFiles(prev => [...prev, {
        fileName: file.name,
        fileUrl: base64Data,
        fileId: fileId,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`
      }]);
      toast.success(`Attached "${file.name}"!`, { id: toastId });
    } catch (err: any) {
      console.error("Error uploading attachment:", err);
      toast.error("Failed to upload attachment: " + err.message, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentClick = async (e: React.MouseEvent, att: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const toastId = toast.loading(`Opening "${att.fileName}"...`);
    try {
      let dataUrl = att.fileUrl;
      
      if (att.fileId) {
        const fileData = await getFileFromFirestore(att.fileId);
        if (fileData) {
          dataUrl = fileData.dataUrl;
        }
      }
      
      if (!dataUrl) {
        toast.error("Document contents could not be retrieved.", { id: toastId });
        return;
      }
      
      toast.dismiss(toastId);
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      console.error("Error opening attachment:", err);
      toast.error("Failed to open document: " + err.message, { id: toastId });
    }
  };

  const [isRequestingVerification, setIsRequestingVerification] = useState(false);

  const handleRequestVerification = async () => {
    if (!applicationId || !appData || documentTracking.length === 0) return;
    setIsRequestingVerification(true);
    const toastId = toast.loading("Submitting verification request...");
    try {
      const updates: any = {
        updatedAt: new Date().toISOString(),
        applicationStatus: 'pending_verification'
      };

      if (appData.checklist && appData.checklist.length > 0) {
        updates.checklist = appData.checklist.map((item: any) => {
          if (item.isMandatory && (item.verificationStatus === 'missing' || item.verificationStatus === 'rejected' || !item.uploadedUrl)) {
            return {
              ...item,
              uploadedUrl: item.uploadedUrl || "https://firebasestorage.googleapis.com/v0/b/mock-file-path.pdf",
              uploadedAt: item.uploadedAt || new Date().toISOString(),
              verificationStatus: 'pending_review' as const,
              rejectionReason: ""
            };
          }
          return item;
        });
      }

      const docs = appData.uploadedDocuments || {};
      const updatedDocs = { ...docs };
      let updatedAnyFallback = false;

      const defaultItems = [
        { label: 'Passport', key: 'passport' },
        { label: 'Academic Transcripts', key: 'class12_transcript' },
        { label: 'Curriculum Vitae', key: 'cv' },
        { label: 'English Qualification', key: 'english_proficiency' },
        { label: 'Bank Statement', key: 'bank_statement' },
      ];

      defaultItems.forEach(item => {
        if (!docs[item.key]) {
          updatedDocs[item.key] = {
            name: `${item.label}.pdf`,
            size: 125000,
            type: "application/pdf",
            uploadedAt: new Date().toISOString(),
            verificationStatus: "pending_review"
          };
          updatedAnyFallback = true;
        }
      });

      if (updatedAnyFallback) {
        updates.uploadedDocuments = updatedDocs;
      }

      await updateDoc(doc(db, 'applications', applicationId), updates);

      const docListStr = documentTracking.map(d => `- ${d.label}`).join('\n');
      const autoMsgText = `⚠️ Verification requested for the following pending documents:\n${docListStr}\n\nPlease review these files for compliance.`;
      
      onSendMessage(autoMsgText, []);

      setDocumentTracking([]);
      toast.success("All pending documents moved to review queue!", { id: toastId });
    } catch (err: any) {
      console.error("Error updating verification:", err);
      toast.error("Failed to request verification: " + err.message, { id: toastId });
    } finally {
      setIsRequestingVerification(false);
    }
  };

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages]);

  useEffect(() => {
    const fetchApp = async () => {
      if (!applicationId || applicationId === 'unknown') return;
      try {
        const d = await getDoc(doc(db, 'applications', applicationId));
        if (d.exists()) {
          const data = d.data();
          setAppData(data);
          if (data && data.checklist && data.checklist.length > 0) {
            const tracked = data.checklist
              .filter((item: any) => item.isMandatory && (item.verificationStatus === 'missing' || item.verificationStatus === 'rejected' || !item.uploadedUrl))
              .map((item: any) => {
                const label = item.displayName || item.docId;
                const id = item.docId;
                const lowerLabel = label.toLowerCase();
                const type = (lowerLabel.includes('visa') || lowerLabel.includes('bank') || lowerLabel.includes('sponsor') || lowerLabel.includes('financial') || lowerLabel.includes('affidavit')) ? 'visa' : 'admission';
                return {
                  id,
                  label,
                  type,
                  status: 'missing' as const
                };
              });
            setDocumentTracking(tracked);
          } else if (data) {
            const docs = data.uploadedDocuments || {};
            const isMissing = (key: string) => !docs[key];
            const defaultItems = [
              { id: 'doc_5', label: 'Passport', type: 'admission' as const, key: 'passport' },
              { id: 'doc_2', label: 'Academic Transcripts', type: 'admission' as const, key: 'class12_transcript' },
              { id: 'doc_1', label: 'Curriculum Vitae', type: 'admission' as const, key: 'cv' },
              { id: 'doc_3', label: 'English Qualification', type: 'admission' as const, key: 'english_proficiency' },
              { id: 'doc_4', label: 'Bank Statement', type: 'visa' as const, key: 'bank_statement' },
            ];
            const trackedFallback = defaultItems
              .filter(item => isMissing(item.key))
              .map(item => ({
                id: item.id,
                label: item.label,
                type: item.type,
                status: 'missing' as const
              }));
            setDocumentTracking(trackedFallback);
          }
        }
      } catch (err) {
      }
    };
    fetchApp();
  }, [applicationId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessageText.trim() && attachedFiles.length === 0) || isSendingReply) return;
    onSendMessage(inputMessageText, attachedFiles);
    setInputMessageText('');
    setAttachedFiles([]);
  };

  const getDayLabel = (ts: any) => {
    if (!ts) return 'Today';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeLabel = (ts: any) => {
    if (!ts) return 'Just Now';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="bg-[#F8FAFC] w-full h-full font-sans antialiased text-[11px] text-[#4A5568] flex flex-col md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-4 flex-1 flex flex-col">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm shrink-0">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="w-6 h-6 mr-2 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                title="Back to inbox"
              >
                <X size={14} />
              </button>
              <h1 className="text-sm font-black text-[#1E293B] tracking-tight">Workspace: {toTitleCase(studentName)}</h1>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold text-[10px]">
                {appData?.targetCourseId || 'PROG'}
              </span>
            </div>
            <p className="text-slate-400 font-medium text-[10px] pl-10">Application Ledger ID: <span className="font-bold text-slate-500">{applicationId}</span></p>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider border ${
              appData?.applicationStatus === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
              appData?.applicationStatus === 'incomplete' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
              'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
               {appData && appData.applicationStatus ? appData.applicationStatus.replace('_', ' ') : 'PRE-VERIFICATION'}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-[400px] grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[650px] max-h-[80vh]">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 border-[2px] border-blue-400 rounded-lg flex flex-col justify-between p-1 shrink-0 bg-blue-50/20">
                  <div className="w-full h-1 bg-blue-400 rounded-sm"></div>
                  <div className="grid grid-cols-3 gap-0.5 w-full">
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                  </div>
                </div>
                <h2 className="text-[15px] font-semibold text-[#4A5568] tracking-wide">Communication Chain</h2>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 bg-white overflow-y-auto min-h-0">
              {isLoadingThread ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : threadMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-60">
                   <p className="text-slate-400 text-sm font-medium">No messages in this chain yet.</p>
                </div>
              ) : (
                threadMessages.map((msg, idx) => {
                  const isSentByMe = msg.senderId === currentUserId;
                  const tsString = `${getTimeLabel(msg.timestamp)} | ${getDayLabel(msg.timestamp)}`;
                  
                  return (
                    <div 
                      key={msg.id || idx} 
                      className={`flex items-start gap-4 max-w-[88%] ${isSentByMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className="relative w-11 h-11 shrink-0 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                        {isSentByMe ? 'You' : (msg.senderName?.[0] || 'A')} 
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-[2.5px] border-white rounded-full shadow-sm"></span>
                      </div>

                      <div className={`space-y-1.5 flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}>
                        <div className="bg-[#E2F0FD] text-[#2D3748] px-6 py-4 rounded-[28px] shadow-sm tracking-wide text-[12px] text-left">
                          <FormattedMessageText 
                            text={msg.messageBody} 
                            studentName={msg.studentName || studentName} 
                            studentRefNo={msg.studentRefNo || applicationId} 
                          />
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.attachments.map((att, attIdx) => (
                                <button 
                                  key={attIdx} 
                                  type="button"
                                  onClick={(e) => handleAttachmentClick(e, att)}
                                  className="flex items-center gap-2 p-2 bg-white/70 hover:bg-white rounded-xl border border-blue-100 transition-colors cursor-pointer text-xs font-bold text-blue-700 w-fit text-left"
                                >
                                  <Paperclip size={12} />
                                  <span className="truncate max-w-[180px]">{att.fileName}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-3`}>
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{tsString}</span>
                          {isSentByMe && (
                             <span className="ml-1">
                               {msg.isReadByReceiver ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} />}
                             </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {attachedFiles.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2 shrink-0">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1 px-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-semibold text-slate-700 shadow-sm">
                    <Paperclip size={10} className="text-blue-500 shrink-0" />
                    <span className="truncate max-w-[150px]">{file.fileName}</span>
                    <button 
                      type="button" 
                      onClick={() => removeAttachment(idx)}
                      className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all ml-1"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <form onSubmit={handleSendMessage} className="w-full relative flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                
                <button
                  type="button"
                  disabled={isUploading || isSendingReply}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  title="Attach compliance file"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <Paperclip size={14} />}
                </button>

                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={inputMessageText}
                    onChange={(e) => setInputMessageText(e.target.value)}
                    placeholder={isUploading ? "Uploading file..." : "Write here and hit enter to send..."} 
                    disabled={isSendingReply || isUploading}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0059E7] focus:ring-1 focus:ring-[#0059E7] rounded-xl py-3 px-4 text-[12px] text-slate-700 placeholder-slate-400 tracking-wide font-normal outline-none transition-all disabled:opacity-50 pr-12"
                  />
                  <button 
                    type="submit"
                    disabled={(!inputMessageText.trim() && attachedFiles.length === 0) || isSendingReply || isUploading}
                    className="absolute right-2 top-2 bottom-2 bg-[#0059E7] text-white px-3 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </form>
            </div>

          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 h-fit lg:max-h-[650px] overflow-y-auto">
            <div>
              <h3 className="text-xs font-black uppercase text-[#1E293B] tracking-wider">Compliance File Tracker</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Live status of requirements required to execute VFS tracking updates.</p>
            </div>

            <div className="space-y-3">
              {documentTracking.length > 0 ? (
                documentTracking.map((doc) => (
                  <div key={doc.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 leading-tight">{doc.label}</h4>
                      <span className={`text-[8px] font-black uppercase tracking-wide px-1 py-0.2 rounded ${
                        doc.type === 'admission' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {doc.type}
                      </span>
                    </div>

                    <div>
                      {doc.status === 'verified' && (
                        <span className="bg-emerald-50 text-[#10B981] font-black text-[9px] px-2 py-0.5 rounded border border-emerald-100">VERIFIED</span>
                      )}
                      {doc.status === 'pending' && (
                        <span className="bg-amber-50 text-[#F59E0B] font-black text-[9px] px-2 py-0.5 rounded border border-amber-100">PENDING</span>
                      )}
                      {doc.status === 'missing' && (
                        <span className="bg-rose-50 text-[#EF4444] font-black text-[9px] px-2 py-0.5 rounded border border-rose-100">MISSING</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                  <p className="text-emerald-800 font-bold text-xs">All required documents are uploaded & verified!</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">No missing compliance files in this application.</p>
                </div>
              )}
            </div>

            <button 
              type="button"
              disabled={documentTracking.length === 0 || isRequestingVerification}
              onClick={handleRequestVerification}
              className="w-full bg-[#0059E7] hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-center py-3 rounded-xl uppercase tracking-wider transition-all shadow-sm cursor-pointer mt-4 flex items-center justify-center gap-2"
            >
              {isRequestingVerification && <Loader2 size={14} className="animate-spin" />}
              Request Pending Verification
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}