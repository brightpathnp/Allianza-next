'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, PlayCircle, Clock, ChevronRight, CheckCircle2, Lock } from 'lucide-react'
import { mockCountries, mockLessons, mockQuizzes } from '@/data/trainingHubSeed'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { UserModuleProgress } from '@/types/training'
import { isSameUniversity, isAgreementActive } from '@/components/training/HubHome'

export default function CountryOverview() {
  const params = useParams()
  const router = useRouter()
  const { user, activeRole, institutions } = useAuth()
  const countrySlug = params.countrySlug as string

  const [progress, setProgress] = useState<UserModuleProgress | null>(null)

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

  useEffect(() => {
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

  const steps = React.useMemo(() => {
    const sList: any[] = []
    lessons.forEach(l => {
      sList.push({ type: 'lesson', id: l.slug, title: l.title })
      const lessonQuiz = activeQuizzes.find(q => q.lessonId === l.id || q.id === `quiz-${l.id}`)
      if (lessonQuiz) {
        sList.push({ 
          type: 'quiz', 
          id: `quiz-${l.slug}`, 
          title: `${l.title} Quiz`
        })
      }
    })
    if (quiz && !quiz.lessonId && !lessons.some(l => `quiz-${l.id}` === quiz.id)) {
      sList.push({ type: 'quiz', id: 'quiz', title: 'Module Assessment' })
    }
    return sList
  }, [lessons, activeQuizzes, quiz])

  const isStepLocked = React.useCallback((stepId: string) => {
    const idx = steps.findIndex(s => s.id === stepId)
    if (idx <= 0) return false
    for (let j = 0; j < idx; j++) {
      if (steps[j].type === 'quiz') {
        const qId = steps[j].id
        if (!progress?.completedQuizIds?.includes(qId)) {
          return true
        }
      }
    }
    return false
  }, [steps, progress?.completedQuizIds])

  useEffect(() => {
    if (!country) return
    const fetchProgress = async () => {
      if (!user) return
      const progressRef = doc(db, 'training_progress', `${user.uid}_${country.id}`)
      const snap = await getDoc(progressRef)
      if (snap.exists()) {
        setProgress(snap.data() as UserModuleProgress)
      }
    }
    fetchProgress()
  }, [country, user])

  if (!country) return null

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
      <DashboardLayout title="Access Restricted" subtitle="You do not have permission to view this training module.">
        <div className="p-8 max-w-md mx-auto text-center mt-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admissions Training Restricted</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Admissions training modules are only available for agent users.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push('/training-hub')}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Back to Training Hub
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (activeRole === 'agent' && !hasAgreement) {
    return (
      <DashboardLayout title="Access Restricted" subtitle="You do not have permission to view this training module.">
        <div className="p-8 max-w-md mx-auto text-center mt-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admissions Training Locked</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Admissions training and videos for <strong>{country.name}</strong> are restricted. To unlock this module, your agency must have an active, signed partnership agreement with a university located in this country.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push('/training-hub')}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Back to Training Hub
            </button>
            <Link 
              href="/network" 
              className="text-sm font-bold text-[#0059E7] hover:underline text-center"
            >
              Browse University Network
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const totalSteps = steps.length
  const completedStepsCount = 
    (progress?.completedLessonIds?.length || 0) + 
    (progress?.completedQuizIds?.length || 0)
  const progressPercentage = totalSteps > 0 ? Math.min(100, Math.round((completedStepsCount / totalSteps) * 100)) : 0

  const firstIncompleteStep = steps.find(s => {
    if (s.type === 'lesson') return !progress?.completedLessonIds?.includes(s.id)
    if (s.type === 'quiz') return !progress?.completedQuizIds?.includes(s.id)
    return false
  }) || steps[0]
  const startSlug = progressPercentage === 100 ? (steps[0]?.id || 'quiz') : (firstIncompleteStep?.id || 'quiz')

  const totalMinutes = lessons.reduce((acc, curr) => acc + curr.estimatedMinutes, 0)

  return (
    <DashboardLayout title="Training Hub" subtitle="Enhance your knowledge with curated training videos and quizzes.">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link href="/training-hub" className="hover:text-slate-900 transition-colors">Training Hub</Link>
          <ChevronRight size={16} />
          <span className="text-slate-900">{country.name}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
          <div className="bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-blue-100 mb-6">
                {country.flagEmoji} Destination Module
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-4">{country.name} Admissions Training</h1>
              <p className="text-slate-300 text-lg md:text-xl max-w-2xl mb-8">
                {country.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-400" />
                  <span>{lessons.length} Lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-blue-400" />
                  <span>~{totalMinutes} Minutes</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="w-1/2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-900">Your Progress</span>
                <span className="text-sm font-bold text-[#0059E7]">{progressPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#0059E7] transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            
            <button 
              onClick={() => router.push(`/training-hub/${country.slug}/${startSlug}`)}
              className="px-8 py-3 bg-[#0059E7] text-white font-bold rounded-full hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <PlayCircle size={20} />
              {progressPercentage === 0 ? 'Start Course' : progressPercentage === 100 ? 'Review Course' : 'Resume Course'}
            </button>
          </div>

          <div className="p-8">
            <h2 className="text-xl font-bold mb-6">Course Content</h2>
            <div className="space-y-4">
              {lessons.map((lesson, idx) => {
                const isCompleted = progress?.completedLessonIds?.includes(lesson.slug)
                const lessonQuiz = activeQuizzes.find(q => q.lessonId === lesson.id || q.id === `quiz-${lesson.id}`)
                const isQuizPassed = progress?.completedQuizIds?.includes(`quiz-${lesson.slug}`) || false

                const lessonLocked = isStepLocked(lesson.slug)
                const quizLocked = lessonQuiz ? isStepLocked(`quiz-${lesson.slug}`) : false

                return (
                  <React.Fragment key={lesson.id}>
                    {lessonLocked ? (
                      <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-150 bg-slate-50 opacity-50 cursor-not-allowed select-none">
                        <div className="mt-1 text-slate-400">
                          <Lock size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-500">
                            {lesson.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {lesson.estimatedMinutes} mins</span>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">LOCKED</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link 
                        href={`/training-hub/${country.slug}/${lesson.slug}`}
                        className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-[#0059E7] hover:shadow-sm transition-all group bg-white"
                      >
                        <div className="mt-1">
                          {isCompleted ? (
                            <CheckCircle2 size={24} className="text-green-500" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:border-[#0059E7] group-hover:text-[#0059E7]">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 group-hover:text-[#0059E7] transition-colors">{lesson.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><Clock size={14} /> {lesson.estimatedMinutes} mins</span>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-[#0059E7]" />
                      </Link>
                    )}

                    {lessonQuiz && (
                      quizLocked ? (
                        <div className="flex items-start gap-4 p-4 pl-12 rounded-xl border border-slate-150 bg-slate-100/50 opacity-50 cursor-not-allowed select-none">
                          <div className="mt-1 text-slate-400">
                            <Lock size={18} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-500 text-sm">
                              {lesson.title} Quiz
                            </h4>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 font-medium">
                              <span>Pass requirement: 80% (5 Questions)</span>
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">LOCKED</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Link 
                          href={`/training-hub/${country.slug}/quiz-${lesson.slug}`}
                          className="flex items-start gap-4 p-4 pl-12 rounded-xl border border-slate-200 hover:border-[#0059E7] hover:shadow-sm transition-all group bg-slate-50"
                        >
                          <div className="mt-1">
                            {isQuizPassed ? (
                              <CheckCircle2 size={20} className="text-green-500" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:border-[#0059E7] group-hover:text-[#0059E7]">
                                Q
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#0059E7] transition-colors">{lesson.title} Quiz</h4>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 font-medium">
                              <span>Pass requirement: 80% (5 Questions)</span>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-[#0059E7]" />
                        </Link>
                      )
                    )}
                  </React.Fragment>
                )
              })}

              {quiz && !quiz.lessonId && !lessons.some(l => `quiz-${l.id}` === quiz.id) && (() => {
                const legacyQuizLocked = isStepLocked('quiz')
                return legacyQuizLocked ? (
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-150 bg-slate-100/50 opacity-50 cursor-not-allowed select-none">
                    <div className="mt-1 text-slate-400">
                      <Lock size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-500">Module Assessment</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 font-medium">
                        <span>Pass requirement: 80%</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">LOCKED</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link 
                    href={`/training-hub/${country.slug}/quiz`}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-[#0059E7] hover:shadow-sm transition-all group bg-slate-50"
                  >
                    <div className="mt-1">
                      {progress?.quizPassed ? (
                        <CheckCircle2 size={24} className="text-green-500" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:border-[#0059E7] group-hover:text-[#0059E7]">
                          QA
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-[#0059E7] transition-colors">Module Assessment</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 font-medium">
                        <span>Pass requirement: 80%</span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-[#0059E7]" />
                  </Link>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}