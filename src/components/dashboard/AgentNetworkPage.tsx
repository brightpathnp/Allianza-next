'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { Building2, Calendar, Loader2, X, Clock, User } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { signInWithPopup, GoogleAuthProvider, linkWithPopup } from 'firebase/auth'
import { isSameUniversity, findMatchingAgreement } from '@/lib/universityUtils'

export function UniversityLogo({ website, name, size = "w-14 h-14 rounded-2xl", logo }: { website: string; name: string; size?: string; logo?: string }) {
  const [hasError, setHasError] = useState(false)
  
  if (logo) {
    return (
      <div className={`${size} border border-slate-100 shadow-sm flex items-center justify-center shrink-0 bg-white p-2 overflow-hidden relative`}>
        <img
          src={logo}
          className="w-full h-full object-contain"
          alt={name}
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
        <Building2 className="w-6 h-6 stroke-[1.8]" />
      </div>
    )
  }

  return (
    <div className={`${size} border border-slate-100 shadow-sm flex items-center justify-center shrink-0 bg-white p-2 overflow-hidden relative`}>
      <img
        src={`https://www.google.com/s2/favicons?sz=256&domain_url=${encodeURIComponent(resolvedWebsite)}`}
        className="w-full h-full object-contain"
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

interface UniversityPartner {
  id: string
  name: string
  locations: string[]
  country: string
  email: string
  status: 'NOT STARTED' | 'PENDING' | 'SIGNED'
  logoInitial: string
  colorHex: string
  website: string
}

const mockUniversities: UniversityPartner[] = [
  {
    id: 'acu',
    name: 'Australian Catholic University',
    locations: ['Ballarat', 'Blacktown', 'Brisbane', 'Canberra', 'Melbourne', 'North Sydney', 'Strathfield'],
    country: 'Australia',
    email: 'admissions@acu.edu.au',
    status: 'NOT STARTED',
    logoInitial: 'A',
    colorHex: 'bg-red-500',
    website: 'https://www.acu.edu.au',
  },
  {
    id: 'cqu',
    name: 'Central Queensland University',
    locations: ['Adelaide', 'Brisbane', 'Perth', 'Melbourne', 'Sydney', 'Rockhampton', 'Townsville'],
    country: 'Australia',
    email: 'admissions@cqu.edu.au',
    status: 'NOT STARTED',
    logoInitial: 'C',
    colorHex: 'bg-emerald-500',
    website: 'https://www.cqu.edu.au',
  },
  {
    id: 'cdu',
    name: 'Charles Darwin University',
    locations: ['Sydney', 'Darwin Waterfront'],
    country: 'Australia',
    email: 'admissions@cdu.edu.au',
    status: 'NOT STARTED',
    logoInitial: 'C',
    colorHex: 'bg-slate-800',
    website: 'https://www.cdu.edu.au',
  },
  {
    id: 'csu',
    name: 'Charles Sturt University',
    locations: ['Australia'],
    country: 'Australia',
    email: 'admissions@university.edu',
    status: 'NOT STARTED',
    logoInitial: 'C',
    colorHex: 'bg-blue-600',
    website: 'https://www.csu.edu.au',
  },
  {
    id: 'ltu',
    name: 'La Trobe University',
    locations: ['Sydney', 'Melbourne'],
    country: 'Australia',
    email: 'admissions@latrobe.edu.au',
    status: 'NOT STARTED',
    logoInitial: 'L',
    colorHex: 'bg-rose-600',
    website: 'https://www.latrobe.edu.au',
  },
  {
    id: 'gcm',
    name: 'Global College Malta',
    locations: ['SmartCity', 'Kalkara'],
    country: 'Malta',
    email: 'admissions@gcm.edu.mt',
    status: 'SIGNED',
    logoInitial: 'G',
    colorHex: 'bg-indigo-600',
    website: 'https://gcm.edu.mt',
  },
  {
    id: 'aea',
    name: 'Advenio eAcademy',
    locations: ['Mosta'],
    country: 'Malta',
    email: 'contact@aea.edu.mt',
    status: 'NOT STARTED',
    logoInitial: 'A',
    colorHex: 'bg-sky-500',
    website: 'https://aea.edu.mt',
  },
  {
    id: 'uom',
    name: 'University of Malta',
    locations: ['Msida', 'Valletta', 'Gozo'],
    country: 'Malta',
    email: 'info@uom.edu.mt',
    status: 'PENDING',
    logoInitial: 'M',
    colorHex: 'bg-amber-600',
    website: 'https://www.um.edu.mt',
  },
  {
    id: 'lmu',
    name: 'London Metropolitan University',
    locations: ['London', 'Holloway'],
    country: 'UK',
    email: 'admissions@londonmet.ac.uk',
    status: 'SIGNED',
    logoInitial: 'L',
    colorHex: 'bg-blue-900',
    website: 'https://www.londonmet.ac.uk',
  },
  {
    id: 'uol',
    name: 'University of Law',
    locations: ['London', 'Birmingham', 'Bristol', 'Leeds', 'Manchester'],
    country: 'UK',
    email: 'admissions@law.ac.uk',
    status: 'PENDING',
    logoInitial: 'U',
    colorHex: 'bg-purple-800',
    website: 'https://www.law.ac.uk',
  },
  {
    id: 'cov',
    name: 'Coventry University',
    locations: ['Coventry', 'London', 'Scarborough'],
    country: 'UK',
    email: 'admissions@coventry.ac.uk',
    status: 'NOT STARTED',
    logoInitial: 'C',
    colorHex: 'bg-yellow-600',
    website: 'https://www.coventry.ac.uk',
  }
]

const countryFlags: Record<string, string> = {
  'Australia': '🇦🇺',
  'Malta': '🇲🇹',
  'UK': '🇬🇧',
  'United Kingdom': '🇬🇧',
}

const normalizeCountryName = (name: string): string => {
  if (!name) return ''
  const norm = name.trim().toLowerCase()
  if (norm === 'uk' || norm === 'united kingdom' || norm === 'u.k.') return 'UK'
  if (norm === 'australia') return 'Australia'
  if (norm === 'malta') return 'Malta'
  return name
}

export default function AgentNetworkPage() {
  const { profile, institutions, user } = useAuth()
  const router = useRouter()
  const [activeRegion, setActiveRegion] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [agreements, setAgreements] = useState<any[]>([])
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [selectedUni, setSelectedUni] = useState<any>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedUniForView, setSelectedUniForView] = useState<any>(null)
  
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [meetingInterviewer, setMeetingInterviewer] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'agreements'),
      where('agentId', '==', user.uid)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgreements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }, (err) => {
      console.error("Error fetching agreements for AgentNetworkPage:", err)
    })
    return unsubscribe
  }, [user?.uid])

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
          studentName: `Partnership Meeting: ${selectedUni.name}`
        })
      })

      if (!response.ok) throw new Error('Failed to schedule interview')

      const resultData = await response.json()
      const meetLink = resultData.meetLink || ''

      const updatedMeeting = {
        date: meetingDate,
        time: meetingTime,
        interviewer: meetingInterviewer || 'Agent',
        notes: meetingNotes,
        link: meetLink,
        scheduledAt: new Date().toISOString()
      }

      await setDoc(doc(db, 'institutions', selectedUni.id), {
        scheduledMeeting: updatedMeeting
      }, { merge: true })

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

  let baseUniversities: any[] = (institutions && institutions.length > 0 ? institutions : mockUniversities)
  
  if (!baseUniversities.some((u: any) => isSameUniversity(u.id, 'global-college-malta'))) {
    const gcmMock = mockUniversities.find((u: any) => u.id === 'gcm')
    if (gcmMock) {
      baseUniversities = [...baseUniversities, { ...gcmMock, id: 'global-college-malta' }]
    }
  }

  const universitiesList = baseUniversities.map((uni: any) => {
    const agreement = findMatchingAgreement(agreements, uni.id, uni.name)
    let agreementStatus: string = 'NOT STARTED'
    if (agreement) {
      agreementStatus = 'SIGNED'
    }

    const normalizedCountry = normalizeCountryName(uni.country || 'Australia')

    let resolvedLocations: string[] = []
    if (uni.locations && Array.isArray(uni.locations)) {
      resolvedLocations = uni.locations
    } else if (uni.location) {
      resolvedLocations = [uni.location]
    } else {
      resolvedLocations = [normalizedCountry]
    }

    let resolvedEmail = uni.email || ''
    if (!resolvedEmail && uni.website) {
      try {
        const url = new URL(uni.website)
        const domain = url.hostname.replace(/^www\./, '')
        resolvedEmail = `admissions@${domain}`
      } catch {
        resolvedEmail = 'admissions@university.edu'
      }
    } else if (!resolvedEmail) {
      resolvedEmail = 'admissions@university.edu'
    }

    return {
      id: uni.id,
      name: uni.name,
      locations: resolvedLocations,
      country: normalizedCountry,
      email: resolvedEmail,
      status: agreementStatus,
      agreementId: agreement?.id || null,
      logoInitial: uni.name ? uni.name.charAt(0) : 'U',
      colorHex: 'bg-blue-600',
      website: uni.website || '',
      logo: uni.logo || '',
      scheduledMeeting: uni.scheduledMeeting || null,
    }
  })

  const preferredDestinations = (profile?.preferredDestinations || ['Australia', 'Malta', 'UK']) as string[]

  const currentInstitutions = (institutions && institutions.length > 0 ? institutions : mockUniversities)
  const countriesWithInstitutions = new Set(currentInstitutions.map(u => normalizeCountryName(u.country)))

  const dynamicRegions = Array.from(new Set(
    preferredDestinations.map(normalizeCountryName)
  ))
  .filter(countryName => countriesWithInstitutions.has(countryName))
  .map((countryName: string) => {
    return {
      id: countryName.toLowerCase(),
      name: countryName,
      flag: countryFlags[countryName] || '🌐'
    }
  })

  useEffect(() => {
    if (dynamicRegions.length > 0) {
      const activeExists = dynamicRegions.some(r => r.id === activeRegion)
      if (!activeExists) {
        setActiveRegion(dynamicRegions[0].id)
      }
    }
  }, [dynamicRegions, activeRegion])

  const currentRegionId = activeRegion || (dynamicRegions[0]?.id || 'australia')
  const activeRegionObj = dynamicRegions.find(r => r.id === currentRegionId) || dynamicRegions[0]

  const filteredUniversities = universitiesList.filter((uni) => {
    const targetCountry = activeRegionObj ? activeRegionObj.name : 'Australia'
    
    const uniCountryNorm = normalizeCountryName(uni.country)
    const targetCountryNorm = normalizeCountryName(targetCountry)

    if (uniCountryNorm !== targetCountryNorm) {
      return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const rawName = uni.name || ''
      return (
        rawName.toLowerCase().startsWith(q) ||
        !!rawName.split(' ').find(w => w.toLowerCase().startsWith(q)) ||
        uni.locations.some(loc => loc.toLowerCase().includes(q)) ||
        uni.email.toLowerCase().includes(q)
      )
    }

    return true
  })

  return (
    <div className="w-full font-sans antialiased text-[#1E293B]">
      
      <div className="w-full bg-gradient-to-r from-[#0B1528] via-[#162B4D] to-[#0D59E7] rounded-[24px] p-8 md:p-10 text-white shadow-xl shadow-blue-900/10 mb-8 relative overflow-hidden flex flex-col justify-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-300 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-shine pointer-events-none mix-blend-overlay" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-4">
            <span className="text-amber-300">✦</span> AI Recommendations
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Automated Partner Matching</h1>
          <p className="text-slate-200 text-xs md:text-sm font-medium leading-relaxed max-w-2xl">
            Discover institutions matching your recruitment profile, preference settings, and historical compliance score. Connect dynamically, view profiles, and send verification signing.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id="agent-network-search"
            type="text"
            placeholder="Search universities by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow shadow-sm placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mr-2 shrink-0">Preferred Destinations</span>
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm shrink-0">
            {dynamicRegions.map((region) => (
              <button
                key={region.id}
                id={`btn-region-${region.id}`}
                onClick={() => setActiveRegion(region.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  currentRegionId === region.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span>{region.flag}</span>
                {region.name}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div className="w-full">
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Universities in {activeRegionObj?.name || 'Selected Destination'}</h2>
          <span className="text-xs font-bold text-slate-400">{filteredUniversities.length} results found</span>
        </div>

        <div className="space-y-3">
          {filteredUniversities.length > 0 ? (
            filteredUniversities.map((uni) => (
              <div 
                key={uni.id} 
                className="group flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 bg-white border border-slate-200 rounded-[20px] hover:border-blue-300 hover:shadow-md transition-all duration-200 gap-4"
              >
                
                <div className="flex items-center gap-5 w-full lg:w-auto">
                  <UniversityLogo website={uni.website} name={uni.name} logo={uni.logo} />

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#1E293B] group-hover:text-blue-700 transition-colors">
                      {uni.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate max-w-[250px]">{uni.locations.join(', ')}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {uni.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3.5 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 border ${
                      uni.status === 'SIGNED' ? 'bg-green-50 text-green-700 border-green-200' :
                      uni.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        uni.status === 'SIGNED' ? 'bg-green-500' :
                        uni.status === 'PENDING' ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`} />
                      {uni.status}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    {uni.scheduledMeeting ? (
                      <button 
                        onClick={() => {
                          setSelectedUniForView(uni)
                          setIsViewModalOpen(true)
                        }}
                        className="flex-1 sm:flex-initial justify-center px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Interview
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setSelectedUni(uni)
                          setMeetingDate('')
                          setMeetingTime('')
                          setMeetingInterviewer('')
                          setMeetingNotes('')
                          setIsScheduleModalOpen(true)
                        }}
                        className="flex-1 sm:flex-initial justify-center px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar size={14} />
                        Schedule
                      </button>
                    )}
                    <button 
                      onClick={() => router.push(`/institution/${uni.id}`)}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Profile
                    </button>
                    {uni.status === 'SIGNED' ? (
                      <button 
                        onClick={() => window.open(`/agreements/review/${uni.agreementId}`, '_blank')}
                        className="flex-1 sm:flex-initial justify-center px-5 py-2 text-xs font-bold text-white bg-[#0059E7] hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">View Agreement</span>
                      </button>
                    ) : uni.status === 'PENDING' ? (
                      <button 
                        onClick={() => window.open(`/agreements/review/${uni.agreementId}`, '_blank')}
                        className="flex-1 sm:flex-initial justify-center px-5 py-2 text-xs font-bold text-white bg-[#0059E7] hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">View Agreement</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => window.open(`/agreements/sign/${uni.id}`, '_blank')}
                        className="flex-1 sm:flex-initial justify-center px-5 py-2 text-xs font-bold text-white bg-[#0059E7] hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="truncate">Sign Agreement</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-slate-400 font-bold text-sm">No institutions found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
      
      {isScheduleModalOpen && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 xs:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Time</label>
                  <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                <input type="text" value={meetingInterviewer} onChange={(e) => setMeetingInterviewer(e.target.value)} placeholder="e.g. John Doe" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Agenda / Notes</label>
                <textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} placeholder="Meeting agenda or notes..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold h-24" />
              </div>
            </div>

            <button
              onClick={handleSaveMeeting}
              disabled={isScheduling}
              className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isScheduling ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
              {isScheduling ? 'Scheduling...' : 'Confirm Meeting'}
            </button>
          </motion.div>
        </div>
      )}

      {isViewModalOpen && selectedUniForView && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            setIsViewModalOpen(false)
            setSelectedUniForView(null)
          }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-md p-6 xs:p-8 shadow-2xl my-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="text-[#0059E7] shrink-0" size={20} />
                Interview Details
              </h2>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false)
                  setSelectedUniForView(null)
                }} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 font-medium mb-6">
              Partnership meeting scheduled with <span className="font-bold text-slate-900">{selectedUniForView.name}</span>
            </p>

            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selectedUniForView.scheduledMeeting?.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{selectedUniForView.scheduledMeeting?.time}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interviewer / Facilitator</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{selectedUniForView.scheduledMeeting?.interviewer || 'Not specified'}</p>
              </div>

              {selectedUniForView.scheduledMeeting?.notes && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agenda / Notes</p>
                  <p className="text-xs font-medium text-slate-600 mt-1 bg-white p-3 rounded-xl border border-slate-150 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {selectedUniForView.scheduledMeeting.notes}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <a 
                  href={selectedUniForView.scheduledMeeting?.link || 'https://meet.google.com/new'}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#0059E7] text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                  </svg>
                  Join Interview
                </a>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => {
                  const uni = selectedUniForView
                  setIsViewModalOpen(false)
                  setSelectedUniForView(null)
                  setSelectedUni(uni)
                  if (uni.scheduledMeeting) {
                    setMeetingDate(uni.scheduledMeeting.date || '')
                    setMeetingTime(uni.scheduledMeeting.time || '')
                    setMeetingInterviewer(uni.scheduledMeeting.interviewer || '')
                    setMeetingNotes(uni.scheduledMeeting.notes || '')
                  }
                  setIsScheduleModalOpen(true)
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Reschedule
              </button>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false)
                  setSelectedUniForView(null)
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}