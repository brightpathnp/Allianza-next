'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { BookOpen, ChevronRight, Settings, Plus, X, Pencil, Loader2, Trash2, Award, Save, Sliders, PlayCircle, Circle, CircleDot, CheckCircle2, Lock, PanelLeftClose, PanelLeftOpen, ChevronLeft, Clock, Upload, ImageIcon, Search, Sun, Sparkles, Volume2, Pause, Play, StopCircle, RotateCcw } from 'lucide-react'
import CountryTrainingManager from '@/components/admin/CountryTrainingManager'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot, query, where, serverTimestamp, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ReactMarkdown from 'react-markdown'
import QuizRunner from '@/components/training/QuizRunner'
import { UserModuleProgress } from '@/types/training'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { mockCountries, mockLessons, syncSeedDataToFirestore } from '@/data/trainingHubSeed'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface InstitutionTraining {
  id: string
  title: string
  description: string
  includeQuiz: boolean
  coverImageUrl?: string
  imageUrl?: string
  durationHours?: number
  durationMinutes?: number
  estimatedMinutes?: number
  questions?: QuizQuestion[]
  lessons?: { title: string, content: string }[]
  modules?: any[]
  universityId: string
  createdBy?: string
  slug?: string
  flagEmoji?: string
  isPublished?: boolean
  createdAt: any
  updatedAt: any
}

const isHtmlContent = (content: string) => {
  if (!content) return false
  const trimmed = content.trim()
  return trimmed.startsWith('<') || /<[a-z][\s\S]*>/i.test(trimmed)
}

const stripHtml = (html: string) => {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')
}

export const isSameUniversity = (id1: string, id2: string) => {
  if (!id1 || !id2) return false
  const n1 = id1.trim().toLowerCase()
  const n2 = id2.trim().toLowerCase()
  if (n1 === n2) return true
  
  const isGCM = (id: string) => 
    id === 'global-college-malta' || 
    id === 'gcm' || 
    id === 'gcm-uid' || 
    id.includes('gcm') || 
    id.includes('malta')
    
  const isPBA = (id: string) => 
    id === 'paris-business-academy' || 
    id === 'pba' || 
    id === 'pba-uid' || 
    id.includes('paris')

  if (isGCM(n1) && isGCM(n2)) return true
  if (isPBA(n1) && isPBA(n2)) return true
  
  return false
}

export const isAgreementActive = (status: string) => {
  if (!status) return false
  const s = status.trim().toLowerCase()
  return s === 'signed' || s === 'approved' || s === 'under_review' || s === 'pending_signature' || s === 'active'
}

const compressImage = (base64Str: string, maxWidth = 1000, maxHeight = 1000, quality = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = base64Str
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(base64Str)
  })
}

