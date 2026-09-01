"use client";

import { motion } from 'motion/react';
import { GraduationCap, Briefcase, Eye, EyeOff, Globe, MapPin, Loader2, ShieldCheck, Zap, Plus, Trash2, Upload, Image as ImageIcon, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getAuthErrorMessage, handleFirestoreError, OperationType } from '@/lib/authUtils';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileToFirestore } from '@/lib/fileStorage';

const COUNTRY_DIAL_CODES: Record<string, string> = {
  'United States': '+1',
  'Canada': '+1',
  'United Kingdom': '+44',
  'Australia': '+61',
  'Germany': '+49',
  'Nepal': '+977',
  'India': '+91',
  'Other': '+'
};

const AgentSignUp = () => {
  const { user: authUser, profile, hiddenCountries } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    agencyName: '',
    email: '',
    password: '',
    country: 'United States',
    address: '',
    phoneNumber: '+1',
    representativeName: '',
    representativePosition: '',
    recruitmentCountries: [] as string[],
    references: [
      {
        institutionName: '',
        country: '',
        contactName: '',
        position: '',
        email: ''
      }
    ],
    logo: '',
    aboutText: '',
    recruitmentVolume: '',
    visaSuccessRate: '',
    docStatuses: {
      businessRegistration: 'Missing',
      panCertificate: 'Missing',
      license: 'Missing',
      professionalCerts: 'Missing',
      uploadedFiles: {} as Record<string, {
        name: string;
        size: string;
        type: string;
        uploadedAt: string;
        dataUrl?: string;
      }>
    },
    agreeTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authUser && !formData.agencyName) {
      const names = profile?.fullName?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        email: authUser.email || '',
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        agencyName: profile?.agencyName || '',
        country: profile?.country || 'United States',
        address: profile?.address || '',
        phoneNumber: profile?.phoneNumber || COUNTRY_DIAL_CODES[profile?.country || 'United States'] || '+1',
        representativeName: profile?.representativeName || '',
        representativePosition: profile?.representativePosition || '',
        recruitmentCountries: profile?.recruitmentCountries || [],
        references: profile?.references || [
          {
            institutionName: '',
            country: '',
            contactName: '',
            position: '',
            email: ''
          }
        ],
        logo: profile?.logo || '',
        aboutText: profile?.aboutText || '',
        docStatuses: profile?.docStatuses || {
          businessRegistration: 'Missing',
          panCertificate: 'Missing',
          license: 'Missing',
          professionalCerts: 'Missing',
          uploadedFiles: {}
        },
        agreeTerms: true
      }));
    }
  }, [authUser, profile, formData.agencyName]);

  const handleDocUpload = (file: File, docKey: string) => {
    if (file.size > 1024 * 1024) {
      toast.error('Document file size must be under 1MB.');
      return;
    }

    const toastId = toast.loading(`Uploading "${file.name}" secure document...`);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const fileId = await uploadFileToFirestore(file, base64);
        const isDataUrlStored = file.size < 20 * 1024;

        const fileMeta: any = {
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type,
          uploadedAt: new Date().toLocaleDateString(),
          fileId: fileId,
        };
        if (isDataUrlStored) {
          fileMeta.dataUrl = base64;
        }

        setFormData(prev => {
          const docStatuses = prev.docStatuses;
          const currentUploaded = { ...(docStatuses.uploadedFiles || {}) };
          currentUploaded[docKey] = fileMeta;

          return {
            ...prev,
            docStatuses: {
              ...docStatuses,
              uploadedFiles: currentUploaded,
              [docKey]: 'Pending Verification'
            }
          };
        });
        if (docFileInputRef.current) {
          docFileInputRef.current.value = '';
        }
        toast.dismiss(toastId);
        toast.success(`"${file.name}" uploaded successfully!`);
      } catch (err: any) {
        toast.dismiss(toastId);
        toast.error(`Upload failed: ${err.message || err}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocDrag = (e: React.DragEvent, docKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOverKey(docKey);
    } else if (e.type === "dragleave") {
      setDragOverKey(null);
    }
  };

  const handleDocDrop = (e: React.DragEvent, docKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleDocUpload(e.dataTransfer.files[0], docKey);
    }
  };

  const triggerDocSelect = (docKey: string) => {
    setActiveDocKey(docKey);
    setTimeout(() => {
      docFileInputRef.current?.click();
    }, 50);
  };

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo file size must be under 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        logo: reader.result as string
      }));
      toast.success('Logo loaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const hasRole = profile?.roles.includes('agent');

  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!formData.firstName.trim()) {
        setError('First name is required.');
        toast.error('First name is required.');
        return false;
      }
      if (!formData.lastName.trim()) {
        setError('Last name is required.');
        toast.error('Last name is required.');
        return false;
      }
      if (!formData.agencyName.trim()) {
        setError('Agency Name is required.');
        toast.error('Agency Name is required.');
        return false;
      }
      if (!formData.representativeName.trim()) {
        setError('Primary Representative Name is required.');
        toast.error('Primary Representative Name is required.');
        return false;
      }
      if (!formData.representativePosition.trim()) {
        setError('Primary Representative Position is required.');
        toast.error('Primary Representative Position is required.');
        return false;
      }
      if (!formData.country.trim()) {
        setError('Market Origin is required.');
        toast.error('Market Origin is required.');
        return false;
      }
      if (!formData.phoneNumber.trim()) {
        setError('Phone Number is required.');
        toast.error('Phone Number is required.');
        return false;
      }
    } else if (step === 2) {
      const requiredDocs = ['businessRegistration', 'license', 'panCertificate', 'professionalCerts'];
      const friendlyNames: Record<string, string> = {
        businessRegistration: 'Business Registration Certificate',
        license: 'License',
        panCertificate: 'PAN/VAT Certificate',
        professionalCerts: 'Professional Certificates/Approvals'
      };
      for (const key of requiredDocs) {
        if (!formData.docStatuses?.uploadedFiles || !formData.docStatuses.uploadedFiles[key]) {
          const errorMsg = `Required Document Missing: ${friendlyNames[key]}`;
          setError(errorMsg);
          toast.error(errorMsg);
          return false;
        }
      }

      for (let i = 0; i < formData.references.length; i++) {
        const ref = formData.references[i];
        if (!ref.institutionName.trim() || !ref.country.trim() || !ref.contactName.trim() || !ref.position.trim() || !ref.email.trim()) {
          const errorMsg = `Please fill in all fields for Institutional Reference #${i + 1}.`;
          setError(errorMsg);
          toast.error(errorMsg);
          return false;
        }
      }
    } else if (step === 3) {
      if (!formData.recruitmentCountries || formData.recruitmentCountries.length === 0) {
        setError('Please select at least one Student Recruitment Country.');
        toast.error('Student Recruitment Countries required.');
        return false;
      }
      if (!formData.email.trim()) {
        setError('Email is required.');
        toast.error('Email is required.');
        return false;
      }
      if (!isAddingRole && !formData.password.trim()) {
        setError('Password is required.');
        toast.error('Password is required.');
        return false;
      }
      if (!isAddingRole && !formData.agreeTerms) {
        setError('Please agree to the terms and conditions.');
        toast.error('Agreement required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasRole) return;

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const targetName = formData.agencyName.trim().toLowerCase();
      const agentsSnap = await getDocs(collection(db, 'agents'));
      let existingAgent = agentsSnap.docs.find(doc => {
        const data = doc.data();
        const nameVal = data.agencyName || data.name;
        return nameVal && nameVal.trim().toLowerCase() === targetName;
      });

      if (!existingAgent) {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('agencyName', '==', formData.agencyName.trim())));
        if (!usersSnap.empty) {
          existingAgent = usersSnap.docs[0] as any;
        }
      }

      if (existingAgent) {
        setLoading(false);
        const errMessage = `An agency profile for "${formData.agencyName}" already exists. Creating duplicate agencies is not permitted. If your agency is already registered, existing admins can add/invite new members through their Teams Identity & Access Management page without requiring super admin approval. Please contact your agency administrator for an invitation.`;
        setError(errMessage);
        toast.error(errMessage);
        return;
      }
    } catch (checkErr) {
      console.warn("Error checking duplicate agency name:", checkErr);
    }

    const agentData = {
      agencyName: formData.agencyName,
      country: formData.country,
      address: formData.address,
      phoneNumber: formData.phoneNumber,
      representativeName: formData.representativeName,
      representativePosition: formData.representativePosition,
      recruitmentCountries: formData.recruitmentCountries || [],
      references: formData.references || [],
      logo: formData.logo,
      aboutText: formData.aboutText,
      recruitmentVolume: formData.recruitmentVolume,
      visaSuccessRate: formData.visaSuccessRate,
      docStatuses: formData.docStatuses,
      updatedAt: serverTimestamp(),
    };

    try {
      if (authUser) {
        const path = `users/${authUser.uid}`;
        try {
          await setDoc(doc(db, 'users', authUser.uid), {
            ...agentData,
            roles: ['agent'],
            status: 'pending',
          }, { merge: true });

          await setDoc(doc(db, 'agents', authUser.uid), {
            id: authUser.uid,
            agencyName: formData.agencyName,
            ceoName: profile?.fullName || `${formData.firstName} ${formData.lastName}`,
            email: profile?.email || formData.email,
            primaryEmail: profile?.email || formData.email,
            country: formData.country,
            location: formData.country,
            status: 'pending',
            baseCommissionPercentage: 0,
            walletBalance: 0,
            creditLimit: 0,
            createdAt: new Date().toISOString(),
            representativeName: formData.representativeName,
            representativePosition: formData.representativePosition,
            address: formData.address,
            phoneNumber: formData.phoneNumber,
            recruitmentCountries: formData.recruitmentCountries || [],
            references: formData.references || [],
            logo: formData.logo,
            aboutText: formData.aboutText,
            docStatuses: formData.docStatuses || {},
          });

          toast.success('Agent profile submitted successfully for review!');

          try {
            await fetch('/api/send-signup-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: profile?.email || formData.email,
                fullName: profile?.fullName || `${formData.firstName} ${formData.lastName}`
              })
            });
          } catch (e) {
            console.error("Failed to trigger signup email:", e);
          }

          router.push('/pending-approval');
        } catch (dbErr) {
          toast.error('Failed to update profile');
          handleFirestoreError(dbErr, OperationType.WRITE, path);
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        const path = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            email: formData.email,
            fullName: `${formData.firstName} ${formData.lastName}`,
            ...agentData,
            roles: ['agent'],
            status: 'pending',
            createdAt: serverTimestamp(),
          });

          await setDoc(doc(db, 'agents', user.uid), {
            id: user.uid,
            agencyName: formData.agencyName,
            ceoName: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            primaryEmail: formData.email,
            country: formData.country,
            location: formData.country,
            status: 'pending',
            baseCommissionPercentage: 0,
            walletBalance: 0,
            creditLimit: 0,
            createdAt: new Date().toISOString(),
            representativeName: formData.representativeName,
            representativePosition: formData.representativePosition,
            address: formData.address,
            phoneNumber: formData.phoneNumber,
            recruitmentCountries: formData.recruitmentCountries || [],
            references: formData.references || [],
            logo: formData.logo,
            aboutText: formData.aboutText,
            docStatuses: formData.docStatuses || {},
          });

          toast.success('Account created and profile submitted for review!');

          try {
            await fetch('/api/send-signup-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: formData.email,
                fullName: `${formData.firstName} ${formData.lastName}`
              })
            });
          } catch (e) {
            console.error("Failed to trigger signup email:", e);
          }

          router.push('/pending-approval');
        } catch (dbErr) {
          toast.error('Failed to create account profile');
          handleFirestoreError(dbErr, OperationType.WRITE, path);
        }
      }
    } catch (err: any) {
      let msg = '';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please log in first to add an agent role to your account.';
      } else {
        msg = getAuthErrorMessage(err);
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isAddingRole = !!authUser;

  return (
    <div className="min-h-screen bg-white py-24 px-6 font-outfit relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-5%] w-[600px] h-full bg-[#0059E7] opacity-5 blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
        {/* Left Side: Info */}
        <div className="hidden lg:block space-y-14">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl text-[#0059E7] border border-slate-100 shadow-sm">
              <Briefcase className="w-10 h-10" strokeWidth={2.5} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
              {isAddingRole
                ? "Scale Your Institutional Reach."
                : "Become a Verified Recruitment Partner."}
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
              Join the elite tier of global educaton consultancies using the Allianza ecosystem to drive exponential student success.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-10">
            {[
              { icon: Globe, title: "180+ Markets", desc: "Access verified programs in Tier-1 study destinations." },
              { icon: ShieldCheck, title: "Enterprise Grade", desc: "Highest security protocols and data integrity." },
              { icon: Zap, title: "Digital Pipeline", desc: "Automated application flow and smart tracking." },
              { icon: GraduationCap, title: "Verified Success", desc: "Industry-leading visa and enrollment percentages." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="space-y-4"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#0059E7] border border-slate-100 shadow-sm">
                  <item.icon size={20} strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-lg text-slate-900 tracking-tight">{item.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-bold">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl shadow-slate-200 border border-slate-100"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
              {isAddingRole ? 'Extend Credentials' : 'Agent Registration'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {isAddingRole ? 'Synchronize your professional agent profile.' : 'Establish your agency identity on the global network.'}
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="mb-10 relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

            <div
              className="absolute top-5 left-0 h-0.5 bg-[#0059E7] -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            />

            <div className="relative z-10 flex justify-between items-center px-2">
              {[
                { step: 1, title: 'Basic Details', desc: 'Primary agency info' },
                { step: 2, title: 'Compliance', desc: 'Docs & references' },
                { step: 3, title: 'Agency Setup & Credentials', desc: 'Profile & access' }
              ].map((item) => {
                const isActive = currentStep === item.step;
                const isCompleted = currentStep > item.step;

                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step < currentStep) {
                        setCurrentStep(item.step);
                      } else if (item.step === currentStep + 1) {
                        handleNext();
                      } else if (item.step === currentStep + 2 && currentStep === 1) {
                        if (validateStep(1)) {
                          setCurrentStep(2);
                          if (validateStep(2)) {
                            setCurrentStep(3);
                          }
                        }
                      }
                    }}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 border-2 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100'
                          : isActive
                          ? 'bg-[#0059E7] border-[#0059E7] text-white shadow-lg shadow-blue-100 scale-110'
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={16} strokeWidth={3} className="text-white" />
                      ) : (
                        item.step
                      )}
                    </div>
                    <div className="text-center mt-3 hidden md:block max-w-[140px]">
                      <p className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${isActive ? 'text-[#0059E7]' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {item.title}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-8 p-6 bg-red-50 border border-red-100 text-red-800 rounded-3xl text-[10px] font-black text-center uppercase tracking-widest leading-relaxed">
              Protocol Violation: {error}
            </div>
          )}

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (currentStep < 3) {
                handleNext();
              } else {
                handleSignUp(e);
              }
            }}
          >
            {/* STEP 1: BASIC DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                    <input
                      type="text"
                      required
                      disabled={isAddingRole}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last Name</label>
                    <input
                      type="text"
                      required
                      disabled={isAddingRole}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Agency Name</label>
                  <input
                    type="text"
                    required
                    disabled={isAddingRole && hasRole}
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    placeholder="Apex Education Group Ltd."
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Representative Name</label>
                    <input
                      type="text"
                      required
                      value={formData.representativeName}
                      onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Representative Position</label>
                    <input
                      type="text"
                      required
                      value={formData.representativePosition}
                      onChange={(e) => setFormData({ ...formData, representativePosition: e.target.value })}
                      placeholder="Managing Director"
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Market Origin</label>
                    <div className="relative">
                      <select
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold appearance-none cursor-pointer"
                        value={formData.country}
                        onChange={(e) => {
                          const newCountry = e.target.value;
                          const newCode = COUNTRY_DIAL_CODES[newCountry] || '+';
                          setFormData(prev => {
                            let updatedPhone = prev.phoneNumber;
                            const prevCode = COUNTRY_DIAL_CODES[prev.country] || '+';
                            if (!updatedPhone || updatedPhone.trim() === prevCode) {
                              updatedPhone = newCode;
                            } else if (updatedPhone.startsWith(prevCode)) {
                              updatedPhone = newCode + updatedPhone.slice(prevCode.length);
                            } else if (!updatedPhone.startsWith('+')) {
                              updatedPhone = newCode + ' ' + updatedPhone;
                            }
                            return {
                              ...prev,
                              country: newCountry,
                              phoneNumber: updatedPhone
                            };
                          });
                        }}
                      >
                        {['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'Nepal', 'India', 'Other'].filter(c => {
                          const countryNorm = (c || '').trim().toLowerCase();
                          for (const [key, value] of Object.entries(hiddenCountries || {})) {
                            if (value === true) {
                              const kNorm = key.trim().toLowerCase();
                              if (countryNorm === kNorm) return false;
                            }
                          }
                          return true;
                        }).map(ct => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <MapPin size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+X XXX XXX XXXX"
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recruitment Volume (Last Year)</label>
                    <select
                      value={formData.recruitmentVolume}
                      onChange={(e) => setFormData({ ...formData, recruitmentVolume: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold appearance-none cursor-pointer"
                    >
                      <option value="">Select volume</option>
                      <option value="0-50">0-50</option>
                      <option value="51-150">51-150</option>
                      <option value="151-200">151-200</option>
                      <option value="200+">200+</option>
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visa Success Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.visaSuccessRate}
                      onChange={(e) => setFormData({ ...formData, visaSuccessRate: e.target.value })}
                      placeholder="e.g., 95"
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: COMPLIANCE */}
            {currentStep === 2 && (
              <div className="space-y-8">
                {/* Required Registration Documents */}
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Required Verification Documents
                    </label>
                    <p className="text-xs text-slate-400 font-medium leading-normal px-1">
                      Upload official documentation to verify your agency credentials. All documents are strictly required.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'businessRegistration', label: 'Business Registration Certificate', desc: 'Official certificate of company/institution registration' },
                      { key: 'license', label: 'License', desc: 'Operating license from relevant local/national authorities' },
                      { key: 'panCertificate', label: 'PAN/VAT Certificate', desc: 'Tax registration certificate' },
                      { key: 'professionalCerts', label: 'Professional Certificates/Approvals', desc: 'Accreditation or professional association memberships' }
                    ].map((docItem) => {
                      const uploadedFile = formData.docStatuses?.uploadedFiles?.[docItem.key];
                      const isDragOver = dragOverKey === docItem.key;

                      return (
                        <div
                          key={docItem.key}
                          onDragEnter={(e) => handleDocDrag(e, docItem.key)}
                          onDragOver={(e) => handleDocDrag(e, docItem.key)}
                          onDragLeave={(e) => handleDocDrag(e, docItem.key)}
                          onDrop={(e) => handleDocDrop(e, docItem.key)}
                          className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between min-h-[160px] ${
                            uploadedFile
                              ? 'bg-emerald-50/10 border-emerald-100'
                              : isDragOver
                              ? 'border-[#0059E7] bg-blue-50/40 scale-[1.01]'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[11px] font-black text-slate-800 tracking-tight leading-tight uppercase">
                                {docItem.label}
                              </span>
                              {uploadedFile ? (
                                <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wider shrink-0">
                                  <CheckCircle size={10} strokeWidth={3} />
                                  Uploaded
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wider shrink-0">
                                  <AlertCircle size={10} strokeWidth={3} />
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                              {docItem.desc}
                            </p>
                          </div>

                          {uploadedFile ? (
                            <div className="mt-4 p-3 bg-slate-50/60 rounded-xl border border-slate-100/80 flex items-center justify-between gap-3 text-[10px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-[#0059E7] shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-700 truncate">{uploadedFile.name}</p>
                                  <p className="text-[9px] text-slate-400 font-medium">{uploadedFile.size}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => {
                                    const currentUploaded = { ...(prev.docStatuses?.uploadedFiles || {}) };
                                    delete currentUploaded[docItem.key];
                                    return {
                                      ...prev,
                                      docStatuses: {
                                        ...prev.docStatuses,
                                        uploadedFiles: currentUploaded,
                                        [docItem.key]: 'Missing'
                                      }
                                    };
                                  });
                                }}
                                className="text-[9px] font-black text-red-500 uppercase tracking-wider px-2 py-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerDocSelect(docItem.key)}
                              className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[10px] font-black text-slate-700 uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Upload size={12} strokeWidth={2.5} />
                              Choose / Drop File
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <input
                    type="file"
                    ref={docFileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && activeDocKey) {
                        handleDocUpload(e.target.files[0], activeDocKey);
                      }
                    }}
                  />
                </div>

                {/* References Section */}
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Institutional References
                      </label>
                      <p className="text-xs text-slate-400 font-medium leading-normal px-1">
                        References from partner universities or institutions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          references: [
                            ...formData.references,
                            { institutionName: '', country: '', contactName: '', position: '', email: '' }
                          ]
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-[10px] font-black text-[#0059E7] uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      Add Reference
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formData.references.map((ref, index) => (
                      <div key={index} className="relative p-5 bg-white rounded-xl border border-slate-100 space-y-4 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                            Reference #{index + 1}
                          </span>
                          {formData.references.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formData.references.filter((_, i) => i !== index);
                                setFormData({ ...formData, references: updated });
                              }}
                              className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Institution Name</label>
                            <input
                              type="text"
                              required
                              value={ref.institutionName}
                              onChange={(e) => {
                                const updated = [...formData.references];
                                updated[index].institutionName = e.target.value;
                                setFormData({ ...formData, references: updated });
                              }}
                              placeholder="e.g. University of Boston"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-xs font-bold placeholder:text-slate-300"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Country</label>
                            <input
                              type="text"
                              required
                              value={ref.country}
                              onChange={(e) => {
                                const updated = [...formData.references];
                                updated[index].country = e.target.value;
                                setFormData({ ...formData, references: updated });
                              }}
                              placeholder="e.g. United States"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-xs font-bold placeholder:text-slate-300"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Person Name</label>
                            <input
                              type="text"
                              required
                              value={ref.contactName}
                              onChange={(e) => {
                                const updated = [...formData.references];
                                updated[index].contactName = e.target.value;
                                setFormData({ ...formData, references: updated });
                              }}
                              placeholder="e.g. Sarah Jenkins"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-xs font-bold placeholder:text-slate-300"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Position</label>
                            <input
                              type="text"
                              required
                              value={ref.position}
                              onChange={(e) => {
                                const updated = [...formData.references];
                                updated[index].position = e.target.value;
                                setFormData({ ...formData, references: updated });
                              }}
                              placeholder="e.g. Director of Admissions"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-xs font-bold placeholder:text-slate-300"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                            <input
                              type="email"
                              required
                              value={ref.email}
                              onChange={(e) => {
                                const updated = [...formData.references];
                                updated[index].email = e.target.value;
                                setFormData({ ...formData, references: updated });
                              }}
                              placeholder="e.g. s.jenkins@uni.edu"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-xs font-bold placeholder:text-slate-300"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: AGENCY SETUP & CREDENTIALS */}
            {currentStep === 3 && (
              <div className="space-y-8">
                {/* Student Recruitment Countries */}
                <div className="space-y-3.5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Student Recruitment Countries
                    </label>
                    <span className="text-[10px] font-mono text-slate-400 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {formData.recruitmentCountries?.length || 0} selected
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-normal px-1">
                    Select the countries where your agency actively recruits students from:
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {['Nepal', 'India', 'Bangladesh', 'Sri Lanka', 'Pakistan', 'Vietnam', 'Philippines', 'Nigeria', 'Kenya', 'Ghana', 'Morocco', 'Other'].map((country) => {
                      const isSelected = formData.recruitmentCountries?.includes(country);
                      return (
                        <button
                          key={country}
                          type="button"
                          onClick={() => {
                            const current = formData.recruitmentCountries || [];
                            const next = isSelected
                              ? current.filter((c) => c !== country)
                              : [...current, country];
                            setFormData({ ...formData, recruitmentCountries: next });
                          }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-[#0059E7] text-white border-[#0059E7] shadow-md shadow-blue-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {country}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand Identity: Logo & About Text */}
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Brand Identity</label>
                    <p className="text-xs text-slate-400 font-medium leading-normal px-1">
                      Provide your official agency logo and a brief introduction.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo Upload Area */}
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Agency Logo</label>

                      {formData.logo ? (
                        <div className="relative group w-full h-36 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-4 shadow-sm">
                          <img
                            src={formData.logo}
                            alt="Agency Logo"
                            className="max-w-full max-h-full object-contain rounded-lg"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-2xl">
                            <button
                              type="button"
                              onClick={() => {
                                const fileInput = document.getElementById('logo-file-input');
                                if (fileInput) fileInput.click();
                              }}
                              className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, logo: '' })}
                              className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-600 transition-all cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => {
                            const fileInput = document.getElementById('logo-file-input');
                            if (fileInput) fileInput.click();
                          }}
                          className={`w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                            dragActive
                              ? 'border-[#0059E7] bg-blue-50/50 scale-[1.01]'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                          }`}
                        >
                          <Upload className={`w-8 h-8 mb-2 transition-transform duration-200 ${dragActive ? 'text-[#0059E7] -translate-y-1' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-700">Drag logo here or click to browse</span>
                          <span className="text-[10px] text-slate-400 mt-1 font-medium">PNG, JPG up to 1MB (Square preferred)</span>
                        </div>
                      )}

                      <input
                        type="file"
                        id="logo-file-input"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </div>

                    {/* About Agency Description */}
                    <div className="space-y-2.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">About Agency</label>
                      <textarea
                        value={formData.aboutText}
                        onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
                        placeholder="Describe your agency's history, recruitment destinations, and core values..."
                        rows={6}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-white text-xs font-bold placeholder:text-slate-300 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* Credentials */}
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Credentials</label>
                    <p className="text-xs text-slate-400 font-medium leading-normal px-1">
                      Set up your login credentials and agree to network terms.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
                      <input
                        type="email"
                        required
                        disabled={isAddingRole}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="operations@institution.com"
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                      />
                    </div>

                    {!isAddingRole && (
                      <>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="••••••••"
                              className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-[#0059E7] outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                            >
                              {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 py-2">
                          <input
                            type="checkbox"
                            id="terms"
                            checked={formData.agreeTerms}
                            onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                            className="mt-1 w-5 h-5 rounded-lg border-slate-300 text-[#0059E7] focus:ring-[#0059E7] cursor-pointer shadow-sm"
                          />
                          <label htmlFor="terms" className="text-[11px] text-slate-500 font-bold cursor-pointer leading-relaxed">
                            I acknowledge the{' '}
                            <button type="button" className="text-[#0059E7] font-black hover:underline underline-offset-4">
                              Digital Network Agreement
                            </button>{' '}
                            and comply with global protocol standards.
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Step Navigation Controls */}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  {currentStep === 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all cursor-pointer text-center"
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all cursor-pointer text-center"
                    >
                      Back
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="submit"
                      disabled={loading || hasRole}
                      className="flex-1 py-4 bg-custom-rainbow text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:opacity-95 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-4"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : hasRole ? 'Institutional Credential Active' : isAddingRole ? 'Expand Enterprise Node' : 'Initialize Onboarding'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 py-4 bg-[#0059E7] hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-100 transition-all cursor-pointer text-center"
                    >
                      Next Step
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>

          {!isAddingRole && (
            <p className="text-center mt-12 text-[11px] text-slate-400 font-black uppercase tracking-widest">
              Existing Entity?{' '}
              <Link href="/login" className="text-[#0059E7] hover:underline underline-offset-8 decoration-2 ml-2">
                Authenticate
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AgentSignUp;