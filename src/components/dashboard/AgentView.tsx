'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { toTitleCase } from '@/utils/textUtils'
import { 
  FileText, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  PlusCircle, 
  Search,
  ChevronRight,
  Clock,
  Loader2,
  LayoutDashboard,
  Trash2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { handleFirestoreError, OperationType } from '@/lib/authUtils'
import { useDashboardErrorHandler } from '@/utils/dashboardError'
import { collection, query, where, orderBy, limit, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { getUniversityName } from '@/lib/universityUtils'
import { CURRENCIES } from '@/types'
import { MiniCalendarWidget } from './MiniCalendarWidget'
import AgentOverview from './AgentOverview'
import { StatusBadge } from './StatusBadge'
import { CentralLoader } from './CentralLoader'

interface Deadline {
  title: string
  date: string
  urgency: 'high' | 'medium' | 'low'
}

const getDeadlineForUniversity = (uniId: string, uniName: string): Deadline => {
  const today = new Date()
  
  // Custom definitions for prefilled colleges (based on reference current time: May 2026)
  // We specify [applicationDeadline, visaDeadline]
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
  }

  let appDeadline: Date
  let visaDeadline: Date

  if (deadlineMap[uniId]) {
    [appDeadline, visaDeadline] = deadlineMap[uniId]
  } else {
    // Determine crossed/not crossed deterministically based on uniName or ID
    let sum = 0
    const key = uniId || uniName || ''
    for (let i = 0; i < key.length; i++) {
      sum += key.charCodeAt(i)
    }
    const isPast = sum % 2 === 0

    if (isPast) {
      // Crossed -> make application deadline in past (e.g. 5 days ago)
      appDeadline = new Date(today)
      appDeadline.setDate(today.getDate() - 5)
      // Visa deadline is 15 days in the future
      visaDeadline = new Date(today)
      visaDeadline.setDate(today.getDate() + 15)
    } else {
      // Not crossed -> make application deadline in future (e.g. 4 days from now)
      appDeadline = new Date(today)
      appDeadline.setDate(today.getDate() + 4)
      // Visa deadline is 25 days in the future
      visaDeadline = new Date(today)
      visaDeadline.setDate(today.getDate() + 25)
    }
  }

  // Check if today has crossed the application deadline
  const isCrossed = today > appDeadline

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getRelativeText = (targetDate: Date) => {
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays > 1) return `In ${diffDays} days`
    if (diffDays === -1) return 'Yesterday'
    return `${Math.abs(diffDays)} days ago`
  }

  if (isCrossed) {
    // Crossed -> Show Visa Deadline
    return {
      title: `Visa Deadline - ${uniName}`,
      date: `${formatDate(visaDeadline)} (${getRelativeText(visaDeadline)})`,
      urgency: 'medium'
    }
  } else {
    // Not crossed yet -> Show Application Deadline
    return {
      title: `Application Deadline - ${uniName}`,
      date: `${formatDate(appDeadline)} (${getRelativeText(appDeadline)})`,
      urgency: 'high'
    }
  }
}

interface AgentViewProps {
  profile: any
}

