'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  CheckSquare,
  Eye,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import GoogleDocsEditor from '@/components/editor/GoogleDocsEditor'
import { CentralLoader } from '@/components/dashboard/CentralLoader'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
}

interface LessonItem {
  id: string
  title: string
  type: 'Reading' | 'Quiz' | 'Code' | 'Video' | 'Document' | string
  duration: string
  content?: string
  imageUrl?: string
  videoUrl?: string
}

interface ModuleItem {
  id: string
  title: string
  description: string
  lessons: LessonItem[]
}

interface CourseSettings {
  publishInstantly: boolean
  requireSequential: boolean
  requirePassingScore: boolean
  allowRetakes: boolean
  randomizeQuestions: boolean
  showExplanations: boolean
  minPassingScore: number
}

interface CourseFormData {
  title: string
  description: string
  slug: string
  flagEmoji: string
  isPublished: boolean
  includeQuiz: boolean
}

interface TrainingDocument {
  title?: string
  description?: string
  slug?: string
  flagEmoji?: string
  isPublished?: boolean
  includeQuiz?: boolean
  universityId?: string
  createdBy?: string
  modules?: ModuleItem[]
  lessons?: Array<{
    title?: string
    type?: string
    duration?: string
    content?: string
    imageUrl?: string
    videoUrl?: string
  }>
  questions?: QuizQuestion[]
  settings?: Partial<CourseSettings>
}

const DEFAULT_GCM_MODULES: ModuleItem[] = [
  {
    id: 'm1',
    title: 'Module 1: Admissions & Entry Requirements',
    description:
      'Comprehensive guidelines on academic credentials, English proficiency, and entry thresholds for GCM.',
    lessons: [
      {
        id: 'l1-a',
        title: 'Section 1.a: Academic Credentials & Minimum Entry Thresholds',
        type: 'Reading',
        duration: '25m',
        content:
          '### Section 1.a: Academic Credentials & Minimum Entry Thresholds\n\nOverview of academic qualifications, grade equivalencies, and secondary school requirements for Global College Malta programs.',
      },
      {
        id: 'l1-b',
        title: 'Section 1.b: English Language Proficiency & MOI Guidelines',
        type: 'Reading',
        duration: '20m',
        content:
          '### Section 1.b: English Language Proficiency & MOI Guidelines\n\nAccepted English test scores (IELTS, TOEFL, Duolingo) and Medium of Instruction (MOI) exemption criteria.',
      },
      {
        id: 'l1-c',
        title: 'Section 1.c: Document Verification Checklist',
        type: 'Reading',
        duration: '15m',
        content:
          '### Section 1.c: Document Verification Checklist\n\nStep-by-step checklist for verifying passport copies, transcripts, and statement of purpose before submission.',
      },
    ],
  },
  {
    id: 'm2',
    title: 'Module 2: Malta Student Visa & Compliance',
    description:
      'Central Visa Unit (CVU) application procedures, financial proofs, and visa interview preparation.',
    lessons: [
      {
        id: 'l2-a',
        title: 'Section 2.a: Central Visa Unit (CVU) Application Workflow',
        type: 'Reading',
        duration: '30m',
        content:
          '### Section 2.a: Central Visa Unit (CVU) Application Workflow\n\nLodging visa applications 8 to 12 weeks prior to course start date, application tracking, and biometric requirements.',
      },
      {
        id: 'l2-b',
        title: 'Section 2.b: Financial Proof & Health Insurance Standards',
        type: 'Reading',
        duration: '25m',
        content:
          '### Section 2.b: Financial Proof & Health Insurance Standards\n\nMandatory bank statement requirements, proof of funds, and Schengen-compliant health insurance policies.',
      },
      {
        id: 'l2-c',
        title: 'Section 2.c: Visa Interview Preparation Guidelines',
        type: 'Reading',
        duration: '20m',
        content:
          '### Section 2.c: Visa Interview Preparation Guidelines\n\nPreparing prospective students for embassy interviews and common compliance questions.',
      },
    ],
  },
  {
    id: 'm3',
    title: 'Module 3: Campus Life & Academic Programs',
    description:
      'Detailed overview of undergraduate and postgraduate courses and student life in SmartCity Malta.',
    lessons: [
      {
        id: 'l3-a',
        title: 'Section 3.a: Undergraduate & Postgraduate Course Offerings',
        type: 'Reading',
        duration: '25m',
        content:
          '### Section 3.a: Undergraduate & Postgraduate Course Offerings\n\nDetailed breakdown of Bachelor and Master degree programs offered at Global College Malta.',
      },
      {
        id: 'l3-b',
        title: 'Section 3.b: Student Accommodation & Location Guide',
        type: 'Reading',
        duration: '20m',
        content:
          '### Section 3.b: Student Accommodation & Location Guide\n\nLiving in Malta, housing options near SmartCity, public transport, and student support services.',
      },
    ],
  },
  {
    id: 'm4',
    title: 'Module 4: Agent Commission & Partner Policies',
    description:
      'Tuition fee payments, student onboarding, commission structures, and compliance.',
    lessons: [
      {
        id: 'l4-a',
        title: 'Section 4.a: Student Onboarding & Tuition Fee Payment Terms',
        type: 'Reading',
        duration: '20m',
        content:
          '### Section 4.a: Student Onboarding & Tuition Fee Payment Terms\n\nPayment schedules, deposit receipts, and official invoice issuance procedures.',
      },
      {
        id: 'l4-b',
        title: 'Section 4.b: Ethical Recruitment & Partner Compliance',
        type: 'Reading',
        duration: '15m',
        content:
          '### Section 4.b: Ethical Recruitment & Partner Compliance\n\nMaintaining recruitment integrity, avoiding fraudulent applications, and agency performance reviews.',
      },
    ],
  },
  {
    id: 'm5',
    title: 'Module 5: Final Assessment & Certification',
    description: 'Knowledge evaluation quiz and agent training certificate issuance.',
    lessons: [
      {
        id: 'l5-a',
        title: 'Section 5.a: Agent Certification & Compliance Assessment',
        type: 'Quiz',
        duration: '15m',
        content:
          '### Section 5.a: Agent Certification & Compliance Assessment\n\nComplete the knowledge assessment quiz to receive official certification for Global College Malta.',
      },
    ],
  },
]

