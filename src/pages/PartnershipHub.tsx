'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  FileSignature, 
  FileCheck, 
  FileText, 
  Upload, 
  Globe, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  ShieldCheck, 
  Coins, 
  History, 
  Calendar, 
  Settings, 
  ArrowRight, 
  User, 
  Building2, 
  ExternalLink, 
  ChevronDown, 
  Check, 
  Briefcase,
  Layers,
  FileSpreadsheet
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { 
  fetchPartnershipConfig, 
  fetchPartnershipHistory, 
  savePartnershipConfiguration, 
  PartnershipConfig, 
  HistoryLog 
} from '@/services/partnershipService'
import SignaturePad from '@/components/dashboard/SignaturePad'
import AgentNetworkPage from './AgentNetworkPage'
import { CentralLoader } from '@/components/dashboard/CentralLoader'
import { shouldExcludeAgency } from '@/utils/excludedAgencies'
import { isSameUniversity } from '@/lib/universityUtils'

export default function PartnershipHub() {
  const router = useRouter()
  const { profile, user, hideSupportCenter, activeRole } = useAuth()
  
  if (activeRole === 'agent') {
    return <AgentNetworkPage />
  }

  const institutionId = profile?.universityId || 'global-college-malta'
  
  const [activeTab, setActiveTab] = useState<'config' | 'requests'>('config')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [config, setConfig] = useState<PartnershipConfig>({
    agreementTitle: "STUDENT SERVICE REPRESENTATION AGREEMENT",
    defaultDuration: "1 Year",
    commissionAmount: 1200,
    commissionCurrency: "EUR",
    visaRefusalFee: 100,
    additionalTerms: "Commission payments are disbursed upon verified enrollment. No commission is paid for student withdrawals during the refund window.",
    uploadedFileName: "standard-agreement-template-v2.pdf"
  })

  const [dbConfig, setDbConfig] = useState<PartnershipConfig | null>(null)

  const [history, setHistory] = useState<HistoryLog[]>([])

  const [requests, setRequests] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)

  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    if (!institutionId) return
    setLoading(true)
    try {
      const activeConfig = await fetchPartnershipConfig(institutionId)
      if (activeConfig) {
        setConfig(activeConfig)
        setDbConfig(activeConfig)
      } else {
        await savePartnershipConfiguration(institutionId, config, null, profile?.uid || 'system')
        setDbConfig(config)
      }

      const activeHistory = await fetchPartnershipHistory(institutionId)
      setHistory(activeHistory)
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load partnership setup data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (institutionId) {
      loadData()
    }

    const targetUniId = profile?.universityId || user?.uid || institutionId || 'global-college-malta'
    const targetUniName = profile?.universityName || profile?.institutionName || profile?.fullName || profile?.name || 'Global College Malta'
    const myUniIds = [targetUniId, user?.uid, profile?.universityId, institutionId, 'global-college-malta', 'gcm', 'gcm-uid'].filter(Boolean) as string[]

    const matchesInstitution = (uniIdVal?: string | null, uniNameVal?: string | null) => {
      if (!uniIdVal && !uniNameVal) return true
      return myUniIds.some(id => isSameUniversity(id, uniIdVal) || isSameUniversity(id, uniNameVal)) ||
        isSameUniversity(targetUniName, uniNameVal) ||
        isSameUniversity(targetUniName, uniIdVal)
    }

    const qAgreements = query(collection(db, 'agreements'))
    const qRequests = query(collection(db, 'partnershipRequests'))

    let fetchedAgreements: any[] = []
    let fetchedRequests: any[] = []

    const updateCombined = () => {
      const allProposals = [...fetchedRequests, ...fetchedAgreements]
      
      const filtered = allProposals.filter(p => {
        if (!matchesInstitution(p.universityId, p.universityName)) return false

        const agName = p.agentName || p.agencyName || p.agentDetails?.companyName || p.agentDetails?.representativeName || ''
        const repName = p.agentDetails?.representativeName || ''
        if (shouldExcludeAgency(agName) || shouldExcludeAgency(repName) || shouldExcludeAgency(p.email)) {
          const collectionName = p.type === 'request' ? 'partnershipRequests' : 'agreements'
          if (p.id) {
            deleteDoc(doc(db, collectionName, p.id)).catch(() => {})
          }
          return false
        }
        return true
      })

      const uniqueProposals = Array.from(new Map(filtered.map(p => [p.id, p])).values())
      setRequests(uniqueProposals)
    }

    const unsubAgreements = onSnapshot(qAgreements, (snapshotAgreements) => {
      fetchedAgreements = snapshotAgreements.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'agreement' }))
      updateCombined()
    }, (error) => {
      console.error("Error listening to agreements:", error)
    })

    const unsubRequests = onSnapshot(qRequests, (snapshotRequests) => {
      fetchedRequests = snapshotRequests.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'request' }))
      updateCombined()
    }, (error) => {
      console.error("Error listening to requests:", error)
    })

    return () => {
      unsubAgreements()
      unsubRequests()
    }
  }, [institutionId, profile?.universityId, profile?.universityName, user?.uid])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setConfig(prev => ({ ...prev, uploadedFileName: file.name }))
      toast.success(`Attached "${file.name}" to config`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setConfig(prev => ({ ...prev, uploadedFileName: file.name }))
      toast.success(`Attached "${file.name}" to config`)
    }
  }

  const handleSaveConfig = async () => {
    if (!institutionId) return
    setSaving(true)
    try {
      await savePartnershipConfiguration(institutionId, config, dbConfig, profile?.uid || 'system')
      toast.success("Partnership configurations saved successfully!")
      
      setDbConfig(config)
      const updatedHistory = await fetchPartnershipHistory(institutionId)
      setHistory(updatedHistory)
    } catch (e) {
      console.error(e)
      toast.error("An error occurred preserving your configuration adjustments.")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string, type: string = 'agreement') => {
    try {
      const collectionName = type === 'request' ? 'partnershipRequests' : 'agreements'
      await updateDoc(doc(db, collectionName, id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}!`)
      setSelectedRequest(null)
    } catch (error) {
      console.error(error)
      toast.error("Failed to update proposal status.")
    }
  }

  if (loading) {
    return <CentralLoader minHeight="min-h-[400px]" />
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
      <div className="flex items-center justify-start gap-6 pb-2">
        <div className="bg-slate-100/70 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] p-1.5 shadow-xl shadow-slate-200/30 flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'config' 
                ? 'bg-[#0059E7] text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Settings size={18} />
            <span>Master Config</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'requests' 
                ? 'bg-[#0059E7] text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileSignature size={18} />
            <span>Active Proposals</span>
            {requests.filter(r => r.status === 'new').length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                {requests.filter(r => r.status === 'new').length}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'config' ? (
          <motion.div 
            key="config-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-8"
          >
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-1">Agreement Document Title</label>
                      <input 
                        type="text"
                        value={config.agreementTitle}
                        onChange={(e) => setConfig({ ...config, agreementTitle: e.target.value })}
                        className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#0059E7] shadow-sm"
                        placeholder="e.g. MASTER STUDENT SERVICE REPRESENTATION AGREEMENT"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-1">Default Duration</label>
                        <div className="relative">
                          <input 
                            type="text"
                            value={config.defaultDuration}
                            onChange={(e) => setConfig({ ...config, defaultDuration: e.target.value })}
                            className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#0059E7] shadow-sm"
                            placeholder="e.g. 1 Year"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-1">Commission Structure</label>
                        <div className="flex rounded-xl overflow-hidden shadow-sm border border-slate-200/80 bg-white group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-[#0059E7] transition-all">
                          <select 
                            value={config.commissionCurrency}
                            onChange={(e) => setConfig({ ...config, commissionCurrency: e.target.value })}
                            className="bg-slate-50 border-none px-4 py-3 text-sm font-black text-slate-700 outline-none select-none shrink-0 border-r border-slate-100 cursor-pointer"
                          >
                            <option value="EUR">€ EUR</option>
                            <option value="USD">$ USD</option>
                            <option value="NPR">₨ NPR</option>
                          </select>
                          <input 
                            type="number"
                            value={config.commissionAmount}
                            onChange={(e) => setConfig({ ...config, commissionAmount: Number(e.target.value) })}
                            className="w-full border-0 px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                            placeholder="e.g. 1200"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-1">Visa Refusal Processing Fee</label>
                      <div className="flex rounded-xl overflow-hidden shadow-sm border border-slate-200/80 bg-white group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-[#0059E7] transition-all">
                        <div className="bg-slate-50 px-5 py-3 text-sm font-black text-slate-500 border-r border-slate-100 select-none">
                          {config.commissionCurrency}
                        </div>
                        <input 
                          type="number"
                          value={config.visaRefusalFee}
                          onChange={(e) => setConfig({ ...config, visaRefusalFee: Number(e.target.value) })}
                          className="w-full border-none px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white"
                          placeholder="e.g. 100"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-1">Additional Terms & Conditions</label>
                      <textarea 
                        value={config.additionalTerms}
                        rows={4}
                        onChange={(e) => setConfig({ ...config, additionalTerms: e.target.value })}
                        className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#0059E7] shadow-sm resize-none"
                        placeholder="Specify dynamic terms, payment notes, and conditions..."
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase pl-1">Agreement PDF Template</label>
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                          dragActive 
                            ? 'border-[#0059E7] bg-blue-50/50 scale-[0.99] shadow-inner' 
                            : 'border-slate-200/80 bg-slate-50/50 hover:bg-white/80 hover:border-[#0059E7] hover:shadow-lg hover:shadow-blue-900/5'
                        }`}
                      >
                        <input 
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-center text-[#0059E7] mb-6 group-hover:scale-110 transition-transform">
                          <Upload size={28} />
                        </div>

                        <h4 className="text-lg font-extrabold text-slate-900 mb-2 font-outfit">Drag & Drop Template</h4>
                        <p className="text-slate-400 text-xs font-semibold max-w-xs mx-auto leading-relaxed">Upload PDF Agreement Template (Max 15MB)</p>

                        {config.uploadedFileName && (
                          <div className="mt-6 flex items-center gap-3 text-emerald-700 bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 animate-fadeIn">
                            <CheckCircle2 size={16} />
                            <span className="tracking-tight">Attached: {config.uploadedFileName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-100/50 flex flex-col sm:flex-row justify-end gap-4">
                    <button 
                      onClick={() => loadData()}
                      className="px-8 py-3.5 border-2 border-slate-200 text-slate-500 rounded-xl font-bold text-[11px] tracking-widest uppercase hover:bg-slate-50 transition-all cursor-pointer w-full sm:w-auto"
                    >
                      Reset Form
                    </button>
                      <button 
                        disabled={saving}
                        onClick={handleSaveConfig}
                        className="px-10 py-3.5 bg-[#0059E7] hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] tracking-widest uppercase shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 cursor-pointer w-full sm:w-auto hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                      >
                        {saving ? 'Syncing...' : 'Save Configuration'}
                        <ArrowRight size={18} />
                      </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-[#0B1528] to-[#0D59E7] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-900/10 overflow-hidden relative group h-56 flex flex-col justify-end transition-all hover:shadow-blue-900/20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
                <div className="absolute top-8 left-10 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg">
                  <Globe size={32} className="text-blue-200" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-extrabold text-2xl font-outfit">Global College Malta</h4>
                  <p className="text-blue-200 text-[10px] font-black tracking-[0.25em] opacity-80 uppercase mt-2">Institutional Hub</p>
                </div>
              </div>

              <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/30">
                <div className="flex items-center gap-5 border-b border-slate-100 pb-8 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-outfit">Compliance</h3>
                    <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Corridor Audit</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed">
                    All global agreement configurations must align with international student recruitment standards.
                  </p>

                  <ul className="space-y-5">
                    {[
                      "Minimum placement commission must exceed 10%.",
                      "Refund clauses must be explicit and transparent.",
                      "Visa denial processing must be clearly defined."
                    ].map((text, i) => (
                      <li key={i} className="flex gap-4 items-start text-[13px] text-slate-600 font-bold">
                        <div className="w-2 h-2 bg-[#0059E7] rounded-full shrink-0 mt-1.5 shadow-sm shadow-blue-500/20" />
                        {text}
                      </li>
                    ))}
                  </ul>

                  {!hideSupportCenter && (
                    <button 
                      onClick={() => router.push("/help-support")}
                      className="w-full py-5 bg-blue-50/80 hover:bg-[#0059E7] text-[#0059E7] hover:text-white font-black text-[11px] tracking-widest uppercase rounded-2xl transition-all shadow-sm border border-blue-100"
                    >
                      Review Global Standards
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/30 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-8 mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner border border-amber-100">
                      <History size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 font-outfit">Audit Feed</h3>
                      <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Ledger Timeline</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 tracking-tighter uppercase">Live Sync</span>
                  </div>
                </div>

                <div className="relative pl-8 border-l-2 border-slate-100 space-y-10 py-2">
                  {history.slice(0, 5).map((log, index) => (
                    <div className="relative group" key={log.id || index}>
                      <span className="absolute -left-[41px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-[#0059E7] group-hover:scale-125 transition-transform shadow-lg shadow-blue-500/10 z-10" />
                      <div className="space-y-2">
                        <p className="text-[11px] font-black text-[#0059E7] tracking-[0.2em] uppercase">
                          {log.timestamp ? 
                            new Date(log.timestamp.toDate()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Recent'
                          }
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed font-bold">
                          {log.actionText.includes('**') ? (
                            <span>
                              {log.actionText.split('**')[0]}
                              <span className="text-slate-900 underline decoration-[#0059E7]/40 underline-offset-4 decoration-2">{log.actionText.split('**')[1]}</span>
                              {log.actionText.split('**')[2]}
                            </span>
                          ) : log.actionText}
                        </p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs font-black italic tracking-wider">
                      No mutations recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="requests-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight font-outfit">Agency Proposals</h3>
                  <p className="text-slate-500 text-xs font-semibold">Verify credentials and sign pending agreements securely.</p>
                </div>
                <div className="flex items-center gap-3 bg-white/80 px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm self-start sm:self-auto ring-4 ring-slate-50">
                  <div className="w-2 h-2 rounded-full bg-[#0059E7] shadow-sm shadow-blue-500/40" />
                  <span className="text-[10px] font-black text-slate-700 tracking-tight">Total Inbox: <span className="text-[#0059E7]">{requests.length}</span></span>
                </div>
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black tracking-[0.25em] uppercase">
                      <th className="py-4 px-8 w-[35%]">Partner Agency</th>
                      <th className="py-4 px-8 w-[20%]">Representative</th>
                      <th className="py-4 px-8 w-[15%]">Commission</th>
                      <th className="py-4 px-8 w-[15%]">Status</th>
                      <th className="py-4 px-8 text-right w-[15%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {requests.map(request => (
                      <tr 
                        key={request.id} 
                        className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                        onClick={() => router.push(`/agreements/review/${request.id}`)}
                      >
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0059E7] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all border border-blue-100">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm group-hover:text-[#0059E7] transition-colors leading-tight truncate">{request.agentName}</p>
                              <p className="text-[9px] text-slate-400 font-black mt-0.5 tracking-[0.15em] uppercase">Verified Partner</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="text-[11px] text-slate-600 font-black flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <User size={13} className="text-slate-400" />
                              <span className="truncate">{request.agentDetails?.representativeName || 'N/A'}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold pl-5 truncate">{request.agentDetails?.position || 'Agent Rep'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                           <div className="flex items-center gap-2 text-xs font-black text-[#0059E7]">
                             <Coins size={16} className="text-blue-300" />
                             <span>{request.terms?.commissionRate || `${config.commissionCurrency} ${config.commissionAmount}`}</span>
                           </div>
                        </td>
                        <td className="py-5 px-8">
                          <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black items-center gap-2 border shadow-sm ${
                            request.status === 'approved' || request.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            request.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              request.status === 'approved' || request.status === 'signed' ? 'bg-emerald-500' :
                              request.status === 'rejected' ? 'bg-red-500' :
                              'bg-amber-500'
                            }`} />
                            <span className="tracking-widest">{request.status.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/agreements/review/${request.id}`)
                              }}
                              className="w-10 h-10 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-[#0059E7] hover:border-blue-100 rounded-xl flex items-center justify-center transition-all shadow-sm"
                              title="View Document"
                            >
                              <FileText size={18} />
                            </button>
                            {request.status === 'new' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateStatus(request.id, 'under_review', request.type)
                                  router.push(`/agreements/review/${request.id}`)
                                }}
                                className="px-6 py-2.5 bg-[#0059E7] hover:bg-blue-700 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-slate-100/50">
                {requests.map(request => (
                  <div 
                    key={request.id} 
                    className="p-6 hover:bg-white/80 active:bg-slate-50 transition-all cursor-pointer space-y-6"
                    onClick={() => router.push(`/agreements/review/${request.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0059E7] flex items-center justify-center shrink-0">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{request.agentName}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider uppercase">Submission Inbox</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-bold items-center gap-2 border shadow-sm shrink-0 ${
                        request.status === 'approved' || request.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        request.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          request.status === 'approved' || request.status === 'signed' ? 'bg-emerald-500' :
                          request.status === 'rejected' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`} />
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Representative</p>
                        <div className="text-xs text-slate-800 font-bold flex items-center gap-2">
                          <User size={14} className="text-slate-300" />
                          <span className="truncate">{request.agentDetails?.representativeName || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Commission</p>
                        <div className="text-xs text-[#0059E7] font-bold flex items-center gap-2">
                          <Coins size={14} className="text-slate-300" />
                          <span>{request.terms?.commissionRate || `${config.commissionCurrency} ${config.commissionAmount}`}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/agreements/review/${request.id}`)
                        }}
                        className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <FileText size={16} /> View Details
                      </button>
                      {request.status === 'new' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(request.id, 'under_review', request.type)
                            router.push(`/agreements/review/${request.id}`)
                          }}
                          className="flex-1 py-4 bg-[#0059E7] text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-blue-500/20"
                        >
                          Start Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {requests.length === 0 && (
                <div className="p-24 text-center flex flex-col items-center justify-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100 text-slate-300 shadow-inner">
                    <FileSignature size={48} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-900">No Proposals Found</h4>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">Incoming contract requests from recruitment agency networks will be cataloged instantly here.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedRequest(null)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-3xl h-[calc(100vh-32px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0059E7] flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Review Partnership Request</h3>
                    <p className="text-slate-500 text-xs font-semibold">{selectedRequest.agentName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors shrink-0"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 rounded-xl p-6">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 mb-2">Agency Details</h4>
                    <ul className="text-slate-700 text-xs font-bold space-y-1.5">
                      <li>Name: <span className="font-medium text-slate-600">{selectedRequest.agentDetails?.companyName || selectedRequest.agentName}</span></li>
                      <li>Rep: <span className="font-medium text-slate-600">{selectedRequest.agentDetails?.representativeName || 'N/A'}</span></li>
                      <li>Position: <span className="font-medium text-slate-600">{selectedRequest.agentDetails?.position || 'N/A'}</span></li>
                      <li>Address: <span className="font-medium text-slate-600 text-[11px] block mt-0.5 leading-relaxed">{selectedRequest.agentDetails?.address || 'Not specified'}</span></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 mb-2">Requested Terms</h4>
                    <ul className="text-slate-700 text-xs font-bold space-y-1.5">
                      <li>Commission: <span className="font-medium text-[#0059E7]">{selectedRequest.terms?.commissionRate || `${config.commissionCurrency} ${config.commissionAmount}`}</span></li>
                      <li>Terms File: <span className="font-medium text-slate-600 truncate block mt-0.5">{selectedRequest.terms?.attachedDocName || config.uploadedFileName}</span></li>
                    </ul>
                  </div>
                </div>

                {selectedRequest.status === 'under_review' && (
                  <div className="border border-amber-200 rounded-2xl p-6 bg-amber-50/40 space-y-4">
                    <div className="flex gap-2.5 items-start">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                      <div>
                        <h4 className="text-xs font-bold text-amber-800">Awaiting Institutional Counter-Signature</h4>
                        <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                          Please verify your counter-signature specifications below. Drawing a signature establishes approval of this partnership.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-2">
                      <SignaturePad 
                        onSave={(signatureUrl) => {
                          if (signatureUrl) {
                            toast.success("Signature recorded successfully in sandbox context!")
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400">Document Template Representation</span>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">PDF PREVIEW</span>
                  </div>
                  
                  <div className="p-8 bg-white font-serif text-xs text-slate-800 leading-relaxed space-y-6 max-h-[70vh] overflow-y-auto">
                    {selectedRequest.finalHtml || selectedRequest.agentSignedHtml ? (
                      <div 
                        className="agreement-content-preview text-slate-800 leading-relaxed font-sans text-sm text-justify space-y-4"
                        dangerouslySetInnerHTML={{ __html: selectedRequest.finalHtml || selectedRequest.agentSignedHtml }} 
                      />
                    ) : (
                      <>
                        <h3 className="text-center font-bold text-sm text-slate-900 border-b pb-4">
                          {selectedRequest.terms?.agreementTitle || config.agreementTitle}
                        </h3>
                        
                        <p>
                          This Representative Agreement is made effective between <strong className="text-slate-900 font-bold">{profile?.fullName || "[University Name placeholder]"}</strong> (Institution) and <strong className="text-slate-900 font-bold">{selectedRequest.agentName}</strong> (Agent).
                        </p>

                        <p>
                          <strong>1. SCOPE:</strong> The Agent is authorized to promote and recruit qualified international students for university-bound academic streams in accordance with institutional guidelines.
                        </p>

                        <p>
                          <strong>2. COMPENSATION:</strong> Payable at <strong className="text-[#0059E7]">{selectedRequest.terms?.commissionRate || `${config.commissionCurrency} ${config.commissionAmount}`}</strong> per student registration, disbursed post enrollment.
                        </p>

                        <p>
                          <strong>3. VISA PROCESSES:</strong> A visa processing rejection penalty of <strong className="text-[#0059E7]">{config.commissionCurrency} {config.visaRefusalFee}</strong> is levied if refusal is due to documents malpractices.
                        </p>

                        <p className="border-t pt-4">
                          <strong>ADDITIONAL CLAUSES:</strong> {config.additionalTerms}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 shrink-0 bg-slate-50 flex justify-between gap-4">
                <button 
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected', selectedRequest.type)}
                  className="px-5 py-3 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Reject Proposal
                </button>

                <div className="flex gap-2">
                  {selectedRequest.status === 'new' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'under_review', selectedRequest.type)}
                      className="px-5 py-3 bg-[#0059E7] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      Process & Review
                    </button>
                  )}
                  {selectedRequest.status === 'under_review' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'approved', selectedRequest.type)}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      Approve & Counter-Sign
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Close Drawer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}