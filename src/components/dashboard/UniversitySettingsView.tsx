'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import InstitutionMatrixTab from '../institution/InstitutionMatrixTab'
import { 
  Building2, 
  Settings, 
  Users, 
  Bot, 
  MapPin, 
  Mail, 
  Globe, 
  CheckCircle2, 
  Plus, 
  X, 
  Save, 
  AlertCircle,
  ChevronDown,
  Coins,
  ShieldCheck,
  CalendarCheck,
  Briefcase,
  Trash2,
  FileText,
  Camera,
  Award
} from 'lucide-react'
import { doc, updateDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { initializeApp, deleteApp, getApps } from 'firebase/app'
import firebaseConfig from '../../../firebase-applet-config.json'
import { toast } from 'sonner'
import AcademicSettingsView from './AcademicSettingsView'
import { useAuth } from '@/contexts/AuthContext'
import { COUNTRIES, CURRENCIES } from '@/types'

interface UniversitySettingsViewProps {
  profile: any
  userId: string
}

export default function UniversitySettingsView({ profile, userId }: UniversitySettingsViewProps) {
  const { institutions, hiddenCountries, user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'profile' | 'admissions' | 'matrix' | 'team' | 'account'>('profile')
  const [loading, setLoading] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const isSuperAdmin = !!(profile?.roles?.includes('superadmin') || profile?.role === 'Superadmin')
  const isUserAdmin = !!(
    isSuperAdmin || 
    profile?.roles?.includes('university') || 
    profile?.roles?.includes('agent') || 
    profile?.roles?.includes('institution_admin') || 
    profile?.roles?.includes('agent_admin') ||
    profile?.role === 'Institution Admin' || 
    profile?.role === 'Agent Admin'
  )

  useEffect(() => {
    const sub = searchParams.get('sub')
    const sec = searchParams.get('section')
    if (sec === 'account') {
      setActiveTab('account')
    } else if (sec === 'profile') {
      setActiveTab('profile')
    } else if (sub === 'admissions' || sub === 'profile' || sub === 'team' || sub === 'matrix' || sub === 'account') {
      setActiveTab(sub as any)
    }
  }, [searchParams])

  useEffect(() => {
    if (profile?.universityId && institutions.length > 0) {
      const inst = institutions.find(i => i.id === profile.universityId)
      if (inst) {
        const instAny = inst as any
        let finalName = instAny.name || formData.universityName
        if (finalName && finalName.endsWith(' Ser')) {
          finalName = finalName.replace(' Ser', '')
        }
        setFormData(prev => ({
          ...prev,
          universityName: finalName,
          country: instAny.country || prev.country,
          description: instAny.description || prev.description,
          ranking: instAny.ranking || prev.ranking,
          established: instAny.established || prev.established,
          studentCount: instAny.studentCount || prev.studentCount,
          institutionType: instAny.institutionType || prev.institutionType,
          sourceCountries: instAny.sourceCountries || prev.sourceCountries,
          schoolId: instAny.schoolId || prev.schoolId,
          currency: instAny.currency || prev.currency,
          website: instAny.website || prev.website,
          location: instAny.location || prev.location,
          feeInfo: instAny.fee || prev.feeInfo,
          applicationFee: instAny.applicationFee || prev.applicationFee,
          registrationFee: instAny.registrationFee || prev.registrationFee,
          vfsFee: instAny.vfsFee || prev.vfsFee,
          scholarshipInfo: instAny.scholarship || prev.scholarshipInfo,
          notesList: instAny.notes || prev.notesList,
          intakesList: instAny.intakes || prev.intakesList,
          levelsList: instAny.levels || prev.levelsList,
          logo: instAny.logo || prev.logo || '',
        }))
      }
    }
  }, [profile?.universityId, institutions])

  const [formData, setFormData] = useState({
    universityName: (profile?.institutionName || profile?.fullName || '').replace(' Ser', ''),
    country: profile?.country || 'Australia',
    description: profile?.description || '',
    ranking: profile?.ranking || '',
    established: profile?.established || '',
    studentCount: profile?.studentCount || '',
    institutionType: profile?.institutionType || '',
    sourceCountries: profile?.sourceCountries || [],
    schoolId: profile?.schoolId || '',
    currency: profile?.currency || 'USD',
    website: profile?.website || '',
    location: profile?.location || '',
    feeInfo: profile?.feeInfo || '',
    applicationFee: profile?.applicationFee || '',
    registrationFee: profile?.registrationFee || '',
    vfsFee: profile?.vfsFee || '',
    scholarshipInfo: profile?.scholarshipInfo || '',
    notesList: profile?.notesList || [],
    intakesList: profile?.intakesList || [],
    levelsList: profile?.levelsList || [],
    intakeInput: '',
    notesInput: '',
    logo: profile?.logo || ''
  })

  const [team, setTeam] = useState<any[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [invitePosition, setInvitePosition] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState('Institution Admin')
  const [inviting, setInviting] = useState(false)

  const [assignFirstName, setAssignFirstName] = useState('')
  const [assignLastName, setAssignLastName] = useState('')
  const [assignPosition, setAssignPosition] = useState('')
  const [assignEmail, setAssignEmail] = useState('')
  const [assignPassword, setAssignPassword] = useState('')
  const [assignUserType, setAssignUserType] = useState<'admin' | 'admissions'>('admin')
  const [assignTargetType, setAssignTargetType] = useState<'institution' | 'agent'>('institution')
  const [assignTargetId, setAssignTargetId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [allAgents, setAllAgents] = useState<any[]>([])

  useEffect(() => {
    const fetchAgents = async () => {
      if (!userId) return
      try {
        const snap = await getDocs(collection(db, 'agents'))
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setAllAgents(list)
      } catch (err) {
        console.error("Error fetching agents:", err)
      }
    }
    fetchAgents()
  }, [userId])

  useEffect(() => {
    if (assignTargetType === 'institution') {
      const currentUniId = profile?.universityId || profile?.institutionId || profile?.id || ''
      setAssignTargetId(currentUniId || (institutions[0]?.id || ''))
    } else {
      setAssignTargetId(allAgents[0]?.id || '')
    }
  }, [assignTargetType, institutions, allAgents, profile])

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isUserAdmin) {
      toast.error('Only administrators are authorized to assign new users.')
      return
    }

    if (!assignFirstName || !assignLastName || !assignPosition || !assignEmail || !assignPassword || !assignTargetId) {
      toast.error('Please fill in all user assignment fields.')
      return
    }

    if (assignPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    const trimmedEmail = assignEmail.trim()
    const parts = trimmedEmail.split('@')
    if (parts.length !== 2) {
      toast.error('Invalid email format.')
      return
    }
    const domain = parts[1].toLowerCase()
    const genericProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 
      'zoho.com', 'yandex.com', 'live.com', 'msn.com', 'gmx.com'
    ]
    const isGeneric = genericProviders.some(provider => {
      return domain === provider || domain.endsWith('.' + provider)
    })
    if (isGeneric) {
      toast.error('Generic unofficial emails are not allowed. The email must be from a college domain.')
      return
    }

    if (!domain.includes('.') || domain.split('.').pop()?.length === 0) {
      toast.error('Please enter a valid college or institutional email domain.')
      return
    }

    setAssigning(true)
    const toastId = toast.loading('Creating user account and assigning roles...')
    try {
      let secondaryApp = getApps().find(app => app.name === 'SecondaryAssignApp')
      if (!secondaryApp) {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryAssignApp')
      }
      const secondaryAuth = getAuth(secondaryApp)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, assignPassword)
      const uid = cred.user.uid

      let entityName = ''
      if (assignTargetType === 'institution') {
        const instObj = institutions.find(i => i.id === assignTargetId) as any
        entityName = instObj?.name || instObj?.institutionName || 'Institution'
      } else {
        const agObj = allAgents.find(a => a.id === assignTargetId)
        entityName = agObj?.agencyName || 'Agent'
      }

      const roleKey = assignTargetType === 'institution'
        ? (assignUserType === 'admin' ? 'institution_admin' : 'institution_admissions')
        : (assignUserType === 'admin' ? 'agent_admin' : 'agent_admissions')
      
      const parentRole = assignTargetType === 'institution' ? 'university' : 'agent'

      const userPayload: any = {
        uid,
        email: trimmedEmail,
        fullName: `${assignFirstName} ${assignLastName}`,
        roles: [roleKey, parentRole],
        status: 'approved',
        position: assignPosition,
        createdAt: serverTimestamp()
      }

      if (assignTargetType === 'institution') {
        userPayload.institutionId = assignTargetId
        userPayload.institutionName = entityName
      } else {
        userPayload.agencyId = assignTargetId
        userPayload.agencyName = entityName
      }

      await setDoc(doc(db, 'users', uid), userPayload)

      try {
        if (secondaryApp) await deleteApp(secondaryApp)
      } catch {}

      toast.dismiss(toastId)
      toast.success(`Successfully assigned ${assignFirstName} ${assignLastName} to ${entityName}!`)

      setAssignFirstName('')
      setAssignLastName('')
      setAssignPosition('')
      setAssignEmail('')
      setAssignPassword('')
      setAssignUserType('admin')
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Assign user error:', err)
      toast.error(err?.message || 'Failed to assign and create user.')
    } finally {
      setAssigning(false)
    }
  }

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const uniId = profile?.universityId || profile?.institutionId || profile?.id
        if (!uniId) return
        const q = query(collection(db, 'users'), where('institutionId', '==', uniId))
        const snap = await getDocs(q)
        const members: any[] = []
        snap.forEach(docSnap => {
          const data = docSnap.data()
          members.push({
            id: docSnap.id,
            name: data.fullName || data.name || 'Member',
            position: data.position || data.role || (data.roles?.[0] ? data.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Institution Member'),
            role: data.role || (data.roles?.[0] ? data.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Institution Admin'),
            email: data.email || ''
          })
        })
        if (members.length === 0 && profile) {
          members.push({
            id: profile.uid || '1',
            name: profile.fullName || 'Administrator',
            position: profile.position || 'Institution Lead',
            role: 'Institution Admin',
            email: profile.email || ''
          })
        }
        setTeam(members)
      } catch (err) {
        console.error("Error fetching team:", err)
      }
    }
    fetchTeam()
  }, [profile])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName || !inviteEmail || !invitePassword) {
      toast.error('Please fill in all required invite fields (Name, Email, Password).')
      return
    }
    if (invitePassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    setInviting(true)
    const toastId = toast.loading('Creating invited team member account...')
    try {
      let secondaryApp = getApps().find(app => app.name === 'SecondaryInviteApp')
      if (!secondaryApp) {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryInviteApp')
      }
      const secondaryAuth = getAuth(secondaryApp)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, inviteEmail, invitePassword)
      const uid = cred.user.uid

      const roleKey = inviteRole.toLowerCase().replace(/\s+/g, '_')
      const uniId = profile?.universityId || profile?.institutionId || profile?.id || profile?.uid
      const uniName = profile?.institutionName || profile?.name || ''

      await setDoc(doc(db, 'users', uid), {
        uid,
        email: inviteEmail,
        fullName: inviteName,
        position: invitePosition.trim() || inviteRole,
        role: inviteRole,
        roles: [roleKey, 'university'],
        status: 'approved',
        institutionId: uniId,
        institutionName: uniName,
        createdAt: serverTimestamp()
      })

      try {
        if (secondaryApp) await deleteApp(secondaryApp)
      } catch {}

      toast.dismiss(toastId)
      toast.success(`Successfully invited ${inviteName} as ${inviteRole}!`)
      
      setTeam(prev => [
        ...prev,
        { id: uid, name: inviteName, position: invitePosition.trim() || inviteRole, role: inviteRole, email: inviteEmail }
      ])
      setInviteName('')
      setInvitePosition('')
      setInviteEmail('')
      setInvitePassword('')
      setShowInviteModal(false)
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Invite member error:', err)
      toast.error(err?.message || 'Failed to invite team member.')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from your institution team?`)) return
    try {
      await deleteDoc(doc(db, 'users', memberId))
      setTeam(prev => prev.filter(m => m.id !== memberId))
      toast.success(`${memberName} has been removed from the team.`)
    } catch (err: any) {
      toast.error('Failed to remove team member.')
    }
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [tokenCopied, setTokenCopied] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(true)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }
    if (!user || !user.email) {
      toast.error('Authentication session is invalid or missing email.')
      return
    }

    setUpdatingPassword(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Your account password has been updated successfully!')
    } catch (err: any) {
      console.error('Password update error:', err)
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        toast.error('The current password you entered is incorrect.')
      } else if (err?.code === 'auth/requires-recent-login') {
        toast.error('Requires recent sign-in. Please log out and sign back in to modify this.')
      } else {
        toast.error(err?.message || 'An error occurred while updating your password.')
      }
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleGenerateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = 'uni_live_'
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setApiToken(token)
    setTokenCopied(false)
    toast.success('Generated a new Client SIS Integration Token!')
  }

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken)
    setTokenCopied(true)
    toast.success('Token copied to clipboard!')
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleUniversityNameChange = (name: string) => {
    const selected = institutions.find(i => i.name === name)
    if (selected) {
      setFormData(prev => ({
        ...prev,
        universityName: selected.name,
        country: selected.country || '',
        description: selected.description || '',
        ranking: selected.ranking || '',
        established: selected.established || '',
        studentCount: selected.studentCount || '',
        institutionType: selected.institutionType || '',
        website: selected.website || '',
        location: selected.location || '',
        feeInfo: selected.fee || '',
        applicationFee: selected.applicationFee || '',
        registrationFee: selected.registrationFee || '',
        vfsFee: selected.vfsFee || '',
        scholarshipInfo: selected.scholarship || '',
        notesList: selected.notes || [],
        intakesList: selected.intakes || [],
        levelsList: selected.levels || [],
        logo: selected.logo || '',
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        universityName: name,
        country: '',
        description: '',
        ranking: '',
        established: '',
        studentCount: '',
        institutionType: '',
        website: '',
        location: '',
        feeInfo: '',
        applicationFee: '',
        registrationFee: '',
        vfsFee: '',
        scholarshipInfo: '',
        notesList: [],
        intakesList: [],
        levelsList: [],
        logo: '',
      }))
    }
  }

  const handleAddIntake = () => {
    if (!formData.intakeInput.trim()) return
    if (!formData.intakesList.includes(formData.intakeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        intakesList: [...prev.intakesList, prev.intakeInput.trim()],
        intakeInput: ''
      }))
    } else {
      setFormData(prev => ({ ...prev, intakeInput: '' }))
    }
  }

  const handleRemoveIntake = (intake: string) => {
    setFormData(prev => ({
      ...prev,
      intakesList: prev.intakesList.filter(i => i !== intake)
    }))
  }

  const handleToggleLevel = (lvl: string) => {
    setFormData(prev => {
      const exists = prev.levelsList.includes(lvl)
      if (exists) {
        return { ...prev, levelsList: prev.levelsList.filter(l => l !== lvl) }
      } else {
        return { ...prev, levelsList: [...prev.levelsList, lvl] }
      }
    })
  }

  const handleAddNote = () => {
    if (!formData.notesInput.trim()) return
    setFormData(prev => ({
      ...prev,
      notesList: [...prev.notesList, prev.notesInput.trim()],
      notesInput: ''
    }))
  }

  const handleRemoveNote = (index: number) => {
    setFormData(prev => {
      const newNotes = [...prev.notesList]
      newNotes.splice(index, 1)
      return { ...prev, notesList: newNotes }
    })
  }

  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
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
      setFormData(prev => ({ ...prev, logo: base64Img }))
      toast.success("Logo uploaded to preview. Click 'Sync Settings' to save changes.")
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to process image.")
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const selectedInstitution = institutions.find(i => i.name === formData.universityName)
      let institutionId = selectedInstitution?.id || profile?.universityId
      
      if (!institutionId && formData.universityName) {
        institutionId = formData.universityName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      }

      const userRef = doc(db, 'users', userId)
      const userUpdate: any = {
        institutionName: formData.universityName,
        country: formData.country,
        description: formData.description,
        ranking: formData.ranking,
        established: formData.established,
        studentCount: formData.studentCount,
        institutionType: formData.institutionType,
        sourceCountries: formData.sourceCountries,
        schoolId: formData.schoolId,
        currency: formData.currency,
        logo: formData.logo || '',
        updatedAt: serverTimestamp()
      }

      if (institutionId && !profile?.universityId) {
        userUpdate.universityId = institutionId
      }

      console.log("Saving settings, keys being sent:", Object.keys(userUpdate))
      try {
        await updateDoc(userRef, userUpdate)
      } catch (err) {
        console.error("Firebase updateDoc error (users):", err)
        throw err
      }

      if (institutionId) {
        const instRef = doc(db, 'institutions', institutionId)
        const instData = {
          id: institutionId,
          programs: selectedInstitution?.programs || [],
          name: formData.universityName,
          country: formData.country,
          description: formData.description,
          ranking: formData.ranking,
          established: formData.established,
          studentCount: formData.studentCount,
          institutionType: formData.institutionType,
          sourceCountries: formData.sourceCountries,
          schoolId: formData.schoolId,
          currency: formData.currency,
          website: formData.website,
          location: formData.location,
          fee: formData.feeInfo,
          applicationFee: formData.applicationFee,
          registrationFee: formData.registrationFee,
          vfsFee: formData.vfsFee,
          scholarship: formData.scholarshipInfo,
          notes: formData.notesList,
          intakes: formData.intakesList,
          levels: formData.levelsList,
          logo: formData.logo || '',
          updatedAt: serverTimestamp()
        }
        console.log("Saving settings, institutions data:", instData)
        try {
          await setDoc(instRef, instData, { merge: true })
        } catch (err) {
          console.error("Firebase setDoc error (institutions):", err)
          throw err
        }
      }
      toast.success('Settings saved successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save settings.')
    } finally {
      setLoading(false)
    }
  }

  const handleDiscard = () => {
    const inst = profile?.universityId ? institutions.find(i => i.id === profile.universityId) : null
    setFormData({
      universityName: profile?.institutionName || profile?.fullName || '',
      country: profile?.country || 'Australia',
      description: profile?.description || '',
      ranking: profile?.ranking || '',
      established: profile?.established || '',
      studentCount: profile?.studentCount || '',
      institutionType: profile?.institutionType || '',
      sourceCountries: profile?.sourceCountries || [],
      schoolId: profile?.schoolId || '',
      currency: profile?.currency || 'USD',
      website: profile?.website || '',
      location: profile?.location || '',
      feeInfo: profile?.feeInfo || '',
      applicationFee: profile?.applicationFee || '',
      registrationFee: profile?.registrationFee || '',
      vfsFee: profile?.vfsFee || '',
      scholarshipInfo: profile?.scholarshipInfo || '',
      notesList: profile?.notesList || [],
      intakesList: profile?.intakesList || [],
      levelsList: profile?.levelsList || [],
      intakeInput: '',
      notesInput: '',
      logo: inst?.logo || profile?.logo || ''
    })
    toast.info('Changes discarded.')
  }

  return (
    <div className="w-full space-y-8 pb-12">
      <div className="flex p-2 bg-slate-100/70 rounded-2xl border border-slate-200/60 backdrop-blur-sm w-full sm:w-fit flex-wrap gap-2 justify-center sm:justify-start">
        {[
          { id: 'profile', label: 'Account', icon: Building2 },
          { id: 'admissions', label: 'Academics', icon: CalendarCheck },
          { id: 'matrix', label: 'Requirements', icon: FileText },
          { id: 'account', label: 'Security', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-grad-blue text-white shadow-md shadow-blue-500/20' 
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'matrix' && profile?.universityId && (
            <InstitutionMatrixTab institutionId={profile.universityId} />
          )}

          {activeTab === 'profile' && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative group/avatar">
                      <div className="w-28 h-28 rounded-2xl p-1 bg-blue-50 border-2 border-blue-200/80 flex items-center justify-center overflow-hidden shadow-inner">
                        {formData.logo ? (
                          <img src={formData.logo} alt="Institution Logo" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <Building2 className="text-grad-blue" size={42} />
                        )}
                      </div>
                      <span className="w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white absolute -bottom-1 -right-1 shadow-sm" title="Active Account" />
                      
                      <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer gap-1">
                        <Camera size={18} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider">Change Photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      </label>
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-lg sm:text-xl mt-3.5 leading-tight">
                      {formData.universityName || profile?.fullName || 'Institution Name'}
                    </h3>
                    
                    <div className="mt-2">
                      <span className="bg-blue-50 text-grad-blue border border-blue-200/60 font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-full inline-block">
                        {formData.institutionType ? `${formData.institutionType.toUpperCase()} INSTITUTION` : 'INSTITUTION ADMIN'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full mt-6">
                      <div className="bg-slate-50/80 rounded-2xl p-3 flex items-center gap-2.5 border border-slate-100 text-left">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-grad-blue flex items-center justify-center shrink-0">
                          <Award size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">{formData.ranking || '#150'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">Global Rank</p>
                        </div>
                      </div>

                      <div className="bg-slate-50/80 rounded-2xl p-3 flex items-center gap-2.5 border border-slate-100 text-left">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-grad-blue flex items-center justify-center shrink-0">
                          <Users size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">{formData.studentCount || '45K+'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">Base Students</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-100 space-y-3.5">
                    <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Details</p>

                    <div className="space-y-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Username:</span>
                        <span className="font-bold text-slate-800 truncate">
                          @{ (formData.schoolId || profile?.email?.split('@')[0] || 'institution').toLowerCase().replace(/[^a-z0-9]/g, '') }
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Email:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[180px]" title={profile?.email || 'admin@institution.edu'}>
                          {profile?.email || 'admin@institution.edu'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Status:</span>
                        <span className="bg-emerald-50 text-emerald-600 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-md border border-emerald-200">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Registry ID:</span>
                        <span className="font-semibold text-slate-800">{formData.schoolId || 'UCAS-2167'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Location:</span>
                        <span className="font-semibold text-slate-800 truncate">{formData.location || formData.country || 'Global'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Currency:</span>
                        <span className="font-semibold text-slate-800">{formData.currency || 'USD'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">Country:</span>
                        <span className="font-semibold text-slate-800">{formData.country || 'United States'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-100 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 py-3 bg-grad-blue hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {loading ? <Bot className="animate-spin" size={16} /> : <Save size={16} />}
                      {loading ? 'Saving...' : 'Sync Settings'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={loading}
                      className="py-3 px-4 bg-white hover:bg-red-50 text-red-500 hover:text-red-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-red-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3.5 bg-blue-50 text-grad-blue rounded-xl shrink-0">
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Public Profile & Global Parameters</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage public metadata, operational fees, and compliance details.</p>
                      </div>
                    </div>
                    
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Profile
                    </span>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Institution Name</label>
                        <div className="relative group">
                          <input 
                            type="text"
                            className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue outline-none transition-all text-sm font-bold text-slate-800 group-hover:bg-white"
                            value={formData.universityName}
                            onChange={e => {
                              handleUniversityNameChange(e.target.value)
                              setIsDropdownOpen(true)
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="Type to search or enter name..."
                          />
                          {isDropdownOpen && formData.universityName?.trim().length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-auto py-2">
                              {institutions
                                .filter(inst => {
                                  const term = (formData.universityName || '').toLowerCase().trim()
                                  if (!term) return true
                                  const rawName = inst.name || ''
                                  return rawName.toLowerCase().startsWith(term) || !!rawName.split(' ').find(w => w.toLowerCase().startsWith(term))
                                })
                                .map(inst => (
                                  <button 
                                    key={inst.id}
                                    type="button"
                                    className="w-full text-left px-6 py-3 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors"
                                    onClick={() => {
                                      handleUniversityNameChange(inst.name)
                                      setIsDropdownOpen(false)
                                    }}
                                  >
                                    {inst.name}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location (Country)</label>
                        <div className="relative group">
                          <select 
                            className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-grad-blue outline-none transition-all text-sm font-bold text-slate-800 appearance-none group-hover:bg-white"
                            value={formData.country}
                            onChange={e => handleInputChange('country', e.target.value)}
                          >
                            <option value="">Select Country</option>
                            {COUNTRIES.filter(c => {
                              const countryNorm = (c || '').trim().toLowerCase()
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
                              return true
                            }).map(country => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-5 top-4 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50/60 rounded-2xl border border-slate-150">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase size={14} className="text-[var(--color-grad-blue)]" />
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institution Registry ID</label>
                        </div>
                        <input 
                          type="text"
                          className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-sm font-bold text-slate-800"
                          value={formData.schoolId}
                          onChange={e => handleInputChange('schoolId', e.target.value)}
                          placeholder="e.g. UCAS-2167"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Institution Type</label>
                        <select
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-800"
                          value={formData.institutionType}
                          onChange={e => handleInputChange('institutionType', e.target.value)}
                        >
                          <option value="Public">Public</option>
                          <option value="Private">Private</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Global Rank</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-800"
                          value={formData.ranking}
                          onChange={e => handleInputChange('ranking', e.target.value)}
                          placeholder="#150"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Established</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-800"
                          value={formData.established}
                          onChange={e => handleInputChange('established', e.target.value)}
                          placeholder="1890"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Base Students</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-800"
                          value={formData.studentCount}
                          onChange={e => handleInputChange('studentCount', e.target.value)}
                          placeholder="45K+"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Institutional Mission Statement</label>
                      <textarea 
                        rows={4}
                        className="w-full px-5 py-3.5 bg-slate-50/40 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-sm font-medium text-slate-700 resize-none leading-relaxed"
                        value={formData.description}
                        onChange={e => handleInputChange('description', e.target.value)}
                        placeholder="Define your institution's USP and mission for prospective agency partners..."
                      />
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-[var(--color-grad-blue)] rounded-xl shrink-0">
                          <Globe size={18} />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">General Parameters</h4>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Website URL</label>
                          <input 
                            type="url" 
                            value={formData.website}
                            onChange={e => handleInputChange('website', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-[var(--color-grad-blue)] text-sm font-bold"
                            placeholder="https://www.example.edu"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">HQ / SmartCity Location</label>
                          <input 
                            type="text" 
                            value={formData.location}
                            onChange={e => handleInputChange('location', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold"
                            placeholder="London Campus, UK"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Operating Currency</label>
                          <div className="relative">
                            <select 
                              value={formData.currency}
                              onChange={e => handleInputChange('currency', e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold appearance-none"
                            >
                              {CURRENCIES.map(curr => (
                                <option key={curr.code} value={curr.code}>
                                  {curr.code} ({curr.symbol}) - {curr.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16} />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">College Application Fee</label>
                            <input 
                              type="text" 
                              value={formData.applicationFee}
                              onChange={e => handleInputChange('applicationFee', e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold"
                              placeholder="e.g. £200.00"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registration Fee</label>
                            <input 
                              type="text" 
                              value={formData.registrationFee}
                              onChange={e => handleInputChange('registrationFee', e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold"
                              placeholder="e.g. £150.00"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">VFS Appointment Fee</label>
                            <input 
                              type="text" 
                              value={formData.vfsFee}
                              onChange={e => handleInputChange('vfsFee', e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold"
                              placeholder="e.g. £50.00"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Global Tuition Range</label>
                          <input 
                            type="text" 
                            value={formData.feeInfo}
                            onChange={e => handleInputChange('feeInfo', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold"
                            placeholder="£12,000 - £18,000 P/A"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Global Scholarship</label>
                          <input 
                            type="text" 
                            value={formData.scholarshipInfo}
                            onChange={e => handleInputChange('scholarshipInfo', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none transition-all text-slate-800 text-sm font-bold"
                            placeholder="Up to 30% merit-based"
                          />
                        </div>
                      </div>

                      <div className="space-y-6 pt-4 border-t border-slate-100">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Degree Levels Offered</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['Undergraduate', 'Postgraduate', 'Doctorate', 'Diploma'].map((lvl) => {
                              const active = formData.levelsList.includes(lvl)
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => handleToggleLevel(lvl)}
                                  className={`px-3 py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all border cursor-pointer ${
                                    active 
                                      ? 'bg-blue-50 border-blue-200 text-[var(--color-grad-blue)]' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Compliance Notes for Agents</label>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto">
                            {formData.notesList.map((note, index) => (
                              <div 
                                key={index}
                                className="flex items-start gap-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs font-medium text-slate-700 relative group"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <p className="flex-1 leading-relaxed pr-6">{note}</p>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveNote(index)}
                                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-1 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {formData.notesList.length === 0 && (
                              <p className="text-[11px] italic text-slate-400 py-1 ml-1">No notes configured.</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Add an advisor info bulletin..."
                              value={formData.notesInput}
                              onChange={(e) => setFormData(prev => ({ ...prev, notesInput: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote() } }}
                              className="flex-1 px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] outline-none"
                            />
                            <button 
                              type="button"
                              onClick={handleAddNote}
                              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Add Note
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuration Active</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          type="button"
                          onClick={handleDiscard}
                          disabled={loading}
                          className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Discard
                        </button>
                        <button 
                          type="button"
                          onClick={handleSave}
                          disabled={loading}
                          className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-[var(--color-grad-blue)] hover:bg-[#004AC1] text-white rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                          {loading ? <Bot className="animate-spin" size={16} /> : <Save size={16} />}
                          {loading ? 'Saving...' : 'Sync Settings'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admissions' && (
            <div className="w-full">
              <AcademicSettingsView profile={profile} />
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-b border-slate-100 pb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Identity & Access Management</h3>
                  <p className="text-sm text-slate-500 font-medium">Define roles and manage institutional team members.</p>
                </div>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                   <Plus size={18} /> Invite New Member
                </button>
              </div>

              <div className="grid gap-4">
                {team.map(member => {
                  const mName = member?.name || 'Member'
                  const mEmail = member?.email || ''
                  const mRole = member?.role || 'Institution Admin'
                  const mPosition = member?.position || mRole
                  const mId = member?.id || Math.random().toString()
                  return (
                    <div key={mId} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                         <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-extrabold text-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            {mName.charAt(0) || 'M'}
                         </div>
                         <div>
                           <h4 className="font-bold text-slate-800 text-lg">{mName}</h4>
                           <p className="text-xs font-semibold text-slate-500">{mPosition}</p>
                           <p className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1 uppercase tracking-wider">
                             <Mail size={12} className="text-blue-500" /> {mEmail}
                           </p>
                         </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-[45%]">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assigned Role</span>
                          {mRole === 'Superadmin' || mRole === 'Institution Admin' ? (
                            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 flex items-center gap-1.5">
                              <ShieldCheck size={12} /> {mRole}
                            </span>
                          ) : (
                            <span className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">{mRole}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleRemoveMember(mId, mName)}
                            title="Remove Member"
                            className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed flex items-center justify-center text-center">
                 <div className="max-w-xs">
                    <p className="text-sm font-bold text-slate-600 mb-1">Audit Logs</p>
                    <p className="text-xs text-slate-500 font-medium">Institutional member activity logs are automatically captured for security compliance.</p>
                 </div>
              </div>

              {showInviteModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                  <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Invite New Team Member</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Add institution member with role-based permissions.</p>
                      </div>
                      <button 
                        onClick={() => setShowInviteModal(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleInviteMember} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sarah Jenkins"
                          value={inviteName}
                          onChange={e => setInviteName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position / Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Admissions Officer, Regional Manager"
                          value={invitePosition}
                          onChange={e => setInvitePosition(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institution Role *</label>
                        <select
                          value={inviteRole}
                          onChange={e => setInviteRole(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="Institution Admin">Institution Admin</option>
                          <option value="Admission">Admission</option>
                          <option value="Manager">Manager</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="sarah@university.edu"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-800"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temporary Password *</label>
                        <input
                          type="password"
                          required
                          placeholder="At least 8 characters"
                          value={invitePassword}
                          onChange={e => setInvitePassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-mono text-slate-800"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowInviteModal(false)}
                          className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={inviting}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                          {inviting ? 'Sending Invite...' : 'Send Invite'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 pb-6 mb-6">
                <h3 className="text-xl font-bold text-slate-800">Account Security & Credentials</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Configure Administrative Login Credentials, Personal authentication, SIS APIs, and secure access audits.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-blue-50 text-[var(--color-grad-blue)] rounded-xl shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Change Account Password</h4>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all font-mono text-slate-800"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all font-mono text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all font-mono text-slate-800"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="w-full py-3 bg-[var(--color-grad-blue)] hover:bg-[#004AC1] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                    >
                      {updatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3.5 bg-blue-50 text-[var(--color-grad-blue)] rounded-xl shrink-0">
                          <Settings size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Two-Factor Auth (2FA)</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Enforce SMS or App authentication keys.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIs2FAEnabled(!is2FAEnabled)
                          toast.success(`2FA enforcement policy has been updated to: ${!is2FAEnabled ? 'ENABLED' : 'DISABLED'}`)
                        }}
                        className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer relative ${is2FAEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${is2FAEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 flex items-start gap-2.5">
                      <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Dual-factor login is mandated for institutional administrators to prevent unauthorized access to partner student ledger channels.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                        <Coins size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">SIS API & SIS Tokens</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sync Student Information Systems natively.</p>
                      </div>
                    </div>

                    {apiToken ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 select-all justify-between break-all">
                          <span className="truncate max-w-[200px]">{apiToken}</span>
                          <button
                            type="button"
                            onClick={handleCopyToken}
                            className="text-[var(--color-grad-blue)] hover:text-[#004AC1] font-sans text-xs underline font-bold cursor-pointer"
                          >
                            {tokenCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-bold">✓ Active, securely encrypted token. Keep this key hidden.</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateToken}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Generate API Token
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-lg">Administrative Login Audit</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Historical audit review of active/stale device access sessions.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">MacBook Pro (Chrome v124) • Kathmandu, Nepal</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{profile?.email || 'saugat@allianza.edu'} • Last active 2 minutes ago</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">Current Session</span>
                  </div>

                  <div className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Mobile Safari (Apple iPhone) • Kathmandu, Nepal</p>
                        <p className="text-[10px] text-slate-400 font-medium">Device Token validated • Jan 28, 2026</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-4 py-1 rounded-full">Authorized</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 mt-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="p-3.5 bg-blue-50 text-[var(--color-grad-blue)] rounded-xl shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-lg">Assign New Partner Users</h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-semibold">Provision administrative or admissions user accounts for institutions and agents.</p>
                  </div>
                </div>

                {!isUserAdmin ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Administrator Credentials Required</p>
                      <p className="text-xs text-amber-700 font-medium mt-1">
                        Only authenticated administrators are authorized to provision and assign new user credentials.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAssignUser} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John"
                          value={assignFirstName}
                          onChange={e => setAssignFirstName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Doe"
                          value={assignLastName}
                          onChange={e => setAssignLastName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position / Role Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Director of Admissions"
                          value={assignPosition}
                          onChange={e => setAssignPosition(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Email (No public domains)</label>
                        <input
                          type="email"
                          required
                          placeholder="user@college.edu"
                          value={assignEmail}
                          onChange={e => setAssignEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Type Privilege</label>
                        <select
                          value={assignUserType}
                          onChange={e => setAssignUserType(e.target.value as any)}
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-bold cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="admissions">Admissions</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={assignPassword}
                          onChange={e => setAssignPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-mono"
                        />
                      </div>
                    </div>

                    {isSuperAdmin ? (
                      <div className="grid sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign To Partner Type</label>
                          <div className="flex items-center gap-4 py-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="assignTargetType"
                                checked={assignTargetType === 'institution'}
                                onChange={() => setAssignTargetType('institution')}
                                className="w-4 h-4 text-[var(--color-grad-blue)] focus:ring-[var(--color-grad-blue)]"
                              />
                              Institution
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="assignTargetType"
                                checked={assignTargetType === 'agent'}
                                onChange={() => setAssignTargetType('agent')}
                                className="w-4 h-4 text-[var(--color-grad-blue)] focus:ring-[var(--color-grad-blue)]"
                              />
                              Recruitment Agent
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {assignTargetType === 'institution' ? 'Select Target Institution' : 'Select Target Agent'}
                          </label>
                          <select
                            required
                            value={assignTargetId}
                            onChange={e => setAssignTargetId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[var(--color-grad-blue)] transition-all text-slate-800 font-bold cursor-pointer"
                          >
                            {assignTargetType === 'institution' ? (
                              institutions.map(inst => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.name || (inst as any).institutionName || 'Unknown Institution'}
                                </option>
                              ))
                            ) : (
                              allAgents.map(ag => (
                                <option key={ag.id} value={ag.id}>
                                  {ag.agencyName || 'Unknown Agent'}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-sm font-bold text-slate-600">
                          Target Assignee Context: <span className="text-[var(--color-grad-blue)] font-extrabold">{profile?.institutionName || profile?.universityName || 'Your Active Institution'}</span>
                        </div>
                        <div className="text-[10px] bg-blue-50 border border-blue-100 text-[var(--color-grad-blue)] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                          Auto-Linked Session
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={assigning}
                        className="px-8 py-3.5 bg-[var(--color-grad-blue)] hover:bg-[#004AC1] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {assigning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Assigning User...
                          </>
                        ) : (
                          'Save & Approve User'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}