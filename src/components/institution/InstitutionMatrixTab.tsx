'use client'

import React, { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Pencil, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { db } from '@/lib/firebase'
import { CentralLoader } from '../dashboard/CentralLoader'
import { InstitutionDocRequirement, StudyLevel } from '@/types/institution'

interface InstitutionMatrixTabProps {
  institutionId: string
}

const STUDY_LEVELS: { key: StudyLevel; label: string }[] = [
  { key: 'diploma', label: 'Diploma' },
  { key: 'bachelor', label: 'Bachelor' },
  { key: 'master', label: 'Master' },
  { key: 'doctorate', label: 'PhD / Doctorate' }
]

const SortableItem = ({ req, idx, totalCount, toggleLevel, toggleMandatory, remove, startEdit, editingId, editForm, setEditForm, saveEdit, setEditingId, moveRequirement, allRequirements }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: req.docId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  if (editingId === req.docId) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Requirement Name</label>
          <input 
            type="text" 
            value={editForm?.displayName || ''} 
            onChange={(e) => setEditForm(prev => ({ ...prev!, displayName: e.target.value }))} 
            className="w-full p-2 text-xs sm:p-2.5 sm:text-sm font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Compliance Description</label>
          <textarea 
            value={editForm?.description || ''} 
            onChange={(e) => setEditForm(prev => ({ ...prev!, description: e.target.value }))} 
            className="w-full p-2 text-[11px] sm:p-2.5 sm:text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" 
            rows={2} 
          />
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={!!editForm?.isEitherOr} 
              onChange={(e) => setEditForm(prev => ({ 
                ...prev!, 
                isEitherOr: e.target.checked,
                eitherOrDocId: e.target.checked ? (prev?.eitherOrDocId || '') : '',
                eitherOrName: e.target.checked ? (prev?.eitherOrName || '') : ''
              }))} 
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" 
            />
            <span className="text-xs font-bold text-slate-700">Either/Or Alternative Document (e.g. English Language or MOI)</span>
          </label>
          
          {editForm?.isEitherOr && (
            <div className="space-y-1 pl-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Alternative Satisfying Document:</label>
              <select 
                value={editForm?.eitherOrDocId || ''} 
                onChange={(e) => {
                  const selectedId = e.target.value
                  const selectedName = allRequirements?.find((r: any) => r.docId === selectedId)?.displayName || ''
                  setEditForm(prev => ({ 
                    ...prev!, 
                    eitherOrDocId: selectedId,
                    eitherOrName: selectedName
                  }))
                }} 
                className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-700"
              >
                <option value="">-- Select Alternative Requirement --</option>
                {allRequirements
                  ?.filter((other: any) => other.docId !== req.docId)
                  ?.map((other: any) => (
                    <option key={other.docId} value={other.docId}>
                      {other.displayName}
                    </option>
                  ))
                }
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                If the student uploads either document, this mandatory criteria will be fulfilled.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end text-[11px] sm:text-xs pt-1">
          <button onClick={() => setEditingId(null)} className="px-2.5 py-1.5 font-medium text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => saveEdit(req.docId)} className="px-2.5 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Save Changes</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border ${req.isMandatory ? 'border-l-4 border-l-rose-500 border-slate-200 shadow-rose-50/50' : 'border-l-4 border-l-slate-300 border-slate-200'} rounded-xl p-3 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-xs hover:border-slate-300 transition-all`}>
      <div className="flex gap-2 sm:gap-3 items-start md:items-center">
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 p-1 sm:p-1.5 rounded hover:bg-slate-50" title="Drag to reorder">
            <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex flex-col gap-0.5 select-none">
            <button 
              type="button"
              onClick={() => moveRequirement(idx, 'up')} 
              disabled={idx === 0} 
              className="p-0.5 sm:p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded transition-all disabled:opacity-20 disabled:hover:bg-transparent shrink-0"
              title="Move up"
            >
              <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <button 
              type="button"
              onClick={() => moveRequirement(idx, 'down')} 
              disabled={idx === totalCount - 1} 
              className="p-0.5 sm:p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded transition-all disabled:opacity-20 disabled:hover:bg-transparent shrink-0"
              title="Move down"
            >
              <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0 flex-grow pr-2 sm:pr-4">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="truncate max-w-[120px] sm:max-w-xs">{req.displayName}</span>
                <span className="text-[8px] sm:text-[9px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded tracking-wide uppercase max-w-[90px] sm:max-w-[170px] truncate shrink-0" title={req.docId}>
                  {(() => {
                    if (req.docId.startsWith('inst_req_') || /^\d+$/.test(req.docId.replace('inst_req_', ''))) {
                      return req.displayName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
                    }
                    return req.docId.replace('GCM_', '').replace('gcm_req_', '').replace('inst_req_', '')
                  })()}
                </span>
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1 mt-0.5" title={req.description}>{req.description}</p>
              {req.isEitherOr && req.eitherOrDocId && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 select-none">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                    🔄 Either/Or Match
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Satisfied by either this OR <span className="text-blue-600 font-bold underline">{req.eitherOrName || req.eitherOrDocId}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 mt-2 md:mt-0 select-none flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 border-r border-slate-100 pr-2 sm:pr-3">
                <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${req.isMandatory ? 'text-rose-600' : 'text-slate-400'}`}>
                  {req.isMandatory ? 'Mandatory' : 'Optional'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleMandatory(idx)}
                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    req.isMandatory ? 'bg-rose-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      req.isMandatory ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <button 
                  onClick={() => startEdit(req)} 
                  title="Edit description"
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 sm:w-3.5 h-3 sm:h-3.5"/>
                </button>
                <button 
                  onClick={() => remove(req.docId)} 
                  title="Delete requirement"
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5"/>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-slate-50/80 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Enforce For:</span>
            <div className="flex gap-2 sm:gap-4 flex-wrap">
              {STUDY_LEVELS.map(level => (
                <label key={level.key} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-600 cursor-pointer hover:text-slate-900 select-none">
                  <input 
                    type="checkbox" 
                    checked={req.enabledLevels[level.key]} 
                    onChange={() => toggleLevel(idx, level.key)} 
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-1 focus:ring-offset-0 cursor-pointer transition-all shrink-0"
                  />
                  <span>{level.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InstitutionMatrixTab({ institutionId }: InstitutionMatrixTabProps) {
  const [requirements, setRequirements] = useState<InstitutionDocRequirement[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInstitutionalMatrix() {
      try {
        const docRef = doc(db, 'institution_matrices', institutionId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const loaded = docSnap.data().requirements || []
          const uniqueRequirements = Array.from(new Map(loaded.map((item: any) => [item.docId, item])).values()) as InstitutionDocRequirement[]
          setRequirements(uniqueRequirements)
          setLoading(false)
        } else {
          seedGCMData()
          setLoading(false)
        }
      } catch (err) {
        console.error("Failed fetching structural configs:", err)
        setLoading(false)
      }
    }
    loadInstitutionalMatrix()
  }, [institutionId])

  const [newReq, setNewReq] = useState({ displayName: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<InstitutionDocRequirement> | null>(null)

  const handleAiMatrixExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    const formData = new FormData()
    formData.append('matrixFile', file)
    formData.append('expectedType', 'admission')

    try {
      const response = await fetch('/api/compliance/extract-matrix', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      
      if (data.success) {
        const parsedItems: InstitutionDocRequirement[] = data.requirements.map((item: any, idx: number) => {
          let baseId = (item.displayName || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
          
          if (!baseId) {
            baseId = `REQ_${Date.now()}_${idx}`
          }

          let finalId = baseId
          finalId = `${baseId}_${idx}`

          return {
            docId: finalId,
            displayName: item.displayName || '',
            description: item.description || '',
            isMandatory: item.isMandatory ?? true,
            maxFileSize: item.maxFileSize || '5MB',
            allowedExtensions: item.allowedExtensions || ['.pdf'],
            enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true }
          }
        })
        setRequirements(prev => [...prev, ...parsedItems])
      } else {
        alert(`AI Ingestion Intercept: ${data.error}`)
      }
    } catch {
      alert('Transmission bridge failed parsing admission data rules.')
    } finally {
      setIsParsing(false)
    }
  }

  const addManualRequirement = () => {
    if (!newReq.displayName || !newReq.description) {
      alert("Please provide both a label and description")
      return
    }

    let baseId = newReq.displayName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
    
    if (!baseId) {
      baseId = `REQ_${Date.now()}`
    }

    let finalId = baseId
    let counter = 1
    while (requirements.some(r => r.docId === finalId)) {
      finalId = `${baseId}_${counter}`
      counter++
    }

    const requirement: InstitutionDocRequirement = {
      docId: finalId,
      ...newReq,
      isMandatory: true,
      maxFileSize: '5MB',
      allowedExtensions: ['.pdf'],
      enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true }
    }
    setRequirements(prev => [requirement, ...prev])
    setNewReq({ displayName: '', description: '' })
  }

  const seedGCMData = () => {
    const GCM_REQUIREMENTS: InstitutionDocRequirement[] = [
      { docId: "GCM_APPLICANT_CV", displayName: "Updated Curriculum Vitae (CV)", description: "A detailed, up-to-date professional résumé outlining your complete academic history, vocational milestones, and relevant employment context.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_CLASS_10_CERT", displayName: "Class 10 Certificate", description: "Official secondary education certificate.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_CLASS_12_CERT", displayName: "Class 12 Certificate", description: "Official higher secondary education certificate.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_BACHELOR_TRANSCRIPT", displayName: "Bachelor Transcript", description: "Official academic transcript of Bachelor's degree.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: false, bachelor: false, master: true, doctorate: true } },
      { docId: "GCM_BACHELOR_CERT", displayName: "Bachelor Certificate", description: "Official Bachelor's degree certificate.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: false, bachelor: false, master: true, doctorate: true } },
      { docId: "GCM_MASTER_TRANSCRIPT", displayName: "Master Transcript", description: "Official academic transcript of Master's degree.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: false, bachelor: false, master: false, doctorate: true } },
      { docId: "GCM_MASTER_CERT", displayName: "Master Certificate", description: "Official Master's degree certificate.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: false, bachelor: false, master: false, doctorate: true } },
      { docId: "GCM_MOI", displayName: "Medium of Instruction (MOI)", description: "Official letter from an institution confirming the medium of instruction was English.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_POLICE_CONDUCT", displayName: "Police Conduct Certificate", description: "A scanned copy of a valid, officially issued Police Conduct Certificate verifying a clean criminal record.", isMandatory: false, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_IDENT_PROOF", displayName: "Valid Passport or ID Card", description: "Clear scan of the passport bio-page or national ID card.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf", ".jpg", ".jpeg"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_ENGLISH_PROOF", displayName: "English Language Qualification", description: "Scanned copy of an approved English Language qualification showing minimum bands.", isMandatory: false, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_PERSONAL_STATEMENT", displayName: "Personal Statement", description: "A written essay/motivation letter outlining academic interest and suitability.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_RECOMMENDATION_LETTER", displayName: "Recommendation Letter", description: "Official reference letter evaluating the applicant's character and capabilities.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } },
      { docId: "GCM_ID_PHOTO", displayName: "Passport-Sized Photograph", description: "One high-quality digital scan of a standard passport-sized photograph.", isMandatory: true, maxFileSize: "5MB", allowedExtensions: [".pdf", ".jpg", ".jpeg"], enabledLevels: { diploma: true, bachelor: true, master: true, doctorate: true } }
    ]

    setRequirements(prev => {
        const existingIds = new Set(prev.map(r => r.docId))
        return [...prev, ...GCM_REQUIREMENTS.filter(r => !existingIds.has(r.docId))]
    })
  }

  const toggleStudyLevelGate = (index: number, level: StudyLevel) => {
    const updated = [...requirements]
    updated[index].enabledLevels[level] = !updated[index].enabledLevels[level]
    setRequirements(updated)
  }

  const toggleMandatoryStatus = (index: number) => {
    const updated = [...requirements]
    updated[index].isMandatory = !updated[index].isMandatory
    setRequirements(updated)
  }

  const handleRemoveRequirementRow = (docId: string) => {
    setRequirements(prev => prev.filter(item => item.docId !== docId))
  }

  const moveRequirement = (index: number, direction: 'up' | 'down') => {
    const updated = [...requirements]
    if (direction === 'up' && index > 0) {
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]]
    } else if (direction === 'down' && index < updated.length - 1) {
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    }
    setRequirements(updated)
  }

  const startEdit = (req: InstitutionDocRequirement) => {
    setEditingId(req.docId)
    setEditForm({ 
      displayName: req.displayName, 
      description: req.description,
      isEitherOr: req.isEitherOr || false,
      eitherOrDocId: req.eitherOrDocId || '',
      eitherOrName: req.eitherOrName || ''
    })
  }

  const saveEdit = (docId: string) => {
    if (!editForm) return
    setRequirements(prev => prev.map(r => r.docId === docId ? { ...r, ...editForm } : r))
    setEditingId(null)
    setEditForm(null)
  }

  const saveMatrixConfigurationToEcosystem = async () => {
    setIsSaving(true)
    try {
      await setDoc(doc(db, 'institution_matrices', institutionId), {
        institutionId,
        requirements,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      alert('Admission Matrix criteria synced live across global system pipelines successfully!')
    } catch (err) {
      alert('Failed saving configurations to central cluster registries.')
    } finally {
      setIsSaving(false)
    }
  }

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  
  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setRequirements((items) => {
        const oldIndex = items.findIndex(i => i.docId === active.id)
        const newIndex = items.findIndex(i => i.docId === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  if (loading) return <CentralLoader minHeight="p-6" />

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-10">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Requirement Matrix Builder</h2>
          <p className="text-sm text-slate-500">Configure admission documentation requirements and map them to specific student study tiers.</p>
        </div>
        <button 
          onClick={saveMatrixConfigurationToEcosystem}
          disabled={isSaving || requirements.length === 0}
          className={`font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all select-none ${
            requirements.length === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
          }`}
        >
          {isSaving ? 'Syncing...' : 'Save Matrix Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          {isParsing ? (
            <div className="space-y-3 py-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="font-semibold text-blue-600">Processing document...</p>
            </div>
          ) : (
            <label className="cursor-pointer block space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✨</span>
              </div>
              <p className="font-bold text-slate-900">AI Matrix Ingestion</p>
              <p className="text-xs text-slate-500 px-4">Upload guidelines or checklists to auto-generate requirements.</p>
              <input type="file" onChange={handleAiMatrixExtraction} accept=".pdf,.doc,.docx,.txt" className="hidden" />
            </label>
          )}
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <p className="font-bold text-slate-900">Manual Requirement</p>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Requirement Name" 
              value={newReq.displayName}
              onChange={(e) => setNewReq({...newReq, displayName: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            />
            <input 
              type="text" 
              placeholder="Requirement Description" 
              value={newReq.description}
              onChange={(e) => setNewReq({...newReq, description: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            />
            <button 
              onClick={addManualRequirement}
              className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Add Requirement
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 tracking-tight">Active Requirements</h3>
        
        {requirements.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50 text-slate-500">
            No requirements defined. Use the tools above to start building your matrix.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={requirements.map(r => r.docId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {requirements.map((req, idx) => (
                  <SortableItem 
                    key={req.docId} 
                    req={req} 
                    idx={idx} 
                    totalCount={requirements.length}
                    toggleLevel={toggleStudyLevelGate} 
                    toggleMandatory={() => toggleMandatoryStatus(idx)} 
                    remove={handleRemoveRequirementRow} 
                    startEdit={startEdit} 
                    editingId={editingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    saveEdit={saveEdit}
                    setEditingId={setEditingId}
                    moveRequirement={moveRequirement}
                    allRequirements={requirements}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

    </div>
  )
}