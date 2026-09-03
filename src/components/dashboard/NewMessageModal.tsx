'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Paperclip, Trash2, Loader2, FileText, CheckCircle } from 'lucide-react';
import { addMessage } from '@/lib/messagingService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
  senderId: string;
}

export function NewMessageModal({ isOpen, onClose, app, senderId }: NewMessageModalProps) {
  const { profile } = useAuth();
  const [category, setCategory] = useState<'Pending Documents' | 'Visa Query' | 'Tuition Fee' | 'Entry Requirements' | 'Interview' | 'Scholarship' | 'Admissions Enquiry' | 'Other Query'>('Pending Documents');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [files, setFiles] = useState<{ name: string; size: string; url: string }[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!app) return null;

  const studentRefNo = app.id ? `STU-2026-${app.id.slice(-4).toUpperCase()}` : 'STU-2026-9941';
  const studentName = `${app.studentFirstName} ${app.studentLastName}`;
  const courseName = app.targetProgramId || 'BA in Marketing';
  const universityId = app.targetUniversityId || '';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFiles = (fileList: FileList) => {
    const newFiles: { name: string; size: string; url: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const sizeKB = (file.size / 1024).toFixed(1);
      const simulatedUrl = `https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=1000&auto=format&fit=crop`;
      newFiles.push({
        name: file.name,
        size: `${sizeKB} KB`,
        url: simulatedUrl,
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${fileList.length} file(s) attached successfully!`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info('Attachment removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error('Please enter a message subject.');
      return;
    }
    if (!body.trim()) {
      toast.error('Please enter the message body description.');
      return;
    }
    if (!universityId) {
      toast.error('Invalid target university recipient.');
      return;
    }

    setIsSending(true);
    try {
      const senderName = profile?.agencyName || profile?.fullName || 'Agent Partner';
      const payload = {
        studentRefNo,
        studentName: studentName || 'Student',
        courseName: courseName || 'General Program',
        senderId,
        receiverId: universityId || 'unknown',
        senderName: senderName || 'Agent',
        messageCategory: category || 'Pending Documents',
        subject: subject.trim() || 'General Inquiry',
        messageBody: body.trim(),
        attachments: files.map(f => ({ fileName: f.name, fileUrl: f.url })),
        isReadByReceiver: false,
      };

      await addMessage(payload);
      const targetInstitutionName = app.targetUniversityName || 'the institution';
      toast.success(`Your message has been sent to ${targetInstitutionName}.`);
      
      setSubject('');
      setBody('');
      setFiles([]);
      onClose();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error('Error sending message: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-grad-text-main font-outfit font-sans tracking-tight">New Message to Institution</h3>
                <p className="text-xs text-slate-500 mt-0.5">Send a locked application message to start an action-item thread.</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Locked Metadata Context</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl select-all">
                    Reference: {studentRefNo}
                  </span>
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm">
                    Student: {studentName}
                  </span>
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl">
                    Program: {courseName}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Message Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="Pending Documents">Pending Documents</option>
                  <option value="Visa Query">Visa Query</option>
                  <option value="Tuition Fee">Tuition Fee</option>
                  <option value="Entry Requirements">Entry Requirements</option>
                  <option value="Interview">Interview</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Admissions Enquiry">Admissions Enquiry</option>
                  <option value="Other Query">Other Query</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Missing Academic Transcripts for Verification"
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Message Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Provide precise details here. This acts as a formal action-item tracker, which universities can reference on their dashboard."
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Attachments
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragActive 
                      ? 'border-[#0052FF] bg-blue-50/20' 
                      : 'border-slate-200 hover:border-[#0052FF] hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                  />
                  <div className="p-3 bg-blue-50 text-[#0052FF] rounded-2xl">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Drag & drop files here, or click to browse</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Supports PDF, JPG, PNG or DOC (Max 10MB per file)</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[280px]">
                            {file.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                            ({file.size})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="w-7 h-7 text-red-700 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0052FF] text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}