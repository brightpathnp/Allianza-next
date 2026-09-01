'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import ContractCard from './ContractCard'
import { 
  Search, 
  Filter, 
  MapPin, 
  ExternalLink, 
  Globe, 
  Mail, 
  Phone, 
  Building2, 
  User, 
  Users,
  ChevronRight, 
  ChevronLeft,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Eye,
  Plus,
  Calendar,
  XCircle,
  FileSignature,
  Download,
  TrendingUp,
  Camera
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { db, auth } from '@/lib/firebase'
import { collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { signInWithPopup, GoogleAuthProvider, linkWithPopup } from 'firebase/auth'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { handleFirestoreError, OperationType } from '@/lib/authUtils'
import { isSameUniversity, findMatchingAgreement } from '@/lib/universityUtils'
import { shouldExcludeAgency } from '@/utils/excludedAgencies'
import AgentWorldMap from './AgentWorldMap'
import NetworkOverviewGrid from './NetworkOverviewGrid'
import { CentralLoader } from './CentralLoader'

const UniversityFavicon: React.FC<{ url?: string; name?: string; altIcon: React.ReactNode }> = ({ url, name, altIcon }) => {
  const [error, setError] = useState(false)
  
  if (!url || error) {
    return <>{altIcon}</>
  }

  return (
    <img 
      src={`https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(url)}`}
      alt={name || 'University'}
      className="w-6 h-6 object-contain rounded-xl"
      referrerPolicy="no-referrer"
      onError={() => {
        setError(true)
      }}
    />
  )
}

const UniversityLogo: React.FC<{ website?: string; name?: string; size?: string; iconSize?: string; logo?: string }> = ({ website, name, size = "w-14 h-14 rounded-2xl", iconSize = "w-6 h-6", logo }) => {
  const [hasError, setHasError] = useState(false)
  
  if (logo) {
    return (
      <div className={`${size} border border-slate-100 shadow-sm flex items-center justify-center shrink-0 bg-white p-2 overflow-hidden relative`}>
        <img
          src={logo}
          className="w-full h-full object-contain"
          alt={name || 'University'}
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  let resolvedWebsite = website || ''
  if (resolvedWebsite && !resolvedWebsite.startsWith('http://') && !resolvedWebsite.startsWith('https://')) {
    resolvedWebsite = `https://${resolvedWebsite}`
  }
  
  if (!resolvedWebsite && name) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    resolvedWebsite = `https://www.${cleanName}.edu`
  }

  if (hasError || !resolvedWebsite) {
    return (
      <div className={`${size} bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600`}>
        <Building2 className={`${iconSize} stroke-[1.8]`} />
      </div>
    )
  }

  return (
    <div className={`${size} border border-slate-100 shadow-sm flex items-center justify-center shrink-0 bg-white p-2 overflow-hidden relative`}>
      <img
        src={`https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(resolvedWebsite)}`}
        className="w-full h-full object-contain"
        alt={name || 'University'}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

const googleDocAgreementCreator = async (
  token: string, 
  uniName: string, 
  agentName: string, 
  data: any,
  terms: { duration: string; commissionRate: string }
): Promise<string> => {
  try {
    const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Institutional Partner Agreement: ${uniName} & ${agentName}`
      })
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      throw new Error(`Google Docs API returned error: ${createRes.status} - ${errText}`)
    }

    const { documentId } = await createRes.json()
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const textToInsert = `REPRESENTATIVE MASTER SERVICE AGREEMENT

This Representative Agreement ("Agreement") is made effective as of ${today} ("Effective Date"), by and between:

PARTIES:
1. THE INSTITUTION:
   Name: ${uniName}

2. THE AGENT:
   Company Name: ${data?.companyName || agentName}
   Representative Name: ${data?.representativeName || 'Authorized Officer'}
   Position: ${data?.position || 'Director'}
   Address: ${data?.address || 'Not Provided'}

WHEREAS, the Agent is a qualified service provider focused on international student recruitment operations; and
WHEREAS, the Institution desires to appoint the Agent to represent the Institution in recruiting qualified candidates under the terms defined below.

IT IS AGREED AS FOLLOWS:

1. APPOINTMENT & TERM
1.1 The Institution hereby appoints the Agent as its partner representation for a duration of ${terms.duration || '1 Year'}.
1.2 This agreement shall start on the Effective Date and remains valid until terminated by either party with 30 days written notice.

2. OBLIGATIONS OF THE AGENT
2.1 The Agent agrees to promote the Institution's courses and pathways in a highly professional and ethical manner.
2.2 The Agent shall verify all applicant academic transcripts, language scores, and financial credentials before sending files to the admissions portal.

3. COMMISSION & FINANCIALS
3.1 The Institution agrees to pay the Agent a commission of ${terms.commissionRate} of the gross first-year tuition fee for each student successfully enrolled.
3.2 Disbursements will be executed within thirty (30) business days following confirmation of attendance.

4. REPRESENTATION SIGNATURES & CORPORATE SEAL

Submitted & Signed by Agent:
Representative: ${data?.representativeName || 'Authorized Officer'}
Position: ${data?.position || 'Director'}
Company: ${data?.companyName || agentName}
Signature Date: ${today}

--------------------------------------------------
Institutional Review Status: Pending Approval / Under Review
Authorized Sign-off: [Click Edit/Sign in Google Docs to append Seal and approved signatures]
--------------------------------------------------
`

    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: textToInsert
            }
          }
        ]
      })
    })

    if (!updateRes.ok) {
      console.warn('Could not populate Google Doc text, but document created successfully')
    }

    return documentId
  } catch (err: any) {
    console.error('Error in googleDocAgreementCreator:', err?.message || err)
    throw err
  }
}

interface NetworkViewProps {
  activeRole: string
  profile: any
}

const NetworkView: React.FC<NetworkViewProps> = ({ activeRole, profile }) => {
  const { user, institutions, hiddenCountries } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [stats, setStats] = useState<any>({})
  const [associatedAgents, setAssociatedAgents] = useState<any[]>([])
  const [partnershipRequests, setPartnershipRequests] = useState<any[]>([])
  const [requestLoading, setRequestLoading] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [selectedUni, setSelectedUni] = useState<any>(null)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [meetingInterviewer, setMeetingInterviewer] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [dynamicDescription, setDynamicDescription] = useState<string | null>(null)
  const [descriptionLoading, setDescriptionLoading] = useState(false)
  const [submittedUniIds, setSubmittedUniIds] = useState<string[]>([])
  const [appsLoaded, setAppsLoaded] = useState(false)
  const [approvedUniIds, setApprovedUniIds] = useState<string[]>([])
  const [agreementsLoaded, setAgreementsLoaded] = useState(false)

  const [statusFilter, setStatusFilter] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeProfileTab, setActiveProfileTab] = useState<'general' | 'scope' | 'compliance' | 'stats'>('stats')

  const [activeCountry, setActiveCountry] = useState('Australia')
  const [agreements, setAgreements] = useState<any[]>([])
  const [agreementStatusLoading, setAgreementStatusLoading] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    
    const q = query(
      collection(db, 'agreements'),
      activeRole === 'university' 
        ? where('universityId', '==', profile?.universityId || user.uid)
        : where('agentId', '==', user.uid)
    )
    
    setAgreementStatusLoading(true)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgreements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setAgreementStatusLoading(false)
    }, (err) => {
      console.error("Error fetching agreements:", err?.message || err)
      setAgreementStatusLoading(false)
    })
    
    return unsubscribe
  }, [user?.uid, activeRole, profile?.universityId])

  const calculateExpiryDate = (signedDate: any, duration: string) => {
    if (!signedDate) return 'N/A'
    
    try {
      const date = signedDate.toDate ? signedDate.toDate() : new Date(signedDate)
      if (isNaN(date.getTime())) return 'N/A'
      
      const expiry = new Date(date)
      const durationNum = parseInt(duration || '1')
      const unit = (duration || '').toLowerCase().includes('year') ? 'year' : 'month'
      
      if (unit === 'year') {
        expiry.setFullYear(expiry.getFullYear() + durationNum)
      } else {
        expiry.setMonth(expiry.getMonth() + durationNum)
      }
      
      return expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch (err) {
      return 'N/A'
    }
  }

  const [googleToken, setGoogleToken] = useState<string | null>(sessionStorage.getItem('g_docs_token'))
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)

  useEffect(() => {
    if (activeRole === 'agent' && user?.uid) {
      setAgreementsLoaded(false)
      const q = query(
        collection(db, 'agreements'),
        where('agentId', '==', user.uid)
      )
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const uniDataList = snapshot.docs
          .map(doc => doc.data())
          .filter(data => data.status === 'approved' || data.status === 'signed')
        const uniIds = uniDataList.map(data => data.universityId).filter(Boolean)
        const uniNames = uniDataList.map(data => data.universityName).filter(Boolean)
        setApprovedUniIds(Array.from(new Set([...uniIds, ...uniNames])))
        setAgreementsLoaded(true)
      }, (err) => {
        console.error("Error fetching agent's agreements:", err)
        setAgreementsLoaded(true)
      })
      
      return () => unsubscribe()
    } else {
      setApprovedUniIds([])
      setAgreementsLoaded(true)
    }
  }, [user?.uid, activeRole])

  useEffect(() => {
    if (activeRole === 'agent' && user?.uid) {
      setAppsLoaded(false)
      const q = query(
        collection(db, 'applications'),
        where('agentId', '==', user.uid)
      )
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const uniIds = snapshot.docs.map(doc => doc.data().targetUniversityId).filter(Boolean)
        setSubmittedUniIds(Array.from(new Set(uniIds)))
        setAppsLoaded(true)
      }, (err) => {
        console.error("Error fetching agent's applications:", err)
        setAppsLoaded(true)
      })
      
      return () => unsubscribe()
    } else {
      setSubmittedUniIds([])
      setAppsLoaded(true)
    }
  }, [user?.uid, activeRole])

  useEffect(() => {
    if (selectedEntity) {
      const fetchDescription = async () => {
        setDescriptionLoading(true)
        try {
          const name = selectedEntity.agencyName || selectedEntity.institutionName || selectedEntity.fullName || selectedEntity.name
          const type = activeRole === 'university' ? 'recruitment agency' : 'higher education institution'
          
          if (!name) return

          const response = await fetch('/api/description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type })
          })

          if (response.ok) {
            const data = await response.json()
            setDynamicDescription(data.description)
          }
        } catch (err) {
          // Silent fallback
        } finally {
          setDescriptionLoading(false)
        }
      }

      setDynamicDescription(null)
      fetchDescription()
    }
  }, [selectedEntity, activeRole])

  useEffect(() => {
    if (user?.uid) {
      const q = query(
        collection(db, 'partnershipRequests'),
        activeRole === 'university' 
          ? where('universityId', '==', user.uid)
          : where('agentId', '==', user.uid)
      )
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setPartnershipRequests(requests)
      }, (err) => {
        console.error("Error fetching partnership requests:", err?.message || err)
      })
      
      return () => unsubscribe()
    }
  }, [user?.uid, activeRole])

  useEffect(() => {
    if (activeRole === 'agent' && (!appsLoaded || !agreementsLoaded)) {
      return
    }

    setLoading(true)
    setError(null)
    let unsubscribe: () => void = () => {}

    try {
      const q = query(collection(db, 'users'))
      unsubscribe = onSnapshot(q, (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        
        let results: any[] = []
        if (activeRole === 'university') {
          const agents = allUsers.filter(u => {
            const hasAgentRole = u.roles?.includes('agent') || u.role === 'agent' || u.userType === 'agent'
            if (!hasAgentRole) return false
            if (u.roles?.includes('university') || u.role === 'university' || u.userType === 'university') return false

            const agName = u.agencyName || u.companyName || u.fullName || u.name || u.displayName || u.email || ''
            if (shouldExcludeAgency(agName)) return false
            if (shouldExcludeAgency(u.agencyName)) return false
            if (shouldExcludeAgency(u.fullName)) return false
            if (shouldExcludeAgency(u.companyName)) return false
            if (shouldExcludeAgency(u.email)) return false
            return true
          })
          
          const agenciesMap = new Map()
          agents.forEach(agent => {
            const key = agent.agencyName || agent.fullName || agent.id
            if (!agenciesMap.has(key)) {
              agenciesMap.set(key, {
                ...agent,
                staff: [agent]
              })
            } else {
              const existing = agenciesMap.get(key)
              existing.staff.push(agent)
            }
          })
          
          results = Array.from(agenciesMap.values())
        } else if (activeRole === 'agent') {
          const dbUnis = allUsers.filter(u => u.roles?.includes('university')).map(u => ({
            ...u,
            isDBEntry: true
          }))
          const combined = [...dbUnis]
          
          results = combined.filter(uni => approvedUniIds.some(idOrName => isSameUniversity(idOrName, uni.id) || isSameUniversity(idOrName, uni.name)))
        }
        
        setEntities(results)                
        if (selectedEntity) {
          const updatedSelectedEntity = results.find(e => e.id === selectedEntity.id)
          if (updatedSelectedEntity) {
            setSelectedEntity(updatedSelectedEntity)
          }
        }
        setLoading(false)
      }, (err) => {
        console.error("Network sync error:", err?.message || err)
        setError("Unable to connect to the network. Please check your permissions.")
        setLoading(false)
      })
    } catch (err: any) {
      console.error("Network effect error:", err?.message || err)
      setError("An unexpected error occurred while loading the network.")
      setLoading(false)
    }

    return () => unsubscribe()
  }, [activeRole, user?.uid, appsLoaded, agreementsLoaded, submittedUniIds, approvedUniIds])

  useEffect(() => {
    if (activeRole === 'university' && selectedEntity && profile?.universityId) {
      const fetchAgentStats = async () => {
        try {
          const staffIds = selectedEntity.staff?.map((s: any) => s.id) || [selectedEntity.id]
          if (staffIds.length === 0) {
            setStats({ total: 0, approved: 0, pending: 0, rejected: 0, enrolled: 0 })
            setAssociatedAgents(selectedEntity.staff || [])
            return
          }
          
          const q = query(
            collection(db, 'applications'), 
            where('agentId', 'in', staffIds.slice(0, 10)),
            where('targetUniversityId', '==', profile.universityId)
          )
          const snapshot = await getDocs(q)
          const apps = snapshot.docs.map(doc => doc.data()).filter((a: any) => a.applicationStatus !== 'draft')
          
          setStats({
            total: apps.length,
            approved: apps.filter((a: any) => a.applicationStatus === 'approved').length,
            pending: apps.filter((a: any) => ['submitted', 'in_review'].includes(a.applicationStatus)).length,
            rejected: apps.filter((a: any) => a.applicationStatus === 'rejected').length,
            enrolled: apps.filter((a: any) => a.applicationStatus === 'enrolled' || a.applicationStatus === 'approved').length,
          })
        } catch (error) {
          console.error("Error fetching agent stats:", error)
        }
      }
      
      fetchAgentStats()
      setAssociatedAgents(selectedEntity.staff || [])
    } else {
      setStats({})
      setAssociatedAgents([])
    }
  }, [selectedEntity, activeRole, profile?.universityId])

  const getAgentStatus = (entityId: string): 'Registered' | 'Pending' | 'Rejected' => {
    const request = partnershipRequests.find(r => r.agentId === entityId)
    const agreement = agreements.find(a => a.agentId === entityId)

    if (request) {
      const s = (request.status || '').toLowerCase()
      if (s === 'rejected' || s === 'declined') return 'Rejected'
      if (s === 'pending' || s === 'under_review' || s === 'submitted') return 'Pending'
      if (s === 'approved' || s === 'signed' || s === 'registered' || s === 'active') return 'Registered'
    }

    if (agreement) {
      const s = (agreement.status || '').toLowerCase()
      if (s === 'rejected' || s === 'declined') return 'Rejected'
      if (s === 'pending' || s === 'under_review') return 'Pending'
      if (s === 'signed' || s === 'approved' || s === 'active' || s === 'finalized') return 'Registered'
    }

    return 'Registered'
  }

  const filteredEntities = entities.filter(entity => {
    if (activeRole === 'university') {
      const agName = entity.agencyName || entity.fullName || entity.companyName || entity.name || entity.email || ''
      if (shouldExcludeAgency(agName) || shouldExcludeAgency(entity.agencyName) || shouldExcludeAgency(entity.fullName)) {
        return false
      }
    }

    const rawName = entity.agencyName || entity.institutionName || entity.fullName || ''
    const name = rawName.toLowerCase()
    const country = (entity.country || '').toLowerCase()
    const term = searchQuery.toLowerCase().trim()
    
    const searchMatch = !term ? true : (name.startsWith(term) || !!rawName.split(' ').find(w => w.toLowerCase().startsWith(term)) || country.includes(term))
    
    if (activeRole === 'university') {
      const agentStatus = getAgentStatus(entity.id)
      if (statusFilter !== 'all') {
        if (statusFilter === 'registered' && agentStatus !== 'Registered') return false
        if (statusFilter === 'pending' && agentStatus !== 'Pending') return false
        if (statusFilter === 'rejected' && agentStatus !== 'Rejected') return false
      }
    }
    
    return searchMatch
  })

  const totalPages = Math.ceil(filteredEntities.length / itemsPerPage)
  const paginatedEntities = filteredEntities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleExportToExcel = () => {
    const dataToExport = filteredEntities.map(entity => {
      const request = partnershipRequests.find(r => r.agentId === entity.id)
      return {
        'Agency Name': entity.agencyName || entity.fullName,
        'Country': entity.country || 'Global',
        'Email': entity.email || 'N/A',
        'Website': entity.website || 'N/A',
        'Partnership Status': request ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Not Started'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agencies")
    XLSX.writeFile(workbook, `Agency_Network_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Agencies exported successfully!')
  }

  const handleRequestPartnership = async (university: any) => {
    if (!user?.uid) {
      toast.error('You must be logged in to request a partnership.')
      return
    }
    
    if (!university.id) {
      toast.error('Invalid university selection.')
      return
    }
    
    const hasSubmitted = submittedUniIds.includes(university.id)
    if (!hasSubmitted) {
      toast.error('You can only send partnership requests to Universities where a student has been submitted.')
      return
    }
    
    setRequestLoading(true)
    try {
      const existing = partnershipRequests.find(r => r.universityId === university.id)
      if (existing) {
        toast.error('A request already exists for this university.')
        return
      }

      await addDoc(collection(db, 'partnershipRequests'), {
        agentId: user.uid,
        agentName: profile?.fullName || 'Agent',
        agencyName: profile?.agencyName || 'No Agency',
        universityId: university.id,
        universityName: university.institutionName || university.fullName || university.name || 'University Partner',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      const targetUniIds = new Set<string>()
      if (university.id) targetUniIds.add(university.id)
      const isGCM = (x: string) => x === 'global-college-malta' || x === 'gcm' || x === 'gcm-uid' || x.includes('gcm') || x.includes('malta')
      if (Array.from(targetUniIds).some(id => isGCM(id.toLowerCase()))) {
        targetUniIds.add('global-college-malta')
        targetUniIds.add('gcm')
        targetUniIds.add('gcm-uid')
      }

      for (const targetId of targetUniIds) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: targetId,
            title: 'New Partnership Request 🤝',
            description: `${profile?.agencyName || profile?.fullName || 'An agent partner'} sent a new partnership request.`,
            category: 'ai-alerts',
            isUnread: true,
            createdAt: serverTimestamp(),
          })
        } catch (notifErr) {
          console.error("Non-blocking error creating notification:", notifErr)
        }
      }

      toast.success('Partnership request sent successfully!')
    } catch (err: any) {
      console.error("Error sending partnership request:", err)
      const errorMessage = err.code === 'permission-denied' 
        ? 'Permission denied. Please ensure you are logged in as an agent.' 
        : 'Failed to send request. ' + (err.message || 'Please try again.')
      toast.error(errorMessage)
    } finally {
      setRequestLoading(false)
    }
  }

  const currentRequest = selectedEntity ? partnershipRequests.find(r => 
    activeRole === 'agent' ? r.universityId === selectedEntity.id : r.agentId === selectedEntity.id
  ) : null

  const handleUpdateStatus = async (requestId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'partnershipRequests', requestId), {
        status,
        updatedAt: serverTimestamp()
      })
      toast.success(`Partnership ${status} successfully.`)
    } catch (err) {
      console.error("Error updating partnership status:", err)
      toast.error("Failed to update status.")
    }
  }

  const [photoUploading, setPhotoUploading] = useState(false)

  const handleSaveMeeting = async () => {
    if (!selectedUni || !meetingDate || !meetingTime || !auth.currentUser) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsScheduling(true)
    const toastId = toast.loading("Scheduling meeting...")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/calendar')
      
      let token: string | undefined
      try {
        const result = await linkWithPopup(auth.currentUser, provider)
        token = GoogleAuthProvider.credentialFromResult(result)?.accessToken
      } catch (err: any) {
        if (err.code === 'auth/credential-already-in-use') {
           const credential = GoogleAuthProvider.credentialFromError(err)
           token = credential?.accessToken
        } else {
           throw err
        }
      }

      if (!token) throw new Error('Authorization required')

      const response = await fetch('/api/schedule-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: meetingDate,
          time: meetingTime,
          interviewer: meetingInterviewer || 'Agent',
          notes: meetingNotes,
          attendeeEmail: selectedUni.email,
          studentName: `Partnership Meeting: ${selectedUni.name || selectedEntity.companyName || selectedEntity.agencyName}`
        })
      })

      if (!response.ok) throw new Error('Failed to schedule interview')
      const result = await response.json()

      const updatedMeeting = {
        date: meetingDate,
        time: meetingTime,
        interviewer: meetingInterviewer || 'Agent',
        link: result.meetLink
      }

      await updateDoc(doc(db, 'users', selectedEntity.id), {
        scheduledMeeting: updatedMeeting
      })

      setSelectedEntity((prev: any) => ({
        ...prev,
        scheduledMeeting: updatedMeeting
      }))

      toast.success("Meeting scheduled successfully!", { id: toastId })
      setIsScheduleModalOpen(false)
      setMeetingDate('')
      setMeetingTime('')
      setMeetingNotes('')
      setMeetingInterviewer('')
    } catch (err) {
      console.error(err)
      toast.error("Failed to schedule meeting.", { id: toastId })
    } finally {
      setIsScheduling(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoUploading(true)
    const compressImage = (imgFile: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(imgFile)
        reader.onload = (event) => {
          const img = new Image()
          img.src = event.target?.result as string
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const MAX_WIDTH = 256
            const MAX_HEIGHT = 256
            let width = img.width
            let height = img.height

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width)
                width = MAX_WIDTH
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height)
                height = MAX_HEIGHT
              }
            }
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error("Failed to get 2D canvas context"))
              return
            }
            ctx.drawImage(img, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/png', 0.9)
            resolve(dataUrl)
          }
          img.onerror = () => reject(new Error("Failed to load image"))
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
      })
    }

    try {
      const base64Img = await compressImage(file)
      
      if (!selectedEntity?.id) {
        toast.error("Please select a valid agency first.")
        return
      }

      try {
        if (selectedEntity.isPredefined) {
          await setDoc(doc(db, 'users', selectedEntity.id), {
            logo: base64Img,
            updatedAt: serverTimestamp()
          }, { merge: true })
        } else {
          await updateDoc(doc(db, 'users', selectedEntity.id), {
            logo: base64Img,
            updatedAt: serverTimestamp()
          })
        }
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${selectedEntity.id}`)
      }

      setSelectedEntity((prev: any) => ({
        ...prev,
        logo: base64Img
      }))

      setEntities((prevEntities) =>
        prevEntities.map((item) =>
          item.id === selectedEntity.id ? { ...item, logo: base64Img } : item
        )
      )

      toast.success("Profile photo uploaded and saved successfully!")
    } catch (err: any) {
      console.error("Error uploading photo:", err)
      toast.error("Failed to upload photo: " + (err.message || err))
    } finally {
      setPhotoUploading(false)
    }
  }

  const normalizeCountryName = (name: string): string => {
    if (!name) return ''
    const norm = name.trim().toLowerCase()
    if (norm === 'uk' || norm === 'united kingdom' || norm === 'u.k.') return 'UK'
    if (norm === 'uae' || norm === 'united arab emirates' || norm === 'u.a.e.') return 'UAE'
    if (norm === 'australia') return 'Australia'
    if (norm === 'france') return 'France'
    if (norm === 'georgia') return 'Georgia'
    if (norm === 'malta') return 'Malta'
    return name
  }

  const AGENT_COUNTRIES = [
    { name: 'Australia', flag: 'https://flagcdn.com/w20/au.png' },
    { name: 'France', flag: 'https://flagcdn.com/w20/fr.png' },
    { name: 'Georgia', flag: 'https://flagcdn.com/w20/ge.png' },
    { name: 'Malta', flag: 'https://flagcdn.com/w20/mt.png' },
    { name: 'UAE', flag: 'https://flagcdn.com/w20/ae.png' },
    { name: 'UK', flag: 'https://flagcdn.com/w20/gb.png' },
  ]

  const preferredDestinations = profile?.preferredDestinations || ['UK', 'Australia']
  const referenceCountries = (profile?.references || []).map((ref: any) => ref.country).filter(Boolean)

  const matchedNormalized = Array.from(new Set([
    ...preferredDestinations.map(normalizeCountryName),
    ...referenceCountries.map(normalizeCountryName)
  ]))

  const countriesWithInstitutions = new Set(institutions.map(u => normalizeCountryName(u.country)))

  const filteredAgentCountries = AGENT_COUNTRIES.filter(c => {
    const countryNorm = (c.name || '').trim().toLowerCase()
    for (const [key, value] of Object.entries(hiddenCountries || {})) {
      if (value === true) {
        const kNorm = key.trim().toLowerCase()
        if (countryNorm === kNorm) return false
        if (kNorm === 'united kingdom' && countryNorm === 'uk') return false
        if (kNorm === 'uk' && countryNorm === 'united kingdom') return false
        if (kNorm === 'united arab emirates' && countryNorm === 'uae') return false
        if (kNorm === 'uae' && countryNorm === 'united arab emirates') return false
      }
    }
    
    return countriesWithInstitutions.has(c.name)
  })

  const displayCountries = filteredAgentCountries.filter(c => 
    matchedNormalized.includes(c.name)
  )

  const finalCountries = displayCountries.length > 0
    ? displayCountries
    : filteredAgentCountries.filter(c => c.name === 'UK' || c.name === 'Australia')

  useEffect(() => {
    if (activeRole === 'agent' && finalCountries.length > 0) {
      const activeExists = finalCountries.some(c => c.name === activeCountry)
      if (!activeExists) {
        setActiveCountry(finalCountries[0].name)
      }
    }
  }, [profile?.preferredDestinations, profile?.references, finalCountries, activeRole])

  const getInstitutionEmail = (uni: any) => {
    if (uni.email) return uni.email
    try {
      const url = new URL(uni.website)
      const domain = url.hostname.replace(/^www\./, '')
      return `admissions@${domain}`
    } catch {
      return 'admissions@university.edu'
    }
  }

  const getAgreementStatus = (uniId: string, uniName?: string) => {
    return findMatchingAgreement(agreements, uniId, uniName)
  }

  const handleConnectGoogle = async (): Promise<string | null> => {
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/documents')
      provider.addScope('https://www.googleapis.com/auth/drive.file')
      
      const result = await signInWithPopup(auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken)
        sessionStorage.setItem('g_docs_token', credential.accessToken)
        toast.success('Connected to Google Workspace!')
        return credential.accessToken
      } else {
        throw new Error('No access token returned from Google account.')
      }
    } catch (err: any) {
      console.error('OAuth popup connection error:', err)
      toast.error(err.message || 'Error authenticating Workspace scopes')
      return null
    }
  }

  const handleRetroactiveGenerate = async (agreement: any) => {
    setIsGeneratingDoc(true)
    try {
      let activeToken = googleToken
      if (!activeToken) {
        activeToken = await handleConnectGoogle()
      }
      if (!activeToken) {
        toast.error('Google Workspace authorization is required.')
        setIsGeneratingDoc(false)
        return
      }
      toast.loading('Generating Google Docs master files...')
      
      const docId = await googleDocAgreementCreator(
        activeToken,
        agreement.universityName,
        agreement.agentName,
        agreement.agentDetails,
        agreement.terms || { duration: '1 Year', commissionRate: '15%' }
      )

      await updateDoc(doc(db, 'agreements', agreement.id), {
        googleDocId: docId,
        googleDocUrl: `https://docs.google.com/document/d/${docId}/edit`,
        updatedAt: serverTimestamp(),
      })

      toast.dismiss()
      toast.success('Live Google Doc created successfully!')
    } catch (err: any) {
      toast.dismiss()
      console.error(err)
      toast.error('Failed to create agreement document. Please make sure Google account has acceptable drive permissions.')
      if (err.code || (err.message && err.message.includes('permission'))) {
        handleFirestoreError(err, OperationType.UPDATE, `agreements/${agreement.id}`)
      }
    } finally {
      setIsGeneratingDoc(false)
    }
  }

  const unisInCountry = institutions.filter(u => {
    const isOfCountry = (() => {
      if (activeCountry === 'UAE') return u.country === 'United Arab Emirates'
      if (activeCountry === 'UK') return u.country === 'United Kingdom'
      return u.country === activeCountry
    })()
    if (!isOfCountry) return false
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const rawName = u.name || ''
      const name = rawName.toLowerCase()
      const city = (u.location || '').toLowerCase()
      return name.startsWith(q) || !!rawName.split(' ').find(w => w.toLowerCase().startsWith(q)) || city.includes(q)
    }
    return true
  })

  if (activeRole === 'agent') {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />
          <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <span className="bg-white/15 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black tracking-wider inline-flex items-center gap-1">
                ✨ Suggested For You
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Institutional Partners & Agreements</h1>
              <p className="text-blue-100 text-sm max-w-xl font-medium col">
                Connect dynamically with global institutions matching your preference settings and reference regions. Check statuses, view profiles, and manage Workspace signing.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-widest text-slate-400 pl-1">Preferred Destinations</h2>
            <p className="text-[10px] font-bold text-slate-400">
              {finalCountries.length} active global regions
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {finalCountries.map(c => {
              const isSelected = activeCountry === c.name
              return (
                <button
                  key={c.name}
                  onClick={() => setActiveCountry(c.name)}
                  className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all duration-300 flex items-center gap-2 border cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 scale-[1.02]' 
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-800 shadow-sm'
                  }`}
                >
                  <img src={c.flag} alt={`${c.name} flag`} className="w-4 h-3.5 object-cover rounded shadow-sm shrink-0" />
                  <span>{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-sm font-extrabold text-slate-700">
              Universities in {activeCountry === 'UK' ? 'United Kingdom (UK)' : activeCountry === 'UAE' ? 'United Arab Emirates (UAE)' : activeCountry}
            </h3>
            <span className="text-xs text-slate-400 font-bold bg-slate-100/80 px-4 py-1 rounded-full">
              {unisInCountry.length} results
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {unisInCountry.length > 0 ? (
              unisInCountry.map(uni => {
                const agreement = getAgreementStatus(uni.id, uni.name)
                const contactEmail = getInstitutionEmail(uni)
                
                return (
                  <div 
                    key={uni.id} 
                    className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 hover:shadow-lg hover:border-blue-100/70 transition-all group duration-300 animate-fadeIn"
                  >
                     <div className="flex items-center gap-4 flex-1">
                        <div onClick={() => router.push(`/institution/${uni.id}`)} className="cursor-pointer">
                           <UniversityLogo website={uni.website} name={uni.name} logo={uni.logo} />
                        </div>
                        <div className="space-y-1">
                          <h3 
                            onClick={() => router.push(`/institution/${uni.id}`)}
                            className="font-extrabold text-slate-800 text-base md:text-lg hover:text-blue-600 cursor-pointer transition-colors leading-snug"
                          >
                            {uni.name}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
                            <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                              <MapPin size={12} /> {uni.location || uni.country}
                            </p>
                            
                            <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                              <Mail size={12} /> {contactEmail}
                            </p>

                            {agreement && agreement.googleDocId && (
                              <span className="scale-90 origin-left text-[10px] font-black font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                                 <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                 G-Docs Linked
                              </span>
                            )}
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex flex-wrap md:flex-nowrap items-center md:items-center gap-x-4 gap-y-2.5 w-full md:w-auto mt-4 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                        <div className="shrink-0 flex items-center">
                          {agreement ? (
                             <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider flex items-center gap-2 ${
                                agreement.status === 'approved' || agreement.status === 'signed' ? 'bg-green-50 text-green-700 border border-green-100' :
                                agreement.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                                'bg-orange-50 text-orange-700 border border-orange-100'
                             }`}>
                                {agreement.status === 'approved' || agreement.status === 'signed' ? (
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                ) : (
                                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                )}
                                {agreement.status.replace('_', ' ')}
                             </span>
                          ) : (
                             <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] font-black tracking-wider">
                                Not Started
                             </span>
                          )}
                        </div>

                        <div className="hidden md:block w-px h-8 bg-slate-100" />

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto ml-auto md:ml-0">
                          <button 
                             onClick={() => router.push(`/institution/${uni.id}`)}
                             className="flex-1 sm:flex-initial justify-center px-6 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm cursor-pointer"
                          >
                             <Eye size={14} /> View Profile
                          </button>

                          {agreement ? (
                             agreement.status === 'signed' || agreement.status === 'approved' ? (
                               <button 
                                  onClick={() => window.open(`/agreements/review/${agreement.id}`, '_blank')}
                                  className="flex-1 sm:flex-initial justify-center px-6 py-3 bg-[#0059E7] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                               >
                                  <FileText size={14} /> View Agreement
                               </button>
                             ) : (
                               <button 
                                  onClick={() => window.open(`/agreements/review/${agreement.id}`, '_blank')}
                                  className="flex-1 sm:flex-initial justify-center px-6 py-3 bg-[#0059E7] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                               >
                                  <FileText size={14} /> Submitted
                               </button>
                             )
                          ) : (
                             <button 
                                onClick={() => {
                                   window.open(`/agreements/sign/${uni.id}`, '_blank')
                                }}
                                className="flex-1 sm:flex-initial justify-center px-6 py-3 bg-[#0059E7] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                             >
                                <Plus size={14} /> Sign Agreement
                             </button>
                          )}
                        </div>
                     </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                <p className="text-slate-400 font-bold text-sm">No institutions found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeRole === 'agent' && (
        <div className="flex justify-end">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search universities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="ml-auto text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {selectedEntity ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setSelectedEntity(null)}
                className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors font-bold text-sm border border-slate-100"
              >
                <X size={18} />
                Back to List
              </button>
              <div className="flex gap-2">
                {activeRole === 'agent' && (
                  <>
                    {currentRequest?.status === 'approved' ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-100">
                        <CheckCircle2 size={16} />
                        Partnered
                      </div>
                    ) : currentRequest?.status === 'pending' ? (
                      <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold border border-orange-100">
                        <Clock size={16} />
                        Request Pending
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleRequestPartnership(selectedEntity)}
                        disabled={requestLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {requestLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        Register Partnership
                      </button>
                    )}
                  </>
                )}

                {activeRole === 'university' && currentRequest?.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(currentRequest.id, 'approved')}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(currentRequest.id, 'rejected')}
                      className="px-6 py-3 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 hover:bg-red-500 transition-all flex items-center gap-2"
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                )}
                
                {activeRole === 'agent' && (selectedEntity.institutionName || selectedEntity.fullName) && (
                  <button 
                    onClick={() => router.push(`/institution/${selectedEntity?.universityId || selectedEntity.id}`)}
                    className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-50 transition-all flex items-center gap-2"
                  >
                    <Eye size={16} /> Detailed Page
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
              {activeRole === 'agent' ? (
                <UniversityLogo 
                  website={selectedEntity.website} 
                  name={selectedEntity.companyName || selectedEntity.agencyName || selectedEntity.institutionName || selectedEntity.fullName} 
                  size="w-32 h-32 rounded-[2.5rem]" 
                  iconSize="w-12 h-12"
                  logo={selectedEntity.logo}
                />
              ) : (
                <div className="relative group/photo shrink-0">
                  {selectedEntity.logo ? (
                    <img 
                      src={selectedEntity.logo} 
                      alt="Agency Logo" 
                      className={`w-32 h-32 rounded-[2.5rem] object-cover shadow-xl border-2 border-white transition-all ${photoUploading ? 'opacity-50' : ''}`}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-bold shadow-xl bg-orange-500">
                      {(selectedEntity.companyName || selectedEntity.agencyName || selectedEntity.institutionName || selectedEntity.fullName)?.charAt(0)}
                    </div>
                  )}
                  {photoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-[2.5rem]">
                      <Loader2 size={18} className="animate-spin text-white" />
                    </div>
                  )}
                  <label className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white rounded-b-[2.5rem] h-10 opacity-0 group-hover/photo:opacity-100 transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer text-[10px] font-bold">
                    <Camera size={14} className="text-white shrink-0" />
                    <span>Upload Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload} 
                      disabled={photoUploading}
                    />
                  </label>
                </div>
              )}
              <div className="text-center md:text-left pt-2">
                <h2 className="text-3xl font-bold text-grad-text-main font-outfit mb-4 tracking-tight">
                   {selectedEntity.companyName || selectedEntity.agencyName || selectedEntity.institutionName || selectedEntity.fullName}
                </h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-sm px-4 py-3 bg-slate-50 rounded-xl">
                    <MapPin size={16} className="text-slate-400" />
                    {selectedEntity.country || 'Global'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-sm px-4 py-3 bg-slate-50 rounded-xl">
                    <Globe size={16} className="text-slate-400" />
                    {selectedEntity.isPredefined ? 'Predefined Partner' : 'Registered Member'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {activeRole === 'university' && (
                  <div className="bg-slate-50/50 p-1 rounded-2xl border border-slate-100 flex gap-1 w-full overflow-x-auto no-scrollbar">
                    {[
                      { id: 'stats', label: 'Partner Stats', icon: TrendingUp },
                      { id: 'general', label: 'General', icon: Building2 },
                      { id: 'scope', label: 'Recruitment Scope', icon: Globe },
                      { id: 'compliance', label: 'Compliance & Verification', icon: ShieldCheck }
                    ].map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeProfileTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveProfileTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            isActive 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                          }`}
                        >
                          <Icon size={14} />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-8">
                  {(activeProfileTab === 'general' || activeRole === 'agent') && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      {activeRole === 'university' && (
                        <div>
                          <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Corporate & Office Details</h3>
                          <div className="space-y-4">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400">Official Business Name</p>
                                  <p className="text-sm font-bold text-slate-800">{selectedEntity.companyName || selectedEntity.agencyName || 'TBD'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400">Website</p>
                                  <a href={selectedEntity.website} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                    {selectedEntity.website?.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                                  </a>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                                  <MapPin size={20} />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold text-slate-400">Headquarters / Regional Office</p>
                                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{selectedEntity.address || 'Location information available upon request'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">About the {activeRole === 'university' ? 'Agency' : 'Institution'}</h3>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 min-h-[100px] flex items-center">
                          {descriptionLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                              <Loader2 size={16} className="animate-spin" />
                              <p className="text-sm font-medium">Retrieving official information...</p>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                              {dynamicDescription ? `"${dynamicDescription}"` : `"Professional ${activeRole === 'university' ? 'recruitment agency' : 'higher education institution'} dedicated to excellence in international student services and global education standards. We prioritize student success and transparent communication."`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Staff Directory</h3>
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/50">
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 tracking-widest whitespace-nowrap">Agent Fullname</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 tracking-widest whitespace-nowrap">Communication</th>
                                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 tracking-widest whitespace-nowrap text-right">Position / Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                <tr className="hover:bg-slate-50/50 transition-colors bg-blue-50/20">
                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
                                        {(selectedEntity.rep1Name || selectedEntity.fullName || 'U')?.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-slate-800">{selectedEntity.rep1Name || selectedEntity.fullName || 'Primary Contact'}</p>
                                        <p className="text-[10px] font-bold text-blue-600 tracking-tighter">Primary Representative</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                        <Mail size={12} className="text-slate-400" />
                                        <span>{selectedEntity.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-right">
                                    <p className="text-xs font-bold text-slate-800">{selectedEntity.rep1Position || selectedEntity.jobTitle || 'Director'}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{selectedEntity.country || 'Headquarters'}</p>
                                  </td>
                                </tr>

                                {selectedEntity.rep2Name && (
                                  <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs shadow-sm">
                                          {selectedEntity.rep2Name.charAt(0)}
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold text-slate-800">{selectedEntity.rep2Name}</p>
                                          <p className="text-[10px] font-bold text-slate-400 tracking-tighter">Secondary Contact</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5" />
                                    <td className="px-6 py-5 text-right">
                                      <p className="text-xs font-bold text-slate-800">{selectedEntity.rep2Position || 'Executive'}</p>
                                    </td>
                                  </tr>
                                )}

                                {associatedAgents.map((agent: any) => (
                                  <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs shadow-sm border border-slate-100">
                                          {agent.fullName?.charAt(0)}
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">{agent.fullName}</p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                          <Mail size={12} className="text-slate-400" />
                                          <span>{agent.email}</span>
                                        </div>
                                        {agent.phoneNumber && (
                                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Phone size={12} className="text-slate-400" />
                                            <span>{agent.phoneNumber}</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                      <p className="text-xs font-bold text-slate-500">{agent.address || 'Regional Office'}</p>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeRole === 'university' && activeProfileTab === 'scope' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                       <div>
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Recruitment Footprint</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <MapPin size={12} /> Key Source Markets
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntity.targetSourceMarkets?.map((m: string) => (
                                  <span key={m} className="px-3 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 shadow-sm">{m}</span>
                                )) || <span className="text-xs text-slate-400 font-medium italic">Global / Not specified</span>}
                              </div>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <Globe size={12} /> Preferred Destinations
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntity.preferredDestinations?.map((d: string) => (
                                  <span key={d} className="px-3 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 shadow-sm">{d}</span>
                                )) || <span className="text-xs text-slate-400 font-medium italic">All major regions</span>}
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white">
                          <p className="text-[10px] font-black tracking-widest opacity-80 mb-2">Recruitment Volume</p>
                          <p className="text-3xl font-black">{selectedEntity.recruitmentVolume || '0-50'} <span className="text-sm font-bold opacity-70">Students / Year</span></p>
                          <p className="text-[10px] mt-4 font-bold opacity-60 leading-relaxed tracking-tighter">Verified annual intake across primary institutional partners in the last fiscal year.</p>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-black tracking-widest opacity-80 mb-2">Visa Success Rate</p>
                            <p className="text-3xl font-black">{selectedEntity.visaSuccessRate || '95'}% <span className="text-sm font-bold opacity-70">Approval</span></p>
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedEntity.visaSuccessRate || 95}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-status-success-border">HIGH</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeRole === 'university' && activeProfileTab === 'compliance' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                       <div>
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Credentials & Documentation</h3>
                        <div className="grid grid-cols-2 gap-4">
                           {Object.entries(selectedEntity.docStatuses || {
                             businessRegistration: 'Verified',
                             panCertificate: 'Verified',
                             license: 'Pending Verification',
                             professionalCerts: 'Missing'
                           }).filter(([k]) => k !== 'uploadedFiles').map(([key, status]) => (
                              <div key={key} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</p>
                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{String(status)}</p>
                                 </div>
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                   status === 'Verified' ? 'bg-green-100 text-green-600' :
                                   status === 'Missing' ? 'bg-red-500 text-red-700' : 'bg-orange-100 text-orange-600'
                                 }`}>
                                   {status === 'Verified' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                 </div>
                              </div>
                           ))}
                        </div>
                      </div>

                      {selectedEntity.references && selectedEntity.references.length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Verified University References</h3>
                          <div className="space-y-4">
                            {selectedEntity.references.map((ref: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-800">{ref.institution}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                      <User size={12} /> {ref.referee}
                                    </p>
                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                      <Clock size={12} /> {ref.duration}
                                    </p>
                                  </div>
                                </div>
                                <div className="sm:text-right">
                                  <p className="text-xs font-bold text-slate-400 tracking-widest mb-1">{ref.country}</p>
                                  <p className="text-xs font-bold text-blue-600 underline cursor-pointer">{ref.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeRole === 'university' && activeProfileTab === 'stats' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Partner Portal Performance</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                            <p className="text-2xl font-black text-slate-800">{stats.total || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest">Total Apps</p>
                          </div>
                          <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center">
                            <p className="text-2xl font-black text-green-700">{stats.enrolled || 0}</p>
                            <p className="text-[10px] font-bold text-green-600 tracking-widest">Enrolled</p>
                          </div>
                          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
                            <p className="text-2xl font-black text-blue-700">{stats.pending || 0}</p>
                            <p className="text-[10px] font-bold text-blue-600 tracking-widest">In Process</p>
                          </div>
                          <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center">
                            <p className="text-2xl font-black text-orange-700">{Math.round((stats.approved / (stats.total || 1)) * 100)}%</p>
                            <p className="text-[10px] font-bold text-orange-600 tracking-widest">Success Rate</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-400 tracking-widest mb-4">Contractual Period</h3>
                        {(() => {
                          const contractAgrmnt = selectedEntity ? agreements.find(a => activeRole === 'university' ? a.agentId === selectedEntity.id : a.universityId === selectedEntity.id) : null
                          const isSigned = contractAgrmnt?.status === 'approved' && contractAgrmnt?.signedAt
                          let commDate = 'Not Signed'
                          let expDate = 'Not Signed'
                          if (isSigned) {
                            try {
                              const d = contractAgrmnt.signedAt.toDate ? contractAgrmnt.signedAt.toDate() : new Date(contractAgrmnt.signedAt)
                              if (!isNaN(d.getTime())) {
                                commDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                expDate = calculateExpiryDate(contractAgrmnt.signedAt, contractAgrmnt.duration || '1 Year')
                              }
                            } catch(e){}
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                                  <Calendar size={24} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400">Agreement Commencement</p>
                                  <p className="text-lg font-bold text-slate-800">{commDate}</p>
                                </div>
                              </div>
                              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                                  <Clock size={24} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400">Agreement Expiry</p>
                                  <p className="text-lg font-bold text-slate-800">{expDate}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {['agent', 'institution'].includes(activeRole) && (
                  <ContractCard 
                    requestId={currentRequest?.id} 
                    universityId={selectedEntity.id}
                    contractStatus={currentRequest?.contractStatus || 'none'} 
                    role={activeRole as 'agent' | 'institution'}
                  />
                )}

                {(selectedEntity.email || selectedEntity.phoneNumber) && (
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-xs">
                    <h3 className="text-xs font-black text-slate-400 tracking-widest mb-4">Contact Channels</h3>
                    <div className="space-y-3">
                      {selectedEntity.email && (
                        <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                            <Mail size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-slate-400">Email Address</p>
                            <p className="text-xs font-bold text-slate-800 break-all">{selectedEntity.email}</p>
                          </div>
                        </div>
                      )}
                      {selectedEntity.phoneNumber && (
                        <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                            <Phone size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-slate-400">Direct Line</p>
                            <p className="text-xs font-bold text-slate-800 truncate">{selectedEntity.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xs">
                  <h3 className="text-xs font-black text-slate-400 tracking-widest mb-4">Meeting Status</h3>
                  {selectedEntity.scheduledMeeting ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Meeting Confirmed</p>
                          <p className="text-[10px] font-medium text-slate-500">{selectedEntity.scheduledMeeting.date} at {selectedEntity.scheduledMeeting.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 p-3 bg-slate-50 rounded-xl">
                        <User size={14} className="text-slate-400" />
                        <span>Facilitator: {selectedEntity.scheduledMeeting.interviewer}</span>
                      </div>
                      <a 
                        href={selectedEntity.scheduledMeeting.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full py-3 bg-blue-600 text-white text-center font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        Join Meeting
                      </a>
                      <button 
                        onClick={() => {
                          setSelectedUni({
                            name: selectedEntity.agencyName || selectedEntity.companyName || selectedEntity.name || 'Partner',
                            email: selectedEntity.email || 'partner@agency.com'
                          })
                          if (selectedEntity.scheduledMeeting) {
                            setMeetingDate(selectedEntity.scheduledMeeting.date || '')
                            setMeetingTime(selectedEntity.scheduledMeeting.time || '')
                            setMeetingInterviewer(selectedEntity.scheduledMeeting.interviewer || '')
                            setMeetingNotes(selectedEntity.scheduledMeeting.notes || '')
                          } else {
                            setMeetingDate('')
                            setMeetingTime('')
                            setMeetingInterviewer('')
                            setMeetingNotes('')
                          }
                          setIsScheduleModalOpen(true)
                        }}
                        className="block w-full py-3 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-center font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Reschedule Meeting
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500 mb-6 font-medium">No meeting scheduled yet.</p>
                      <button 
                        onClick={() => {
                          setSelectedUni({
                            name: selectedEntity.agencyName || selectedEntity.companyName || selectedEntity.name || 'Partner',
                            email: selectedEntity.email || 'partner@agency.com'
                          })
                          setIsScheduleModalOpen(true)
                        }}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all"
                      >
                        Schedule a Meeting
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {activeRole === 'university' && (
            <>
              <div className="mb-6">
                <NetworkOverviewGrid />
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-[1.75rem] shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportToExcel}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/15 transition-all cursor-pointer"
                  >
                    <Download size={15} />
                    Export
                  </button>
                  
                  <div className="hidden sm:block h-6 w-px bg-slate-200" />

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 hidden sm:block whitespace-nowrap">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs cursor-pointer min-w-[130px]"
                    >
                      <option value="all">All Status</option>
                      <option value="registered">Registered</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input 
                    type="text"
                    placeholder="Search agencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-xs"
                  />
                </div>
              </div>
            </>
          )}
          {loading ? (
            <CentralLoader minHeight="min-h-[400px]" />
          ) : paginatedEntities.length > 0 ? (
            <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="hidden md:block overflow-x-auto border-b border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/60">
                      <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase whitespace-nowrap">Entity Name</th>
                      <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase whitespace-nowrap">Country/Location</th>
                      <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase whitespace-nowrap">Point of Contact</th>
                      <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase whitespace-nowrap">Network Status</th>
                      <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase text-right whitespace-nowrap">
                        {activeRole === 'university' ? 'Agreement Expiry' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEntities.map((entity) => {
                      const request = activeRole === 'university' 
                        ? partnershipRequests.find(r => r.agentId === entity.id)
                        : null
                      
                      const displayName = entity.companyName || entity.agencyName || entity.institutionName || entity.fullName

                      return (
                        <tr 
                          key={entity.id} 
                          onClick={() => {
                            if (activeRole === 'agent') {
                              router.push(`/institution/${entity.id}`)
                            } else {
                              setSelectedEntity(entity)
                            }
                          }}
                          className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-5 max-w-[300px]">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-xs ${
                                activeRole === 'university' ? 'bg-blue-50 text-grad-blue' : 'bg-orange-50 text-orange-600'
                              }`}>
                                {activeRole === 'university' ? (
                                  <Building2 size={20} />
                                ) : (
                                  <UniversityFavicon 
                                    url={entity.website} 
                                    name={entity.institutionName || entity.fullName || entity.name} 
                                    altIcon={<Globe size={20} />} 
                                  />
                                )}
                              </div>
                              <div className="truncate">
                                <p className="font-bold font-outfit text-slate-900 text-sm group-hover:text-grad-blue transition-colors truncate">
                                  {displayName}
                                </p>
                                {entity.staff && entity.staff.length > 0 && (
                                  <p className="text-[10px] text-slate-400 font-bold tracking-tight flex items-center gap-1 mt-0.5">
                                    <Users size={10} />
                                    {entity.staff.length} {entity.staff.length === 1 ? 'Agent' : 'Agents'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                              <MapPin size={14} className="text-slate-400" />
                              {entity.country || 'Global'}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-700 font-semibold truncate max-w-[200px]">
                                {entity.email || 'No email provided'}
                              </p>
                              {entity.website && (
                                <p className="text-[10px] text-grad-blue font-semibold truncate max-w-[200px]">
                                  {entity.website}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              activeRole === 'university'
                                ? (() => {
                                    const status = getAgentStatus(entity.id)
                                    if (status === 'Registered') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    if (status === 'Pending') return 'bg-amber-50 text-amber-700 border-amber-200'
                                    return 'bg-rose-50 text-rose-700 border-rose-200'
                                  })()
                                : entity.isPredefined 
                                  ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {activeRole === 'university' 
                                ? getAgentStatus(entity.id)
                                : entity.isPredefined ? 'Predefined' : 'Registered'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-xs text-slate-600">
                            {activeRole === 'university' ? (
                              (() => {
                                const agreement = agreements.find(a => a.agentId === entity.id)
                                if (agreement && (agreement.status === 'signed' || agreement.status === 'approved' || agreement.status === 'under_review')) {
                                  return calculateExpiryDate(agreement.agentDetails?.signedDate || agreement.createdAt, agreement.terms?.duration || '1 Year')
                                }
                                return 'N/A'
                              })()
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {activeRole === 'agent' && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/institution/${entity.id}`)
                                    }}
                                    className="px-3 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-blue-600 shadow-sm hover:border-blue-200 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1"
                                  >
                                    <Eye size={12} /> Detailed Page
                                  </button>
                                )}
                                <button className="px-3 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 shadow-sm hover:border-slate-200 transition-all opacity-0 group-hover:opacity-100">
                                  View Profile
                                </button>
                                <div className="p-2 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
                                  <ChevronRight size={18} />
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedEntities.map((entity) => {
                  const request = activeRole === 'university' 
                    ? partnershipRequests.find(r => r.agentId === entity.id)
                    : null
                  
                  const displayName = entity.companyName || entity.agencyName || entity.institutionName || entity.fullName
                  const agreement = activeRole === 'university' ? agreements.find(a => a.agentId === entity.id) : null
                  
                  return (
                    <div 
                      key={entity.id}
                      onClick={() => {
                        if (activeRole === 'agent') {
                          router.push(`/institution/${entity.id}`)
                        } else {
                          setSelectedEntity(entity)
                        }
                      }}
                      className="p-5 space-y-4 hover:bg-slate-50/50 active:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white shadow-sm ${
                            activeRole === 'university' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {activeRole === 'university' ? (
                              <Building2 size={20} />
                            ) : (
                              <UniversityFavicon 
                                url={entity.website} 
                                name={entity.institutionName || entity.fullName || entity.name} 
                                altIcon={<Globe size={20} />} 
                              />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#1E1E1E] font-outfit leading-tight mb-1">
                              {displayName}
                            </h4>
                            {entity.staff && entity.staff.length > 0 && (
                              <p className="text-[10px] text-slate-400 font-bold tracking-tight flex items-center gap-1 mt-0.5">
                                <Users size={10} />
                                {entity.staff.length} {entity.staff.length === 1 ? 'Agent' : 'Agents'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-heavy tracking-widest border ${
                          activeRole === 'university'
                            ? (() => {
                                const status = getAgentStatus(entity.id)
                                if (status === 'Registered') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                if (status === 'Pending') return 'bg-amber-50 text-amber-700 border-amber-200'
                                return 'bg-rose-50 text-rose-700 border-rose-200'
                              })()
                            : entity.isPredefined 
                              ? 'bg-slate-100 text-slate-500 border-slate-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {activeRole === 'university' 
                            ? getAgentStatus(entity.id)
                            : entity.isPredefined ? 'Predefined' : 'Registered'}
                        </span>
                      </div>

                      <div className="space-y-2.5 pt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 tracking-wider">Location</span>
                          <span className="text-slate-600 font-medium flex items-center gap-1.5">
                            <MapPin size={12} className="text-slate-400" />
                            {entity.country || 'Global'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 tracking-wider">Contact</span>
                          <span className="text-slate-600 font-medium text-right truncate max-w-[200px]">
                            {entity.email || 'No email provided'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          {activeRole === 'university' ? (
                            <>
                              <span className="text-[10px] font-black text-slate-400 tracking-wider">Agreement Expiry</span>
                              <span className="text-xs font-bold text-slate-700">
                                {(() => {
                                  if (agreement && (agreement.status === 'signed' || agreement.status === 'approved' || agreement.status === 'under_review')) {
                                    return calculateExpiryDate(agreement.agentDetails?.signedDate || agreement.createdAt, agreement.terms?.duration || '1 Year')
                                  }
                                  return 'N/A'
                                })()}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-black text-slate-400 tracking-wider">Actions</span>
                              <div className="flex items-center gap-2">
                                {activeRole === 'agent' && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/institution/${entity.id}`)
                                    }}
                                    className="px-2.5 py-1.5 bg-white border border-slate-150 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-slate-50 flex items-center gap-1"
                                  >
                                    <Eye size={10} /> Profile
                                  </button>
                                )}
                                <button className="px-2.5 py-1.5 bg-white border border-slate-150 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50">
                                  View
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-8">
                  {activeRole === 'university' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 hidden sm:block">Show:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  )}
                  
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest whitespace-nowrap">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEntities.length)} of {filteredEntities.length} entries
                  </p>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }}
                      disabled={currentPage === 1}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 hover:bg-slate-50 cursor-pointer shadow-sm transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPage(page)
                          }}
                          className={`w-8 h-8 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                            currentPage === page 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 hover:bg-slate-50 cursor-pointer shadow-sm transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No results found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto px-4 mt-2">
                {searchQuery 
                  ? `We couldn't find any match for "${searchQuery}". Try a different keyword.`
                  : activeRole === 'university' 
                    ? "There are currently no registered recruitment agencies in your network. Once agencies sign up, they will appear here automatically."
                    : "You can find and manage your university connections here once partnership agreements have been finalized and approved with them."}
              </p>
            </div>
          )}
        </>
      )}

      {isScheduleModalOpen && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Schedule Meeting</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 font-medium mb-8">
              Scheduling a partnership meeting with <span className="font-bold text-slate-900">{selectedUni?.name}</span>
            </p>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest px-1">Date</label>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest px-1">Time</label>
                  <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-widest px-1">Full Name</label>
                <input type="text" value={meetingInterviewer} onChange={(e) => setMeetingInterviewer(e.target.value)} placeholder="e.g. John Doe" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-widest px-1">Agenda / Notes</label>
                <textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} placeholder="Meeting agenda or notes..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold h-24" />
              </div>
            </div>

            <button
              onClick={handleSaveMeeting}
              disabled={isScheduling}
              className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black tracking-widest text-[11px] hover:bg-[#0059E7] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isScheduling ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
              {isScheduling ? 'Scheduling...' : 'Confirm Meeting'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default NetworkView