"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  BarChart3,
  Loader2,
  Globe,
  ArrowRight,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getAuthErrorMessage, handleFirestoreError, OperationType } from "@/lib/authUtils";
import { useAuth } from "@/contexts/AuthContext";
import { uploadFileToFirestore } from "@/lib/fileStorage";
import { COUNTRIES } from "@/types";

const UniversitySignUpPage = () => {
  const router = useRouter();
  const { user: authUser, profile, institutions, hiddenCountries } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    institutionName: "",
    universityId: "",
    country: "United States",
    contactName: "",
    email: "",
    password: "",
    docStatuses: {
      businessRegistration: "Missing",
      panCertificate: "Missing",
      license: "Missing",
      professionalCerts: "Missing",
      uploadedFiles: {} as Record<
        string,
        {
          name: string;
          size: string;
          type: string;
          uploadedAt: string;
          dataUrl?: string;
        }
      >,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [uniSearch, setUniSearch] = useState("");
  const [debouncedUniSearch, setDebouncedUniSearch] = useState("");
  const [suggestedUni, setSuggestedUni] = useState<any | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUniSearch(uniSearch), 300);
    return () => clearTimeout(timer);
  }, [uniSearch]);

  useEffect(() => {
    if (formData.email && formData.email.includes("@")) {
      const domain = formData.email.split("@")[1].toLowerCase();
      const match = institutions.find((u) =>
        u.domains?.some(
          (d) =>
            domain === d.toLowerCase() ||
            domain.endsWith("." + d.toLowerCase())
        )
      );
      if (match && formData.institutionName !== match.name) {
        setSuggestedUni(match);
      } else {
        setSuggestedUni(null);
      }
    } else {
      setSuggestedUni(null);
    }
  }, [formData.email, formData.institutionName, institutions]);

  useEffect(() => {
    if (authUser && !formData.institutionName) {
      setFormData((prev) => ({
        ...prev,
        email: authUser.email || "",
        contactName: profile?.fullName || "",
        institutionName: profile?.institutionName || "",
        universityId: profile?.universityId || "",
        country: profile?.country || "United States",
        docStatuses:
          profile?.docStatuses || {
            businessRegistration: "Missing",
            panCertificate: "Missing",
            license: "Missing",
            professionalCerts: "Missing",
            uploadedFiles: {},
          },
      }));
    }
  }, [authUser, profile, formData.institutionName]);

  const handleDocUpload = (file: File, docKey: string) => {
    if (file.size > 1024 * 1024) {
      toast.error("Document file size must be under 1MB.");
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

        setFormData((prev) => {
          const docStatuses = prev.docStatuses;
          const currentUploaded = { ...(docStatuses.uploadedFiles || {}) };
          currentUploaded[docKey] = fileMeta;

          return {
            ...prev,
            docStatuses: {
              ...docStatuses,
              uploadedFiles: currentUploaded,
              [docKey]: "Pending Verification",
            },
          };
        });
        if (docFileInputRef.current) {
          docFileInputRef.current.value = "";
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

  const hasRole = profile?.roles.includes("university");

  const filteredPredefined = useMemo(() => {
    const term = debouncedUniSearch.toLowerCase().trim();
    if (!term) return [];
    return institutions
      .filter((u) => {
        const rawName = u.name || "";
        return (
          rawName.toLowerCase().startsWith(term) ||
          !!rawName.split(" ").find((w) => w.toLowerCase().startsWith(term))
        );
      })
      .slice(0, 50);
  }, [debouncedUniSearch, institutions]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasRole) return;

    if (!formData.institutionName) {
      setError("Please select or enter your institution name.");
      return;
    }

    const requiredDocs = [
      "businessRegistration",
      "license",
      "panCertificate",
      "professionalCerts",
    ];
    const friendlyNames: Record<string, string> = {
      businessRegistration: "Business Registration Certificate",
      license: "License",
      panCertificate: "PAN/VAT Certificate",
      professionalCerts: "Professional Certificates/Approvals",
    };
    for (const key of requiredDocs) {
      if (
        !formData.docStatuses?.uploadedFiles ||
        !formData.docStatuses.uploadedFiles[key]
      ) {
        const errorMsg = `Please upload the required document: ${friendlyNames[key]}`;
        setError(errorMsg);
        toast.error(`Required Document Missing: ${friendlyNames[key]}`);
        return;
      }
    }

    setError(null);

    try {
      const targetName = formData.institutionName.trim().toLowerCase();
      const univsSnap = await getDocs(collection(db, "universities"));
      let existingUniv = univsSnap.docs.find((doc) => {
        const data = doc.data();
        const nameVal = data.name || data.institutionName;
        return nameVal && nameVal.trim().toLowerCase() === targetName;
      });

      if (!existingUniv) {
        const usersSnap = await getDocs(
          query(
            collection(db, "users"),
            where("institutionName", "==", formData.institutionName.trim())
          )
        );
        if (!usersSnap.empty) {
          existingUniv = usersSnap.docs[0] as any;
        }
      }

      if (existingUniv) {
        const errMessage = `An institution profile for "${formData.institutionName}" already exists. Creating duplicate institutions is not permitted. If your institution is already registered, existing admins can add/invite new members through their Teams Identity & Access Management page without requiring super admin approval. Please contact your organization administrator for an invitation.`;
        setError(errMessage);
        toast.error(errMessage);
        return;
      }
    } catch (checkErr) {
      console.warn("Error checking duplicate institution name:", checkErr);
    }

    try {
      const profileData = {
        institutionName: formData.institutionName,
        universityId: formData.universityId || authUser?.uid || "pending",
        country: formData.country,
        roles: ["university"],
        docStatuses: formData.docStatuses,
        updatedAt: serverTimestamp(),
      };

      if (authUser) {
        const path = `users/${authUser.uid}`;
        try {
          await setDoc(
            doc(db, "users", authUser.uid),
            {
              ...profileData,
              email: authUser.email || "",
              fullName: authUser.displayName || formData.contactName,
              status: "pending",
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );

          await setDoc(doc(db, "universities", authUser.uid), {
            id: authUser.uid,
            name: formData.institutionName,
            country: formData.country,
            status: "pending",
            intakes: [],
            disciplines: [],
            featured: false,
            email: authUser.email || "",
            contactName: formData.contactName,
            docStatuses: formData.docStatuses || {},
            createdAt: new Date().toISOString(),
          });

          toast.success("University profile submitted successfully for review!");

          try {
            await fetch("/api/send-signup-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: authUser.email || formData.email,
                fullName: authUser.displayName || formData.contactName,
              }),
            });
          } catch (e) {
            console.error("Failed to trigger signup email:", e);
          }

          router.push("/pending-approval");
        } catch (dbErr) {
          toast.error("Failed to update profile");
          handleFirestoreError(dbErr, OperationType.WRITE, path);
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        const user = userCredential.user;

        const path = `users/${user.uid}`;
        try {
          await setDoc(doc(db, "users", user.uid), {
            email: formData.email,
            fullName: formData.contactName,
            ...profileData,
            roles: ["university"],
            status: "pending",
            createdAt: serverTimestamp(),
          });

          await setDoc(doc(db, "universities", user.uid), {
            id: user.uid,
            name: formData.institutionName,
            country: formData.country,
            status: "pending",
            intakes: [],
            disciplines: [],
            featured: false,
            email: formData.email,
            contactName: formData.contactName,
            docStatuses: formData.docStatuses || {},
            createdAt: new Date().toISOString(),
          });

          toast.success("Account created and profile submitted for review!");

          try {
            await fetch("/api/send-signup-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: formData.email,
                fullName: formData.contactName,
              }),
            });
          } catch (e) {
            console.error("Failed to trigger signup email:", e);
          }

          router.push("/pending-approval");
        } catch (dbErr) {
          toast.error("Failed to create institution profile");
          handleFirestoreError(dbErr, OperationType.WRITE, path);
        }
      }
    } catch (err: any) {
      let msg = "";
      if (err.code === "auth/email-already-in-use") {
        msg =
          "This email is already registered. Please log in first to add a university account.";
      } else {
        msg = getAuthErrorMessage(err);
      }
      setError(msg);
      toast.error(msg);
    }
  };

  const isAddingRole = !!authUser;

  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6 font-outfit relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-5%] w-[600px] h-full bg-emerald-500 opacity-5 blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
        <div className="hidden lg:block space-y-14">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl text-emerald-600 border border-slate-100 shadow-sm">
              <Building2 className="w-10 h-10" strokeWidth={2.5} />
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight">
              {isAddingRole
                ? "Scale Your Institutional Presence."
                : "The Integrated Campus for Global Enrollment."}
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
              Allianza provides academic institutions with direct access to
              pre-screened students and a verified global recruitment
              infrastructure.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-10">
            {[
              {
                icon: ShieldCheck,
                title: "Verified Integrity",
                desc: "Highest standards for candidate screening and validation.",
              },
              {
                icon: Zap,
                title: "Efficiency Engine",
                desc: "Reduce admissions overhead by 40% with smart workflows.",
              },
              {
                icon: BarChart3,
                title: "Deep Intelligence",
                desc: "Proprietary analytics for market and partner performance.",
              },
              {
                icon: Globe,
                title: "Global Authority",
                desc: "Instant visibility in 180+ emerging student markets.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="space-y-4"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-600 border border-slate-100 shadow-sm">
                  <item.icon size={20} strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-lg text-slate-900 tracking-tight">
                  {item.title}
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed font-bold">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl shadow-slate-200 border border-slate-100"
        >
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
              {isAddingRole
                ? "Extend Credentials"
                : "Institution Onboarding"}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {isAddingRole
                ? "Synchronize your institutional profile."
                : "Establish your university node on the global network."}
            </p>
          </div>

          {error && (
            <div className="mb-8 p-6 bg-red-50 border border-red-100 text-red-800 rounded-3xl text-[10px] font-black text-center uppercase tracking-widest leading-relaxed">
              Protocol Violation: {error}
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  disabled={isAddingRole}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                  placeholder="admissions@institution.edu"
                />
              </div>

              <AnimatePresence>
                {suggestedUni && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-600">
                        <Zap size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
                          Verified Match
                        </p>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">
                          {suggestedUni.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          institutionName: suggestedUni.name,
                          universityId: suggestedUni.id,
                          country: suggestedUni.country,
                        });
                        setUniSearch(suggestedUni.name);
                        setSuggestedUni(null);
                        toast.success("System parameters synchronized");
                      }}
                      className="px-4 py-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors shrink-0"
                    >
                      Connect
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2.5 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Institutional Brand
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  disabled={isAddingRole && hasRole}
                  value={formData.institutionName}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      institutionName: e.target.value,
                      universityId: "",
                    });
                    setUniSearch(e.target.value);
                    setShowUniDropdown(true);
                  }}
                  onFocus={() => setShowUniDropdown(true)}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                  placeholder="University Name"
                />

                <AnimatePresence>
                  {showUniDropdown &&
                    uniSearch.trim().length > 0 &&
                    filteredPredefined.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 left-0 right-0 top-full mt-3 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden max-h-[240px] overflow-y-auto"
                      >
                        {filteredPredefined.map((uni) => (
                          <button
                            key={uni.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                institutionName: uni.name,
                                universityId: uni.id,
                                country: uni.country,
                              });
                              setUniSearch(uni.name);
                              setShowUniDropdown(false);
                            }}
                            className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                          >
                            <p className="text-sm font-bold text-slate-800 mb-1">
                              {uni.name}
                            </p>
                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                              {uni.country}
                            </p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Headquarters
                </label>
                <div className="relative">
                  <select
                    value={formData.country}
                    disabled={isAddingRole && hasRole}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all bg-slate-50 text-sm font-bold appearance-none cursor-pointer disabled:opacity-60"
                  >
                    {COUNTRIES.filter((c) => {
                      const countryNorm = (c || "").trim().toLowerCase();
                      for (const [key, value] of Object.entries(
                        hiddenCountries || {}
                      )) {
                        if (value === true) {
                          const kNorm = key.trim().toLowerCase();
                          if (countryNorm === kNorm) return false;
                        }
                      }
                      return true;
                    }).map((country) => (
                      <option key={country}>{country}</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <Globe size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Officer Identity
                </label>
                <input
                  type="text"
                  required
                  placeholder="Primary Officer Name"
                  disabled={isAddingRole}
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Required Verification Documents
                </label>
                <p className="text-xs text-slate-400 font-medium leading-normal px-1">
                  Upload official documentation to verify your institution
                  credentials. All documents are strictly required.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: "businessRegistration",
                    label: "Business Registration Certificate",
                    desc: "Official certificate of company/institution registration",
                  },
                  {
                    key: "license",
                    label: "License",
                    desc: "Operating license from relevant local/national authorities",
                  },
                  {
                    key: "panCertificate",
                    label: "PAN/VAT Certificate",
                    desc: "Tax registration certificate",
                  },
                  {
                    key: "professionalCerts",
                    label: "Professional Certificates/Approvals",
                    desc: "Accreditation or professional association memberships",
                  },
                ].map((docItem) => {
                  const uploadedFile =
                    formData.docStatuses?.uploadedFiles?.[docItem.key];
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
                          ? "bg-emerald-50/10 border-emerald-100"
                          : isDragOver
                          ? "border-emerald-500 bg-emerald-50/40 scale-[1.01]"
                          : "bg-white border-slate-100 hover:border-slate-200"
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
                            <FileText size={16} className="text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-700 truncate">
                                {uploadedFile.name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium">
                                {uploadedFile.size}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => {
                                const currentUploaded = {
                                  ...(prev.docStatuses?.uploadedFiles || {}),
                                };
                                delete currentUploaded[docItem.key];
                                return {
                                  ...prev,
                                  docStatuses: {
                                    ...prev.docStatuses,
                                    uploadedFiles: currentUploaded,
                                    [docItem.key]: "Missing",
                                  },
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

            {!isAddingRole && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!isAddingRole}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all bg-slate-50 text-sm font-bold placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={2.5} />
                    ) : (
                      <Eye size={18} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              disabled={hasRole}
              className="w-full py-5 bg-custom-rainbow text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:opacity-95 shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-4"
            >
              {hasRole ? (
                "Institutional Credential Active"
              ) : (
                <>
                  {isAddingRole
                    ? "Expand Institutional Node"
                    : "Initialize Synchronization"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {!isAddingRole && (
            <p className="text-center mt-12 text-[11px] text-slate-400 font-black uppercase tracking-widest">
              Commercial Entity?{" "}
              <Link
                href="/signup/agent"
                className="text-[#0059E7] hover:underline underline-offset-8 decoration-2 ml-2"
              >
                Connect via Agency Hub
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UniversitySignUpPage;