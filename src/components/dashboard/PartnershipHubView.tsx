'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileSignature, 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
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
  FileCheck,
  Briefcase
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  where, 
  orderBy,
  updateDoc,
  serverTimestamp,
  addDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { handleFirestoreError, OperationType } from '@/lib/authUtils'
import { InstitutionalAgreementSettings, AgreementParameter, AgreementRecord, CURRENCIES } from '@/types'
import SignaturePad from './SignaturePad'

interface Request {
  id: string
  agentId: string
  agentName: string
  status: 'new' | 'under_review' | 'approved' | 'rejected'
  createdAt: any
  updatedAt: any
  agentDetails?: any
  terms?: any
}

export default function PartnershipHubView({ profile }: { profile: any }) {
  const { user } = useAuth()
  const router = useRouter()
  const institutionId = profile?.universityId || 'global-college-malta'
  const isGCM = institutionId === 'global-college-malta'
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeView, setActiveView] = useState<'settings' | 'requests'>('settings')
  
  const [settings, setSettings] = useState<InstitutionalAgreementSettings | null>(null)
  
  const [requests, setRequests] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)

  const [uniSignatureType, setUniSignatureType] = useState<'draw' | 'upload'>('draw')
  const [uniFormData, setUniFormData] = useState({
    representativeName: profile?.fullName || '',
    position: profile?.jobTitle || '',
    date: new Date().toISOString().split('T')[0],
    signatureUrl: '',
    sealUrl: '',
  })

  const compressImage = (base64Str: string, maxWidth: number = 280, maxHeight: number = 160): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str) {
        resolve('')
        return
      }
      const img = new Image()
      img.src = base64Str
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(base64Str)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        try {
          const compressedBase64 = canvas.toDataURL('image/png')
          resolve(compressedBase64)
        } catch (err) {
          resolve(base64Str)
        }
      }
      img.onerror = () => {
        resolve(base64Str)
      }
    })
  }
  
  const [isParamModalOpen, setIsParamModalOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<AgreementParameter | null>(null)
  const [newParam, setNewParam] = useState({ key: '', value: '', description: '' })

  const [editingClauseId, setEditingClauseId] = useState<string | null>(null)

  const updateSettingField = (key: keyof InstitutionalAgreementSettings, value: any) => {
    setSettings(prev => {
      const base = prev || {
        institutionId: institutionId,
        title: 'B2B SERVICE REPRESENTATION AGREEMENT',
        commissionAmount: '1000',
        commissionCurrency: 'EUR',
        agreementDuration: '1 Year',
        visaRefusalFee: '100',
        additionalTerms: '',
        parameters: [],
        clauses: [],
        updatedAt: null,
        updatedBy: user?.uid || 'system'
      } as any
      return {
        ...base,
        [key]: value
      }
    })
  }

  const initializeUniversityData = async (customId: string) => {
    if (!user) return
    
    const isGlobalCollegeMalta = customId === 'global-college-malta' || customId === 'gcm'
    const isPBA = customId === 'paris-business-academy'
    
    const title = isGlobalCollegeMalta ? 'AGENCY AGREEMENT' : 'B2B SERVICE REPRESENTATION AGREEMENT'
    const commAmount = isGlobalCollegeMalta ? '1200' : (isPBA ? '1500' : '1000')
    const commCurrency = isGlobalCollegeMalta ? 'EUR' : (isPBA ? 'EUR' : 'GBP')
    const duration = '1 Year'
    const refusalFee = isGlobalCollegeMalta ? '100' : (isPBA ? '150' : '50')
    const additionalTerms = isGlobalCollegeMalta 
      ? 'No commission is paid for students who withdraw within the first month or abscond after obtaining a student visa.'
      : 'Commission payments are processed upon verified student enrollment and full first-year tuition payment. No payout for early withdrawals.'

    const preamble = isGlobalCollegeMalta 
      ? `Between Global College Malta, 2nd Floor, SCM01, Smart City Malta (herein referred to as "GCM") and {{NAME_OF_CONSULTANCY}}, {{ADDRESS}} herein after referred to as an Agent WHEREAS\n  (A) NAME OF THE CONSULTANCY Pvt. Ltd, is an educational consultant, and\n  (B) GCM has offered NAME OF THE CONSULTANCY Pvt. Ltd, as an Agent, promoting GCM and recruiting to campus-based undergraduate and postgraduate programs of GCM, and the agent has agreed to accept this offer of appointment; and\n  (C) The parties now wish to commit to the terms of this writing appointment.\n  NOW, THEREFORE, the parties have agreed as follows:`
      : `Between ${profile?.fullName || 'the Institution'} (herein referred to as the "Institution") and {{NAME_OF_CONSULTANCY}}, {{ADDRESS}} (herein referred to as the "Agent").\nWHEREAS the Institution is a provider of higher education programs, and the Agent has expertise in recruiting qualified international students. NOW, THEREFORE, the parties agree as follows:`

    const parameters = isGlobalCollegeMalta 
      ? [
          { id: '1', key: 'Payment Cycle', value: 'Per Successful Enrollment', description: 'Paid after full year fee is received' },
          { id: '2', key: 'Invoice Processing', value: '3 Weeks', description: 'Average time to process agent invoices' }
        ]
      : [
          { id: '1', key: 'Payment Cycle', value: 'Per Enrollment Session', description: 'Disbursed after the semester intake census date' }
        ]

    const clauses = isGlobalCollegeMalta
      ? [
          { id: "1", title: "1. INTERPRETATION", text: "1.1 In this Agreement, unless otherwise specified or the context otherwise requires:\n\n(i) Words importing any gender shall include all other genders and words importing the singular shall include the plural and vice versa;\n\n(ii) Reference to a Clause, Schedule, or Annexure is to the relevant clause, schedule, or annexure to this Agreement;\n\n(iii) Reference to this Agreement or to any other document is a reference to this Agreement or to that other document as modified, amended, varied, supplemented, assigned, novated, or replaced from time to time;\n\n(iv) Reference to a provision of law is a reference to that provision as extended, applied, amended, consolidated, or re-enacted or as the application thereof is modified from time to time and shall be construed as including a reference to any order, instrument, regulation or other subordinate legislation from time to time made under it;\n\n(V) Reference to a party to this Agreement includes that party's permitted successors, transferees, and assignees; and\n\n(vi) Reference to a person includes any individual, firm, company, corporation, body corporate, government, state or agency of the state, trust or foundation, or any association, partnership, or unincorporated body of two or more of the foregoing (whether or not having separate legal personality and wherever incorporated or established).\n\n1.2 Headings used in this Agreement shall not affect its construction or interpretation.\n\n1.3 Words and phrases defined in any part of this Agreement bear the same meaning throughout this Agreement.\n\n1.4 The Schedules form part of this Agreement and have the same full force and effect as if expressly set out in their entirety in the operative part of this Agreement.\n\n1.5 Any action required to be performed by a party to this Agreement that falls to be performed on a date which is not a Business Day shall be performed immediately following Business Day.\n\n1.6 Obligations and liabilities assumed by more than one person in this Agreement as a single party or otherwise are assumed jointly and severally unless otherwise specified.\n\n1.7 In this Agreement, any phrase introduced by the words "including", "include", "in particular" or any similar expression shall be construed as illustrative only and shall not be construed as limiting the generality of any preceding words." },
          { id: "2", title: "2. NATURE OF THE AGREEMENT", text: "2.1 GCM hereby designates the Agent as its authorized representative in Nepal to promote and market the college and to recruit agents and students for its campus-based programs. All day-to-day contacts between the Agent and GCM will be conducted between the Agent and GCM or its authorized signatory/nominee.\n\n2.2 This Agreement will commence on the date it is signed by both parties, which shall be deemed to be the Commencement Date of this Agreement. It is intended that this Agreement shall be valid for one year from the date of signing in the first instance. Thereafter, this Agreement shall be extended for further periods subject to the performance of the Agent.\n\n2.3 This Agreement supersedes and replaces all previous agreements, arrangements, and understandings (if any) between the parties but shall not prejudice any rights which may already have accrued thereunder to any party." },
          { id: "3", title: "3. THE AGENT'S OBLIGATIONS", text: "3.1 The Agent will coordinate recruitment activities and counsel potential students from the initial point of contact until registration as a student with GCM. The Agent will provide potential students with accurate, up-to-date information provided by GCM.\n\n3.2 The Agent will at all times use all proper care and skills expected of a competent educational consultant.\n\n3.3 The Agent acknowledges GCM's rights to the intellectual property used on or about GCM's business and the goodwill connected with that are the property of GCM. The Agent accepts that it is only permitted to use the intellectual property for and during the term of this Agreement and only as authorized by GCM and that it will not use any trademark or trademark or logos which resemble GCM's trademarks or trade names or logos and which would therefore be likely to confuse or to mislead the public or any section of the public. The Agent shall adhere to GCM's brand/marketing guidelines and submit samples of promotional materials to GCM's Recruitment and admissions staff for approval before use.\n\n3.4 The Agent will keep GCM fully informed of educational developments in the agreed market(s) which might affect GCM, and be prepared to act for GCM on such matters as shall be reasonably requested by GCM.\n\n3.5 The Agent will meet staff from GCM's Recruitment and Admissions office regularly to review performance and ensure a good working relationship.\n\n3.6 Compliance with Law.\n\n3.6.1 The Agent shall ensure that it complies with the laws applicable to the agreed market(s) and shall obtain all necessary permits, licenses, permissions, or approvals necessary and advisable for its business in the agreed market(s). GCM shall provide such assistance as is reasonable to assist the agent in obtaining the necessary approvals, licenses, permits, or permissions." },
          { id: "4", title: "4. GCM'S OBLIGATIONS", text: "4.1 Welfare, social, accommodation, and academic advisory support will be provided for students registered with GCM. These services will be under the control and authority of GCM. Students will be informed by the Agent of the full range of services available.\n\n4.2 The Recruitment and Admissions Office of GCM will supply an Agent Guidance Booklet, give a face-to-face training where possible, and ensure an adequate supply of accurate and up-to-date promotional materials to enable the Agent to carry out its obligations hereunder.\n\n4.3 Staff from the Recruitment and Admissions Office will meet regularly with the Agent to review performance and payments under Schedule 1.\n\n4.4 GCM will pay commission as detailed in clause 5.2 and Schedule 1." },
          { id: "5", title: "5. FINANCIAL PROVISIONS", text: "5.1 The tuition fees for all programs will be notified to the Agent by GCM as soon as they are made available.\n\n5.2 Payment of commission. In respect of each student registered on a program who pays the student's fee, following an introduction to GCM via the Agent, GCM shall, upon completion of enrolment of the student, pay to the Agent commission as set out in Schedule 1. If the student's fee is reduced because of a fee waiver, scholarship, or otherwise, the commission payable shall be calculated on the reduced amount paid by the student. The commission shall only be payable upon the provision of an invoice by the Agent providing details of the students recommended by the Agent to GCM, and GCM shall thereafter endeavor to process the invoice for payment as soon as possible. Generally, it takes three weeks to process the invoice after receiving it from agents.\n\n5.3 No other costs or expenses will be paid by GCM, except by prior written consent.\n\n5.4 The commission can be claimed only after the full-year fee is paid by the student. Otherwise, the commission would be paid on a pro-rata basis at the end of each semester." },
          { id: "6", title: "6. GENERAL", text: "6.1 Data Protection. 6.1.1 The Agent will collect, process, and utilize the Contact Data only for its obligations under this Agreement. The Agent will only act on the instructions of GCM in collecting, processing, and utilizing the Contact Data.\n\n6.2 Termination. 6.2.1 This Agreement may be terminated by either party by giving three months' notice in writing.\n\n6.2.2 This Agreement shall be deemed to be terminated with immediate effect upon the occurrence of any one or more of the following events: (i) The Agent ceases or threatens to cease, to carry on business or there is a change in ownership or control of the Agent with whom GCM deems there to be a conflict of interest. (ii) Any order is made or a resolution passed for the winding up of the Agent's business or an administrator or receiver is appointed by order of a court or otherwise, or the Agent takes or suffers any such action in consequence of debt. (iii) A serious breach of any of the terms of this Agreement has been committed by the Agent, and in particular, any breach of confidentiality imposed herein shall be regarded as a serious breach of this Agreement. (iv) The Agent purports to sub-contract or assign any or all of this Agreement to a third party.\n\n6.3 Consequences of Termination or Expiry. 6.3.1 Termination of this Agreement shall not affect the rights and liabilities of either party subsisting at the date of termination.\n\n6.3.2 Upon expiry of this Agreement or termination of this Agreement for any reason, the Agent shall immediately cease to: (i) provide the services described in clause 3; (ii) make use of any trademarks, marketing materials, or other intellectual property rights of GCM; or (iii) present itself as being an Agent of, or in any other way associated with GCM;\n\n6.3.3 The Agent shall, within twenty-one (21) days, securely destroy all stocks of any advertising or promotional material relating to the services, including any marketing materials that are in the possession of the Agent and any records stored about the services.\n\n6.3.4 The Agent shall immediately securely destroy or return to GCM (as instructed by GCM) any Contact Data that the Agent has collected (in any form) in performing the services;\n\n6.3.5 The Agent shall have no claim against GCM for compensation for loss of agency rights, loss of goodwill, or any similar loss; and\n\n6.3.6 Upon expiry of this Agreement or any termination under Clause 6.2.1 any commission properly due and payable to the Agent under Clause 5 about ongoing program fees paid by students to GCM after the date of such termination or expiry ("Outstanding Charges") shall continue to be payable by GCM subject to the Agent's compliance with the surviving terms of this Agreement set out in Clause 6.3.8.\n\n6.3.7 In the event of termination of this Agreement by GCM under Clause 6.2.2, Commissions for students already recruited and enrolled before termination shall remain payable to the Agent.\n\n6.3.8 The termination or expiry of this Agreement for any reason shall not affect any provision of this Agreement which is expressed to survive or operate in the event of termination, including Clauses 3.9 and 6, and any rights of any party which may have accrued by, at or up to the date of such expiry or termination.\n\n6.4 No Partnership or Agency. Nothing in this Agreement shall create or be deemed to create a partnership, relationship of agency, or the relationship of employer and employee between the parties.\n\n6.5 Force Majeure. 6.5.1 If either party is affected by Force Majeure (any unforeseeable and insuperable event affecting the carrying out of this Agreement by either Party) it shall forthwith notify the other parties of the nature and extent of the Force Majeure.\n\n6.5.2 No party shall be deemed in breach of this Agreement or otherwise be liable to the other parties because of any delay in performance or non-performance of any of its obligations hereunder to the extent that such delay or non-performance is due to any Force Majeure, and the time for performance of that obligation shall be extended accordingly.\n\n6.6 Waiver. No waiver of any breach of any condition of this Agreement shall be binding unless the same shall be in writing and signed by the party waiving the such breach.\n\n6.7 Notices. 6.7.1 Any formal notice or communication between the parties thereto must be in writing. In the event of any dispute, the English text of such notice or other communication between the parties hereto shall prevail to the extent of any inconsistency.\n\n6.8 Assignment. This Agreement shall be binding upon the successors and assignees of both parties, but no assignation, voluntary or by operation of law, shall be binding upon either of the parties hereto without the written consent of the other party.\n\n6.9 Governing Law and Jurisdiction. 6.9.1 This Agreement shall be governed by Maltese law and the parties prorogate the exclusive jurisdiction of the Maltese courts in respect of any dispute hereunder." }
        ]
      : [
          { id: "1", title: "1. PURPOSE & APPOINTMENT", text: "1.1 The Institution appoints the Agent to recruit qualified prospective students in the agreed territory, and the Agent accepts this appointment under the terms of this Agreement." },
          { id: "2", title: "2. COMMISSION TERMS", text: "2.1 Commission rate is as specified herein. Payout is processed upon complete tuition payment and enrollment verification." },
          { id: "3", title: "3. COMPLIANCE & LEGAL DUTIES", text: "3.1 The Agent must act at all times with complete professional integrity, adhere to visa submission standards, and accurately represent the Institution's programs." },
          { id: "4", title: "4. TERM & TERMINATION", text: "4.1 This Agreement is active for the specified duration and may be terminated by either party with sixty (60) days advance written notice." }
        ]

    const defaults: InstitutionalAgreementSettings = {
      institutionId: customId,
      title: title,
      commissionAmount: commAmount,
      commissionCurrency: commCurrency,
      agreementDuration: duration,
      visaRefusalFee: refusalFee,
      additionalTerms: additionalTerms,
      parameters: parameters,
      preamble: preamble,
      clauses: clauses,
      witnessWhereOf: "IN WITNESS WHEREOF, the parties hereto have executed this Agreement in duplicate as follows:",
      signatures: {
        institution: `For and on behalf of ${profile?.fullName || 'the Institution'}\nSignature & Company Seal:\nName: ${profile?.fullName || ''}\nDate:`,
        agent: "For and on behalf of the Agent\nSignature & Company Seal:\nName: {{NAME_OF_SIGNATORY}}\nPosition: {{POSITION}}\nDate: {{DATE}}"
      },
      schedule1: {
        title: "Schedule 1 - Commission Schedule",
        table: isGlobalCollegeMalta 
          ? [
              { program: "All other UG, Bachelor (first year only), and PG Degree Programs", rate: "€1200" },
              { program: "In case of visa refusal for a student who paid all one-time fees + tuition fees", rate: "€100" }
            ]
          : [
              { program: "All Degree Programs", rate: `${commCurrency === 'EUR' ? '€' : '£'}${commAmount}` }
            ],
        note: isGlobalCollegeMalta 
          ? "It is the responsibility of the Agent to ensure that the Agent reference number is given when applying using the GCM application service. No commission will be paid against any student whose application does not show the agent reference. For the avoidance of doubt, these commission payments are one-off and not cumulative. Payments will only be made in respect of students who have enrolled in a program where a commission is due. Payment of all sums due by GCM will be made in EURO (at the exchange rate prevailing at the time of processing the invoice). *No commission is paid for the student: a) Who withdraws within the first month of the program Or b) Absconding after obtaining a student visa"
          : "Commission will be processed and disbursed upon receipt of registration verification and enrollment requirements."
      },
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || 'system'
    }

    try {
      await setDoc(doc(db, 'institution_agreements', customId), defaults)
      setSettings(defaults)
    } catch (err) {
      console.error("Error initializing defaulted data for university:", err)
    }
  }

  useEffect(() => {
    if (selectedRequest) {
      if (selectedRequest.status === 'signed' && selectedRequest.institutionDetails) {
        setUniFormData({
          representativeName: selectedRequest.institutionDetails.representativeName || '',
          position: selectedRequest.institutionDetails.position || '',
          date: selectedRequest.institutionDetails.date || new Date().toISOString().split('T')[0],
          signatureUrl: selectedRequest.institutionDetails.signatureUrl || '',
          sealUrl: selectedRequest.institutionDetails.sealUrl || '',
        })
      } else {
        setUniFormData({
          representativeName: profile?.fullName || '',
          position: profile?.jobTitle || '',
          date: new Date().toISOString().split('T')[0],
          signatureUrl: '',
          sealUrl: '',
        })
      }
    }
  }, [selectedRequest, profile])

  const getPrebuiltHtmlPreview = (): string => {
    if (!selectedRequest) return ''
    if (selectedRequest.finalHtml) {
      return selectedRequest.finalHtml
    }
    if (selectedRequest.agentSignedHtml) {
      let html = selectedRequest.agentSignedHtml
      
      const repName = uniFormData.representativeName 
        ? uniFormData.representativeName.toUpperCase() 
        : '<span class="text-xs text-amber-700 font-bold uppercase italic tracking-wide">[Awaiting Representative Name]</span>'
      
      const position = uniFormData.position 
        ? uniFormData.position.toUpperCase() 
        : '<span class="text-xs text-amber-700 font-bold uppercase italic tracking-wide">[Awaiting Representative Position]</span>'
      
      let dateStr = ''
      try {
        dateStr = uniFormData.date 
          ? new Date(uniFormData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() 
          : ''
      } catch (e) {
        dateStr = ''
      }
      if (!dateStr) {
        dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
      }

      const sigHtml = uniFormData.signatureUrl 
        ? `<img src="${uniFormData.signatureUrl}" style="max-height: 70px; max-width: 160px; object-fit: contain; display: block; margin: auto;" alt="University Signature" />`
        : '<span class="text-xs text-amber-700 font-bold uppercase italic tracking-wide">[Awaiting University Signature]</span>'
      
      const sealHtml = uniFormData.sealUrl 
        ? `<img class="university-seal-img" src="${uniFormData.sealUrl}" style="max-height: 138px; max-width: 175px; width: 138px; height: 138px; object-fit: contain; display: block; margin: auto;" alt="University Seal" />`
        : '<span class="text-xs text-amber-700 font-bold uppercase italic tracking-wide">[Optional Seal Pending]</span>'

      const replacements: Record<string, string> = {
        '{{UNIVERSITY_NAME}}': profile?.fullName?.toUpperCase() || 'UNIVERSITY',
        '{{UNIVERSITY_REP_NAME}}': repName,
        '{{UNIVERSITY_REP_POSITION}}': position,
        '{{UNIVERSITY_DATE}}': dateStr,
        '{{UNIVERSITY_SIGNATURE}}': sigHtml,
        '{{UNIVERSITY_SEAL}}': sealHtml
      }

      Object.entries(replacements).forEach(([key, value]) => {
        html = html.split(key).join(value)
      })

      return html
    }
    return ''
  }

  useEffect(() => {
    if (!institutionId) return

    const unsubSettings = onSnapshot(doc(db, 'institution_agreements', institutionId), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as InstitutionalAgreementSettings)
      } else {
        if (user) {
          initializeUniversityData(institutionId)
        }
      }
      setLoading(false)
    }, (error) => {
      console.error("Error listening to agreement settings:", error)
      setLoading(false)
    })

    const q = query(
      collection(db, 'agreements'), 
      where('universityId', '==', institutionId)
    )
    const unsubRequests = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Request[]
      setRequests(fetched)
    }, (error) => {
      console.error("Error listening to agreements requests:", error)
    })

    return () => {
      unsubSettings()
      unsubRequests()
    }
  }, [institutionId])

  const handleSaveSettings = async (overrideSettings?: InstitutionalAgreementSettings) => {
    const dataToSave = overrideSettings || settings
    if (!dataToSave) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'institution_agreements', institutionId), {
        ...dataToSave,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      })
      toast.success('Agreement settings updated successfully!')
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'agreement settings')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'agreements', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      toast.success(`Agreement ${newStatus.replace('_', ' ')} successfully`)
      setSelectedRequest(null)
    } catch (error) {
      console.error('Error updating agreement:', error)
      toast.error('Failed to update agreement')
      handleFirestoreError(error, OperationType.UPDATE, `agreements/${id}`)
    }
  }

  const handleDeleteRequest = async (e: React.MouseEvent, request: any) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this agreement request? This action cannot be undone.')) return
    
    const id = request.id
    const agentId = request.agentId

    try {
      await deleteDoc(doc(db, 'agreements', id))
      
      const q = query(
        collection(db, 'partnershipRequests'),
        where('agentId', '==', agentId),
        where('universityId', '==', institutionId)
      )
      
      const pSnap = await getDocs(q)
      for (const pDoc of pSnap.docs) {
        await deleteDoc(pDoc.ref)
      }

      toast.success('Agreement request and all traces deleted successfully')
    } catch (error) {
      console.error('Error deleting agreement:', error)
      toast.error('Failed to delete agreement')
    }
  }

  const addOrUpdateParam = () => {
    if (!settings) return
    
    let updatedParams = [...(settings.parameters || [])]
    if (editingParam) {
      updatedParams = updatedParams.map(p => p.id === editingParam.id ? { ...p, ...newParam } : p)
    } else {
      updatedParams.push({ ...newParam, id: Date.now().toString() })
    }
    
    setSettings({ ...settings, parameters: updatedParams })
    setIsParamModalOpen(false)
    setEditingParam(null)
    setNewParam({ key: '', value: '', description: '' })
  }

  const handleFinalizeAgreement = async () => {
    if (!selectedRequest || !uniFormData.signatureUrl || !uniFormData.sealUrl) {
      toast.error('Please provide both your representative signature and university seal to finalize the agreement')
      return
    }

    setSaving(true)
    const toastId = toast.loading('Finalizing and counter-signing agreement...')

    try {
      let finalHtml = selectedRequest.agentSignedHtml || settings?.agreement_template || ''
      
      if (finalHtml) {
        const replacements = {
          '{{UNIVERSITY_NAME}}': profile?.fullName?.toUpperCase() || 'UNIVERSITY',
          '{{UNIVERSITY_REP_NAME}}': uniFormData.representativeName.toUpperCase(),
          '{{UNIVERSITY_REP_POSITION}}': uniFormData.position.toUpperCase(),
          '{{UNIVERSITY_DATE}}': new Date(uniFormData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
          '{{UNIVERSITY_SIGNATURE}}': `<img src="${uniFormData.signatureUrl}" style="max-height: 70px; max-width: 160px; object-fit: contain; display: block; margin: auto;" alt="University Signature" />`,
          '{{UNIVERSITY_SEAL}}': uniFormData.sealUrl ? `<img class="university-seal-img" src="${uniFormData.sealUrl}" style="max-height: 138px; max-width: 175px; width: 138px; height: 138px; object-fit: contain; display: block; margin: auto;" alt="University Seal" />` : ''
        }

        Object.entries(replacements).forEach(([key, value]) => {
          finalHtml = finalHtml.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
        })
      }

      if (selectedRequest.id) {
        await updateDoc(doc(db, 'agreements', selectedRequest.id), {
          status: 'signed',
          institutionDetails: {
            ...uniFormData,
            signedDate: serverTimestamp(),
          },
          finalHtml: finalHtml,
          updatedAt: serverTimestamp(),
        })

        toast.success('Agreement finalized and successfully counter-signed!', { id: toastId })
        setSelectedRequest(null)
      }
    } catch (err) {
      console.error("Error finalizing agreement:", err)
      toast.error('Failed to finalize agreement', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const removeParam = (id: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      parameters: (settings.parameters || []).filter(p => p.id !== id)
    })
  }

  const addClause = () => {
    if (!settings) return
    const newClause = { id: Date.now().toString(), title: `New Clause`, text: '' }
    setSettings({ ...settings, clauses: [...(settings.clauses || []), newClause] })
    setEditingClauseId(newClause.id)
  }

  const updateClause = (id: string, updates: any) => {
    if (!settings) return
    setSettings({
      ...settings,
      clauses: (settings.clauses || []).map(c => c.id === id ? { ...c, ...updates } : c)
    })
  }

  const removeClause = (id: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      clauses: (settings.clauses || []).filter(c => c.id !== id)
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-grad-card-bg rounded-2xl border border-grad-border">
        <Clock className="text-blue-100 animate-spin mb-4" size={48} />
        <p className="text-grad-text-sub opacity-80 font-bold uppercase tracking-widest text-xs">Loading Agreement Config...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex p-1.5 bg-slate-100/80 rounded-[1.25rem] border border-slate-200/60 backdrop-blur-sm w-fit gap-1">
        {[
          { id: 'settings', label: 'Master Config', icon: Settings },
          { id: 'requests', label: 'Active Proposals', icon: FileSignature },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'bg-white text-grad-blue shadow-sm' 
                  : 'text-grad-text-sub hover:text-grad-text-main'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.id === 'requests' && requests.filter(r => r.status === 'new').length > 0 && (
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-grad-blue opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-grad-blue"></span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeView === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-grad-card-bg p-6 md:p-8 rounded-2xl border border-grad-border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                <FileSignature size={200} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Building2 size={12} /> Agreement Title
                  </label>
                  <input 
                    type="text" 
                    value={settings?.title || ''}
                    onChange={(e) => updateSettingField('title', e.target.value)}
                    className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main text-sm"
                    placeholder="e.g. AGENCY AGREEMENT"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Clock size={12} /> Default Duration
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={settings?.agreementDuration || ''}
                      onChange={(e) => updateSettingField('agreementDuration', e.target.value)}
                      className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main text-sm"
                      placeholder="e.g. 1 Year"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-grad-text-sub opacity-40 pointer-events-none">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Coins size={12} /> Commission Amount ({settings?.commissionCurrency || 'EUR'})
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={settings?.commissionAmount || ''}
                      onChange={(e) => updateSettingField('commissionAmount', e.target.value)}
                      className="flex-1 px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main text-sm"
                      placeholder="e.g. 1200"
                    />
                    <select
                      value={settings?.commissionCurrency || 'EUR'}
                      onChange={(e) => updateSettingField('commissionCurrency', e.target.value)}
                      className="w-24 px-4 py-3 bg-grad-bg border border-grad-border rounded-xl font-bold text-grad-text-main text-sm outline-none"
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>{curr.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <ShieldCheck size={12} /> Visa Refusal Fee (Admin Charge)
                  </label>
                  <input 
                    type="text" 
                    value={settings?.visaRefusalFee || ''}
                    onChange={(e) => updateSettingField('visaRefusalFee', e.target.value)}
                    className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main text-sm"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>

              <div className="space-y-1.5 mb-8">
                 <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">Additional Terms & Important Notes</label>
                 <textarea 
                    rows={3}
                    value={settings?.additionalTerms || ''}
                    onChange={(e) => updateSettingField('additionalTerms', e.target.value)}
                    className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main text-sm resize-none"
                    placeholder="Enter any specific exclusion clauses or payment conditions..."
                 />
              </div>

              <div className="bg-grad-bg p-5 rounded-2xl border border-grad-border border-dashed group/upload hover:bg-grad-bg transition-all cursor-pointer relative overflow-hidden">
                {saving && (
                  <div className="absolute inset-0 bg-grad-card-bg/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                    <Clock className="text-grad-blue animate-spin mb-2" size={24} />
                    <p className="text-[10px] font-black text-grad-blue uppercase tracking-widest">Analysing Document...</p>
                  </div>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  id="agreement-upload" 
                  accept=".pdf,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    setSaving(true)
                    const toastId = toast.loading(`Uploading and parsing ${file.name}...`)
                    
                    try {
                      const reader = new FileReader()
                      reader.readAsDataURL(file)
                      reader.onload = async () => {
                        const base64Data = (reader.result as string).split(',')[1]
                        
                        const response = await fetch('/api/parse-agreement-template', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            fileData: base64Data,
                            mimeType: file.type || 'application/pdf',
                            fileName: file.name
                          })
                        })
                        
                        if (!response.ok) throw new Error('Failed to parse agreement')
                        
                        const result = await response.json()
                        
                        if (result.html) {
                          const updatedSettings = { 
                            ...settings!, 
                            templateName: file.name,
                            agreement_template: result.html
                          }
                          setSettings(updatedSettings)
                          toast.success(`Agreement content extracted from ${file.name}`, { id: toastId })
                          handleSaveSettings(updatedSettings)
                        }
                      }
                    } catch (err) {
                      console.error("Upload error:", err)
                      toast.error("Failed to process file", { id: toastId })
                    } finally {
                      setSaving(false)
                    }
                  }}
                />
                <label htmlFor="agreement-upload" className="flex flex-col items-center justify-center gap-4 cursor-pointer">
                  <div className="w-16 h-16 bg-grad-card-bg rounded-xl shadow-sm flex items-center justify-center text-grad-text-sub opacity-40 group-hover/upload:text-grad-blue group-hover/upload:shadow-md transition-all">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-grad-text-main">
                      {settings?.templateName ? `Current File: ${settings.templateName}` : 'Upload Official Agreement Template'}
                    </p>
                    <p className="text-[10px] text-grad-text-sub opacity-80 font-bold uppercase mt-1 tracking-wider">PDF or Word Documents under 10MB</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-6">
                <button 
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="px-8 py-3 bg-grad-blue text-white rounded-xl font-black text-sm hover:bg-grad-blue/90 shadow-xl shadow-grad-blue/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Partnership Configuration'} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-black/60 border-none p-8 rounded-2xl shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <ShieldCheck size={180} />
               </div>
               <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                 <ShieldCheck size={20} className="text-emerald-700" /> Compliance Guide
               </h3>
               <div className="space-y-4">
                  {[
                    "Standardise your recruitment commission to reduce negotiation overhead.",
                    "Define clear visa refusal admin fees to manage application costs.",
                    "Agreement validity periods are automatically calculated from signature date.",
                    "Uploaded templates are directly accessible by verified agent partners upon request."
                  ].map((text, i) => (
                    <div key={i} className="flex gap-2">
                       <span className="shrink-0 w-1.5 h-1.5 bg-status-success-text rounded-full mt-2" />
                       <p className="text-xs text-grad-text-sub opacity-40 font-medium leading-relaxed">{text}</p>
                    </div>
                  ))}
               </div>
               <button className="w-full mt-10 py-3 bg-status-success-text hover:bg-status-success-text text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-status-success-text/40">
                  View Full Compliance Policy
               </button>
            </div>

            <div className="bg-grad-card-bg p-8 rounded-2xl border border-grad-border shadow-sm overflow-hidden relative">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-grad-text-main font-outfit">History</h3>
                  <Clock size={20} className="text-grad-text-sub opacity-40" />
               </div>
               <div className="space-y-6">
                  <div className="flex gap-4 relative">
                     <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-grad-blue text-[10px] font-black z-10 border border-white ring-4 ring-grad-border">01</div>
                     <div className="flex-1 pb-6 border-l-2 border-grad-border pl-4 ml-[-20px] pt-1">
                        <p className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest mb-1">Today</p>
                        <p className="text-xs font-bold text-grad-text-main">Commission updated to €{settings?.commissionAmount}</p>
                     </div>
                  </div>
                  <div className="flex gap-4 relative opacity-60">
                     <div className="shrink-0 w-8 h-8 rounded-full bg-grad-bg flex items-center justify-center text-grad-text-sub opacity-80 text-[10px] font-black z-10 border border-white ring-4 ring-grad-border">02</div>
                     <div className="flex-1 pb-6 border-l-2 border-grad-border pl-4 ml-[-20px] pt-1">
                        <p className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest mb-1">Last Week</p>
                        <p className="text-xs font-bold text-grad-text-main">Visa refusal fee established</p>
                     </div>
                  </div>
                  <div className="flex gap-4 relative opacity-40">
                     <div className="shrink-0 w-8 h-8 rounded-full bg-grad-bg flex items-center justify-center text-grad-text-sub opacity-40 text-[10px] font-black z-10 border border-white ring-4 ring-grad-border">03</div>
                     <div className="flex-1 pl-4 ml-[-20px] pt-1">
                        <p className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest mb-1">May 2026</p>
                        <p className="text-xs font-bold text-grad-text-main">Agreement system initialized</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
              <div>
                 <h2 className="text-xl font-black text-grad-text-main font-outfit tracking-tight">Agreement Requests</h2>
                 <p className="text-grad-text-sub opacity-80 text-[11px] font-bold mt-0.5">Review and manage partnership proposals from your recruitment network</p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="px-3 py-2 bg-grad-bg border border-grad-border rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-grad-blue rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-grad-text-sub uppercase tracking-widest">Live Feed active</span>
                 </div>
              </div>
           </div>

           <div className="bg-grad-card-bg rounded-2xl border border-grad-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-grad-bg border-b border-grad-border">
                      <th className="py-3 px-4 text-[9px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest">Partner Agent</th>
                      <th className="py-3 px-4 text-[9px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest">Representative Name</th>
                      <th className="py-3 px-4 text-[9px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest">Requested Date</th>
                      <th className="py-3 px-4 text-[9px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest">Commission / Terms</th>
                      <th className="py-3 px-4 text-[9px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest">Status</th>
                      <th className="py-3 px-4 text-[9px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grad-border">
                    {requests.map(request => (
                      <tr 
                        key={request.id} 
                        onClick={() => router.push('/agreements/review/' + request.id)}
                        className="hover:bg-grad-bg/50 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-grad-bg rounded-lg flex items-center justify-center text-grad-text-sub opacity-80 group-hover:bg-blue-50 group-hover:text-grad-blue transition-colors shrink-0">
                              <Building2 size={16} />
                            </div>
                            <div>
                              <p className="font-extrabold text-grad-text-main font-outfit text-[13px] group-hover:text-grad-blue transition-colors">{request.agentName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-[11px] text-grad-text-sub font-bold flex items-center gap-1">
                            <User size={11} className="text-grad-text-sub opacity-80 shrink-0" />
                            {request.agentDetails?.representativeName || 'Representative N/A'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-[11px] text-grad-text-sub font-bold flex items-center gap-1">
                            <Calendar size={11} className="text-grad-text-sub opacity-80 shrink-0" />
                            {request.createdAt?.toDate()?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || 'Recently'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-[11px] text-grad-text-sub font-bold flex items-center gap-1">
                            <Coins size={11} className="text-grad-text-sub opacity-80 shrink-0" />
                            {request.terms?.commissionRate || settings?.commissionAmount + ' ' + settings?.commissionCurrency}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={"inline-flex px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider items-center gap-1 " + (
                            request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            request.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          )}>
                            <span className={"w-1 h-1 rounded-full " + (
                              request.status === 'approved' ? 'bg-status-success-text' :
                              request.status === 'rejected' ? 'bg-status-needsattn-text' :
                              'bg-status-pending-text'
                            )} />
                            {request.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); router.push('/agreements/review/' + request.id) }}
                              className="px-2.5 py-2 bg-grad-bg text-grad-text-sub rounded-lg font-bold text-[10px] hover:bg-grad-bg transition-all flex items-center gap-1.5 border border-grad-border cursor-pointer"
                            >
                              <FileText size={10} /> View
                            </button>
                            <button 
                              onClick={(e) => handleDeleteRequest(e, request)} 
                              className="px-2.5 py-2 bg-red-50/50 text-red-700 rounded-lg font-bold text-[10px] hover:bg-red-50 transition-all flex items-center gap-1.5 border border-red-200/50 cursor-pointer"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                            {request.status === 'new' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(request.id, 'under_review'); }}
                                className="px-2.5 py-2 bg-grad-blue text-white rounded-lg font-bold text-[10px] hover:bg-grad-blue/90 transition-all cursor-pointer"
                              >
                                Review
                              </button>
                            )}
                            {request.status === 'under_review' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); router.push('/agreements/review/' + request.id) }}
                                className="px-2.5 py-2 bg-status-success-text text-white rounded-lg font-bold text-[10px] hover:bg-status-success-text transition-all cursor-pointer"
                              >
                                Action
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {requests.length === 0 && (
                <div className="py-24 bg-grad-bg/50 rounded-[3rem] border-2 border-dashed border-grad-border flex flex-col items-center justify-center text-center m-6">
                  <div className="w-20 h-20 bg-grad-card-bg rounded-2xl shadow-sm flex items-center justify-center text-grad-text-sub opacity-40 mb-6 border border-grad-border animate-pulse">
                    <FileSignature size={40} />
                  </div>
                  <h4 className="text-grad-text-main font-black text-lg mb-2">No Requests Found</h4>
                  <p className="text-grad-text-sub opacity-80 max-w-xs text-sm font-medium">When agents sign your agreement template, their partnership requests will appear here for review.</p>
                </div>
              )}
            </div>
        </div>
      )}

      <AnimatePresence>
        {isParamModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setIsParamModalOpen(false)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-md bg-grad-card-bg rounded-2xl shadow-2xl overflow-hidden"
             >
                <div className="p-8 pb-0">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-grad-blue">
                        <Settings size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-grad-text-main font-outfit tracking-tight">{editingParam ? 'Edit Parameter' : 'New Parameter'}</h3>
                        <p className="text-xs text-grad-text-sub opacity-80 font-bold uppercase tracking-widest mt-0.5">Advanced Contract Logic</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">Parameter Key</label>
                      <input 
                        type="text" 
                        value={newParam.key}
                        onChange={e => setNewParam({ ...newParam, key: e.target.value })}
                        className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main"
                        placeholder="e.g. Early Bird Discount"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">Parameter Value</label>
                      <input 
                        type="text" 
                        value={newParam.value}
                        onChange={e => setNewParam({ ...newParam, value: e.target.value })}
                        className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main"
                        placeholder="e.g. 5%"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">Description (Optional)</label>
                      <input 
                        type="text" 
                        value={newParam.description}
                        onChange={e => setNewParam({ ...newParam, description: e.target.value })}
                        className="w-full px-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg focus:ring-4 focus:ring-grad-blue focus:border-grad-blue outline-none transition-all font-bold text-grad-text-main"
                        placeholder="Detail the use case for this parameter..."
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 flex gap-4">
                  <button 
                    onClick={() => setIsParamModalOpen(false)}
                    className="flex-1 py-4 bg-grad-bg text-grad-text-sub rounded-xl font-black text-xs hover:bg-grad-border transition-all font-black"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addOrUpdateParam}
                    className="flex-2 py-4 bg-grad-blue text-white rounded-xl font-black text-xs hover:bg-grad-blue/90 shadow-xl shadow-blue-200/50 transition-all font-black"
                  >
                    {editingParam ? 'Save Changes' : 'Create Parameter'}
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {false && selectedRequest && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedRequest(null)}
          >
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-4xl bg-grad-card-bg rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[90vh]"
               onClick={e => e.stopPropagation()}
             >
                <div className="p-8 border-b border-grad-border shrink-0 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-grad-blue rounded-xl">
                         <Building2 size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-grad-text-main font-outfit tracking-tight">Agent Partnership Proposal</h3>
                         <p className="text-grad-text-sub opacity-80 text-xs font-bold uppercase tracking-widest mt-0.5">Submitted by {selectedRequest.agentName}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-grad-bg rounded-xl text-grad-text-sub opacity-80">
                      <XCircle size={24} />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest border-b border-grad-border pb-4">Agent Credentials</h4>
                         <div className="space-y-4">
                            <div>
                               <p className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase mb-1">Company</p>
                               <p className="font-bold text-grad-text-main font-outfit">{selectedRequest.agentDetails?.companyName}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase mb-1">Signatory</p>
                               <p className="font-bold text-grad-text-main font-outfit">{selectedRequest.agentDetails?.representativeName} ({selectedRequest.agentDetails?.position})</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase mb-1">Physical Address</p>
                               <p className="font-bold text-grad-text-main font-outfit text-sm">{selectedRequest.agentDetails?.address || 'Not specified'}</p>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest border-b border-grad-border pb-4">Contract Finalization</h4>
                         
                         <div className="space-y-4">
                           <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">Counter-Signatory</label>
                             <div className="relative">
                               <User className="absolute left-4 top-1/2 -translate-y-1/2 text-grad-text-sub opacity-40" size={16} />
                               <input 
                                 type="text" 
                                 value={uniFormData.representativeName}
                                 onChange={e => setUniFormData({...uniFormData, representativeName: e.target.value})}
                                 className="w-full pl-10 pr-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg outline-none transition-all font-bold text-grad-text-main text-sm"
                               />
                             </div>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">Position</label>
                              <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-grad-text-sub opacity-40" size={16} />
                                <input 
                                  type="text" 
                                  value={uniFormData.position}
                                  onChange={e => setUniFormData({...uniFormData, position: e.target.value})}
                                  className="w-full pl-10 pr-4 py-3 bg-grad-bg border border-grad-border rounded-xl focus:bg-grad-card-bg outline-none transition-all font-bold text-grad-text-main text-sm"
                                />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <div className="flex items-center justify-between pl-1">
                                 <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest">Your Signature</label>
                                 <div className="flex bg-grad-bg p-4 rounded-xl">
                                   <button 
                                     onClick={() => setUniSignatureType('draw')}
                                     className={`px-2 py-0.5 text-[8px] font-black rounded transition-all ${uniSignatureType === 'draw' ? 'bg-grad-card-bg text-grad-blue shadow-sm' : 'text-grad-text-sub opacity-80'}`}
                                   >
                                     DRAW
                                   </button>
                                   <button 
                                     onClick={() => setUniSignatureType('upload')}
                                     className={`px-2 py-0.5 text-[8px] font-black rounded transition-all ${uniSignatureType === 'upload' ? 'bg-grad-card-bg text-grad-blue shadow-sm' : 'text-grad-text-sub opacity-80'}`}
                                   >
                                     UPLOAD
                                   </button>
                                 </div>
                              </div>
                              
                              {uniSignatureType === 'draw' ? (
                                <SignaturePad 
                                   onSave={async (url) => {
                                     if (url) {
                                       const compressed = await compressImage(url, 280, 160)
                                       setUniFormData(prev => ({ ...prev, signatureUrl: compressed }))
                                     } else {
                                       setUniFormData(prev => ({ ...prev, signatureUrl: '' }))
                                     }
                                   }}
                                   onClear={() => setUniFormData(prev => ({ ...prev, signatureUrl: '' }))}
                                   savedSignature={uniFormData.signatureUrl}
                                 />
                              ) : (
                                <div className="relative group">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        const reader = new FileReader()
                                        reader.onloadend = async () => {
                                          const compressed = await compressImage(reader.result as string, 280, 160)
                                          setUniFormData(prev => ({ ...prev, signatureUrl: compressed }))
                                        }
                                        reader.readAsDataURL(file)
                                      }
                                    }}
                                    className="hidden" 
                                    id="uni-sig-upload"
                                  />
                                  <label 
                                    htmlFor="uni-sig-upload"
                                    className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all border-2 border-dashed ${uniFormData.signatureUrl ? 'border-emerald-200 bg-emerald-50/20' : 'border-grad-border bg-grad-bg hover:bg-grad-bg'}`}
                                  >
                                    {uniFormData.signatureUrl ? (
                                      <img src={uniFormData.signatureUrl} alt="Uploaded Signature" className="max-h-16 object-contain" />
                                    ) : (
                                      <>
                                        <Upload size={16} className="text-grad-text-sub opacity-40" />
                                        <p className="text-[10px] font-bold text-grad-text-sub opacity-80 uppercase">Upload Signature</p>
                                      </>
                                    )}
                                  </label>
                                </div>
                              )}
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest pl-1">University Seal (Optional)</label>
                              <input 
                                type="file" 
                                id="uni-seal-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const reader = new FileReader()
                                    reader.onloadend = async () => {
                                      const compressed = await compressImage(reader.result as string, 300, 300)
                                      setUniFormData(prev => ({ ...prev, sealUrl: compressed }))
                                    }
                                    reader.readAsDataURL(file)
                                  }
                                }}
                              />
                              <label htmlFor="uni-seal-upload" className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${uniFormData.sealUrl ? 'border-status-info-bg bg-blue-50/30' : 'border-grad-border hover:border-grad-blue/50 bg-grad-bg'}`}>
                                {uniFormData.sealUrl ? (
                                  <>
                                     <img src={uniFormData.sealUrl} alt="Uni Seal" className="max-h-12" />
                                     <span className="text-[10px] font-black text-grad-blue">CHANGE SEAL</span>
                                  </>
                                ) : (
                                  <>
                                     <Upload size={16} className="text-grad-text-sub opacity-40" />
                                     <span className="text-[10px] font-bold text-grad-text-sub uppercase">UPLOAD SEAL</span>
                                  </>
                                )}
                              </label>
                           </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-grad-text-sub opacity-80 uppercase tracking-widest border-b border-grad-border pb-4">Contract Review (Internal Template Mode)</h4>
                      <div className="bg-grad-card-bg p-12 rounded-2xl shadow-inner max-h-[500px] md:max-h-[700px] overflow-y-auto border border-grad-border custom-scrollbar prose prose-slate prose-legal max-w-none">
                         {selectedRequest.finalHtml || selectedRequest.agentSignedHtml ? (
                            <div 
                               className="agreement-content-preview"
                               dangerouslySetInnerHTML={{ __html: getPrebuiltHtmlPreview() }} 
                            />
                          ) : settings?.agreement_template ? (
                           <div 
                              className="agreement-content-preview"
                              dangerouslySetInnerHTML={{ __html: (() => {
                                   let content = settings.agreement_template.replace(/\{\{NAME\_OF\_CONSULTANCY\}\}/g, selectedRequest.agentDetails?.companyName || '[CONSULTANCY NAME]')
                                   const isGCM = institutionId === 'global-college-malta' || institutionId === 'gcm' || settings?.institutionId === 'global-college-malta'
                                   if (isGCM && content) {
                                     const patterns = [
                                       /<(?:h[1-6]|p|div)[^>]*>(?:\s*<[^>]+>\s*)*Schedule\s*1\s*[-–—:]*\s*(?:Commission|Program)[^]*$/i,
                                       /Schedule\s*1\s*[-–—:]*\s*Commission[^]*$/i,
                                       /<(?:h[1-6]|p|div)[^>]*>[^<]*Schedule\s*1[^<]*(?:<\/h[1-6]|<\/p|<\/div>)[^]*$/i
                                     ]
                                     let cleaned = false
                                     for (const pattern of patterns) {
                                       if (pattern.test(content)) {
                                         const index = content.search(pattern)
                                         if (index !== -1) {
                                           const truncatedPart = content.substring(index)
                                           if (/UG|Bachelor|PG|refusal|withdraws|Enrolled/i.test(truncatedPart)) {
                                             content = content.substring(0, index)
                                             cleaned = true
                                             break
                                           }
                                         }
                                       }
                                     }
                                     if (!cleaned) {
                                       const lastSchedule = content.lastIndexOf("Schedule 1")
                                       if (lastSchedule !== -1 && lastSchedule > content.length * 0.4) {
                                         const beforeStr = content.substring(0, lastSchedule)
                                         const lastTagOpen = beforeStr.lastIndexOf("<p")
                                         const lastHeaderOpen = beforeStr.lastIndexOf("<h")
                                         const cutIndex = Math.max(lastTagOpen, lastHeaderOpen)
                                         if (cutIndex !== -1 && cutIndex > content.length * 0.4) {
                                           const truncatedPart = content.substring(cutIndex)
                                           if (/UG|Bachelor|PG|refusal|withdraws/i.test(truncatedPart)) {
                                             content = content.substring(0, cutIndex)
                                           }
                                         }
                                       }
                                     }
                                   }
                                   if (isGCM && content) {
                                     content = content.replace(/<(h[1-6]|p|div)([^>]*?)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, text) => {
                                       const rawText = text.replace(/<[^>]*>/g, '').trim()
                                       const isSubClause = /^\d+\.\d+/.test(rawText) || /^\([a-z0-9]+\)/i.test(rawText) || /^[a-z]\)\s+/i.test(rawText)
                                       const isMainClause = /^\d+\.\s+[A-Z\s&_-]{3,}/.test(rawText) || /^[1-9]\.\s+[A-Za-z]/.test(rawText)
                                       
                                       if (isSubClause) {
                                         return `<p style="margin-left: 16px; margin-top: 8px; margin-bottom: 8px; text-transform: none; font-weight: normal; border-left: none !important; padding-left: 0 !important; color: #475569; text-align: justify; line-height: 1.6;">${text}</p>`
                                       } else if (isMainClause) {
                                         return `<h3 style="font-size: 15px; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em; color: #1e3a8a; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #3b82f6 !important; padding-left: 12px !important; display: block; line-height: 1.4;">${text}</h3>`
                                       }
                                       return match
                                     })
                                   }
                                   return content
                                 })() }} 
                           />
                         ) : (
                           <>
                             <h3 className="text-center font-bold mb-6 text-grad-text-main font-outfit border-b pb-4">{settings?.title || 'AGENCY AGREEMENT'}</h3>
                             <p className="mb-4">This Representative Agreement is made effective between <span className="font-bold">{profile?.fullName}</span> (Institution) and <span className="font-bold">{selectedRequest.agentName}</span> (Agent).</p>
                             <p className="mb-4">1. MISSION: The Agent shall perform recruitment services in accordance with the institutional quality handbook.</p>
                             <p className="mb-4">2. COMPENSATION: Payable as {selectedRequest.terms?.commissionRate || (settings?.commissionAmount + ' ' + settings?.commissionCurrency)} per student.</p>
                             <p className="mb-4">3. VALIDITY: Valid for {selectedRequest.terms?.duration || settings?.agreementDuration}.</p>
                           </>
                         )}
                         
                         <div className="mt-12 flex justify-between border-t pt-8">
                            <div>
                               <p className="text-[8px] uppercase font-bold text-grad-text-sub opacity-80 mb-8 tracking-widest">Institution counter-sign</p>
                               <div className="w-48 border-b border-grad-border h-10 border-dashed"></div>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] uppercase font-bold text-grad-text-sub opacity-80 mb-8 tracking-widest">Agent Digital Verification</p>
                               <p className="font-black text-grad-text-main font-outfit text-xs">{selectedRequest.agentDetails?.representativeName}</p>
                               <p className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">SIGNED VIA PORTAL</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-8 border-t border-grad-border bg-grad-bg/30 flex gap-4 shrink-0">
                  <button 
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                    className="flex-1 py-4 bg-grad-card-bg border border-grad-border text-red-700 rounded-xl font-black text-sm hover:bg-red-50 transition-all font-black border-2"
                  >
                    Reject Application
                  </button>
                  <button 
                    disabled={saving}
                    onClick={handleFinalizeAgreement}
                    className="flex-1 py-4 bg-status-success-text text-white rounded-xl font-black text-sm hover:bg-status-success-text shadow-xl shadow-status-success-text/20 transition-all font-black flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? 'Processing...' : 'Counter-Sign & Finalize Agreement'} <FileCheck size={18} />
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}