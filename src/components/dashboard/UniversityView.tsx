'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BarChart3, 
  FileCheck,
  Globe,
  ChevronRight,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  University,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Calendar,
  FileText
} from 'lucide-react'
import { collection, query, where, onSnapshot, orderBy, collectionGroup } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { MiniCalendarWidget } from './MiniCalendarWidget'
import UniversityWelcomeHeader from './UniveristyWelcomeHeader'
import InstitutionalMetricsGrid from './InstitutionalMetricsGrid'
import { getAppStagnationCategory } from '@/services/metricsService'
import { StatusBadge } from './StatusBadge'
import { CentralLoader } from './CentralLoader'
import { useDashboardState } from '@/contexts/DashboardStateContext'
import { useDashboardErrorHandler } from '@/utils/dashboardError'
import { mockApplications } from '@/data/mockData'
import { shouldExcludeAgency } from '@/utils/excludedAgencies'

const standardizeName = (name?: string): string => {
  if (!name) return ''
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (!word) return ''
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

interface UniversityViewProps {
  profile: any
}

const UniversityView = ({ profile }: UniversityViewProps) => {
  const { hideSupportCenter } = useAuth()
  const { mode } = useDashboardState()
  const { handleFirestoreError } = useDashboardErrorHandler()
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [activeView, setActiveView] = useState<'applications' | 'agents'>('applications')
  const [loading, setLoading] = useState(true)
  const [messagesTodayCount, setMessagesTodayCount] = useState(0)

  const inboundPipelineRef = React.useRef<HTMLDivElement>(null)
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null)

  const displayApplications = mode === 'quota-standby' ? mockApplications : applications

  const handleMetricClick = (type: string, value: string) => {
    if (inboundPipelineRef.current) {
      inboundPipelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    
    if (activeFilter?.type === type && activeFilter?.value === value) {
      setActiveFilter(null)
      setActiveView('applications')
    } else {
      setActiveFilter({ type, value })
      if (type === 'agent_status') {
        setActiveView('agents')
      } else {
        setActiveView('applications')
      }
    }
  }

  useEffect(() => {
    if (!profile?.universityId) return

    let agentsDocs: any[] = []
    let usersDocs: any[] = []
    let agreementDocs: any[] = []
    let partnershipDocs: any[] = []

    const isSameUni = (id1?: string, id2?: string) => {
      if (!id1 || !id2) return false
      const a = id1.trim().toLowerCase()
      const b = id2.trim().toLowerCase()
      if (a === b) return true
      const isGCM = (x: string) => x === 'global-college-malta' || x === 'gcm' || x === 'gcm-uid' || x.includes('gcm') || x.includes('malta')
      return isGCM(a) && isGCM(b)
    }

    const updateAgentsList = () => {
      const agentMap = new Map<string, any>()

      agentsDocs.forEach(a => {
        if (a.id && !a.id.startsWith('agent_') && !a.id.startsWith('uni_')) {
          const name = a.agencyName || a.companyName || a.fullName || a.name
          if (!shouldExcludeAgency(name)) {
            agentMap.set(a.id, {
              id: a.id,
              agencyName: a.agencyName || a.companyName || a.fullName || a.name,
              location: a.location || a.country || a.city || 'Global',
              status: a.status || 'approved'
            })
          }
        }
      })

      usersDocs.forEach(u => {
        if ((u.roles?.includes('agent') || u.role === 'agent') && u.id && !u.id.startsWith('agent_') && !u.id.startsWith('uni_')) {
          const name = u.agencyName || u.companyName || u.fullName || u.name
          if (!shouldExcludeAgency(name)) {
            if (!agentMap.has(u.id)) {
              agentMap.set(u.id, {
                id: u.id,
                agencyName: u.agencyName || u.companyName || u.fullName || u.name,
                location: u.location || u.country || u.city || 'Global',
                status: u.status || 'approved'
              })
            }
          }
        }
      })

      const reqByAgentId = new Map<string, string>()
      const reqByAgencyName = new Map<string, string>()

      const processReq = (item: any) => {
        if (profile?.universityId && !isSameUni(item.universityId, profile.universityId) && item.universityId !== profile.universityId) {
          return
        }
        if (item.agentId) {
          reqByAgentId.set(item.agentId, item.status)
        }
        if (item.agencyName) {
          reqByAgencyName.set(item.agencyName, item.status)
          reqByAgencyName.set(item.agencyName.trim().toLowerCase(), item.status)
        }
      }

      agreementDocs.forEach(processReq)
      partnershipDocs.forEach(processReq)

      const agentList: any[] = []
      agentMap.forEach((agent, id) => {
        let status = reqByAgentId.get(id)
        if (!status && agent.agencyName) {
          status = reqByAgencyName.get(agent.agencyName) || reqByAgencyName.get(agent.agencyName.trim().toLowerCase())
        }
        if (!status) {
          status = agent.status || 'approved'
        }
        agentList.push({
          ...agent,
          status
        })
      })

      if (agentList.length === 0 && (agreementDocs.length > 0 || partnershipDocs.length > 0)) {
        const allReqs = [...agreementDocs, ...partnershipDocs]
        allReqs.forEach(item => {
          if (profile?.universityId && !isSameUni(item.universityId, profile.universityId) && item.universityId !== profile.universityId) return
          agentList.push({
            id: item.id || item.agentId || Math.random().toString(),
            agencyName: item.agencyName || item.agentName || 'Partner Agency',
            location: item.location || 'Global',
            status: item.status || 'approved'
          })
        })
      }

      setAgents(agentList)
    }

    const unsubAgents = onSnapshot(collection(db, 'agents'), (snap) => {
      agentsDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      updateAgentsList()
    }, (err) => handleFirestoreError(err))

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      usersDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      updateAgentsList()
    })

    const unsubAgr = onSnapshot(collection(db, 'agreements'), (snap) => {
      agreementDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      updateAgentsList()
    })

    const unsubPartnerships = onSnapshot(collection(db, 'partnershipRequests'), (snap) => {
      partnershipDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      updateAgentsList()
    })

    const q = query(
      collectionGroup(db, 'messages'),
      where('receiverId', '==', profile.universityId)
    )

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const today = new Date()
      const count = snapshot.docs.filter(docSnap => {
        const data = docSnap.data()
        let date: Date | null = null
        if (data.timestamp) {
          date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        } else if (data.createdAt) {
          date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        }
        if (!date) return false
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear()
      }).length
      setMessagesTodayCount(count)
    }, (error) => {
      handleFirestoreError(error)
    })

    return () => {
      unsubAgents()
      unsubUsers()
      unsubAgr()
      unsubPartnerships()
      unsubscribeMessages()
    }
  }, [profile?.universityId])

  const getFilteredAgents = () => {
    return agents.filter(a => {
      if (shouldExcludeAgency(a.agencyName || a.fullName)) return false
      if (!activeFilter || activeFilter.type !== 'agent_status') return true

      const normFilter = activeFilter.value.toLowerCase().trim()
      const st = (a.status || 'approved').toLowerCase()

      if (normFilter.includes('approved') || normFilter.includes('signed') || normFilter.includes('active')) {
        return st === 'approved' || st === 'signed' || st === 'active' || st === 'finalized' || st === 'completed'
      }
      if (normFilter.includes('pending')) {
        return st === 'pending' || st === 'under_review' || st === 'draft'
      }
      if (normFilter.includes('reject') || normFilter.includes('decline') || normFilter.includes('suspend')) {
        return st === 'rejected' || st === 'declined' || st === 'suspended' || st === 'cancelled'
      }
      return st === normFilter
    })
  }

  useEffect(() => {
    if (!profile?.universityId) {
      setLoading(false)
      return
    }

    const uIdLow = (profile.universityId || '').toLowerCase()
    const isGCM = uIdLow === 'global-college-malta' || uIdLow === 'gcm' || uIdLow === 'gcm-uid' || uIdLow.includes('gcm') || uIdLow.includes('malta')
    const uniIds = isGCM
      ? Array.from(new Set(['global-college-malta', 'gcm', 'gcm-uid', profile.universityId]))
      : [profile.universityId]

    const q = query(
      collection(db, 'applications'),
      where('targetUniversityId', 'in', uniIds)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((app: any) => app.applicationStatus !== 'draft')
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return dateB.getTime() - dateA.getTime()
      })
      setApplications(apps)
      setLoading(false)
    }, (error) => {
      handleFirestoreError(error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [profile?.universityId])

  const stats = [
    { label: 'Total Applicants', value: applications.length.toString(), icon: Users, color: 'blue' },
    { label: 'Pending Reviews', value: applications.filter(a => a && (a.applicationStatus === 'under_review' || a.applicationStatus === 'submitted')).length.toString(), icon: FileCheck, color: 'orange' },
    { label: 'Recently Added', value: applications.filter(a => {
      if (!a?.createdAt || typeof a.createdAt.toDate !== 'function') return false
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 1)
      try {
        return a.createdAt.toDate() > dayAgo
      } catch (e) {
        return false
      }
    }).length.toString(), icon: GraduationCap, color: 'green' },
    { label: 'Partner Agents', value: [...new Set(applications.filter(a => a?.agentId).map(a => a.agentId))].length.toString(), icon: Globe, color: 'indigo' },
  ]

  if (loading) {
    return <CentralLoader minHeight="min-h-[500px]" />
  }

  if (!profile?.universityId) {
    return (
      <div className="grad-card-lg p-16 text-center max-w-2xl mx-auto mt-20 border-amber-200 bg-amber-50/20">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-grad-md flex items-center justify-center mx-auto mb-8 shadow-sm">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-3xl font-black text-[#1E1E1E] mb-4 font-outfit tracking-tight">Institutional Link Required</h2>
        <p className="text-[#6C757D] mb-10 font-black tracking-widest text-xs leading-relaxed max-w-sm mx-auto">To view applications, please link your account to your institution in the admissions dashboard settings.</p>
        <button 
          onClick={() => router.push('/dashboard?tab=Settings')}
          className="px-10 py-5 bg-[#1E1E1E] text-white rounded-xl font-black shadow-lg hover:bg-black transition-all tracking-[0.2em] text-xs"
        >
          Initialize Settings
        </button>
      </div>
    )
  }

  const filteredApplications = displayApplications.filter(app => {
    if (!activeFilter) return true
    
    const rawStatus = (app.applicationStatus || '').toLowerCase()
    
    if (activeFilter.type === 'funnel') {
      const v = (activeFilter.value || '').toLowerCase().trim()
      if (v === 'submitted') return ['submitted', 'received', 'in_review', 'under_review'].includes(rawStatus)
      if (v === 'incomplete') return ['incomplete', 'pending_docs', 'pending_documents', 'draft'].includes(rawStatus)
      if (v === 'interview pending' || v === 'interview') return ['interview_pending', 'interview_requested', 'interview_scheduled', 'interview'].includes(rawStatus)
      if (v === 'withdrawn') return ['withdrawn', 'cancelled'].includes(rawStatus)
      if (v === 'rejected') return ['rejected', 'declined'].includes(rawStatus)
      if (v === 'approved') return ['approved', 'offer_issued', 'finalized'].includes(rawStatus)
      return false
    }
    
    if (activeFilter.type === 'program') {
      return app.targetProgramId === activeFilter.value
    }

    if (activeFilter.type === 'intake') {
      let termVal = app.intakeTerm
      const termYear = app.intakeYear || ''
      if (termVal) {
        if (termYear && !termVal.includes(termYear)) termVal = `${termVal} ${termYear}`
      } else termVal = '2026 Spring'
      return termVal.toLowerCase().includes(activeFilter.value.toLowerCase().replace(' intake', ''))
    }
    if (activeFilter.type === 'agent_status' || activeFilter.type === 'applicant_status') {
      const filterVal = activeFilter.value.toLowerCase().trim()
      if ((filterVal === 'approved' || filterVal === 'signed' || filterVal === 'active') && (rawStatus === 'approved' || rawStatus === 'offer_issued' || rawStatus === 'signed' || rawStatus === 'active')) return true
      if ((filterVal === 'pending' || filterVal === 'submitted' || filterVal === 'submitted / review' || filterVal === 'under review') && (rawStatus === 'submitted' || rawStatus === 'in_review' || rawStatus === 'under_review' || rawStatus === 'pending' || rawStatus === 'draft')) return true
      if ((filterVal === 'interview pending' || filterVal === 'pending review' || filterVal === 'interview') && (rawStatus === 'interview_requested' || rawStatus === 'interview_pending' || rawStatus === 'interview_scheduled')) return true
      if ((filterVal === 'incomplete' || filterVal === 'blocked' || filterVal === 'pending docs') && (rawStatus === 'draft' || rawStatus === 'incomplete' || rawStatus === 'pending_documents')) return true
      if ((filterVal === 'rejected' || filterVal === 'declined' || filterVal === 'suspended') && (rawStatus === 'rejected' || rawStatus === 'declined' || rawStatus === 'suspended')) return true
      return rawStatus === filterVal
    }
    if (activeFilter.type === 'stagnation') {
      return getAppStagnationCategory(app) === activeFilter.value
    }
    if (activeFilter.type === 'tier_spread') {
      const studyLevel = (app.studyLevel || '').toLowerCase()
      let lKey = 'bachelor'
      if (studyLevel.includes('diploma')) lKey = 'diploma'
      else if (studyLevel.includes('master') || studyLevel.includes('postgraduate')) lKey = 'master'
      else if (studyLevel.includes('phd') || studyLevel.includes('doctor') || studyLevel.includes('research')) lKey = 'doctorate'
      return lKey === activeFilter.value
    }
    return true
  })

  const getApplicationsTodayCount = () => {
    const today = new Date()
    return applications.filter(a => {
      if (!a?.createdAt) return false
      let date: Date
      try {
        if (typeof a.createdAt.toDate === 'function') {
          date = a.createdAt.toDate()
        } else {
          date = new Date(a.createdAt)
        }
      } catch (e) {
        return false
      }
      const isToday = date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()
      return isToday && a.applicationStatus === 'submitted'
    }).length
  }

  const getTasksTodayCount = () => {
    const today = new Date()
    return applications.filter(a => {
      const isTaskStatus = a.applicationStatus === 'under_review' || 
                           a.applicationStatus === 'interview_requested' || 
                           a.applicationStatus === 'interview_pending' || 
                           a.applicationStatus === 'pending_documents'
      if (!isTaskStatus) return false
      
      if (!a?.createdAt) return false
      let date: Date
      try {
        if (typeof a.createdAt.toDate === 'function') {
          date = a.createdAt.toDate()
        } else {
          date = new Date(a.createdAt)
        }
      } catch (e) {
        return false
      }
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
    }).length
  }

  const institutionName = standardizeName(profile?.institutionName || 
    (profile?.universityId === 'paris-business-academy' ? "Paris Business Academy" : "Global College Malta"))

  const showOnboarding = applications.length === 0 && !loading && mode !== 'quota-standby'

  if (showOnboarding) {
    return (
      <div className="w-full font-sans antialiased select-none selection:bg-blue-600/10 space-y-12">
        <div className="w-full bg-gradient-to-r from-[#0B1528] via-[#0F1E36] to-[#0D59E7] rounded-[20px] p-6 sm:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg shadow-blue-900/5 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />
          </div>
          <div className="space-y-1 relative z-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight font-outfit">Welcome, Global College Malta!</h1>
            <p className="text-slate-300 text-xs font-semibold">
              Let's get you ready to receive applications. Complete your onboarding checklist below to unlock your admissions dashboard.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            <div className="lg:col-span-7 space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                  <Sparkles size={12} className="animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.2em] font-outfit text-slate-400">Institutional Activation</span>
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight font-outfit leading-tight">
                  Calibrate your portal for <br />
                  <span className="text-[#0059E7]">global admissions.</span>
                </h2>
                <p className="text-slate-500 text-lg max-w-xl font-medium">
                  Connect your institution to 1,600+ verified recruitment partners by configuring your admissions criteria.
                </p>
              </div>

              <div className="grid gap-6">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 flex items-start gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-inner">
                    <CheckCircle2 size={28} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-800 font-outfit">University Profile</h3>
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-lg border border-emerald-200">Verified</span>
                    </div>
                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                      Campus locations, accreditation details, and primary contact leads have been initialized.
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group relative bg-white border-2 border-blue-500/10 rounded-[2rem] p-8 shadow-2xl shadow-blue-900/10 flex items-start gap-6 ring-8 ring-blue-500/5 transition-all hover:shadow-blue-900/20 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#0059E7] text-white flex items-center justify-center shrink-0 shadow-xl shadow-blue-200">
                    <FileText size={28} />
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold text-slate-900 font-outfit">Document Compliance Matrix</h3>
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-lg border border-amber-200">Action Required</span>
                    </div>
                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                      Define your mandatory document requirements (SOP, IELTS, Transcripts) to enable automated screening.
                    </p>
                    <button 
                      onClick={() => {
                        router.push('/dashboard?tab=Settings&sub=matrix')
                      }}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#0059E7] text-white rounded-2xl font-bold text-[11px] tracking-widest hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
                    >
                      Configure Matrix <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group relative bg-white/30 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 flex items-start gap-6 opacity-60"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 border border-slate-300 shadow-inner">
                    <Calendar size={28} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-800 font-outfit">Academic Intakes & Fees</h3>
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-lg">Locked</span>
                    </div>
                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                      Initialize active intake periods and tuition fee structures to go live on our course explorer.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-market-trends-gradient rounded-[2.5rem] p-8 overflow-hidden text-white shadow-2xl shadow-blue-900/20"
              >
                <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
                  <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[200%] bg-gradient-to-b from-white via-transparent to-black rounded-[40%] transform rotate-12 animate-[spin_120s_linear_infinite]" />
                </div>
                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />
                
                <div className="relative z-10 space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold font-outfit tracking-tight">
                      Market <span className="text-sky-300">Trends</span>
                    </h3>
                    <p className="text-slate-300 text-[11px] font-medium tracking-wide uppercase opacity-80">Active student sourcing hotspots.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-default">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold tracking-widest text-blue-200/80 uppercase">South Asia</span>
                        <span className="text-[10px] font-bold text-emerald-300">High Growth</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        Surge in applications for Management and Technology tracks from Nepal and India.
                      </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-default">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold tracking-widest text-blue-200/80 uppercase">Gulf Region</span>
                        <span className="text-[10px] font-bold text-sky-300">MBA Focus</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">
                        Increasing demand for professional MBA and short-course postgraduate options.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0B1528] bg-slate-800 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                            <img src={`https://i.pravatar.cc/100?img=${i + 30}`} alt="Agent" />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-400">Connected to 1,600+ recruitment agencies</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Partner Success</h4>
                    <p className="text-xs text-slate-500">Scale your admissions reach.</p>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "Institutional partners with clear document compliance matrices receive 40% higher quality applications."
                </p>

                {!hideSupportCenter && (
                  <button 
                    onClick={() => router.push('/help-support')}
                    className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Contact Admissions Support <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <UniversityWelcomeHeader 
        userName={institutionName}
        logo={profile?.logo}
        newApplicationsCount={getApplicationsTodayCount()}
        tasksCount={getTasksTodayCount()}
        messagesCount={messagesTodayCount}
        onAcademicSettingsClick={() => router.push('/dashboard?tab=Settings&sub=admissions')}
      />

      <InstitutionalMetricsGrid universityId={profile?.universityId} onMetricClick={handleMetricClick} activeFilter={activeFilter} applications={displayApplications} />

      <div className="grid lg:grid-cols-3 gap-8 w-full max-w-full overflow-x-hidden" ref={inboundPipelineRef}>
        <div className="lg:col-span-2 space-y-8 w-full overflow-hidden">
          {activeFilter && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-xs font-bold text-blue-700 tracking-wider">
                  Filtered by: {activeFilter.value}
                </span>
                <button 
                  onClick={() => setActiveFilter(null)}
                  className="p-1 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                >
                  <X size={14} className="text-blue-500" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-xl shadow-slate-200/40 p-0 overflow-hidden">
            <div className="p-6 md:px-8 md:py-8 flex justify-between items-center border-b border-slate-100/50">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-[#0059E7] rounded-full shadow-lg shadow-blue-500/20" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {activeView === 'agents' || activeFilter?.type === 'agent_status' ? 'Agent Pipeline' : 'Inbound Pipeline'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                    {activeView === 'agents' || activeFilter?.type === 'agent_status' ? 'Live Partner Registry' : 'Live Admissions Registry'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/applications')}
                  className="px-4 py-2 bg-blue-50 text-[#0059E7] text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-widest"
                >
                  View Registry
                </button>
              </div>
            </div>
            
            <div className="hidden md:block overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-[#EAEBEF] text-[10px] font-black text-slate-400 tracking-[0.25em] bg-[#F7F8FA]">
                  {activeView === 'agents' || activeFilter?.type === 'agent_status' ? (
                    <>
                      <th className="px-6 py-4 w-[45%]">Agency Entity</th>
                      <th className="px-6 py-4 w-[30%]">Location</th>
                      <th className="px-6 py-4 text-right w-[25%]">Network Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 w-[40%]">Student Prospect</th>
                      <th className="px-6 py-4 w-[35%]">Academic Program</th>
                      <th className="px-6 py-4 text-right w-[25%]">Channel Status</th>
                    </>
                  )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEBEF]">
                  {activeView === 'agents' || activeFilter?.type === 'agent_status' ? (
                    getFilteredAgents().length > 0 ? (
                      getFilteredAgents().map((agent) => (
                        <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-black text-[#1E1E1E] truncate">{standardizeName(agent.agencyName) || 'Unnamed'}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 truncate">{agent.location || 'N/A'}</td>
                          <td className="px-6 py-4 text-right whitespace-nowrap"><StatusBadge status={agent.status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="py-24 text-center text-[#6C757D]">No agents found.</td></tr>
                    )
                  ) : filteredApplications.length > 0 ? (
                    (activeFilter ? filteredApplications : filteredApplications.slice(0, 8)).map((app) => (
                      <tr 
                        key={app.id}
                        onClick={() => router.push(`/application/${app.id}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 overflow-hidden">
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-[#1E1E1E] font-outfit leading-tight mb-0.5 truncate">
                                {standardizeName(app.studentFirstName)} {standardizeName(app.studentLastName)}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-[#6C757D] font-black tracking-tight truncate">
                                <span className="truncate">{standardizeName(app.agencyName || app.agentFullName) || 'Partner Agent'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 overflow-hidden">
                          <p className="text-xs font-black text-[#6C757D] font-outfit tracking-tight truncate">
                            {typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : (app.targetProgramId || 'General Intelligence')}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <StatusBadge status={app.applicationStatus} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-24 text-center">
                        <div className="w-20 h-20 bg-[#F7F8FA] border border-[#EAEBEF] rounded-grad-md flex items-center justify-center mx-auto mb-6 text-slate-300">
                          <FileCheck size={40} />
                        </div>
                        <h4 className="text-[#1E1E1E] font-black mb-2 font-outfit tracking-[0.3em] text-sm">Registry Empty</h4>
                        <p className="text-[11px] font-black text-[#6C757D] tracking-widest max-w-[240px] mx-auto leading-relaxed">No active items detected in your partner channel.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden divide-y divide-[#EAEBEF]">
              {activeView === 'agents' || activeFilter?.type === 'agent_status' ? (
                (() => {
                  const filteredAgents = getFilteredAgents()
                  return filteredAgents.length > 0 ? (
                    filteredAgents.map((agent) => (
                      <div key={agent.id} className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-sm font-black text-[#1E1E1E] font-outfit">
                            {standardizeName(agent.agencyName) || 'Unnamed'}
                          </h4>
                          <StatusBadge status={agent.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-[10px] font-black text-slate-400 tracking-wider">Location</span>
                          <span className="text-slate-600 font-medium">{agent.location || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 px-6 text-center text-[#6C757D] text-xs font-black tracking-wider">
                      No agents found.
                    </div>
                  )
                })()
              ) : (
                filteredApplications.length > 0 ? (
                  (activeFilter ? filteredApplications : filteredApplications.slice(0, 8)).map((app) => (
                    <div 
                      key={app.id}
                      onClick={() => router.push(`/application/${app.id}`)}
                      className="p-6 space-y-4 hover:bg-slate-50/50 active:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-black text-[#1E1E1E] font-outfit leading-tight mb-1">
                            {standardizeName(app.studentFirstName)} {standardizeName(app.studentLastName)}
                          </h4>
                          <p className="text-[10px] text-[#6C757D] font-black tracking-wider">
                            {standardizeName(app.agencyName || app.agentFullName) || 'Partner Agent'}
                          </p>
                        </div>
                        <StatusBadge status={app.applicationStatus} />
                      </div>
                      <div className="text-xs pt-3 border-t border-[#F1F2F4]">
                        <span className="text-xs font-black text-[#6C757D] font-outfit tracking-tight truncate block">
                          {typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : (app.targetProgramId || 'General Intelligence')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 px-6 text-center">
                    <div className="w-16 h-16 bg-[#F7F8FA] border border-[#EAEBEF] rounded-grad-md flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <FileCheck size={32} />
                    </div>
                    <h4 className="text-[#1E1E1E] font-black mb-1 font-outfit tracking-[0.25em] text-xs">Registry Empty</h4>
                    <p className="text-[10px] font-black text-[#6C757D] tracking-widest max-w-[200px] mx-auto leading-relaxed">No active items detected in your partner channel.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <MiniCalendarWidget />
        </div>
      </div>
    </div>
  )
}

export default UniversityView