const DEFAULT_GCM_QUESTIONS: QuizQuestion[] = [
  {
    question:
      'What is the primary visa issuing body for students attending Global College Malta?',
    options: [
      'Identity Malta / Central Visa Unit',
      'UK Visas and Immigration',
      'US Citizenship & Immigration Services',
      'Schengen Border Council',
    ],
    correctAnswer: 0,
  },
  {
    question:
      'Which English language test scores are accepted by Global College Malta?',
    options: [
      'IELTS (min 6.0)',
      'Duolingo (min 105)',
      'Medium of Instruction (MOI) Certificate',
      'All of the above',
    ],
    correctAnswer: 3,
  },
  {
    question:
      'How long before the course start date should Malta visa applications ideally be lodged?',
    options: [
      'At least 8 to 12 weeks',
      '1 week before orientation',
      'On arrival in Valletta',
      'After completing the first semester',
    ],
    correctAnswer: 0,
  },
]

const DEFAULT_SETTINGS: CourseSettings = {
  publishInstantly: true,
  requireSequential: true,
  requirePassingScore: true,
  allowRetakes: true,
  randomizeQuestions: false,
  showExplanations: true,
  minPassingScore: 80,
}

const DEFAULT_FORM_DATA: CourseFormData = {
  title: '',
  description: '',
  slug: '',
  flagEmoji: '🎓',
  isPublished: false,
  includeQuiz: true,
}

function normalizeUniversityId(uniId: unknown): string {
  if (!uniId) {
    return 'global-college-malta'
  }

  const normalizedId = String(uniId).toLowerCase().trim()

  if (
    normalizedId === 'gcm' ||
    normalizedId.includes('global college malta') ||
    normalizedId.includes('global-college-malta') ||
    normalizedId.includes('gcm-uid') ||
    normalizedId.includes('malta')
  ) {
    return 'global-college-malta'
  }

  if (
    normalizedId === 'pba' ||
    normalizedId.includes('paris business academy') ||
    normalizedId.includes('paris-business-academy') ||
    normalizedId.includes('paris')
  ) {
    return 'paris-business-academy'
  }

  return normalizedId
}

function isSameUniversity(id1: unknown, id2: unknown): boolean {
  if (!id1 || !id2) {
    return false
  }

  return normalizeUniversityId(id1) === normalizeUniversityId(id2)
}

function isAgreementActive(status: unknown): boolean {
  if (!status) {
    return true
  }

  const normalizedStatus = String(status).toLowerCase().trim()

  return [
    'active',
    'signed',
    'approved',
    'completed',
    'under_review',
    'pending_signature',
  ].includes(normalizedStatus)
}

async function compressImage(
  base64String: string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.5,
): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      let width = image.width
      let height = image.height

      if (width > height && width > maxWidth) {
        height *= maxWidth / width
        width = maxWidth
      }

      if (height >= width && height > maxHeight) {
        width *= maxHeight / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      context?.drawImage(image, 0, 0, width, height)

      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    image.onerror = () => {
      resolve(base64String)
    }

    image.src = base64String
  })
}