export default function HubHome() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeRole, user, profile, institutions } = useAuth()
  const isSuperAdmin = activeRole === 'superadmin' || activeRole === 'admin'
  const [usersList, setUsersList] = useState<any[]>([])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'))
        setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })))
      } catch (err) {
        console.warn("Notice: users collection fetch failed:", err)
      }
    }
    fetchUsers()
  }, [])

  const getTrainingUniId = (trainingUniId: string) => {
    if (!trainingUniId) return ''
    const u = usersList.find(usr => usr.id === trainingUniId || usr.uid === trainingUniId)
    return u?.universityId || trainingUniId
  }

  const getUniName = (uid: string) => {
    let uniName = ''
    const userProfile = usersList.find(u => u.id === uid || u.uid === uid)
    if (userProfile) {
      uniName = userProfile.institutionName || userProfile.fullName || userProfile.name
    }
    if (!uniName) {
      const uidLower = uid.toLowerCase()
      if (uidLower === 'global-college-malta' || uidLower === 'gcm' || uidLower === 'gcm-uid' || uidLower.includes('gcm') || uidLower.includes('malta')) {
        uniName = 'Global College Malta'
      } else if (uidLower === 'paris-business-academy' || uidLower === 'pba' || uidLower === 'pba-uid' || uidLower.includes('paris')) {
        uniName = 'Paris Business Academy'
      } else {
        const found = (institutions || []).find(u => u.id === uid || u.id === uidLower)
        if (found) {
          uniName = found.name
        }
      }
    }

    if (uniName && uniName.endsWith(' Ser')) {
      uniName = uniName.replace(' Ser', '')
    }

    return uniName || ''
  }

  const getTrainingDisplayTitle = (training: InstitutionTraining) => {
    let titleToUse = training.title || ''
    if (titleToUse.trim() === 'Undergraduate Admission 2026' || titleToUse.trim() === 'Undergraduate Admissions 2026' || titleToUse.trim() === 'Training Institution') {
      titleToUse = 'Admission Course'
    }
    titleToUse = titleToUse.replace(/Training Institution/g, 'Institution Training')

    const uniName = getUniName(training.universityId || '')

    if (uniName && titleToUse.toLowerCase().includes(uniName.toLowerCase())) {
      const regex = new RegExp(`${uniName}\\s*[-:]?\\s*`, 'gi')
      titleToUse = titleToUse.replace(regex, '')
    }

    if (titleToUse.toLowerCase().includes('global college malta')) {
      titleToUse = titleToUse.replace(/global college malta/gi, '')
      titleToUse = titleToUse.replace(/^[-:\s]+/, '')
    }

    return titleToUse || 'Untitled Course'
  }

  const getTrainingLogo = (training: InstitutionTraining) => {
    const uid = training.universityId || ''
    
    const userProfile = usersList.find(u => u.id === uid || u.uid === uid)
    if (userProfile && userProfile.logo) {
      return userProfile.logo
    }

    const uidLower = uid.toLowerCase()
    const found = (institutions || []).find(u => u.id === uid || u.id === uidLower)
    if (found && found.logo) {
      return found.logo
    }

    return ''
  }

  const [showAdmin, setShowAdmin] = useState(false)
  const [activeHubTab, setActiveHubTab] = useState<'learning' | 'manage_mine' | 'manage_global' | 'video_guides'>(
    activeRole === 'university' ? 'manage_mine' : 'learning'
  )

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [highlightRects, setHighlightRects] = useState<DOMRect[]>([])
  const contentRef = useRef<HTMLDivElement>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const currentChunkIndexRef = useRef(0)
  const currentCharIndexRef = useRef(0)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
    }
    window.speechSynthesis.onvoiceschanged = loadVoices
    loadVoices()
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const updateHighlight = (charIndex: number, length: number) => {
    if (!contentRef.current) return
    
    const container = contentRef.current
    const range = document.createRange()
    let currentCount = 0
    let foundStart = false

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()

    while (node) {
      const text = node.textContent || ''
      const nodeLength = text.length

      if (!foundStart && currentCount + nodeLength > charIndex) {
        const startOffset = Math.max(0, charIndex - currentCount)
        range.setStart(node, Math.min(startOffset, nodeLength))
        foundStart = true
      }

      if (foundStart && currentCount + nodeLength >= charIndex + length) {
        const endOffset = (charIndex + length) - currentCount
        range.setEnd(node, Math.min(Math.max(0, endOffset), nodeLength))
        break
      }

      currentCount += nodeLength
      
      const nextNode = walker.nextNode()
      if (nextNode) {
        if (node.parentElement !== nextNode.parentElement) {
          currentCount += 1 
        }
      }
      node = nextNode
    }

    if (foundStart) {
      try {
        const rects = Array.from(range.getClientRects())
        setHighlightRects(rects)
      } catch (e) {
        console.warn('Highlight range error:', e)
      }
    }
  }

  const getBestVoice = () => {
    const availVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices()
    const englishVoices = availVoices.filter(v => v.lang.startsWith('en'))
    const natural = englishVoices.find(v => v.name.toLowerCase().includes('natural'))
    if (natural) return natural
    const google = englishVoices.find(v => v.name.toLowerCase().includes('google'))
    if (google) return google
    const us = englishVoices.find(v => v.lang === 'en-US')
    if (us) return us
    return englishVoices[0] || null
  }

  const stopTTS = () => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
      window.speechSynthesis.cancel()
    } catch (e) {
      console.warn('SpeechSynthesis stop error:', e)
    }
    ;(window as any)._activeUtterance = null
    setIsSpeaking(false)
    setIsPaused(false)
    setHighlightRects([])
  }

  const startTTS = (content: string, startChunkIdx?: number, startCharIdx?: number) => {
    if (isPaused && startChunkIdx === undefined && startCharIdx === undefined) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsSpeaking(true)
      return
    }

    stopTTS()

    setTimeout(() => {
      let textToSpeak = ""
      if (contentRef.current) {
        textToSpeak = contentRef.current.innerText || ""
      } else {
        textToSpeak = stripHtml(content || '')
      }

      if (!textToSpeak.trim()) {
        toast.error("No speakable text found.")
        return
      }
      
      const rawText = textToSpeak
      const chunks = rawText.match(/[^.!?]+[.!?]+[\])'"`'""]*\s*|.+/g) || [rawText]
      
      let currentChunkIndex = startChunkIdx !== undefined ? startChunkIdx : currentChunkIndexRef.current
      let totalCharOffset = 0
      for (let i = 0; i < currentChunkIndex && i < chunks.length; i++) {
        totalCharOffset += chunks[i].length
      }

      const playNextChunk = () => {
        if (currentChunkIndex >= chunks.length) {
          ;(window as any)._activeUtterance = null
          setIsSpeaking(false)
          setIsPaused(false)
          setHighlightRects([])
          currentChunkIndexRef.current = 0
          currentCharIndexRef.current = 0
          return
        }

        currentChunkIndexRef.current = currentChunkIndex
        let chunkText = chunks[currentChunkIndex]
        
        let startOffset = (currentChunkIndex === startChunkIdx && startCharIdx !== undefined) ? startCharIdx : (currentChunkIndex === currentChunkIndexRef.current ? currentCharIndexRef.current : 0)
        if (startOffset > 0 && startOffset < chunkText.length) {
          totalCharOffset += startOffset
          chunkText = chunkText.substring(startOffset)
        }

        const utterance = new SpeechSynthesisUtterance(chunkText)
        
        const bestVoice = getBestVoice()
        if (bestVoice) {
          utterance.voice = bestVoice
        }
        utterance.rate = playbackRate

        utterance.onboundary = (event) => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
          }
          if (event.name === 'word') {
            currentCharIndexRef.current = startOffset + event.charIndex
            let wordLength = event.charLength
            if (wordLength === undefined || wordLength === 0) {
              const remainingText = chunkText.substring(event.charIndex)
              const nextSpace = remainingText.search(/\s/)
              wordLength = nextSpace === -1 ? remainingText.length : nextSpace
            }
            updateHighlight(totalCharOffset + event.charIndex, wordLength)
          }
        }

        utterance.onend = () => {
          if (!(window as any)._activeUtterance) return
          totalCharOffset += (chunks[currentChunkIndex].length - (startOffset > 0 ? startOffset : 0))
          currentChunkIndex++
          currentChunkIndexRef.current = currentChunkIndex
          currentCharIndexRef.current = 0
          playNextChunk()
        }

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error on chunk:', e)
          ;(window as any)._activeUtterance = null
          setIsSpeaking(false)
          setIsPaused(false)
          setHighlightRects([])
        }

        utteranceRef.current = utterance
        ;(window as any)._activeUtterance = utterance

        window.speechSynthesis.speak(utterance)
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
        setIsSpeaking(true)
      }

      playNextChunk()
    }, 100)
  }

  const pauseTTS = () => {
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsSpeaking(false)
  }

  useEffect(() => {
    if (activeRole === 'university' && activeHubTab === 'learning') {
      setActiveHubTab('manage_mine')
    }
  }, [activeRole, activeHubTab])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [durationHours, setDurationHours] = useState<number>(1)
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [includeQuiz, setIncludeQuiz] = useState(true)
  const [courseImage, setCourseImage] = useState<string>('')
  const [creatingCourse, setCreatingCourse] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const openCreateCourseModal = () => {
    setCourseTitle('')
    setCourseDescription('')
    setDurationHours(1)
    setDurationMinutes(30)
    setIncludeQuiz(true)
    setCourseImage('')
    setShowCourseModal(true)
  }

  const handleCourseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const result = reader.result as string
      if (result) {
        const compressed = await compressImage(result)
        setCourseImage(compressed)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read image file.')
    }
    reader.readAsDataURL(file)
  }

  const formatDuration = (training: InstitutionTraining) => {
    const hrs = training.durationHours ?? (training.estimatedMinutes ? Math.floor(training.estimatedMinutes / 60) : 0)
    const mins = training.durationMinutes ?? (training.estimatedMinutes ? training.estimatedMinutes % 60 : 0)
    if (hrs === 0 && mins === 0) return "0 Mins"
    const parts = []
    if (hrs > 0) parts.push(`${hrs} ${hrs === 1 ? 'Hour' : 'Hours'}`)
    if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'Min' : 'Mins'}`)
    return parts.join(' ')
  }

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseTitle.trim()) {
      toast.error("Please enter a course title.")
      return
    }
    if (!courseDescription.trim()) {
      toast.error("Please enter a course description.")
      return
    }

    const resolvedUniId = profile?.universityId || user?.uid || 'global-college-malta'
    setCreatingCourse(true)

    try {
      const totalMinutes = (Number(durationHours) || 0) * 60 + (Number(durationMinutes) || 0)

      const docRef = await addDoc(collection(db, 'institution_trainings'), {
        title: courseTitle.trim(),
        description: courseDescription.trim(),
        durationHours: Number(durationHours) || 0,
        durationMinutes: Number(durationMinutes) || 0,
        estimatedMinutes: totalMinutes,
        includeQuiz: Boolean(includeQuiz),
        coverImageUrl: courseImage || '',
        imageUrl: courseImage || '',
        universityId: resolvedUniId,
        createdBy: user?.uid || '',
        isPublished: false,
        flagEmoji: '🎓',
        lessons: [
          {
            title: 'Course Overview & Instructions',
            content: courseDescription.trim()
          }
        ],
        questions: includeQuiz ? [
          {
            question: `What is the primary objective of ${courseTitle.trim()}?`,
            options: [
              'Adhere strictly to university admissions criteria and compliance guidelines',
              'Bypass verification checks for international students',
              'Submit incomplete application packages',
              'None of the above'
            ],
            correctAnswer: 0
          }
        ] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      toast.success("Course created in Draft mode! Redirecting to course editor...")
      setShowCourseModal(false)
      router.push(`/training-hub/institution/edit/${docRef.id}`)
    } catch (error: any) {
      console.error("Error creating course:", error)
      if (error?.message?.includes('too large') || error?.code === 'out-of-range') {
        toast.error("Critical: Firestore 1MB document limit reached. Even with optimization, the course is too large.")
      } else {
        toast.error("Failed to create course. Please try again.")
      }
    } finally {
      setCreatingCourse(false)
    }
  }

  const [trainings, setTrainings] = useState<InstitutionTraining[]>([])
  const [loading, setLoading] = useState(false)
  const [editingTraining, setEditingTraining] = useState<InstitutionTraining | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'lessons' | 'quiz'>('details')
  const [takingTraining, setTakingTraining] = useState<InstitutionTraining | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [lessons, setLessons] = useState<{title: string, content: string}[]>([])

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null)
  const [progress, setProgress] = useState<UserModuleProgress | null>(null)

  useEffect(() => {
    if (!takingTraining || !takingTraining.id || !user?.uid) {
      setProgress(null)
      return
    }

    const fetchProgress = async () => {
      try {
        const safeTrainingId = String(takingTraining.id).replace(/\//g, '_')
        const progressRef = doc(db, 'training_progress', `${user.uid}_${safeTrainingId}`)
        const snap = await getDoc(progressRef)
        if (snap.exists()) {
          setProgress(snap.data() as UserModuleProgress)
        } else {
          const initialProgress: UserModuleProgress = {
            userId: user.uid,
            countryId: takingTraining.id,
            completedLessonIds: [],
            completedQuizIds: [],
            quizScores: {},
            quizPassed: false,
            quizScore: 0,
            quizAttempts: 0,
          }
          setProgress(initialProgress)
        }
      } catch (err) {
        console.warn("Notice: Could not fetch progress for taking training, using initial progress fallback:", err)
        setProgress({
          userId: user.uid,
          countryId: takingTraining.id,
          completedLessonIds: [],
          completedQuizIds: [],
          quizScores: {},
          quizPassed: false,
          quizScore: 0,
          quizAttempts: 0,
        })
      }
    }

    fetchProgress()
  }, [takingTraining, user?.uid])

  const [agreements, setAgreements] = useState<any[]>([])
  useEffect(() => {
    if (user?.uid && activeRole === 'agent') {
      const unsubAgr = onSnapshot(query(collection(db, 'agreements'), where('agentId', '==', user.uid)), (snapshot) => {
        setAgreements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      }, (err) => {
        console.warn("Notice: agreements snapshot subscription status:", err)
      })
      return () => unsubAgr()
    }
  }, [user?.uid, activeRole])

  const agreedCountries = React.useMemo(() => {
    if (activeRole !== 'agent' || !user?.uid) return []
    const signedAgreements = agreements.filter(a => isAgreementActive(a.status))
    const agreedUniIds = signedAgreements.map(a => a.universityId)
    const agreedUnis = (institutions || []).filter(u => agreedUniIds.some(uid => isSameUniversity(uid, u.id)))
    return [...new Set(agreedUnis.map(u => (u.country || '').trim().toLowerCase()).filter(Boolean))]
  }, [agreements, institutions, activeRole, user?.uid])

  const hasAgreementForCountry = React.useCallback((countryNameOrSlug: string) => {
    if (activeRole !== 'agent') return true
    if (!countryNameOrSlug) return false
    const normInput = countryNameOrSlug.trim().toLowerCase()
    
    const normalize = (c: string) => {
      const n = (c || '').trim().toLowerCase()
      if (n === 'united kingdom' || n === 'uk' || n === 'gb') return 'uk'
      if (n === 'united states' || n === 'usa' || n === 'us' || n === 'united states of america') return 'us'
      if (n === 'united arab emirates' || n === 'uae') return 'uae'
      return n
    }
    
    const normInputMapped = normalize(normInput)
    return agreedCountries.some(c => normalize(c) === normInputMapped)
  }, [agreedCountries, activeRole])

  const [countries, setCountries] = useState<any[]>([])
  const [lessonsList, setLessonsList] = useState<any[]>([])
  const [quizzesList, setQuizzesList] = useState<any[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [allProgress, setAllProgress] = useState<Record<string, UserModuleProgress>>({})
  const [learningSearch, setLearningSearch] = useState('')

  useEffect(() => {
    if (!user?.uid) return
    const unsub = onSnapshot(query(collection(db, 'training_progress'), where('userId', '==', user.uid)), (snapshot) => {
      const p: Record<string, UserModuleProgress> = {}
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as UserModuleProgress
        p[data.countryId] = data
      })
      setAllProgress(p)
    }, (err) => {
      console.warn("Notice: training_progress sync status:", err)
    })
    return () => unsub()
  }, [user?.uid])

  const getModuleProgressInfo = (moduleId: string, isInstitution: boolean, institutionData?: InstitutionTraining) => {
    const p = allProgress[moduleId]
    let totalSteps = 0
    let completedSteps = 0

    if (isInstitution && institutionData) {
      totalSteps = (institutionData.lessons?.length || 0) + (institutionData.includeQuiz ? 1 : 0)
    } else {
      const moduleLessons = lessonsList.filter(l => l.countryId === moduleId)
      const moduleQuiz = quizzesList.find(q => q.countryId === moduleId && !q.lessonId)
      totalSteps = moduleLessons.length + (moduleQuiz ? 1 : 0)
    }

    if (p) {
      completedSteps = (p.completedLessonIds?.length || 0) + (p.completedQuizIds?.length || 0)
    }

    const percentage = totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0
    return { percentage, completed: percentage === 100 && totalSteps > 0, totalSteps, completedSteps }
  }

  const displayedCountries = countriesLoading ? mockCountries : (countries.length > 0 ? countries : mockCountries)
  const displayedLessons = countriesLoading ? mockLessons : (lessonsList.length > 0 ? lessonsList : mockLessons)

  const filteredCountries = React.useMemo(() => {
    const base = displayedCountries.filter(c => c.isPublished)
    if (activeRole !== 'agent') return base
    return base.filter(country => hasAgreementForCountry(country.name) || hasAgreementForCountry(country.slug))
  }, [displayedCountries, activeRole, hasAgreementForCountry])

  const getLearningData = () => {
    const data: any[] = []

    filteredCountries.forEach(country => {
      const progressInfo = getModuleProgressInfo(country.id, false)
      data.push({
        id: `country-${country.id}`,
        type: 'destination',
        tag: "DESTINATION",
        tagColor: "bg-blue-100 text-[#0059E7]",
        title: `${country.name} Admissions Training`,
        desc: country.description || `Master the ${country.name} admissions process and visa requirements.`,
        time: `${(lessonsList.filter(l => l.countryId === country.id).length * 12)} mins`,
        completed: progressInfo.completed,
        progress: progressInfo.percentage,
        img: country.coverImageUrl || `https://flagcdn.com/w640/mt.png`,
        slug: country.slug
      })
    })

    trainings.forEach(training => {
      const progressInfo = getModuleProgressInfo(training.id, true, training)
      const title = getTrainingDisplayTitle(training)

      data.push({
        id: `inst-${training.id}`,
        type: 'institution',
        tag: "UNIVERSITY",
        tagColor: "bg-emerald-100 text-emerald-600",
        title: title,
        desc: training.description,
        time: `${(training.lessons?.length || 0) * 15} mins`,
        completed: progressInfo.completed,
        progress: progressInfo.percentage,
        img: training.coverImageUrl || training.imageUrl || "https://flagcdn.com/w640/mt.png",
        raw: training
      })
    })

    return data.filter(item => 
      item.title.toLowerCase().includes(learningSearch.toLowerCase()) || 
      item.desc.toLowerCase().includes(learningSearch.toLowerCase())
    )
  }

  const learningData = getLearningData()
  const completedCount = learningData.filter(d => d.completed).length

  const [showCountryModal, setShowCountryModal] = useState(false)
  const [editingCountry, setEditingCountry] = useState<any | null>(null)
  const [countryForm, setCountryForm] = useState({
    name: '',
    slug: '',
    flagEmoji: '🌐',
    description: '',
    isPublished: true
  })

  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [selectedCountryForLessons, setSelectedCountryForLessons] = useState<any | null>(null)
  const [lessonForm, setLessonForm] = useState({
    title: '',
    slug: '',
    content: '',
    estimatedMinutes: 10,
    order: 1
  })

  const [expandedCountryLessonsId, setExpandedCountryLessonsId] = useState<string | null>(null)

  const [showQuizModal, setShowQuizModal] = useState(false)
  const [selectedCountryForQuiz, setSelectedCountryForQuiz] = useState<any | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])

  const [showDeleteCountryConfirm, setShowDeleteCountryConfirm] = useState(false)
  const [countryToDelete, setCountryToDelete] = useState<any | null>(null)

  const [showDeleteLessonConfirm, setShowDeleteLessonConfirm] = useState(false)
  const [lessonToDelete, setLessonToDelete] = useState<any | null>(null)

  const renderModals = () => {
    return (
      <>
        {showCourseModal && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="text-[#0059E7]" size={20} />
                    Create Institution Course
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add a new training module for your partner recruiting agents
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCourseSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Undergraduate Admissions & Visa Requirements 2026"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0059E7] focus:bg-white text-sm font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Provide a comprehensive summary of what agents will learn in this course..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0059E7] focus:bg-white text-sm font-medium transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={durationHours}
                          onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full pl-4 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0059E7] focus:bg-white text-sm font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          Hours
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                          className="w-full pl-4 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0059E7] focus:bg-white text-sm font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          Mins
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Clock size={14} className="text-[#0059E7]" />
                    Total estimated duration: <span className="font-bold text-slate-700">{durationHours} Hours {durationMinutes} Minutes</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Include Assessment Quiz</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Require agents to pass a knowledge evaluation quiz to complete module
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeQuiz(!includeQuiz)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      includeQuiz ? 'bg-[#0059E7]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        includeQuiz ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course Cover Image
                  </label>

                  {courseImage ? (
                    <div className="relative rounded-xl border border-slate-200 overflow-hidden h-36 group">
                      <img src={courseImage} alt="Course cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseImage('')}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-[#0059E7] rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-all group"
                    >
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#0059E7] mx-auto mb-2 transition-colors" />
                      <p className="text-xs font-bold text-slate-700">Click to upload course image</p>
                      <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP up to 2MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCourseImageChange}
                    className="hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCourse}
                    className="px-6 py-2.5 bg-[#0059E7] hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {creatingCourse ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating Course...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Course
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {showDeleteCountryConfirm && countryToDelete && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto mb-4 text-2xl">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Destination Module?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed text-center">
                Are you sure you want to permanently delete <strong>{countryToDelete.name}</strong>? This will also delete all of its associated lessons. This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => { setShowDeleteCountryConfirm(false); setCountryToDelete(null) }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteCountry}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showDeleteLessonConfirm && lessonToDelete && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto mb-4 text-2xl">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Lesson?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed text-center">
                Are you sure you want to permanently delete the lesson <strong>{lessonToDelete.title}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => { setShowDeleteLessonConfirm(false); setLessonToDelete(null) }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteLesson}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showQuizModal && createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Manage Module Assessment
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Configure final quiz for {selectedCountryForQuiz?.name} Admissions Training</p>
                </div>
                <button 
                  onClick={() => setShowQuizModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Assessment Questions ({quizQuestions.length})</h4>
                  <button 
                    onClick={addQuizQuestion}
                    className="px-3 py-1.5 bg-blue-50 text-[#0059E7] text-sm font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} /> Add Question
                  </button>
                </div>

                {quizQuestions.length === 0 ? (
                  <div className="text-center p-8 bg-white rounded-xl border border-slate-200 text-slate-500 shadow-sm">
                    <p>No questions added yet. Click 'Add Question' to start building your assessment.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {quizQuestions.map((q, qIndex) => (
                      <div key={q.id || qIndex} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative space-y-4">
                        <button 
                          onClick={() => removeQuizQuestion(qIndex)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <h5 className="font-bold text-slate-900 text-sm">Question {qIndex + 1}</h5>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Question Text</label>
                          <input 
                            type="text"
                            value={q.question}
                            onChange={(e) => updateQuizQuestionField(qIndex, 'question', e.target.value)}
                            placeholder="Enter the quiz question..."
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Answer Options & Correct Answer</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt: string, optIndex: number) => (
                              <div key={optIndex} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <input 
                                  type="radio" 
                                  name={`correct-${q.id || qIndex}`}
                                  checked={q.correctIndex === optIndex}
                                  onChange={() => updateQuizQuestionField(qIndex, 'correctIndex', optIndex)}
                                  className="w-4 h-4 text-[#0059E7] focus:ring-[#0059E7] flex-shrink-0 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-400 font-mono w-4">{String.fromCharCode(65 + optIndex)}.</span>
                                <input 
                                  type="text"
                                  value={opt}
                                  onChange={(e) => updateQuizQuestionField(qIndex, 'option', e.target.value, optIndex)}
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  className="w-full bg-transparent focus:outline-none text-sm text-slate-700"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Explanation (Optional)</label>
                          <input 
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => updateQuizQuestionField(qIndex, 'explanation', e.target.value)}
                            placeholder="e.g. Students are limited to working 20 hours per week."
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 flex-shrink-0">
                <button 
                  onClick={() => setShowQuizModal(false)}
                  className="px-5 py-2 border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-100 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveQuiz}
                  className="px-5 py-2 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-600 text-sm flex items-center gap-1.5"
                >
                  <Save size={16} /> Save Assessment
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {trainingToDelete && createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Training Module</h3>
              <p className="text-slate-500 mb-6">Are you sure you want to delete this training module? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setTrainingToDelete(null)}
                  className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="px-6 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  const openManageQuizModal = (countryItem: any) => {
    setSelectedCountryForQuiz(countryItem)
    const existingQuiz = quizzesList.find(q => q.countryId === countryItem.id || q.id === `quiz-${countryItem.id}`)
    if (existingQuiz && existingQuiz.questions) {
      setQuizQuestions(JSON.parse(JSON.stringify(existingQuiz.questions)))
    } else {
      setQuizQuestions([
        {
          id: 'q1',
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: ''
        }
      ])
    }
    setShowQuizModal(true)
  }

  const addQuizQuestion = () => {
    const nextId = `q-${Date.now()}`
    setQuizQuestions([
      ...quizQuestions,
      {
        id: nextId,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ])
  }

  const removeQuizQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index))
  }

  const updateQuizQuestionField = (index: number, field: string, value: any, optionIndex?: number) => {
    const copy = [...quizQuestions]
    if (field === 'question') {
      copy[index].question = value
    } else if (field === 'option' && optionIndex !== undefined) {
      copy[index].options[optionIndex] = value
    } else if (field === 'correctIndex') {
      copy[index].correctIndex = value
    } else if (field === 'explanation') {
      copy[index].explanation = value
    }
    setQuizQuestions(copy)
  }

  const handleSaveQuiz = async () => {
    if (!selectedCountryForQuiz) return
    
    if (quizQuestions.some(q => !q.question.trim() || q.options.some((o: string) => !o.trim()))) {
      alert("Please fill out all questions and options before saving.")
      return
    }

    try {
      const id = `quiz-${selectedCountryForQuiz.slug}`
      await setDoc(doc(db, 'training_quizzes', id), {
        id,
        countryId: selectedCountryForQuiz.id,
        questions: quizQuestions
      }, { merge: true })

      setShowQuizModal(false)
      setSelectedCountryForQuiz(null)
      setQuizQuestions([])
      toast.success("Assessment quiz saved successfully!")
    } catch (error) {
      console.error("Error saving quiz:", error)
      alert("Failed to save quiz.")
    }
  }

  const getCountryCode = (slug: string) => {
    const map: Record<string, string> = {
      'australia': 'au',
      'malta': 'mt',
      'canada': 'ca',
      'france': 'fr',
      'united-kingdom': 'gb',
      'uk': 'gb',
      'united-states': 'us',
      'usa': 'us',
      'united-arab-emirates': 'ae',
      'uae': 'ae',
      'georgia': 'ge',
      'india': 'in',
      'nepal': 'np',
      'germany': 'de',
      'ireland': 'ie',
      'new-zealand': 'nz',
      'singapore': 'sg',
      'japan': 'jp'
    }
    return map[slug.toLowerCase()] || 'un'
  }

  const startTraining = (training: InstitutionTraining) => {
    setTakingTraining(training)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setShowCertificate(false)
    setCurrentStepIndex(0)
    setSidebarOpen(true)
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slug: '',
    flagEmoji: '🎓',
    isPublished: true,
    includeQuiz: true
  })
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [completions, setCompletions] = useState<Record<string, any>>({})

  const universityId = profile?.roles?.includes('university') ? user?.uid : profile?.universityId

  useEffect(() => {
    if (user?.uid) {
      const qCompletions = query(collection(db, 'training_completions'), where('userId', '==', user.uid))
      const unsubscribe = onSnapshot(qCompletions, (snapshot) => {
        const cData: Record<string, any> = {}
        snapshot.forEach((doc) => {
          cData[doc.data().trainingId] = { id: doc.id, ...doc.data() }
        })
        setCompletions(cData)
      }, (err) => {
        console.warn("Notice: training_completions snapshot subscription status:", err)
      })
      return () => unsubscribe()
    }
  }, [user?.uid])

  useEffect(() => {
    const q = query(collection(db, 'institution_trainings'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tData: InstitutionTraining[] = []
      snapshot.forEach((doc) => {
        tData.push({ id: doc.id, ...doc.data() } as InstitutionTraining)
      })

      if (activeRole === 'university') {
        const userUniId = profile?.universityId || ''
        const userUid = user?.uid || ''
        const filtered = tData.filter(t => {
          const resolved = getTrainingUniId(t.universityId)
          return (
            (userUid && t.createdBy === userUid) ||
            (userUid && t.universityId === userUid) ||
            (userUniId && t.universityId === userUniId) ||
            (userUniId && isSameUniversity(t.universityId, userUniId)) ||
            (userUid && isSameUniversity(t.universityId, userUid)) ||
            (userUniId && isSameUniversity(resolved, userUniId)) ||
            (userUid && isSameUniversity(resolved, userUid))
          )
        })
        setTrainings(filtered)
      } else {
        setTrainings(tData)
      }
    }, (err) => {
      console.warn("Notice: institution_trainings snapshot subscription status:", err)
    })
    return () => unsubscribe()
  }, [activeRole, user?.uid, profile?.universityId, usersList])

  useEffect(() => {
    const initSeed = async () => {
      console.log("[Seeding] Starting training hub seeding check. isSuperAdmin:", isSuperAdmin)
      if (isSuperAdmin) {
        try {
          await syncSeedDataToFirestore()
          console.log("[Seeding] Seeding successful.")
        } catch (error) {
          console.error("[Seeding] Seeding failed:", error)
        }
      } else {
        console.log("[Seeding] Skipping seeding (not a superadmin).")
      }
    }
    initSeed()
  }, [isSuperAdmin])

  useEffect(() => {
    const unsubCountries = onSnapshot(collection(db, 'training_countries'), (snapshot) => {
      const list: any[] = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setCountries(list)
      setCountriesLoading(false)
    }, (err) => {
      console.warn("Notice: training_countries snapshot subscription status:", err)
      setCountriesLoading(false)
    })

    const unsubLessons = onSnapshot(collection(db, 'training_lessons'), (snapshot) => {
      const list: any[] = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setLessonsList(list)
    }, (err) => {
      console.warn("Notice: training_lessons snapshot subscription status:", err)
    })

    const unsubQuizzes = onSnapshot(collection(db, 'training_quizzes'), (snapshot) => {
      const list: any[] = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setQuizzesList(list)
    }, (err) => {
      console.warn("Notice: training_quizzes snapshot subscription status:", err)
    })

    return () => {
      unsubCountries()
      unsubLessons()
      unsubQuizzes()
    }
  }, [])

  const handleSave = async () => {
    const finalTitle = formData.title

    if (!finalTitle.trim() || !universityId) return
    
    if (formData.includeQuiz && questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      alert("Please fill out all questions and options, or remove incomplete questions.")
      return
    }
    
    setLoading(true)
    try {
      const payload: any = {
        title: finalTitle,
        description: formData.description,
        slug: formData.slug,
        flagEmoji: formData.flagEmoji,
        isPublished: formData.isPublished,
        includeQuiz: formData.includeQuiz,
        questions: formData.includeQuiz ? questions : [],
        lessons,
        updatedAt: serverTimestamp()
      }

      const payloadString = JSON.stringify(payload)
      const estimatedSize = payloadString.length
      
      if (estimatedSize > 1000000) {
        const hasBase64 = payloadString.includes('data:image/')
        toast.error(
          hasBase64 
            ? "Course content is too large (1MB limit). You have embedded images (base64). Please use the 'Insert Image' upload tool in the editor to host them on the server instead."
            : "Course content is too large (1MB limit). This course has excessive text or data. Please split it into multiple courses or reduce the amount of content."
        )
        setLoading(false)
        return
      }

      if (editingTraining) {
        await updateDoc(doc(db, 'institution_trainings', editingTraining.id), payload)
      } else {
        await addDoc(collection(db, 'institution_trainings'), {
          ...payload,
          universityId,
          createdAt: serverTimestamp()
        })
      }
      setShowCreateModal(false)
      setEditingTraining(null)
      setFormData({ title: '', description: '', slug: '', flagEmoji: '🎓', isPublished: true, includeQuiz: true })
      setQuestions([])
      setActiveTab('details')
    } catch (error: any) {
      console.error('Error saving training:', error)
      if (error?.message?.includes('too large') || error?.code === 'out-of-range') {
        toast.error("Critical: Firestore 1MB limit reached. Please reduce image sizes.")
      } else {
        toast.error(`Error: ${error?.message?.substring(0, 60) || "Failed to save"}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (training: InstitutionTraining) => {
    setEditingTraining(training)
    setFormData({
      title: training.title || '',
      description: training.description || '',
      slug: training.slug || '',
      flagEmoji: training.flagEmoji || '🎓',
      isPublished: training.isPublished ?? true,
      includeQuiz: training.includeQuiz
    })
    setQuestions(training.questions || [])
    setLessons(training.lessons || [])
    setActiveTab('details')
    setShowCreateModal(true)
  }

  const openCreateModal = () => {
    setEditingTraining(null)
    setFormData({ title: '', description: '', slug: '', flagEmoji: '🎓', isPublished: true, includeQuiz: true })
    setQuestions([])
    setLessons([])
    setActiveTab('details')
    setShowCreateModal(true)
  }
  
  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }])
  }
  
  const updateQuestion = (index: number, field: string, value: any, optionIndex?: number) => {
    const newQuestions = [...questions]
    if (field === 'question') {
      newQuestions[index].question = value
    } else if (field === 'option' && optionIndex !== undefined) {
      newQuestions[index].options[optionIndex] = value
    } else if (field === 'correctAnswer') {
      newQuestions[index].correctAnswer = value
    }
    setQuestions(newQuestions)
  }
  
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const addLesson = () => {
    setLessons([...lessons, { title: '', content: '' }])
  }

  const updateLesson = (index: number, field: string, value: string) => {
    const newLessons = [...lessons]
    newLessons[index] = { ...newLessons[index], [field]: value }
    setLessons(newLessons)
  }

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index))
  }

  const [trainingToDelete, setTrainingToDelete] = useState<string | null>(null)

  const handleDeleteConfirm = async () => {
    if (trainingToDelete) {
      try {
        await deleteDoc(doc(db, 'institution_trainings', trainingToDelete))
        setTrainingToDelete(null)
      } catch (error) {
        console.error("Error deleting training:", error)
        alert("Failed to delete training module.")
      }
    }
  }

  const handleSaveCountry = async () => {
    if (!countryForm.name.trim()) return
    const computedSlug = countryForm.slug.trim() || countryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const id = editingCountry ? editingCountry.id : `country-${computedSlug}`

    try {
      await setDoc(doc(db, 'training_countries', id), {
        id,
        name: countryForm.name,
        slug: computedSlug,
        flagEmoji: countryForm.flagEmoji || '🌐',
        description: countryForm.description,
        isPublished: countryForm.isPublished,
        publishedAt: countryForm.isPublished ? new Date().toISOString() : null
      }, { merge: true })

      setShowCountryModal(false)
      setEditingCountry(null)
      setCountryForm({ name: '', slug: '', flagEmoji: '🌐', description: '', isPublished: true })
    } catch (error) {
      console.error("Error saving country:", error)
      alert("Failed to save country.")
    }
  }

  const handleTogglePublishCountry = async (countryItem: any) => {
    try {
      await setDoc(doc(db, 'training_countries', countryItem.id), {
        isPublished: !countryItem.isPublished,
        publishedAt: !countryItem.isPublished ? new Date().toISOString() : null
      }, { merge: true })
    } catch (error) {
      console.error("Error toggling publish state:", error)
    }
  }

  const openEditCountryModal = (countryItem: any) => {
    setEditingCountry(countryItem)
    setCountryForm({
      name: countryItem.name,
      slug: countryItem.slug,
      flagEmoji: countryItem.flagEmoji || '🌐',
      description: countryItem.description || '',
      isPublished: countryItem.isPublished ?? true
    })
    setShowCountryModal(true)
  }

  const openCreateCountryModal = () => {
    setEditingCountry(null)
    setCountryForm({
      name: '',
      slug: '',
      flagEmoji: '🌐',
      description: '',
      isPublished: true
    })
    setShowCountryModal(true)
  }

  const handleDeleteCountry = (countryItem: any) => {
    setCountryToDelete(countryItem)
    setShowDeleteCountryConfirm(true)
  }

  const confirmDeleteCountry = async () => {
    if (!countryToDelete) return
    try {
      await deleteDoc(doc(db, 'training_countries', countryToDelete.id))
      const countryLessons = displayedLessons.filter(l => l.countryId === countryToDelete.id)
      for (const lesson of countryLessons) {
        await deleteDoc(doc(db, 'training_lessons', lesson.id))
      }
      setShowDeleteCountryConfirm(false)
      setCountryToDelete(null)
    } catch (error) {
      console.error("Error deleting country:", error)
      alert("Failed to delete country module.")
    }
  }

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim() || !selectedCountryForLessons) return
    const computedSlug = lessonForm.slug.trim() || lessonForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const id = editingLesson ? editingLesson.id : `lesson-${selectedCountryForLessons.slug}-${computedSlug}`

    try {
      await setDoc(doc(db, 'training_lessons', id), {
        id,
        countryId: selectedCountryForLessons.id,
        title: lessonForm.title,
        slug: computedSlug,
        content: lessonForm.content,
        estimatedMinutes: Number(lessonForm.estimatedMinutes) || 10,
        order: Number(lessonForm.order) || 1
      }, { merge: true })

      setShowLessonModal(false)
      setEditingLesson(null)
      setLessonForm({ title: '', slug: '', content: '', estimatedMinutes: 10, order: 1 })
    } catch (error) {
      console.error("Error saving lesson:", error)
      alert("Failed to save lesson.")
    }
  }

  const openCreateLessonModal = (countryItem: any) => {
    setSelectedCountryForLessons(countryItem)
    setEditingLesson(null)
    
    const countryLessons = displayedLessons.filter(l => l.countryId === countryItem.id)
    const nextOrder = countryLessons.length > 0 ? Math.max(...countryLessons.map(l => l.order || 0)) + 1 : 1

    setLessonForm({
      title: '',
      slug: '',
      content: '',
      estimatedMinutes: 10,
      order: nextOrder
    })
    setShowLessonModal(true)
  }

  const openEditLessonModal = (countryItem: any, lessonItem: any) => {
    setSelectedCountryForLessons(countryItem)
    setEditingLesson(lessonItem)
    setLessonForm({
      title: lessonItem.title,
      slug: lessonItem.slug,
      content: lessonItem.content || '',
      estimatedMinutes: lessonItem.estimatedMinutes || 10,
      order: lessonItem.order || 1
    })
    setShowLessonModal(true)
  }

  const handleDeleteLesson = (lessonItem: any) => {
    setLessonToDelete(lessonItem)
    setShowDeleteLessonConfirm(true)
  }

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return
    try {
      await deleteDoc(doc(db, 'training_lessons', lessonToDelete.id))
      setShowDeleteLessonConfirm(false)
      setLessonToDelete(null)
    } catch (error) {
      console.error("Error deleting lesson:", error)
      alert("Failed to delete lesson.")
    }
  }

  const renderUniversityManagement = () => {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
          </div>
          {trainings.length > 0 && (
            <button 
              onClick={() => router.push('/training-hub/institution/new')}
              className="px-5 py-2.5 bg-[#0059E7] hover:bg-blue-700 transition-all text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create New
            </button>
          )}
        </div>
        
        {trainings.length === 0 ? (
          <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-12 text-center text-slate-500 relative shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-[#0059E7] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-slate-900 mb-2">No Courses Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed font-medium">
              Create your first training course to help agents understand your college's admission process and requirements. You can also add quizzes to test their knowledge.
            </p>
            <div className="inline-flex gap-4">
              <button 
                onClick={() => router.push('/training-hub/institution/new')}
                className="px-6 py-3 bg-[#0059E7] hover:bg-blue-700 transition-all text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                Create Training & Quiz
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map(training => {
              const logoUrl = getTrainingLogo(training)
              const displayTitle = getTrainingDisplayTitle(training)
              const hasCover = Boolean(training.coverImageUrl || training.imageUrl)
              return (
                <div key={training.id} className="bg-white rounded-[1.75rem] border border-slate-200/80 overflow-hidden shadow-[0_2px_12_-3px_rgba(0,0,0,0.04)] hover:shadow-lg hover:border-blue-200 transition-all flex flex-col h-full group">
                  <div className="h-44 w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    {hasCover ? (
                      <img 
                        src={training.coverImageUrl || training.imageUrl || "https://flagcdn.com/w640/mt.png"} 
                        alt={displayTitle} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://flagcdn.com/w640/mt.png" }}
                      />
                    ) : logoUrl ? (
                      <div className="relative w-20 h-20 bg-white rounded-2xl border border-slate-200/80 p-2.5 flex items-center justify-center shadow-xs overflow-hidden z-10 group-hover:scale-105 transition-transform duration-300">
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className="max-h-full max-w-full object-contain mix-blend-multiply" 
                          referrerPolicy="no-referrer" 
                          style={{ backgroundColor: 'white' }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0059E7] border border-blue-100 flex items-center justify-center font-bold text-2xl font-outfit uppercase relative z-10 group-hover:scale-105 transition-transform duration-300">
                        {displayTitle.substring(0, 2)}
                      </div>
                    )}

                    <div className="absolute top-3 left-3 z-10">
                      {training.isPublished === true ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                          <CheckCircle2 size={12} /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                          <Lock size={12} /> Draft Mode
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/60 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => router.push(`/training-hub/institution/edit/${training.id}`)}
                        className="p-1.5 text-slate-500 hover:text-[#0059E7] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Training Course"
                      >
                        <Pencil size={15} />
                      </button>
                      <button 
                        onClick={() => setTrainingToDelete(training.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Training"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 
                      onClick={() => router.push(`/training-hub/institution/edit/${training.id}`)}
                      className="text-lg font-bold font-outfit text-slate-900 leading-snug hover:text-[#0059E7] cursor-pointer transition-colors mb-2 break-words"
                    >
                      {displayTitle}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 mb-6 flex-1 leading-relaxed font-medium">
                      {stripHtml(training.description) || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between text-xs font-semibold pt-4 border-t border-slate-100/80 mb-4 text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <BookOpen size={13} className="text-slate-400" />
                        <span>{training.lessons?.length || 0} Lessons</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Clock size={13} className="text-slate-400" />
                        <span>{formatDuration(training)}</span>
                      </div>
                      {training.includeQuiz && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#0059E7] border border-blue-100">
                          Quiz
                        </span>
                      )}
                    </div>

                    <div className="mt-auto">
                      <button 
                        onClick={() => router.push(`/training-hub/institution/edit/${training.id}`)}
                        className="w-full py-2.5 rounded-xl bg-[#0059E7] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
                      >
                        Manage Course
                        <ChevronRight size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (activeRole !== 'agent' && activeRole !== 'university' && !isSuperAdmin) {
    return (
      <DashboardLayout title="Training Hub" subtitle="Training Modules">
        <div className="p-8 max-w-6xl mx-auto text-center">
          <p className="text-slate-500">Training hub is only available for agents and universities.</p>
        </div>
      </DashboardLayout>
    )
  }

  const renderGlobalManagement = () => {
    return (
      <div className="space-y-8 font-sans">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Module Management</h2>
              <p className="text-slate-500 mt-1">Create, edit, and publish destination modules and training lessons.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={openCreateCountryModal}
                className="px-5 py-2.5 bg-[#0059E7] text-white font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm text-sm"
              >
                <Plus size={18} /> Add New Country
              </button>
              <button 
                onClick={() => setShowAdmin(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm transition-all bg-white"
              >
                Exit Admin Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-500">Total Countries</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{displayedCountries.length}</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-500">Published Countries</span>
              <div className="text-3xl font-extrabold text-green-600 mt-1">
                {displayedCountries.filter(c => c.isPublished).length}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-500">Total Lessons</span>
              <div className="text-3xl font-extrabold text-[#0059E7] mt-1">{displayedLessons.length}</div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Destination Courses</h3>
            
            {displayedCountries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                <p className="text-lg font-medium text-slate-700">No countries created yet.</p>
                <p className="text-sm text-slate-500 mt-1">Click "Add New Country" above to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {displayedCountries.map((countryItem) => {
                  const countryLessons = displayedLessons
                    .filter(l => l.countryId === countryItem.id)
                    .sort((a, b) => a.order - b.order)
                  const isExpanded = expandedCountryLessonsId === countryItem.id

                  return (
                    <div key={countryItem.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
                      
                      <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-3xl shadow-inner">
                            {countryItem.flagEmoji || '🌐'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xl font-bold text-slate-900">{countryItem.name}</h4>
                              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                /{countryItem.slug}
                              </span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1 max-w-2xl line-clamp-2">{countryItem.description}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          
                          <button 
                            onClick={() => handleTogglePublishCountry(countryItem)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                              countryItem.isPublished 
                                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${countryItem.isPublished ? 'bg-green-600' : 'bg-slate-400'}`}></span>
                            {countryItem.isPublished ? 'Published' : 'Draft'}
                          </button>

                          <button 
                            onClick={() => openEditCountryModal(countryItem)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                            title="Edit Country"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCountry(countryItem)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all"
                            title="Delete Country"
                          >
                            <Trash2 size={18} />
                          </button>

                          <button 
                            onClick={() => setExpandedCountryLessonsId(isExpanded ? null : countryItem.id)}
                            className={`px-4 py-2 border rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                              isExpanded 
                                ? 'bg-slate-100 text-slate-700 border-slate-300' 
                                : 'bg-white text-[#0059E7] border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <BookOpen size={16} />
                            {isExpanded ? 'Hide Lessons' : `Manage Lessons (${countryLessons.length})`}
                          </button>

                          <button 
                            onClick={() => openManageQuizModal(countryItem)}
                            className="px-4 py-2 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg font-bold text-sm hover:bg-amber-100 transition-all flex items-center gap-2"
                          >
                            <Award size={16} />
                            {(() => {
                              const existingQuiz = quizzesList.find(q => q.countryId === countryItem.id || q.id === `quiz-${countryItem.id}`)
                              return existingQuiz && existingQuiz.questions ? `Edit Quiz (${existingQuiz.questions.length})` : 'Create Quiz'
                            })()}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Lessons List ({countryLessons.length})</h5>
                            <button 
                              onClick={() => openCreateLessonModal(countryItem)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0059E7] text-xs font-bold rounded-lg border border-blue-200 transition-all flex items-center gap-1"
                            >
                              <Plus size={14} /> Add Lesson
                            </button>
                          </div>

                          {countryLessons.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm">
                              No lessons added for this country yet. Click "Add Lesson" to start creating the course curriculum.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {countryLessons.map((lessonItem) => (
                                <div key={lessonItem.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
                                  <div className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
                                      {lessonItem.order || 1}
                                    </span>
                                    <div>
                                      <h6 className="font-bold text-slate-900 text-sm">{lessonItem.title}</h6>
                                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                        <span>/{lessonItem.slug}</span>
                                        <span>•</span>
                                        <span>{lessonItem.estimatedMinutes || 10} mins</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => openEditLessonModal(countryItem, lessonItem)}
                                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                                      title="Edit Lesson"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteLesson(lessonItem)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {showCountryModal && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingCountry ? 'Edit Country Module' : 'Add New Destination Country'}
                  </h3>
                  <button 
                    onClick={() => setShowCountryModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Country Name</label>
                      <input 
                        type="text"
                        value={countryForm.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setCountryForm(prev => ({
                            ...prev,
                            name: val,
                            slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                              ? val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                              : prev.slug
                          }))
                        }}
                        placeholder="e.g. Canada"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Flag Emoji</label>
                      <input 
                        type="text"
                        value={countryForm.flagEmoji}
                        onChange={(e) => setCountryForm(prev => ({ ...prev, flagEmoji: e.target.value }))}
                        placeholder="e.g. 🇨🇦"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 text-center text-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">URL Slug</label>
                    <input 
                      type="text"
                      value={countryForm.slug}
                      onChange={(e) => setCountryForm(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g. canada"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                    <textarea 
                      value={countryForm.description}
                      onChange={(e) => setCountryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter details about this destination's admissions, visas, and training pathways..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 h-28 resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox"
                      id="isPublished"
                      checked={countryForm.isPublished}
                      onChange={(e) => setCountryForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                      className="w-4 h-4 text-[#0059E7] focus:ring-[#0059E7] border-slate-300 rounded"
                    />
                    <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                      Publish module immediately
                    </label>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
                  <button 
                    onClick={() => setShowCountryModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors bg-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveCountry}
                    className="px-5 py-2 bg-[#0059E7] text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Save Country
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {showLessonModal && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingLesson ? `Edit Lesson: ${editingLesson.title}` : `Add New Lesson for ${selectedCountryForLessons?.name}`}
                  </h3>
                  <button 
                    onClick={() => setShowLessonModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Lesson Title</label>
                      <input 
                        type="text"
                        value={lessonForm.title}
                        onChange={(e) => {
                          const val = e.target.value
                          setLessonForm(prev => ({
                            ...prev,
                            title: val,
                            slug: prev.slug === '' || prev.slug === prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                              ? val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                              : prev.slug
                          }))
                        }}
                        placeholder="e.g. Student Visa Application"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Order #</label>
                      <input 
                        type="number"
                        value={lessonForm.order}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 text-center"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">URL Slug</label>
                      <input 
                        type="text"
                        value={lessonForm.slug}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="e.g. student-visa-process"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Est. Minutes</label>
                      <input 
                        type="number"
                        value={lessonForm.estimatedMinutes}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, estimatedMinutes: Number(e.target.value) }))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Content (Markdown / Text)</label>
                    <textarea 
                      value={lessonForm.content}
                      onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write detailed lesson content. Markdown is fully supported..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 h-60 font-sans"
                      required
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
                  <button 
                    onClick={() => setShowLessonModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors bg-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveLesson}
                    className="px-5 py-2 bg-[#0059E7] text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Save Lesson
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
    )
  }

  if (showAdmin && isSuperAdmin) {
    return (
      <DashboardLayout title="Training Hub Admin" subtitle="Manage training modules, lessons, and view user progress.">
        <div className="p-8 max-w-6xl mx-auto">
          {renderGlobalManagement()}
          {renderModals()}
        </div>
      </DashboardLayout>
    )
  }

  if (takingTraining) {
    const lessonsSource = (takingTraining.modules && takingTraining.modules.length > 0)
      ? takingTraining.modules.flatMap((m: any) => m.lessons)
      : (takingTraining.lessons || [])

    const steps = [
      ...(lessonsSource && lessonsSource.length > 0
        ? lessonsSource.map((lesson: any, idx: number) => ({
            type: 'lesson' as const,
            id: `lesson-${idx}`,
            title: lesson.title,
            content: lesson.content
          }))
        : [{
            type: 'lesson' as const,
            id: 'intro',
            title: 'Overview',
            content: takingTraining.description
          }]
      ),
      ...(takingTraining.includeQuiz && takingTraining.questions && takingTraining.questions.length > 0
        ? [{
            type: 'quiz' as const,
            id: 'quiz',
            title: 'Knowledge Quiz'
          }]
        : []
      )
    ]

    const currentStep = steps[currentStepIndex] || steps[0]
    const totalSteps = steps.length
    const completedStepsCount = progress 
      ? (progress.completedLessonIds?.length || 0) + (progress.completedQuizIds?.length || 0)
      : 0
    const progressPercentage = totalSteps > 0 ? Math.min(100, Math.round((completedStepsCount / totalSteps) * 100)) : 0

    const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null
    const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null

    const updateProgress = async (updates: Partial<UserModuleProgress>) => {
      if (!user || !progress) return
      const newProgress = { ...progress, ...updates }
      setProgress(newProgress)
      try {
        const progressRef = doc(db, 'training_progress', `${user.uid}_${takingTraining.id}`)
        await setDoc(progressRef, newProgress, { merge: true })
      } catch (err) {
        console.error("Failed to update progress in db:", err)
      }
    }

    const markLessonCompleted = () => {
      if (currentStep?.type === 'lesson' && progress && !progress.completedLessonIds.includes(currentStep.id)) {
        updateProgress({
          completedLessonIds: [...progress.completedLessonIds, currentStep.id]
        })
      }
    }

    const markLessonIncomplete = () => {
      if (currentStep?.type === 'lesson' && progress && progress.completedLessonIds.includes(currentStep.id)) {
        updateProgress({
          completedLessonIds: progress.completedLessonIds.filter(id => id !== currentStep.id)
        })
      }
    }

    const resetQuizCompletion = () => {
      if (currentStep?.type === 'quiz' && progress) {
        const currentQuizId = currentStep.id
        const updatedCompletedQuizIds = (progress.completedQuizIds || []).filter(id => id !== currentQuizId)
        const updatedScores = { ...(progress.quizScores || {}) }
        delete updatedScores[currentQuizId]
        
        updateProgress({
          completedQuizIds: updatedCompletedQuizIds,
          quizScores: updatedScores,
          quizPassed: false,
          quizScore: 0
        })
      }
    }

    const handleQuizComplete = async (passed: boolean, score: number) => {
      if (!progress) return
      
      const currentQuizId = currentStep.id
      const updatedCompletedQuizIds = passed
        ? [...(progress.completedQuizIds || [])].filter(id => id !== currentQuizId).concat(currentQuizId)
        : (progress.completedQuizIds || [])
        
      const updatedScores = {
        ...(progress.quizScores || {}),
        [currentQuizId]: Math.max((progress.quizScores || {})[currentQuizId] || 0, score)
      }

      const newProgress = {
        ...progress,
        quizPassed: passed || progress.quizPassed,
        quizScore: Math.max(progress.quizScore, score),
        quizAttempts: progress.quizAttempts + 1,
        completedQuizIds: updatedCompletedQuizIds,
        quizScores: updatedScores,
        completedAt: passed && !progress.completedQuizIds?.includes(currentQuizId) ? new Date().toISOString() : progress.completedAt
      }

      setProgress(newProgress)

      try {
        const progressRef = doc(db, 'training_progress', `${user.uid}_${takingTraining.id}`)
        await setDoc(progressRef, newProgress, { merge: true })

        if (passed && user?.uid) {
          let rawScore = 0
          if (takingTraining.questions) {
            rawScore = Math.round((score / 100) * takingTraining.questions.length)
          }
          await setDoc(doc(db, 'training_completions', `${user.uid}_${takingTraining.id}`), {
            userId: user.uid,
            trainingId: takingTraining.id,
            completedAt: serverTimestamp(),
            score: rawScore,
            totalQuestions: takingTraining.questions ? takingTraining.questions.length : 0,
          })
        }
      } catch (err) {
        console.error("Failed to update progress and completions in db:", err)
      }
    }

    const handleCompleteAndFinishTraining = async () => {
      if (!user?.uid || !progress) return
      
      let updatedCompletedLessons = progress.completedLessonIds
      if (currentStep && !progress.completedLessonIds.includes(currentStep.id)) {
        updatedCompletedLessons = [...progress.completedLessonIds, currentStep.id]
      }
      
      const newProgress = {
        ...progress,
        completedLessonIds: updatedCompletedLessons,
        completedAt: new Date().toISOString()
      }
      setProgress(newProgress)
      
      try {
        const progressRef = doc(db, 'training_progress', `${user.uid}_${takingTraining.id}`)
        await setDoc(progressRef, newProgress, { merge: true })
        
        await setDoc(doc(db, 'training_completions', `${user.uid}_${takingTraining.id}`), {
          userId: user.uid,
          trainingId: takingTraining.id,
          completedAt: serverTimestamp(),
          score: 0,
          totalQuestions: 0,
        })
        
        setQuizSubmitted(true)
        setShowCertificate(true)
        toast.success("Congratulations! You have completed the training module.")
      } catch (err) {
        console.error("Failed to complete training:", err)
        toast.error("Failed to save progress.")
      }
    }

    const isStepLocked = (idx: number) => {
      if (idx <= 0) return false
      for (let j = 0; j < idx; j++) {
        if (steps[j].type === 'lesson') {
          if (!progress?.completedLessonIds?.includes(steps[j].id)) {
            return true
          }
        } else if (steps[j].type === 'quiz') {
          if (!progress?.completedQuizIds?.includes(steps[j].id)) {
            return true
          }
        }
      }
      return false
    }

    const quizData = takingTraining.includeQuiz && takingTraining.questions && takingTraining.questions.length > 0 ? {
      id: takingTraining.id,
      title: 'Knowledge Quiz',
      description: 'Knowledge evaluation for ' + takingTraining.title,
      countryId: takingTraining.id,
      questions: takingTraining.questions.map((q, idx) => ({
        id: `q-${idx}`,
        question: q.question,
        options: q.options,
        correctIndex: q.correctAnswer,
        explanation: 'The correct answer is option ' + (q.correctAnswer + 1)
      }))
    } : null

    if (showCertificate) {
      return (
        <div className="flex h-screen overflow-hidden bg-white">
          {sidebarOpen && (
            <div className="w-[280px] shrink-0 bg-[#1B2547] text-white flex flex-col transition-all duration-300 relative">
              <div className="p-6 border-b border-white/10 relative pr-12">
                <h2 className="font-bold text-lg leading-tight">{getTrainingDisplayTitle(takingTraining)}</h2>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="absolute right-4 top-6 text-white/50 hover:text-white"
                >
                  <PanelLeftClose size={20} />
                </button>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center opacity-60">
                <Award size={48} className="text-yellow-400 mb-4" />
                <p className="text-sm font-semibold">Training Completed!</p>
                <p className="text-xs text-white/60 mt-1">You have received your certificate for this module.</p>
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center px-6">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 mr-4"
                >
                  <PanelLeftOpen size={20} />
                </button>
              )}
              <span className="text-sm font-bold text-green-600">CERTIFICATE GENERATED</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-slate-50 flex items-center justify-center">
              <div className="bg-white p-16 rounded-2xl border-4 border-double border-slate-200 text-center relative overflow-hidden max-w-2xl w-full shadow-lg">
                <div className="absolute top-0 left-0 w-full h-3 bg-[#0059E7]"></div>
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-yellow-50 text-yellow-600 mb-8">
                  <Award size={56} />
                </div>
                <h2 className="text-4xl font-bold text-[#0059E7] mb-3 font-serif">Certificate of Completion</h2>
                <p className="text-slate-500 mb-10 uppercase tracking-widest text-sm font-semibold">This is to certify that</p>
                <p className="text-3xl font-bold text-slate-900 mb-10 border-b border-slate-200 pb-4 inline-block min-w-[320px]">
                  {profile?.firstName} {profile?.lastName}
                </p>
                <p className="text-slate-500 mb-4 text-xl">has successfully completed the training module</p>
                <p className="text-3xl font-bold text-slate-900 mb-16 leading-tight">{getTrainingDisplayTitle(takingTraining)}</p>
                <div className="flex justify-between items-end max-w-md mx-auto gap-8 mb-12">
                  <div className="text-center w-1/2">
                    <p className="text-slate-900 font-bold border-b border-slate-300 pb-2 mb-2 text-lg">
                      {completions[takingTraining.id]?.completedAt 
                        ? new Date(completions[takingTraining.id].completedAt.seconds * 1000).toLocaleDateString()
                        : new Date().toLocaleDateString()
                      }
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Date</p>
                  </div>
                  <div className="text-center w-1/2">
                    <div className="border-b border-slate-300 pb-2 mb-2 h-10 flex items-end justify-center">
                       <span className="font-serif italic text-2xl text-slate-700">Bec Education</span>
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Institution</p>
                  </div>
                </div>
                
                <div className="mt-12 text-center">
                  <button 
                    onClick={() => {
                      setTakingTraining(null)
                      setShowCertificate(false)
                    }}
                    className="px-8 py-3 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Return to Hub
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen overflow-hidden bg-white relative">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div 
          onMouseEnter={() => {
            if (!sidebarOpen && window.innerWidth >= 768) {
              setIsSidebarHovered(true)
            }
          }}
          onMouseLeave={() => {
            if (!sidebarOpen && window.innerWidth >= 768) {
              setIsSidebarHovered(false)
            }
          }}
          className={`
            fixed inset-y-0 left-0 z-50 bg-[#1B2547] text-white flex flex-col transition-all duration-300 ease-in-out
            ${sidebarOpen 
              ? 'w-[280px] translate-x-0 md:relative' 
              : isSidebarHovered 
                ? 'w-[280px] translate-x-0 shadow-2xl z-50 md:absolute md:top-0 md:bottom-0 md:left-0' 
                : 'w-[280px] -translate-x-full md:translate-x-0 md:w-14 md:relative'
            }
          `}
        >
          {(sidebarOpen || isSidebarHovered) ? (
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400 block mb-0.5">
                  Training Syllabus
                </span>
                <h2 className="font-bold text-base leading-tight truncate" title={getTrainingDisplayTitle(takingTraining)}>{getTrainingDisplayTitle(takingTraining)}</h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => {
                    setSidebarOpen(!sidebarOpen)
                    setIsSidebarHovered(false)
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    sidebarOpen 
                      ? 'text-blue-400 bg-white/10 hover:bg-white/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={sidebarOpen ? "Unpin Sidebar (Collapse)" : "Pin Sidebar Open"}
                >
                  {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-b border-white/10 flex flex-col items-center justify-center shrink-0">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Click to Pin Sidebar (or hover to expand)"
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
            {(sidebarOpen || isSidebarHovered) ? (
              steps.map((step, idx) => {
                const isCurrent = idx === currentStepIndex
                let isCompleted = false
                if (step.type === 'lesson') isCompleted = progress?.completedLessonIds?.includes(step.id) || false
                if (step.type === 'quiz') isCompleted = progress?.completedQuizIds?.includes(step.id) || false

                const isLocked = isStepLocked(idx)

                if (isLocked) {
                  return (
                    <div
                      key={step.id}
                      className="block px-4 py-3 border-b border-white/5 opacity-40 cursor-not-allowed select-none"
                      title="This section is locked until you complete previous steps"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0 text-slate-400">
                          <Lock size={16} />
                        </div>
                        <span className="text-xs text-slate-300 leading-snug">{step.title}</span>
                      </div>
                    </div>
                  )
                }

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      setCurrentStepIndex(idx)
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false)
                      }
                    }}
                    className={`w-full text-left block px-4 py-3 border-b border-white/5 transition-colors ${
                      isCurrent ? 'bg-white/10 font-bold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isCurrent ? (
                          <CircleDot size={16} className="text-[#0059E7]" />
                        ) : isCompleted ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <Circle size={16} className="text-white/30" />
                        )}
                      </div>
                      <span className="text-xs leading-snug">{step.title}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                {steps.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex
                  let isCompleted = false
                  if (step.type === 'lesson') isCompleted = progress?.completedLessonIds?.includes(step.id) || false
                  if (step.type === 'quiz') isCompleted = progress?.completedQuizIds?.includes(step.id) || false
                  const isLocked = isStepLocked(idx)

                  return (
                    <button
                      key={step.id}
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) setCurrentStepIndex(idx)
                      }}
                      title={`${idx + 1}. ${step.title}${isLocked ? ' (Locked)' : isCompleted ? ' (Completed)' : ''}`}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                          : isCompleted 
                            ? 'text-green-400 hover:bg-white/10' 
                            : isLocked 
                              ? 'text-white/20 cursor-not-allowed' 
                              : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isCurrent ? (
                        <CircleDot size={16} />
                      ) : isCompleted ? (
                        <CheckCircle2 size={16} />
                      ) : isLocked ? (
                        <Lock size={14} />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {!sidebarOpen && !isSidebarHovered && (
            <div className="p-2 border-t border-white/10 flex justify-center text-[10px] font-bold text-blue-400">
              {progressPercentage}%
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center">
            <div className="px-4 sm:px-6 flex items-center border-r border-slate-200 h-full shrink-0">
              <button 
                onClick={() => setTakingTraining(null)}
                className="text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-2 text-sm whitespace-nowrap bg-transparent border-0 cursor-pointer"
              >
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Back to Hub</span>
              </button>
            </div>
            <div className="flex-1 flex h-full">
              <div className="flex-1 px-4 sm:px-6 flex flex-col justify-center border-r border-slate-200 relative min-w-0">
                <div className="flex items-center gap-2 mb-1.5 overflow-hidden whitespace-nowrap">
                  <span className="text-sm font-bold text-[#0059E7]">{progressPercentage}% COMPLETE</span>
                  <span className="text-sm text-slate-400 font-medium truncate">{completedStepsCount}/{totalSteps} Steps</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#0059E7] transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              <div className="w-[30%] min-w-[120px] sm:w-[40%] flex items-center px-4">
                <button 
                  disabled={!prevStep}
                  onClick={() => {
                    if (prevStep) setCurrentStepIndex(currentStepIndex - 1)
                  }}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm disabled:opacity-30 disabled:hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
                >
                  <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous {prevStep?.type === 'quiz' ? 'Assessment' : 'Lesson'}</span>
                  <span className="sm:hidden">Prev</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-white relative scroll-smooth">
            <div className="max-w-4xl mx-auto">
              {isStepLocked(currentStepIndex) ? (
                <div className="max-w-md mx-auto p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 mt-12">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">Section Locked</h2>
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    You must successfully pass the preceding quiz with a score of <strong>80% or higher</strong> to unlock this section.
                  </p>
                  <button
                    onClick={() => {
                      let lastUnpassedQuizIdx = -1
                      for (let j = 0; j < currentStepIndex; j++) {
                        if (steps[j].type === 'quiz' && !progress?.completedQuizIds?.includes(steps[j].id)) {
                          lastUnpassedQuizIdx = j
                        }
                      }
                      if (lastUnpassedQuizIdx !== -1) {
                        setCurrentStepIndex(lastUnpassedQuizIdx)
                      } else {
                        setCurrentStepIndex(0)
                      }
                    }}
                    className="px-6 py-3 bg-[#0059E7] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors w-full shadow-sm"
                  >
                    Go to Preceding Quiz
                  </button>
                </div>
              ) : (
                <>
                  {currentStep.type === 'lesson' && (
                    <div>
                      {isSpeaking && !isPaused ? (
                        <div className="mb-8 sticky top-4 z-40 bg-white/95 backdrop-blur-md border-2 border-blue-500 shadow-xl shadow-blue-500/10 rounded-2xl px-4 py-2 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md animate-pulse">
                              <Volume2 size={16} />
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">Playing Audio</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              {[0.75, 1, 1.25, 1.5].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => {
                                    setPlaybackRate(rate)
                                    if (isSpeaking) {
                                      startTTS(currentStep.content || '', currentChunkIndexRef.current, currentCharIndexRef.current)
                                    }
                                  }}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                    playbackRate === rate 
                                      ? 'bg-blue-600 text-white shadow-sm' 
                                      : 'text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button 
                                onClick={pauseTTS}
                                className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-all shadow-sm active:scale-95 cursor-pointer"
                                title="Pause Audio"
                              >
                                <Pause size={16} fill="currentColor" />
                              </button>
                              <button 
                                onClick={stopTTS}
                                className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
                                title="Stop Audio"
                              >
                                <StopCircle size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-8 p-6 rounded-3xl bg-slate-50 border-2 border-blue-100 shadow-sm relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-blue-600 text-white shadow-lg shadow-blue-200">
                              <Volume2 size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-extrabold text-slate-900 leading-tight">Audio Learning Assistant</p>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">Listen to this lesson with real-time highlighting</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                              {[0.75, 1, 1.25, 1.5].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => {
                                    setPlaybackRate(rate)
                                    if (isSpeaking) {
                                      startTTS(currentStep.content || '', currentChunkIndexRef.current, currentCharIndexRef.current)
                                    }
                                  }}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    playbackRate === rate 
                                      ? 'bg-blue-600 text-white shadow-md' 
                                      : 'text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              {isSpeaking ? (
                                <button 
                                  onClick={pauseTTS}
                                  className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-all shadow-md active:scale-95 cursor-pointer"
                                  title="Pause Audio (Depress)"
                                >
                                  <Pause size={20} fill="currentColor" />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => startTTS(currentStep.content || '')}
                                  className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 cursor-pointer"
                                  title="Play Audio (Make Sticky)"
                                >
                                  <Play size={20} fill="currentColor" className="ml-1" />
                                </button>
                              )}
                              
                              {isPaused && (
                                <button 
                                  onClick={stopTTS}
                                  className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-md active:scale-95 cursor-pointer"
                                  title="Stop Audio"
                                >
                                  <StopCircle size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {!progress?.completedLessonIds.includes(currentStep.id) && (
                        <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-lg mb-1">Ready to start this lesson?</h3>
                            <p className="text-slate-500 text-sm">Read through the material below to complete this section.</p>
                          </div>
                          <button 
                            onClick={markLessonCompleted}
                            className="px-6 py-2.5 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
                          >
                            Click here to start
                          </button>
                        </div>
                      )}

                      <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-[#0059E7] relative"
                      >
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                          {highlightRects.map((rect, index) => {
                            const container = contentRef.current
                            if (!container) return null
                            const containerRect = container.getBoundingClientRect()
                            return (
                              <div
                                key={index}
                                className="tts-word-highlight"
                                style={{
                                  top: rect.top - containerRect.top,
                                  left: rect.left - containerRect.left,
                                  width: rect.width,
                                  height: rect.height,
                                }}
                              />
                            )
                          })}
                        </div>
                        {isHtmlContent(currentStep.content || '') ? (
                          <div 
                            className="lesson-html-content"
                            dangerouslySetInnerHTML={{ __html: currentStep.content || '' }} 
                            onClick={(e) => {
                              const target = e.target as HTMLElement
                              if (target.tagName === 'IMG') {
                                setExpandedImage({ 
                                  src: (target as HTMLImageElement).src, 
                                  alt: (target as HTMLImageElement).alt || '' 
                                })
                              }
                            }}
                          />
                        ) : (
                          <ReactMarkdown>
                            {currentStep.content || ''}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep.type === 'quiz' && (
                    progress?.completedQuizIds?.includes(currentStep.id) ? (
                      <div className="max-w-2xl mx-auto p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 mt-8">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
                          <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-slate-900">Assessment Passed!</h2>
                        <p className="text-xl mb-6">
                          You scored <span className="font-bold">{(progress?.quizScores || {})[currentStep.id] || 100}%</span> on this assessment.
                        </p>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                          You have successfully completed this section. You can retake this quiz at any time to test your knowledge or improve your score, which will temporarily lock subsequent sections until passed again.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <button 
                            onClick={resetQuizCompletion}
                            className="px-6 py-3 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors w-full sm:w-auto cursor-pointer"
                          >
                            Retake / Reset Quiz
                          </button>
                          <button 
                            onClick={() => {
                              setShowCertificate(true)
                            }}
                            className="px-6 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-colors w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer animate-fade-in"
                          >
                            <Award size={18} /> View Certificate
                          </button>
                        </div>
                      </div>
                    ) : (
                      quizData && (
                        <QuizRunner 
                          key={`${currentStep.id}-${progress?.completedQuizIds?.includes(currentStep.id) ? 'completed' : 'pending'}`}
                          quiz={quizData as any} 
                          onComplete={handleQuizComplete} 
                          onReset={resetQuizCompletion}
                        />
                      )
                    )
                  )}
                </>
              )}
            </div>
          </div>

          <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center group">
            <div className="w-1.5 h-10 bg-slate-300 hover:bg-blue-600 rounded-l-full cursor-pointer transition-all"></div>

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-2xl p-2.5 flex flex-col gap-2.5 translate-x-full opacity-0 pointer-events-none group-hover:translate-x-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 ease-in-out mr-2">
              <button
                disabled={!prevStep}
                onClick={() => {
                  if (prevStep) {
                    setCurrentStepIndex(currentStepIndex - 1)
                  }
                }}
                title={prevStep ? `Previous: ${prevStep.title}` : 'No previous section'}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-[#0059E7] text-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 flex items-center justify-center transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeft size={22} />
              </button>

              {!isStepLocked(currentStepIndex) && currentStep.type === 'lesson' && (
                progress?.completedLessonIds.includes(currentStep.id) ? (
                  <button
                    onClick={markLessonIncomplete}
                    title="Completed (Click to Undo)"
                    className="w-12 h-12 rounded-xl bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 size={22} />
                  </button>
                ) : (
                  <button
                    onClick={markLessonCompleted}
                    title="Mark Complete"
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-green-600 text-slate-700 hover:text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 size={22} />
                  </button>
                )
              )}
              {!isStepLocked(currentStepIndex) && currentStep.type === 'quiz' && progress?.completedQuizIds?.includes(currentStep.id) && (
                <button
                  onClick={resetQuizCompletion}
                  title="Reset Quiz Completion"
                  className="w-12 h-12 rounded-xl bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 flex items-center justify-center transition-all shadow-sm cursor-pointer"
                >
                  <RotateCcw size={22} />
                </button>
              )}

              {nextStep ? (() => {
                const nextLocked = isStepLocked(currentStepIndex + 1)
                return (
                  <button
                    disabled={nextLocked}
                    onClick={() => {
                      if (!nextLocked) {
                        setCurrentStepIndex(currentStepIndex + 1)
                      }
                    }}
                    title={nextLocked ? 'Locked: Pass the preceding quiz to unlock' : `Next: ${nextStep.title}`}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                      nextLocked
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-[#0059E7] hover:bg-blue-700 text-white cursor-pointer'
                    }`}
                  >
                    {nextLocked ? <Lock size={22} /> : <ChevronRight size={22} />}
                  </button>
                )
              })() : (
                currentStep.type === 'lesson' && (
                  <button
                    onClick={handleCompleteAndFinishTraining}
                    title="Complete & Finish Training"
                    className="w-12 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <Award size={22} />
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {expandedImage && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300"
            onClick={() => setExpandedImage(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white hover:text-slate-200 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              onClick={() => setExpandedImage(null)}
            >
              <X size={24} />
            </button>
            <img 
              src={expandedImage.src} 
              alt={expandedImage.alt}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200 bg-white mix-blend-multiply"
            />
            {expandedImage.alt && (
              <p className="text-white text-center text-sm mt-4 font-medium px-4 py-2 bg-black/40 rounded-lg backdrop-blur-sm">
                {expandedImage.alt}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  const tabs = []
  if (activeRole === 'university') {
    tabs.push({ id: 'manage_mine', label: 'Management', icon: Sliders })
  } else if (isSuperAdmin) {
    tabs.push({ id: 'learning', label: 'Admissions Courses', icon: BookOpen })
    tabs.push({ id: 'manage_global', label: 'Destination Modules Creator', icon: Sliders })
    tabs.push({ id: 'video_guides', label: 'Country Video Guides', icon: PlayCircle })
  }

  return (
    <DashboardLayout 
      title="Training Hub" 
      subtitle={
        activeHubTab === 'manage_mine' 
          ? ""
          : activeHubTab === 'manage_global'
          ? "Create, edit, and publish destination modules and training lessons."
          : activeHubTab === 'video_guides'
          ? "Manage video training guides for different destination countries."
          : "Self-paced learning center to master country-specific admissions processes."
      }
    >
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {tabs.length > 0 && (
          <div className="flex overflow-x-auto border-b border-slate-200 pb-px gap-2 hide-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeHubTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveHubTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'border-[#0059E7] text-[#0059E7]' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {activeHubTab === 'manage_mine' && renderUniversityManagement()}
        
        {activeHubTab === 'manage_global' && renderGlobalManagement()}
        
        {activeHubTab === 'video_guides' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <CountryTrainingManager />
          </div>
        )}

        {activeHubTab === 'learning' && activeRole !== 'university' && (
          <div className="space-y-8 md:space-y-10 -mt-2 md:-mt-4">
            <div className="bg-white rounded-2xl sm:rounded-[32px] py-8 px-4 sm:p-8 md:p-10 flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex flex-row items-center justify-between w-full max-w-6xl gap-4 md:gap-8">
                
                <div className="hidden md:flex flex-1 justify-start items-center opacity-70 lg:opacity-100">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-400 relative">
                     <div className="absolute -top-3 text-yellow-400">
                       <Sun size={24} />
                     </div>
                     <div className="w-6 h-10 md:w-8 md:h-12 bg-blue-600 rounded-t-full absolute -bottom-4 z-10 flex items-center justify-center text-white">
                       <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full mt-2"></div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center w-full max-w-2xl mx-auto shrink z-10">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 md:mb-4">
                    Education, talents, and career opportunities. <br className="hidden sm:block" /><span className="text-[#0059E7]">All in one place.</span>
                  </h1>
                  <p className="text-slate-500 text-sm max-w-lg mb-6 md:mb-8 leading-relaxed">
                    Grow your skill with the most reliable online courses and certifications in marketing, information technology, programming, and data science.
                  </p>
                  
                  <div className="relative w-full max-w-xl">
                    <input 
                      type="text" 
                      placeholder="Find your course" 
                      value={learningSearch}
                      onChange={(e) => setLearningSearch(e.target.value)}
                      className="w-full pl-6 pr-14 py-3 sm:py-4 rounded-full border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0059E7] focus:border-transparent text-sm"
                    />
                    <button className="absolute right-2 top-2 bottom-2 aspect-square bg-[#0059E7] hover:bg-blue-700 transition-colors text-white rounded-full flex items-center justify-center">
                      <Search size={18} />
                    </button>
                  </div>
                </div>

                <div className="hidden md:flex flex-1 justify-end items-center opacity-70 lg:opacity-100">
                  <div className="relative scale-75 lg:scale-100 transform origin-right">
                    <div className="w-16 h-20 bg-white border-2 border-slate-200 rounded-md relative shadow-sm flex flex-col items-center pt-3 gap-2">
                       <div className="w-8 h-1 bg-slate-200 rounded-full"></div>
                       <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
                       <div className="w-6 h-1 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="absolute -top-2 -left-4 transform -rotate-45 text-yellow-500">
                      <Sparkles size={40} fill="currentColor" />
                    </div>
                  </div>
                </div>
                
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Courses</h2>
                <p className="text-xs text-slate-500 mt-1">Total {learningData.length} modules available, you have completed {completedCount}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200 rounded-full pl-4 pr-10 py-2 text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer">
                    <option>All Courses</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight size={16} className="text-slate-400 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {learningData.length > 0 ? learningData.map(course => (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full">
                  <div className="h-44 w-full overflow-hidden relative">
                    <img 
                      src={course.img || "https://flagcdn.com/w640/mt.png"} 
                      alt={course.title} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://flagcdn.com/w640/mt.png" }}
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm ${course.tagColor}`}>
                        {course.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-2 leading-tight whitespace-normal break-words">{course.title}</h3>
                    <p className="text-[13px] text-slate-500 mb-6 flex-1 leading-relaxed line-clamp-3">{course.desc}</p>
                    
                    <div className="flex items-center justify-between text-xs font-semibold mb-3">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock size={12} className="text-slate-400" />
                        {course.time}
                      </div>
                      {course.completed && (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 size={12} />
                          Completed
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full h-1 bg-slate-100 rounded-full mb-6 overflow-hidden">
                       <div 
                         className={`h-full rounded-full ${course.completed ? 'bg-emerald-500' : 'bg-[#0059E7]'}`} 
                         style={{ width: `${course.progress}%` }}
                       ></div>
                    </div>
                    
                    <div className="mt-auto">
                      <button 
                        onClick={() => {
                          if (course.type === 'destination') {
                            router.push(`/training-hub/${course.slug}`)
                          } else {
                            setTakingTraining(course.raw)
                            setCurrentStepIndex(0)
                            setSidebarOpen(true)
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-[#0059E7] hover:bg-blue-700 text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        {course.progress > 0 && !course.completed ? 'Continue Training' : 'View Training'}
                        <ChevronRight size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Search className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No trainings found</h3>
                  <p className="text-slate-500 text-sm">Try adjusting your search query or filters.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 mt-12 mb-6">
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"><span className="text-[10px]">Prev</span></button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"><ChevronLeft size={14} /></button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center bg-[#0059E7] text-white text-xs font-bold shadow-sm">1</button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 text-xs font-bold">2</button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"><ChevronRight size={14} /></button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"><span className="text-[10px]">Next</span></button>
            </div>
          </div>
        )}

        {renderModals()}
      </div>
    </DashboardLayout>
  )
}