const AgentView = ({ profile }: AgentViewProps) => {
  const { user, institutions } = useAuth()
  const { handleFirestoreError: reportFirestoreError } = useDashboardErrorHandler()
  const router = useRouter()
  const [allApps, setAllApps] = React.useState<any[]>([])
  const [drafts, setDrafts] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const [agreements, setAgreements] = React.useState<any[]>([])
  const [institutionSettings, setInstitutionSettings] = React.useState<Record<string, any>>({})

  // Search and Filter state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSearchFocused, setIsSearchFocused] = React.useState(false)
  const searchContainerRef = React.useRef<HTMLDivElement>(null)
  const [activeFilter, setActiveFilter] = React.useState<{ type: string; value: string } | null>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const handleMetricClick = (type: string, value: string) => {
    if (activeFilter?.type === type && activeFilter?.value === value) {
      setActiveFilter(null) // toggle off
    } else {
      setActiveFilter({ type, value })
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  // Close search dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (!user?.uid) return
    const cacheKey = `agent_apps_${user.uid}`
    
    // Fetch all applications to keep statistics and counts fully accurate
    const q = query(
      collection(db, 'applications'),
      where('agentId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    )

    const unsubscribeApps = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
      setAllApps(apps)
      setDrafts(apps.filter(app => app.applicationStatus === 'draft'))
      setLoading(false)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(apps))
      } catch {
        // ignore
      }
    }, (err) => {
       reportFirestoreError(err)
       try {
         const cached = localStorage.getItem(cacheKey)
         if (cached) {
           const parsed = JSON.parse(cached)
           setAllApps(parsed)
           setDrafts(parsed.filter((app: any) => app.applicationStatus === 'draft'))
         }
       } catch {
         // ignore
       }
       setLoading(false)
     })

    const unsubAgr = onSnapshot(query(collection(db, 'agreements'), where('agentId', '==', user.uid)), (snapshot) => {
      setAgreements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => {
      reportFirestoreError(err)
    })

    const unsubInst = onSnapshot(collection(db, 'institution_agreements'), (snapshot) => {
      const mapping: Record<string, any> = {}
      snapshot.docs.forEach(doc => {
        mapping[doc.id] = doc.data()
      })
      setInstitutionSettings(mapping)
    }, (err) => {
      reportFirestoreError(err)
    })

    return () => {
      unsubscribeApps()
      unsubAgr()
      unsubInst()
    }
  }, [user?.uid])

  const activeCount = allApps.filter(app => app.applicationStatus !== 'draft' && app.applicationStatus !== 'withdrawn' && app.applicationStatus !== 'Withdrawn').length
  const approvedCount = allApps.filter(app => app.applicationStatus === 'approved').length
  const uniqueStudentsCount = [...new Set(
    allApps.filter(app => app.applicationStatus !== 'draft' && app.applicationStatus !== 'withdrawn' && app.applicationStatus !== 'Withdrawn')
           .map(app => toTitleCase(`${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim()))
  )].filter((name: any) => name.length > 1).length

  const commissionPotential = React.useMemo(() => {
    let total = 0
    
    // Commission potential: number of unique students per signed agreement * commission amount per student
    const signedAgreements = agreements.filter(a => a.status === 'signed')
    const nonDraftApps = allApps.filter(app => app.applicationStatus !== 'draft' && app.applicationStatus !== 'rejected')
    
    signedAgreements.forEach(agreement => {
      const uniId = agreement.universityId
      const instSetting = institutionSettings[uniId]
      const uni = institutions.find(u => u.id === uniId)
      
      let commissionStr = agreement.terms?.commissionRate || (instSetting?.commissionAmount ? `${instSetting.commissionAmount}` : null)
      if (!commissionStr) return
      
      const uniApps = nonDraftApps.filter(app => app.targetUniversityId === uniId)
      const uniqueApps = new Map<string, any>()
      uniApps.forEach(app => {
        const studentName = toTitleCase(`${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim())
        if (studentName.length > 1 && !uniqueApps.has(studentName)) {
           uniqueApps.set(studentName, app)
        }
      })
      
      if (uniqueApps.size === 0) return
      
      if (commissionStr.includes('%')) {
         let pct = parseFloat(commissionStr.replace(/[^0-9.]/g, ''))
         if (isNaN(pct)) pct = 0
         
         const validApps = Array.from(uniqueApps.values())
         validApps.forEach(app => {
            let feeStr = '0'
            if (uni) {
              const program = uni.programs?.find((p: any) => p.name === app.targetProgramId || p.id === app.targetProgramId)
              feeStr = program?.fee || program?.totalTuitionFee || program?.firstYearFee || uni.fee || '0'
            }
            const match = feeStr.match(/[0-9]+([,.][0-9]+)?/)
            let fee = 0
            if (match) {
                fee = parseFloat(match[0].replace(/,/g, ''))
            }
            total += fee * (pct / 100)
         })
      } else {
         let amt = parseFloat(commissionStr.replace(/[^0-9.]/g, ''))
         if (isNaN(amt)) amt = 0
         total += uniqueApps.size * amt
      }
    })

    return total
  }, [allApps, agreements, institutionSettings, institutions])

  const currencySymbol = CURRENCIES.find(c => c.code === (profile?.currency || 'USD'))?.symbol || '$'

  const stats = [
    { label: 'Students', value: loading ? '...' : uniqueStudentsCount.toString(), icon: Users, color: 'orange' },
    { label: 'Active Applications', value: loading ? '...' : activeCount.toString(), icon: FileText, color: 'blue' },
    { label: 'Approved Applications', value: loading ? '...' : approvedCount.toString(), icon: CheckCircle, color: 'green' },
    { label: 'Commission Potential', value: `${currencySymbol}${commissionPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'purple' },
  ]

  // Filter based on query. Keep up to 6 results.
  const filteredApps = React.useMemo(() => {
    const term = searchQuery.toLowerCase().trim()
    if (!term) {
      return []
    }
    return allApps.filter(app => {
      const firstName = (app.studentFirstName || '').toLowerCase()
      const lastName = (app.studentLastName || '').toLowerCase()
      const fullName = `${firstName} ${lastName}`.trim()
      
      // Do not show drafts if they have no student name
      if (app.applicationStatus === 'draft' && !fullName) {
        return false
      }
      
      // Match if the name starts with the term, or first/last name starts with term
      return (
        fullName.startsWith(term) ||
        firstName.startsWith(term) ||
        lastName.startsWith(term)
      )
    }).slice(0, 6)
  }, [allApps, searchQuery, institutions])

  const displayApps = React.useMemo(() => {
    let apps = allApps.filter(app => app.applicationStatus !== 'draft' && app.applicationStatus !== 'withdrawn' && app.applicationStatus !== 'Withdrawn')
    
    if (activeFilter) {
      apps = apps.filter(app => {
        const status = (app.applicationStatus || app.status || '').toLowerCase()
        
        if (activeFilter.type === 'pipeline') {
          if (activeFilter.value === 'incomplete') return status === 'incomplete'
          if (activeFilter.value === 'requestInterview') return status === 'interview_requested'
          if (activeFilter.value === 'approved') return status === 'approved'
          if (activeFilter.value === 'rejected') return status === 'rejected'
        }
        
        if (activeFilter.type === 'missingDocs') {
          if (status !== 'incomplete') return false
          const docsSet = new Set(Array.isArray(app.missingDocuments) ? app.missingDocuments : [])
          
          if (activeFilter.value === 'passport') return docsSet.has('Passport Scan') || docsSet.has('Passport / ID Scan') || !app.docs_passport
          if (activeFilter.value === 'englishProof') return docsSet.has('English Proof / MOI') || docsSet.has('English Proof Pending') || !app.docs_lor
          if (activeFilter.value === 'transcripts') return docsSet.has('Academic Transcripts') || docsSet.has('Missing Transcripts') || !app.docs_transcripts
          if (activeFilter.value === 'sop') return docsSet.has('Statement of Purpose')
        }
        
        if (activeFilter.type === 'destinations') {
          const dest = (app.destination || app.targetUniversityId || '').toLowerCase()
          return dest.includes(activeFilter.value.toLowerCase())
        }
        
        if (activeFilter.type === 'commissions') {
          if (activeFilter.value === 'cleared') return status === 'approved'
          if (activeFilter.value === 'forecast') return status !== 'approved' && status !== 'rejected'
        }
        
        return true
      })
    } else {
      apps = apps.slice(0, 6)
    }
    
    return apps
  }, [allApps, activeFilter])

  // Get upcoming deadlines for institutions with applications
  const upcomingDeadlines = React.useMemo(() => {
    // Collect unique target institutions
    const targetUniMap = new Map<string, { id: string, name: string }>()
    allApps.forEach(app => {
      const uniId = app.targetUniversityId
      const uniName = getUniversityName(app, institutions)
      if (uniId || uniName) {
        // Use name as the key to unique them nicely
        const key = (uniId || uniName).toLowerCase()
        if (!targetUniMap.has(key)) {
          targetUniMap.set(key, { id: uniId || '', name: uniName })
        }
      }
    })

    const list: Deadline[] = []
    targetUniMap.forEach((uni) => {
      const uniDeadline = getDeadlineForUniversity(uni.id, uni.name)
      list.push(uniDeadline)
    })

    // Sort by urgency or date. High first, then medium, then low.
    const priority = { high: 0, medium: 1, low: 2 }
    return list.sort((a, b) => priority[a.urgency] - priority[b.urgency])
  }, [allApps])

  const handleDeleteDraft = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation()
    const path = `applications/${appId}`
    try {
      await deleteDoc(doc(db, 'applications', appId))
      toast.success('Draft application deleted successfully')
      setDeletingId(null)
    } catch (error: any) {
      console.error('Error deleting draft:', error?.message || error)
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.DELETE, path)
      }
      toast.error('Failed to delete draft application')
    }
  }

  const quickActions = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-[100] w-full lg:w-auto">
      <button 
        onClick={() => router.push('/new-application')}
        className="flex items-center justify-center gap-2.5 px-5 py-3 sm:px-6 sm:py-3.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/10 rounded-xl font-black text-xs transition-all shrink-0 font-outfit tracking-[0.15em] relative z-10"
      >
        <PlusCircle size={18} />
        New Application
      </button>
      
      {/* Interactive Search Field */}
      <div ref={searchContainerRef} className="relative z-50 flex-1 sm:flex-none min-w-0">
        <div className="relative flex items-center bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs focus-within:ring-2 focus-within:ring-white/30 transition-all w-full sm:w-60 lg:w-64 xl:w-72">
          <Search size={16} className="text-white/70 shrink-0 mr-2.5" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchFocused(true)
            }}
            onFocus={() => setIsSearchFocused(true)}
            className="w-full bg-transparent border-none text-white placeholder:text-white/50 text-xs sm:text-sm font-bold outline-none py-0 tracking-tight"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 text-white/70 hover:text-white rounded-full transition-colors shrink-0 ml-1"
            >
              <span className="text-[10px]">✕</span>
            </button>
          )}
        </div>

        {/* Suggestions/Results dropdown */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-80 lg:w-96 bg-white rounded-xl border border-[#EAEBEF] shadow-2xl overflow-hidden z-50 py-3 max-h-80 overflow-y-auto">
            <p className="text-[10px] font-black text-slate-400 tracking-[0.25em] px-5 mb-3 mt-1 font-outfit">
              Search Results
            </p>
            {filteredApps.length > 0 ? (
              <div className="space-y-0.5">
                {filteredApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      router.push(app.applicationStatus === 'draft' ? `/new-application/${app.id}` : `/application/${app.id}`)
                      setSearchQuery('')
                      setIsSearchFocused(false)
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[#1E1E1E] truncate font-outfit">
                        {toTitleCase(`${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim())}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-[#6C757D] font-black tracking-tight mt-0.5">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation()
                            if (app.targetUniversityId && app.targetUniversityId !== 'other') {
                              router.push(`/institution/${app.targetUniversityId}`)
                            }
                          }}
                          className={`hover:text-[#0059E7] hover:underline transition-colors ${app.targetUniversityId && app.targetUniversityId !== 'other' ? 'cursor-pointer' : ''}`}
                        >
                          {getUniversityName(app, institutions)}
                        </span>
                        <span className="opacity-30">•</span>
                        <span>{typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : (app.targetProgramId || 'General')}</span>
                      </div>
                    </div>
                    <StatusBadge status={app.applicationStatus} className="!text-[8px] !px-3 !py-1" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-bold px-5 py-4 font-sans">No matching students found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Helper to format filter display string
  const getFilterDisplay = () => {
    if (!activeFilter) return ''
    const { type, value } = activeFilter
    if (type === 'pipeline') {
      const labels: Record<string, string> = {
        incomplete: 'Incomplete',
        requestInterview: 'Req. Interview',
        approved: 'Approved',
        rejected: 'Rejected',
      }
      return labels[value] || value
    }
    if (type === 'missingDocs') {
      const labels: Record<string, string> = {
        passport: 'Passport Scan',
        englishProof: 'English Proof / MOI',
        transcripts: 'Academic Transcripts',
        sop: 'Statement of Purpose'
      }
      return labels[value] || value
    }
    if (type === 'destinations') {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    if (type === 'commissions') {
       const labels: Record<string, string> = {
         cleared: 'Cleared Commissions',
         forecast: 'Pipeline Projection'
       }
       return labels[value] || value
    }
    return value
  }

  return (
    <div className="space-y-12">
      <AgentOverview 
        agentId={user?.uid || ''} 
        agencyName={profile?.agencyName} 
        actionComponent={quickActions} 
        onMetricClick={handleMetricClick}
        activeFilter={activeFilter}
      />

      {/* Drafts Section - Only shown if drafts exist */}
      {drafts.length > 0 && (
        <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 sm:p-12 shadow-xl shadow-slate-200/30">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 shadow-inner">
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Draft Applications</h3>
              <span className="bg-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full font-bold border border-amber-200">{drafts.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {drafts.map((app) => (
              <div 
                key={app.id}
                onClick={() => deletingId !== app.id && router.push(`/new-application/${app.id}`)}
                className={`group relative bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer ${
                  deletingId === app.id ? 'ring-4 ring-red-100 border-red-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:border-amber-100 transition-all border border-transparent shadow-inner">
                    <FileText size={28} />
                  </div>
                  <div className="flex items-center gap-2">
                    {deletingId !== app.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingId(app.id)
                        }}
                        className="p-3 text-slate-300 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Draft"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-slate-900 leading-tight truncate">{toTitleCase(`${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim()) || 'Unnamed Student'}</p>
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Last edited • {app.updatedAt?.toDate() ? new Date(app.updatedAt.toDate()).toLocaleDateString() : 'Just now'}</p>
                </div>

                {/* Delete Confirmation Overlay */}
                {deletingId === app.id && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm p-6 flex flex-col justify-center items-center text-center z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AlertCircle size={32} className="text-red-600 mb-3" />
                    <p className="text-sm font-black text-[#1E1E1E] mb-6 tracking-widest font-outfit">Delete this draft?</p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex-1 px-4 py-4 rounded-xl border border-[#EAEBEF] text-[10px] font-black text-[#6C757D] tracking-widest hover:bg-slate-50 transition-all font-outfit"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => handleDeleteDraft(e, app.id)}
                        className="flex-1 px-4 py-4 rounded-xl bg-red-600 text-[10px] font-black text-white hover:bg-red-700 shadow-lg shadow-red-100 tracking-widest transition-all font-outfit"
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="grid lg:grid-cols-3 gap-12" ref={listRef}>
        <div className="lg:col-span-2 space-y-12">
          {activeFilter && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-xs font-bold text-blue-700 tracking-wider">
                  Filtered by: {getFilterDisplay()}
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

          <div className="bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-2 h-8 bg-[#0059E7] rounded-full shadow-lg shadow-blue-500/20" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Inbound Pipeline
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Live Admissions Registry</p>
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
            <div className="space-y-4">
              {loading ? (
                <CentralLoader minHeight="min-h-[300px]" />
              ) : displayApps.length > 0 ? (
                displayApps.map((app, i) => (
                  <div 
                    key={app.id} 
                    onClick={() => router.push(`/application/${app.id}`)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 bg-grad-bg rounded-xl hover:bg-white border border-transparent hover:border-[#EAEBEF] hover:shadow-xs transition-all cursor-pointer group gap-4 md:gap-6"
                  >
                    <div className="flex items-start gap-4 md:gap-6 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-[#EAEBEF] flex items-center justify-center text-[#0059E7] shrink-0 mt-0.5 group-hover:scale-115 transition-transform">
                        <FileText size={24} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base md:text-lg font-black text-[#1E1E1E] font-outfit leading-tight mb-1 break-words whitespace-normal">{toTitleCase(`${app.studentFirstName || ''} ${app.studentLastName || ''}`.trim())}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-x-2 gap-y-1 text-[10px] text-[#6C757D] font-black tracking-[0.1em]">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation()
                              if (app.targetUniversityId && app.targetUniversityId !== 'other') {
                                router.push(`/institution/${app.targetUniversityId}`)
                              }
                            }}
                            className={`hover:text-[#0059E7] hover:underline transition-colors break-words whitespace-normal ${app.targetUniversityId && app.targetUniversityId !== 'other' ? 'cursor-pointer' : ''}`}
                          >
                            {getUniversityName(app, institutions)}
                          </span>
                          <span className="opacity-30 hidden sm:inline">•</span>
                          <span className="text-slate-400 break-words whitespace-normal">{typeof app.targetProgramId === 'object' ? app.targetProgramId?.name : app.targetProgramId}</span>
                        </div>
                        <div className="mt-3">
                          {(() => {
                            const d = getDeadlineForUniversity(app.targetUniversityId || '', getUniversityName(app, institutions))
                            const isVisaDeadline = d.title.toLowerCase().includes('visa')
                            return (
                              <span className={`inline-flex items-center gap-2.5 text-[10px] font-black text-[#6C757D] bg-white border border-[#EAEBEF] px-3 py-1.5 shadow-xs tracking-tight ${isVisaDeadline ? 'rounded-none' : 'rounded-full'}`}>
                                <Clock size={13} className={d.urgency === 'high' ? 'text-rose-600' : 'text-amber-500'} />
                                <span>{d.title}: <strong className="text-[#1E1E1E] font-black ml-1">{d.date}</strong></span>
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-150 w-full md:w-auto shrink-0">
                      <StatusBadge status={app.applicationStatus} />
                      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-[#0059E7] group-hover:border-[#0059E7] transition-all hidden md:flex">
                        <ChevronRight size={18} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center text-slate-400 border-2 border-dashed border-[#EAEBEF] rounded-[2rem] bg-[#F7F8FA]">
                  <div className="w-20 h-20 bg-white rounded-grad-md flex items-center justify-center mx-auto mb-6 shadow-xs border border-[#EAEBEF]">
                    <PlusCircle size={40} className="text-slate-200" />
                  </div>
                  <h4 className="text-[#1E1E1E] font-black mb-2 font-outfit tracking-[0.3em] text-sm">No Active Cycles</h4>
                  <p className="text-[11px] font-black text-[#6C757D] tracking-widest max-w-[200px] mx-auto leading-relaxed">Start your first student application to begin recruitment.</p>
                  <button onClick={() => router.push('/new-application')} className="text-[#0059E7] text-xs font-black mt-6 hover:underline tracking-widest font-outfit">Initialize Application</button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-12">
          <MiniCalendarWidget />
        </div>
      </div>
    </div>
  )
}

export default AgentView