export default function InstitutionTrainingFormPage(): React.JSX.Element {
  const params = useParams<{ trainingId?: string | string[] }>()
  const router = useRouter()
  const { activeRole, user, profile } = useAuth()

  const trainingIdParam = params.trainingId
  const trainingId = Array.isArray(trainingIdParam)
    ? trainingIdParam[0]
    : trainingIdParam

  const isSuperAdmin = activeRole === 'superadmin' || activeRole === 'admin'
  const isUniversity = activeRole === 'university'
  const universityId = profile?.roles?.includes('university')
    ? user?.uid
    : profile?.universityId

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'curriculum' | 'settings' | 'quiz' | 'details'
  >('curriculum')

  const [formData, setFormData] =
    useState<CourseFormData>(DEFAULT_FORM_DATA)

  const [settings, setSettings] =
    useState<CourseSettings>(DEFAULT_SETTINGS)

  const [modules, setModules] = useState<ModuleItem[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')

  const [addingLessonForModuleId, setAddingLessonForModuleId] = useState<
    string | null
  >(null)

  const [editingLesson, setEditingLesson] = useState<{
    moduleId: string
    lesson: LessonItem
  } | null>(null)

  const [newLessonData, setNewLessonData] = useState({
    title: '',
    type: 'Reading',
    duration: '20m',
    content: '',
  })

  useEffect(() => {
    if (isUniversity || isSuperAdmin) {
      return
    }

    toast.error(
      'Only institutions and administrators are permitted to manage training modules.',
    )
    router.replace('/training-hub')
  }, [isSuperAdmin, isUniversity, router])

  useEffect(() => {
    if (!trainingId) {
      return
    }

    const fetchTraining = async (): Promise<void> => {
      setFetching(true)

      try {
        const trainingSnapshot = await getDoc(
          doc(db, 'institution_trainings', trainingId),
        )

        if (!trainingSnapshot.exists()) {
          toast.error('Training module not found.')
          router.replace('/training-hub')
          return
        }

        const training = trainingSnapshot.data() as TrainingDocument
        const userUniversityId = profile?.universityId ?? ''
        const userId = user?.uid ?? ''

        const isOwner =
          !isUniversity ||
          training.createdBy === userId ||
          training.universityId === userId ||
          training.universityId === userUniversityId ||
          (userUniversityId &&
            isSameUniversity(training.universityId, userUniversityId)) ||
          (userId && isSameUniversity(training.universityId, userId))

        if (isUniversity && !isOwner) {
          toast.error('You do not have permission to edit this training module.')
          router.replace('/training-hub')
          return
        }

        setFormData({
          title: training.title ?? '',
          description: training.description ?? '',
          slug: training.slug ?? '',
          flagEmoji: training.flagEmoji ?? '🎓',
          isPublished: training.isPublished ?? false,
          includeQuiz: training.includeQuiz ?? true,
        })

        setSettings({
          publishInstantly: training.settings?.publishInstantly ?? true,
          requireSequential: training.settings?.requireSequential ?? true,
          requirePassingScore: training.settings?.requirePassingScore ?? true,
          allowRetakes: training.settings?.allowRetakes ?? true,
          randomizeQuestions: training.settings?.randomizeQuestions ?? false,
          showExplanations: training.settings?.showExplanations ?? true,
          minPassingScore: training.settings?.minPassingScore ?? 80,
        })

        if (Array.isArray(training.modules) && training.modules.length > 0) {
          setModules(training.modules)
        } else if (
          Array.isArray(training.lessons) &&
          training.lessons.length > 0
        ) {
          setModules([
            {
              id: 'm1',
              title: 'Module 1: General Course Lessons',
              description:
                'Standard lessons associated with this training program.',
              lessons: training.lessons.map((lesson, index) => ({
                id: `l1-${index + 1}`,
                title: lesson.title ?? `Lesson ${index + 1}`,
                type: lesson.type ?? 'Reading',
                duration: lesson.duration ?? '20m',
                content: lesson.content ?? '',
                imageUrl: lesson.imageUrl ?? '',
                videoUrl: lesson.videoUrl ?? '',
              })),
            },
          ])
        }

        if (Array.isArray(training.questions)) {
          setQuestions(training.questions)
        }
      } catch (error) {
        console.error('Error fetching training module:', error)
        toast.error('Failed to load training module details.')
      } finally {
        setFetching(false)
      }
    }

    void fetchTraining()
  }, [
    isUniversity,
    profile?.universityId,
    router,
    trainingId,
    user?.uid,
  ])

  const handleLoadGCMDefaults = (): void => {
    setFormData({
      title: 'Global College Malta Agent Training Course',
      description:
        'Comprehensive training program covering admission criteria, visa compliance, English proficiency guidelines, and agent recruitment policies for Global College Malta.',
      slug: 'gcm-101-admissions-visas',
      flagEmoji: '🇲🇹',
      isPublished: true,
      includeQuiz: true,
    })
    setModules(DEFAULT_GCM_MODULES)
    setQuestions(DEFAULT_GCM_QUESTIONS)
    toast.success('Loaded Global College Malta default course curriculum.')
  }

  const handleCreateNewModule = (): void => {
    const moduleName = newModuleName.trim()

    if (!moduleName) {
      toast.error('Please enter a module name.')
      return
    }

    const nextModuleIndex = modules.length + 1

    const module: ModuleItem = {
      id: `module-${Date.now()}`,
      title: moduleName.startsWith('Module')
        ? moduleName
        : `Module ${nextModuleIndex}: ${moduleName}`,
      description:
        newModuleDescription.trim() ||
        'Overview of lessons in this course module.',
      lessons: [],
    }

    setModules((currentModules) => [...currentModules, module])
    setNewModuleName('')
    setNewModuleDescription('')
    toast.success(`Created ${module.title}`)
  }

  const handleDeleteModule = (moduleId: string): void => {
    setModules((currentModules) =>
      currentModules.filter((module) => module.id !== moduleId),
    )
    toast.info('Module removed.')
  }

  const handleAddLessonSubmit = (moduleId: string): void => {
    const lessonTitle = newLessonData.title.trim()

    if (!lessonTitle) {
      toast.error('Please enter a lesson title.')
      return
    }

    const lesson: LessonItem = {
      id: `lesson-${Date.now()}`,
      title: lessonTitle,
      type: newLessonData.type,
      duration: newLessonData.duration || '20m',
      content:
        newLessonData.content ||
        `### ${lessonTitle}\n\nDetailed study materials for this lesson segment.`,
    }

    setModules((currentModules) =>
      currentModules.map((module) =>
        module.id === moduleId
          ? { ...module, lessons: [...module.lessons, lesson] }
          : module,
      ),
    )

    setAddingLessonForModuleId(null)
    setNewLessonData({
      title: '',
      type: 'Reading',
      duration: '20m',
      content: '',
    })
    toast.success('Lesson added to module.')
  }

  const handleDeleteLesson = (
    moduleId: string,
    lessonId: string,
  ): void => {
    setModules((currentModules) =>
      currentModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.filter(
                (lesson) => lesson.id !== lessonId,
              ),
            }
          : module,
      ),
    )
  }

  const saveEditedLesson = (): void => {
    if (!editingLesson) {
      return
    }

    const { moduleId, lesson: updatedLesson } = editingLesson

    setModules((currentModules) =>
      currentModules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.map((lesson) =>
                lesson.id === updatedLesson.id ? updatedLesson : lesson,
              ),
            }
          : module,
      ),
    )

    setEditingLesson(null)
    toast.success('Section content updated.')
  }

  const addQuestion = (): void => {
    setQuestions((currentQuestions) => [
      ...currentQuestions,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      },
    ])
  }

  const removeQuestion = (questionIndex: number): void => {
    setQuestions((currentQuestions) =>
      currentQuestions.filter((_, index) => index !== questionIndex),
    )
  }

  const updateQuestionField = (
    questionIndex: number,
    field: 'question' | 'option' | 'correctAnswer',
    value: string | number,
    optionIndex?: number,
  ): void => {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, index) => {
        if (index !== questionIndex) {
          return question
        }

        if (field === 'question' && typeof value === 'string') {
          return { ...question, question: value }
        }

        if (
          field === 'option' &&
          typeof value === 'string' &&
          optionIndex !== undefined
        ) {
          return {
            ...question,
            options: question.options.map((option, index) =>
              index === optionIndex ? value : option,
            ),
          }
        }

        if (field === 'correctAnswer' && typeof value === 'number') {
          return { ...question, correctAnswer: value }
        }

        return question
      }),
    )
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const imageFile = event.target.files?.[0]

    if (!imageFile || !editingLesson) {
      return
    }

    if (imageFile.size > 2 * 1024 * 1024) {
      toast.error('Image is too large. The maximum file size is 2 MB.')
      return
    }

    const reader = new FileReader()

    reader.onload = async (): Promise<void> => {
      const result = reader.result

      if (typeof result !== 'string') {
        return
      }

      const compressedImage = await compressImage(result)

      setEditingLesson((currentEditingLesson) =>
        currentEditingLesson
          ? {
              ...currentEditingLesson,
              lesson: {
                ...currentEditingLesson.lesson,
                imageUrl: compressedImage,
              },
            }
          : null,
      )

      toast.success('Photo uploaded and optimized.')
    }

    reader.onerror = (): void => {
      toast.error('Unable to read the selected image.')
    }

    reader.readAsDataURL(imageFile)
  }

  const saveCourse = async (shouldPublish: boolean): Promise<void> => {
    if (!formData.title.trim()) {
      toast.error('Please provide a course title.')
      return
    }

    if (modules.length === 0) {
      toast.error('Please add at least one course module.')
      return
    }

    setLoading(true)

    try {
      const resolvedUniversityId = normalizeUniversityId(
        universityId || 'global-college-malta',
      )

      const generatedSlug = formData.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        slug: formData.slug.trim() || generatedSlug,
        flagEmoji: formData.flagEmoji || '🎓',
        isPublished: shouldPublish,
        includeQuiz: formData.includeQuiz,
        modules,
        questions: formData.includeQuiz ? questions : [],
        settings: {
          ...settings,
          publishInstantly: shouldPublish,
        },
        updatedAt: serverTimestamp(),
      }

      const estimatedPayloadSize = JSON.stringify(payload).length

      if (estimatedPayloadSize > 1_000_000) {
        const hasEmbeddedBase64Image =
          JSON.stringify(payload).includes('data:image/')

        toast.error(
          hasEmbeddedBase64Image
            ? 'Course content exceeds Firestore’s 1 MB limit because it includes embedded image data. Use hosted image URLs instead.'
            : 'Course content exceeds Firestore’s 1 MB limit. Reduce the amount of lesson content or split the course.',
        )
        return
      }

      if (trainingId) {
        await updateDoc(
          doc(db, 'institution_trainings', trainingId),
          payload,
        )
      } else {
        await addDoc(collection(db, 'institution_trainings'), {
          ...payload,
          universityId: resolvedUniversityId,
          createdBy: user?.uid ?? '',
          createdAt: serverTimestamp(),
        })
      }

      setFormData((currentFormData) => ({
        ...currentFormData,
        isPublished: shouldPublish,
      }))

      if (!shouldPublish) {
        toast.success(
          'Draft saved successfully. This course remains visible only in your institution dashboard.',
        )
        return
      }

      let notifiedCount = 0

      try {
        const agreementsSnapshot = await getDocs(
          query(collection(db, 'agreements')),
        )

        const agentIds = new Set<string>()

        agreementsSnapshot.forEach((agreementDocument) => {
          const agreement = agreementDocument.data() as {
            universityId?: string
            agentId?: string
            status?: string
          }

          if (
            agreement.agentId &&
            isSameUniversity(
              agreement.universityId,
              resolvedUniversityId,
            ) &&
            isAgreementActive(agreement.status)
          ) {
            agentIds.add(agreement.agentId)
          }
        })

        const institutionName =
          profile?.institutionName ||
          profile?.fullName ||
          'Partner Institution'

        await Promise.all(
          [...agentIds].map(async (agentId) => {
            await addDoc(collection(db, 'notifications'), {
              userId: agentId,
              title: 'New Training Course Published 🎓',
              description: `${institutionName} has published the course: "${formData.title.trim()}". Check your Training Hub to start learning!`,
              category: 'applications',
              isUnread: true,
              createdAt: serverTimestamp(),
            })

            notifiedCount += 1
          }),
        )
      } catch (notificationError) {
        console.error(
          'Error sending notifications to partner agents:',
          notificationError,
        )
      }

      toast.success(
        notifiedCount > 0
          ? `Course published successfully and ${notifiedCount} partner agent(s) were notified.`
          : 'Course published successfully. It is now available to relevant partner agents.',
      )

      router.push('/training-hub')
    } catch (error: unknown) {
      console.error('Error saving training module:', error)

      const firebaseError = error as {
        code?: string
        message?: string
      }

      if (
        firebaseError.code === 'out-of-range' ||
        firebaseError.message?.includes('too large')
      ) {
        toast.error(
          'Firestore’s 1 MB document limit was reached. Reduce course size or use external image URLs.',
        )
      } else {
        toast.error(
          `Failed to save the module: ${
            firebaseError.message?.slice(0, 80) ?? 'Unknown error'
          }`,
        )
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <CentralLoader minHeight="p-12" />
  }

  if (editingLesson) {
    const parentModule = modules.find(
      (module) => module.id === editingLesson.moduleId,
    )

    return (
      <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingLesson(null)}
              aria-label="Back to course curriculum"
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={22} />
            </button>

            <div>
              <h1 className="text-lg font-black text-slate-900">
                Edit Section Content
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {parentModule
                  ? `Editing section in ${parentModule.title}`
                  : 'Manage section text, photos, videos, and settings.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setEditingLesson(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveEditedLesson}
              className="px-5 py-2 bg-[#0059E7] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={16} />
              Save Section Content
            </button>
          </div>
        </header>

        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <label
              htmlFor="section-title"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Section Title
            </label>
            <input
              id="section-title"
              type="text"
              value={editingLesson.lesson.title}
              onChange={(event) =>
                setEditingLesson((currentEditingLesson) =>
                  currentEditingLesson
                    ? {
                        ...currentEditingLesson,
                        lesson: {
                          ...currentEditingLesson.lesson,
                          title: event.target.value,
                        },
                      }
                    : null,
                )
              }
              placeholder="e.g. Section 1.a: Academic Credentials & Visa Overview"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="section-type"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Section Type
              </label>
              <select
                id="section-type"
                value={editingLesson.lesson.type || 'Reading'}
                onChange={(event) =>
                  setEditingLesson((currentEditingLesson) =>
                    currentEditingLesson
                      ? {
                          ...currentEditingLesson,
                          lesson: {
                            ...currentEditingLesson.lesson,
                            type: event.target.value,
                          },
                        }
                      : null,
                  )
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="Reading">Reading / Article</option>
                <option value="Video">Video Tutorial</option>
                <option value="Document">Document / PDF</option>
                <option value="Quiz">Quiz Segment</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="section-duration"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Duration (Estimated)
              </label>
              <input
                id="section-duration"
                type="text"
                value={editingLesson.lesson.duration || '20m'}
                onChange={(event) =>
                  setEditingLesson((currentEditingLesson) =>
                    currentEditingLesson
                      ? {
                          ...currentEditingLesson,
                          lesson: {
                            ...currentEditingLesson.lesson,
                            duration: event.target.value,
                          },
                        }
                      : null,
                  )
                }
                placeholder="e.g. 15m or 1 hour"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-xs font-bold text-slate-700">
                Section Content Editor
              </label>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                Google Docs Editor Mode
              </span>
            </div>

            <GoogleDocsEditor
              value={editingLesson.lesson.content || ''}
              onChange={(content: string) =>
                setEditingLesson((currentEditingLesson) =>
                  currentEditingLesson
                    ? {
                        ...currentEditingLesson,
                        lesson: {
                          ...currentEditingLesson.lesson,
                          content,
                        },
                      }
                    : null,
                )
              }
              placeholder="Start writing or paste section lesson material here..."
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ImageIcon size={16} className="text-blue-600" />
              Photo Upload & Image URL Option
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="url"
                value={editingLesson.lesson.imageUrl || ''}
                onChange={(event) =>
                  setEditingLesson((currentEditingLesson) =>
                    currentEditingLesson
                      ? {
                          ...currentEditingLesson,
                          lesson: {
                            ...currentEditingLesson.lesson,
                            imageUrl: event.target.value,
                          },
                        }
                      : null,
                  )
                }
                placeholder="Paste image URL (https://...)"
                className="sm:col-span-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />

              <label className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={15} />
                Choose Photo File
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    void handleImageUpload(event)
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {editingLesson.lesson.imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-w-md mt-2 group">
                <img
                  src={editingLesson.lesson.imageUrl}
                  alt="Section photo preview"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setEditingLesson((currentEditingLesson) =>
                      currentEditingLesson
                        ? {
                            ...currentEditingLesson,
                            lesson: {
                              ...currentEditingLesson.lesson,
                              imageUrl: '',
                            },
                          }
                        : null,
                    )
                  }
                  aria-label="Remove section image"
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label
              htmlFor="section-video-url"
              className="block text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Video size={16} className="text-blue-600" />
              Video Link / Embed URL Option
            </label>

            <input
              id="section-video-url"
              type="url"
              value={editingLesson.lesson.videoUrl || ''}
              onChange={(event) =>
                setEditingLesson((currentEditingLesson) =>
                  currentEditingLesson
                    ? {
                        ...currentEditingLesson,
                        lesson: {
                          ...currentEditingLesson.lesson,
                          videoUrl: event.target.value,
                        },
                      }
                    : null,
                )
              }
              placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />

            {editingLesson.lesson.videoUrl && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Video size={13} />
                  Video Link Attached
                </div>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 max-w-lg">
                  <iframe
                    src={editingLesson.lesson.videoUrl}
                    title="Video preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setEditingLesson(null)}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEditedLesson}
            className="px-6 py-2.5 bg-[#0059E7] hover:bg-[#0047BA] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={16} />
            Save Section Content
          </button>
        </footer>
      </main>
    )
  }

  return (
    <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/training-hub')}
            aria-label="Back to Training Hub"
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={22} />
          </button>

          {formData.isPublished ? (
            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs shrink-0">
              <CheckCircle size={14} />
              Published
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs shrink-0">
              <Lock size={14} />
              Draft Mode (Internal Only)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleLoadGCMDefaults}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <button
            type="button"
            onClick={() => {
              void saveCourse(false)
            }}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => {
              void saveCourse(true)
            }}
            disabled={loading}
            className="px-5 py-2 bg-[#0059E7] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {formData.isPublished ? 'Update' : 'Publish Course'}
          </button>

          {formData.isPublished && (
            <button
              type="button"
              onClick={() => {
                void saveCourse(false)
              }}
              disabled={loading}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              title="Unpublish course to revert it to draft mode"
            >
              <Lock size={14} />
              Unpublish
            </button>
          )}
        </div>
      </header>

      <section className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formData.title || 'Global College Malta Agent Training Course'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-3xl">
            {formData.description ||
              'Comprehensive training program covering admission criteria, visa compliance, English proficiency guidelines, and agent recruitment policies for Global College Malta.'}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
            <nav aria-label="Course designer sections" className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('curriculum')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'curriculum'
                    ? 'bg-blue-50 text-[#0059E7] border border-blue-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen
                    size={16}
                    className={
                      activeTab === 'curriculum'
                        ? 'text-[#0059E7]'
                        : 'text-slate-400'
                    }
                  />
                  Curriculum Designer
                </span>
                <span className="text-[10px] font-mono font-bold bg-blue-100/70 text-[#0059E7] px-2 py-0.5 rounded-full">
                  {modules.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-[#0059E7] border border-blue-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings
                  size={16}
                  className={
                    activeTab === 'settings'
                      ? 'text-[#0059E7]'
                      : 'text-slate-400'
                  }
                />
                Module Settings
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'quiz'
                    ? 'bg-blue-50 text-[#0059E7] border border-blue-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle
                    size={16}
                    className={
                      activeTab === 'quiz'
                        ? 'text-[#0059E7]'
                        : 'text-slate-400'
                    }
                  />
                  Grading Center / Quiz
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {questions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-blue-50 text-[#0059E7] border border-blue-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText
                  size={16}
                  className={
                    activeTab === 'details'
                      ? 'text-[#0059E7]'
                      : 'text-slate-400'
                  }
                />
                Course Information
              </button>
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-3 space-y-6">
          {activeTab === 'curriculum' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Interactive Course Curriculum Builder
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Edit or reorganize modules and lessons. Changes instantly sync
                  to the student view.
                </p>
              </div>

              <div className="space-y-5">
                {modules.map((module, moduleIndex) => (
                  <article
                    key={module.id}
                    className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-slate-200 text-slate-700 font-mono text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                            M{moduleIndex + 1}
                          </span>
                          <h3 className="text-sm font-black text-slate-900">
                            {module.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium pl-0.5">
                          {module.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteModule(module.id)}
                        aria-label={`Delete ${module.title}`}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-2 pl-1 sm:pl-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs gap-3 hover:border-blue-300 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditingLesson({
                                moduleId: module.id,
                                lesson,
                              })
                            }
                            className="flex items-center gap-3 overflow-hidden flex-1 text-left cursor-pointer"
                          >
                            <span className="text-[10px] font-mono font-extrabold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md shrink-0">
                              {lesson.type || 'Reading'}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {lesson.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">
                              ({lesson.duration || '20m'})
                            </span>

                            {(lesson.imageUrl || lesson.videoUrl) && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 shrink-0 flex items-center gap-1">
                                {lesson.imageUrl && <ImageIcon size={10} />}
                                {lesson.videoUrl && <Video size={10} />}
                                Media
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingLesson({
                                  moduleId: module.id,
                                  lesson,
                                })
                              }
                              aria-label={`Edit ${lesson.title}`}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteLesson(module.id, lesson.id)
                              }
                              aria-label={`Delete ${lesson.title}`}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {addingLessonForModuleId === module.id ? (
                        <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-4 space-y-3 mt-2">
                          <p className="text-xs font-bold text-blue-900">
                            Add Section
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Section title"
                              value={newLessonData.title}
                              onChange={(event) =>
                                setNewLessonData((currentLessonData) => ({
                                  ...currentLessonData,
                                  title: event.target.value,
                                }))
                              }
                              className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <select
                              value={newLessonData.type}
                              onChange={(event) =>
                                setNewLessonData((currentLessonData) => ({
                                  ...currentLessonData,
                                  type: event.target.value,
                                }))
                              }
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="Reading">Reading</option>
                              <option value="Quiz">Quiz</option>
                              <option value="Video">Video</option>
                              <option value="Document">Document</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setAddingLessonForModuleId(null)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAddLessonSubmit(module.id)}
                              className="px-4 py-1.5 bg-[#5B4DF5] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#4939E4]"
                            >
                              Add Section
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingLessonForModuleId(module.id)
                            setNewLessonData({
                              title: '',
                              type: 'Reading',
                              duration: '20m',
                              content: '',
                            })
                          }}
                          className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          <Plus size={15} />
                          Add Section
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <section className="border-2 border-dashed border-slate-200/90 rounded-2xl p-6 bg-slate-50/30 space-y-4">
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Create New Course Module
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="module-name"
                      className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1"
                    >
                      Module Name
                    </label>
                    <input
                      id="module-name"
                      type="text"
                      value={newModuleName}
                      onChange={(event) =>
                        setNewModuleName(event.target.value)
                      }
                      placeholder="e.g. Module 3: Microservice Deployment Pipelines"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="module-description"
                      className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1"
                    >
                      Module Description / Subtext
                    </label>
                    <input
                      id="module-description"
                      type="text"
                      value={newModuleDescription}
                      onChange={(event) =>
                        setNewModuleDescription(event.target.value)
                      }
                      placeholder="Brief overview of lessons inside..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewModule}
                  className="px-5 py-2.5 bg-[#5B4DF5] hover:bg-[#4939E4] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  Add Course Module
                </button>
              </section>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Module & Assessment Settings
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Configure publication parameters, pass thresholds, and assessment
                  rules.
                </p>
              </div>

              <section className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <ShieldCheck size={16} className="text-blue-600" />
                  Publishing & Visibility
                </h3>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Publish Instantly
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      When enabled, course modules are immediately visible to
                      partner agents.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        publishInstantly: !currentSettings.publishInstantly,
                      }))
                    }
                    aria-label="Toggle publish instantly"
                    aria-pressed={settings.publishInstantly}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-all ${
                      settings.publishInstantly ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.publishInstantly ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireSequential}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        requireSequential: event.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-900">
                      Require Sequential Completion
                    </span>
                    <span className="block text-[11px] text-slate-500 font-medium">
                      Students must complete Module 1 before unlocking Module 2.
                    </span>
                  </span>
                </label>
              </section>

              <section className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 space-y-4">
                <h3 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <CheckSquare size={16} className="text-blue-600" />
                  Assessment & Quiz Settings
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeQuiz}
                      onChange={(event) =>
                        setFormData((currentFormData) => ({
                          ...currentFormData,
                          includeQuiz: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">
                        Include End-of-Course Assessment Quiz
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium">
                        Attach an evaluation test at the end of the module.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.requirePassingScore}
                      onChange={(event) =>
                        setSettings((currentSettings) => ({
                          ...currentSettings,
                          requirePassingScore: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">
                        Require Passing Score for Certification
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium">
                        Issue a completion certificate only when the required
                        score is met.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowRetakes}
                      onChange={(event) =>
                        setSettings((currentSettings) => ({
                          ...currentSettings,
                          allowRetakes: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">
                        Allow Unlimited Retakes
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium">
                        Students can re-attempt the quiz if they fail.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.randomizeQuestions}
                      onChange={(event) =>
                        setSettings((currentSettings) => ({
                          ...currentSettings,
                          randomizeQuestions: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">
                        Randomize Question Order
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium">
                        Shuffle question order on each quiz attempt.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showExplanations}
                      onChange={(event) =>
                        setSettings((currentSettings) => ({
                          ...currentSettings,
                          showExplanations: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">
                        Show Explanations & Correct Answers
                      </span>
                      <span className="block text-[11px] text-slate-500 font-medium">
                        Display answer explanations after quiz submission.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <label
                    htmlFor="minimum-passing-score"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Minimum Passing Score (%)
                  </label>
                  <input
                    id="minimum-passing-score"
                    type="number"
                    min={50}
                    max={100}
                    value={settings.minPassingScore}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        minPassingScore: Number(event.target.value),
                      }))
                    }
                    className="w-32 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Grading Center & Quiz Questions
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Manage assessment questions and correct options for agent
                    evaluation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus size={16} />
                  Add Question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((question, questionIndex) => (
                  <article
                    key={`${questionIndex}-${question.question}`}
                    className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
                        Q{questionIndex + 1}
                      </span>

                      <input
                        type="text"
                        value={question.question}
                        onChange={(event) =>
                          updateQuestionField(
                            questionIndex,
                            'question',
                            event.target.value,
                          )
                        }
                        placeholder="Type assessment question here..."
                        className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        aria-label={`Delete question ${questionIndex + 1}`}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pl-2 pt-1">
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="radio"
                            name={`correct-${questionIndex}`}
                            checked={
                              question.correctAnswer === optionIndex
                            }
                            onChange={() =>
                              updateQuestionField(
                                questionIndex,
                                'correctAnswer',
                                optionIndex,
                              )
                            }
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(event) =>
                              updateQuestionField(
                                questionIndex,
                                'option',
                                event.target.value,
                                optionIndex,
                              )
                            }
                            placeholder={`Option ${optionIndex + 1}`}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Course Information
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Basic metadata, display titles, and URL handles.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="course-title"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Course Title
                  </label>
                  <input
                    id="course-title"
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((currentFormData) => ({
                        ...currentFormData,
                        title: event.target.value,
                      }))
                    }
                    placeholder="e.g. HIST-204: Global Civilizations & Trade Routes"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="course-description"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Course Overview / Subtext
                  </label>
                  <textarea
                    id="course-description"
                    rows={3}
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((currentFormData) => ({
                        ...currentFormData,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Course description..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="course-slug"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      URL Slug
                    </label>
                    <input
                      id="course-slug"
                      type="text"
                      value={formData.slug}
                      onChange={(event) =>
                        setFormData((currentFormData) => ({
                          ...currentFormData,
                          slug: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="course-flag"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Flag / Accent Emoji
                    </label>
                    <input
                      id="course-flag"
                      type="text"
                      value={formData.flagEmoji}
                      onChange={(event) =>
                        setFormData((currentFormData) => ({
                          ...currentFormData,
                          flagEmoji: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}