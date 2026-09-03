'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  CircleDot, 
  PanelLeftClose, 
  PanelLeftOpen, 
  X, 
  Lock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  StopCircle,
  Settings2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { mockCountries, mockLessons, mockQuizzes } from '@/data/trainingHubSeed'
import QuizRunner from '@/components/training/QuizRunner'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, setDoc, collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { UserModuleProgress } from '@/types/training'
import { isSameUniversity, isAgreementActive } from '@/components/training/HubHome'
import { toast } from 'sonner'

const isHtmlContent = (content: string) => {
  if (!content) return false
  const trimmed = content.trim()
  return trimmed.startsWith('<') || /<[a-z][\s\S]*>/i.test(trimmed)
}

export default function LessonViewer() {
  const params = useParams()
  const router = useRouter()
  const { user, activeRole, institutions } = useAuth()
  const countrySlug = params.countrySlug as string
  const lessonSlug = params.lessonSlug as string
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [progress, setProgress] = useState<UserModuleProgress | null>(null)
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null)

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
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()
        window.speechSynthesis.cancel()
      } catch (e) {
        // ignore
      }
      ;(window as any)._activeUtterance = null
    }
  }, [])

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

  const startTTS = (startChunkIdx?: number, startCharIdx?: number) => {
    if (isPaused && startChunkIdx === undefined && startCharIdx === undefined) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsSpeaking(true)
      return
    }

    stopTTS()

    setTimeout(() => {
      let textToSpeak = ''

      if (contentRef.current) {
        textToSpeak = contentRef.current.innerText || contentRef.current.textContent || ''
      }

      const fallbackContent = currentStep?.type === 'lesson' ? (currentStep.data as any).content : ''
      if (!textToSpeak.trim() && fallbackContent) {
        textToSpeak = fallbackContent
          .replace(/<[^>]*>?/gm, ' ')
          .replace(/#+\s*/g, '')
          .replace(/[*_`]/g, '')
          .replace(/&nbsp;/g, ' ')
      }

      if (!textToSpeak.trim()) {
        toast.error("No speakable text found in this lesson.")
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

  const pauseTTS = () => {
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsSpeaking(false)
  }

  const [countries, setCountries] = useState<any[]>([])
  const [lessonsList, setLessonsList] = useState<any[]>([])
  const [quizzesList, setQuizzesList] = useState<any[]>([])

  const [agreements, setAgreements] = useState<any[]>([])
  useEffect(() => {
    if (user?.uid && activeRole === 'agent') {
      const unsubAgr = onSnapshot(query(collection(db, 'agreements'), where('agentId', '==', user.uid)), (snapshot) => {
        setAgreements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      })
      return () => unsubAgr()
    }
  }, [user?.uid, activeRole])

  const agreedCountries = React.useMemo(() => {
    if (activeRole !== 'agent' || !user?.uid) return []
    const signedAgreements = agreements.filter(a => isAgreementActive(a.status))
    const agreedUniIds = signedAgreements.map(a => a.universityId)
    const agreedUnis = (institutions || []).filter(u => agreedUniIds.some(uid => isSameUniversity(uid, u.id)))
    return [...new Set(agreedUnis.map(u => u.country.trim().toLowerCase()))]
  }, [agreements, institutions, activeRole, user?.uid])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const unsubCountries = onSnapshot(collection(db, 'training_countries'), (snapshot) => {
      const list: any[] = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setCountries(list)
    })

    const unsubLessons = onSnapshot(collection(db, 'training_lessons'), (snapshot) => {
      const list: any[] = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setLessonsList(list)
      setIsLoading(false)
    })

    const unsubQuizzes = onSnapshot(collection(db, 'training_quizzes'), (snapshot) => {
      const list: any[] = []
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() })
      })
      setQuizzesList(list)
    })

    return () => {
      unsubCountries()
      unsubLessons()
      unsubQuizzes()
    }
  }, [])

  const activeCountries = countries.length > 0 ? countries : mockCountries
  const activeLessons = lessonsList.length > 0 ? lessonsList : mockLessons
  const activeQuizzes = quizzesList.length > 0 ? quizzesList : mockQuizzes

  const country = activeCountries.find(c => c.slug === countrySlug)
  const lessons = activeLessons.filter(l => l.countryId === country?.id).sort((a, b) => a.order - b.order)
  const quiz = activeQuizzes.find(q => q.countryId === country?.id) || null

  type Step = 
    | { type: 'lesson'; id: string; title: string; data: import('@/types/training').TrainingLesson }
    | { type: 'quiz'; id: string; title: string; data: import('@/types/training').TrainingQuiz }

  const steps: Step[] = React.useMemo(() => {
    const sList: Step[] = []
    lessons.forEach(l => {
      sList.push({ type: 'lesson', id: l.slug, title: l.title, data: l })
      const lessonQuiz = activeQuizzes.find(q => q.lessonId === l.id || q.id === `quiz-${l.id}`)
      if (lessonQuiz) {
        sList.push({ 
          type: 'quiz', 
          id: `quiz-${l.slug}`, 
          title: `${l.title} Quiz`, 
          data: lessonQuiz 
        })
      }
    })
    if (quiz && !quiz.lessonId && !lessons.some(l => `quiz-${l.id}` === quiz.id)) {
      sList.push({ type: 'quiz', id: 'quiz', title: 'Module Assessment', data: quiz })
    }
    return sList
  }, [lessons, activeQuizzes, quiz])

  const currentStepIndex = steps.findIndex(s => s.id === lessonSlug)
  const currentStep = steps[currentStepIndex]

  useEffect(() => {
    stopTTS()
  }, [lessonSlug, currentStepIndex])

  const isStepLocked = React.useCallback((idx: number) => {
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
  }, [steps, progress?.completedQuizIds, progress?.completedLessonIds])

  useEffect(() => {
    if (isLoading) return
    if (!country || currentStepIndex === -1) {
      router.push('/training-hub')
    }
  }, [country, currentStepIndex, router, isLoading])

  useEffect(() => {
    if (!country) return
    
    const fetchProgress = async () => {
      if (!user || !country?.id) return
      try {
        const safeCountryId = String(country.id).replace(/\//g, '_')
        const progressRef = doc(db, 'training_progress', `${user.uid}_${safeCountryId}`)
        const snap = await getDoc(progressRef)
        if (snap.exists()) {
          setProgress(snap.data() as UserModuleProgress)
        } else {
          const initialProgress: UserModuleProgress = {
            userId: user.uid,
            countryId: country.id,
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
        console.warn("Notice: Failed to fetch progress, using fallback:", err)
        setProgress({
          userId: user.uid,
          countryId: country.id,
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
  }, [countrySlug, user])

  const updateProgress = async (updates: Partial<UserModuleProgress>) => {
    if (!user || !country || !progress) return
    const newProgress = { ...progress, ...updates }
    setProgress(newProgress)
    try {
      const progressRef = doc(db, 'training_progress', `${user.uid}_${country.id}`)
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

      const isLegacyQuiz = currentQuizId === 'quiz'
      
      updateProgress({
        completedQuizIds: updatedCompletedQuizIds,
        quizScores: updatedScores,
        ...(isLegacyQuiz ? { quizPassed: false, quizScore: 0 } : {})
      })
    }
  }

  const handleQuizComplete = (passed: boolean, score: number) => {
    if (!progress || !currentStep) return
    
    const currentQuizId = currentStep.id
    const updatedCompletedQuizIds = passed
      ? [...(progress.completedQuizIds || [])].filter(id => id !== currentQuizId).concat(currentQuizId)
      : (progress.completedQuizIds || [])
      
    const updatedScores = {
      ...(progress.quizScores || {}),
      [currentQuizId]: Math.max((progress.quizScores || {})[currentQuizId] || 0, score)
    }

    updateProgress({
      quizPassed: passed || progress.quizPassed,
      quizScore: Math.max(progress.quizScore, score),
      quizAttempts: progress.quizAttempts + 1,
      completedQuizIds: updatedCompletedQuizIds,
      quizScores: updatedScores,
      completedAt: passed && !progress.completedQuizIds?.includes(currentQuizId) ? new Date().toISOString() : progress.completedAt
    })
  }

  if (!country || !currentStep) return null

  const hasAgreement = (() => {
    if (activeRole !== 'agent') return true
    const normalize = (c: string) => {
      const n = c.trim().toLowerCase()
      if (n === 'united kingdom' || n === 'uk' || n === 'gb') return 'uk'
      if (n === 'united states' || n === 'usa' || n === 'us' || n === 'united states of america') return 'us'
      if (n === 'united arab emirates' || n === 'uae') return 'uae'
      return n
    }
    const normCountryName = normalize(country.name)
    const normCountrySlug = normalize(country.slug)
    return agreedCountries.some(c => normalize(c) === normCountryName || normalize(c) === normCountrySlug)
  })()

  if (activeRole === 'university') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="p-8 max-w-md text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admissions Training Restricted</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Admissions training modules are only available for agent users.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push('/training-hub')}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors w-full"
            >
              Back to Training Hub
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (activeRole === 'agent' && !hasAgreement) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="p-8 max-w-md text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admissions Training Locked</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Admissions training and videos for <strong>{country?.name || 'this country'}</strong> are restricted. To unlock this module, your agency must have an active, signed partnership agreement with a university located in this country.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push('/training-hub')}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors w-full"
            >
              Back to Training Hub
            </button>
            <Link 
              href="/network" 
              className="text-sm font-bold text-[#0059E7] hover:underline"
            >
              Browse University Network
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalSteps = steps.length
  const completedStepsCount = 
    (progress?.completedLessonIds?.length || 0) + 
    (progress?.completedQuizIds?.length || 0)
  const progressPercentage = totalSteps > 0 ? Math.min(100, Math.round((completedStepsCount / totalSteps) * 100)) : 0

  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null

  if (!country || !currentStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading lesson content...</p>
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
                {country.name ? 'Course Syllabus' : 'Training'}
              </span>
              <h2 className="font-bold text-base leading-tight truncate" title={country.name}>{country.name}</h2>
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
              const isCurrent = step.id === lessonSlug
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
                <Link
                  key={step.id}
                  href={`/training-hub/${country.slug}/${step.id}`}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={`block px-4 py-3 border-b border-white/5 transition-colors ${
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
                </Link>
              )
            })
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              {steps.map((step, idx) => {
                const isCurrent = step.id === lessonSlug
                let isCompleted = false
                if (step.type === 'lesson') isCompleted = progress?.completedLessonIds?.includes(step.id) || false
                if (step.type === 'quiz') isCompleted = progress?.completedQuizIds?.includes(step.id) || false
                const isLocked = isStepLocked(idx)

                return (
                  <Link
                    key={step.id}
                    href={isLocked ? '#' : `/training-hub/${country.slug}/${step.id}`}
                    onClick={(e) => {
                      if (isLocked) e.preventDefault()
                    }}
                    title={`${idx + 1}. ${step.title}${isLocked ? ' (Locked)' : isCompleted ? ' (Completed)' : ''}`}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
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
                  </Link>
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
            <Link 
              href={`/training-hub/${country.slug}`}
              className="text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Back to Course</span>
            </Link>
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
                  if (prevStep) router.push(`/training-hub/${country.slug}/${prevStep.id}`)
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
                      router.push(`/training-hub/${country.slug}/${steps[lastUnpassedQuizIdx].id}`)
                    } else {
                      router.push(`/training-hub/${country.slug}`)
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
                                    startTTS(currentChunkIndexRef.current, currentCharIndexRef.current)
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
                                    startTTS(currentChunkIndexRef.current, currentCharIndexRef.current)
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
                                onClick={() => startTTS()}
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

                    {currentStep.data.videoUrl && (
                      <div className="mb-8 aspect-video rounded-xl overflow-hidden border border-slate-200">
                        <iframe 
                          src={currentStep.data.videoUrl} 
                          className="w-full h-full"
                          allowFullScreen
                        />
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
                          className="px-6 py-2.5 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors shrink-0"
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
                      {isHtmlContent(currentStep.data.content) ? (
                        <div 
                          className="lesson-html-content"
                          dangerouslySetInnerHTML={{ __html: currentStep.data.content }} 
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
                          {currentStep.data.content}
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
                          className="px-6 py-3 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors w-full sm:w-auto"
                        >
                          Retake / Reset Quiz
                        </button>
                        {nextStep && (
                          <button 
                            onClick={() => router.push(`/training-hub/${country.slug}/${nextStep.id}`)}
                            className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-full hover:bg-slate-200 transition-colors w-full sm:w-auto"
                          >
                            Next Section
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <QuizRunner 
                      key={`${currentStep.id}-${progress?.completedQuizIds?.includes(currentStep.id) ? 'completed' : 'pending'}`}
                      quiz={currentStep.data} 
                      onComplete={handleQuizComplete} 
                      onReset={resetQuizCompletion}
                    />
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
                  router.push(`/training-hub/${country.slug}/${prevStep.id}`)
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

            {nextStep && (() => {
              const nextLocked = isStepLocked(currentStepIndex + 1)
              return (
                <button
                  disabled={nextLocked}
                  onClick={() => {
                    if (!nextLocked) {
                      router.push(`/training-hub/${country.slug}/${nextStep.id}`)
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
            })()}
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