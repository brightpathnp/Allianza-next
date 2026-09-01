'use client'

import React, { useState, useEffect } from 'react'
import { getFullAgencyProfile, updateFullAgencyProfile, AgencyProfileFull } from '@/services/agencyService2'
import { toast } from 'sonner'
import { Search, Plus, X, UploadCloud, Shield, Check, Laptop, KeyRound, Camera } from 'lucide-react'
import { handleFirestoreError, OperationType } from '@/lib/authUtils'
import { CentralLoader } from './CentralLoader'

interface Settings2Props {
  profile?: any
  activeRole?: string
  userId?: string
}

export default function Settings2({ profile, activeRole, userId }: Settings2Props) {
  const [activeTab, setActiveTab] = useState<string>('General')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [dbSnapshot, setDbSnapshot] = useState<AgencyProfileFull | null>(null)
  const [formData, setFormData] = useState<Partial<AgencyProfileFull>>({})
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const suggestedMarkets = ['Nepal', 'India', 'Bangladesh', 'Sri Lanka', 'Bhutan', 'Pakistan', 'Maldives']
  const suggestedDestinations = ['UK', 'Australia', 'Malta', 'France', 'USA', 'Canada', 'Germany', 'New Zealand', 'Ireland']

  useEffect(() => {
    if (!userId || dbSnapshot) return

    async function loadConfigData() {
      try {
        let fetched: AgencyProfileFull | null = null
        if (userId) {
          try {
            fetched = await getFullAgencyProfile(userId)
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.GET, `users/${userId}`)
          }
        }
        
        const initialTemplate: AgencyProfileFull = {
          companyName: fetched?.companyName || profile?.companyName || profile?.agencyName || 'Vibe Global Pvt. Ltd.',
          email: fetched?.email || profile?.email || 'vibe.edu.np@gmail.com',
          usernameSlug: fetched?.usernameSlug || profile?.usernameSlug || 'vibe-global',
          phoneNumber: fetched?.phoneNumber || profile?.phoneNumber || '+977 91823042020',
          businessAddress: fetched?.businessAddress || profile?.address || 'Bagmati, KTM, Nepal',
          baseCountry: fetched?.baseCountry || profile?.country || 'Nepal',
          primaryRep: fetched?.primaryRep || profile?.rep1Name || profile?.fullName || 'Saugat Dhungel',
          repTitle: fetched?.repTitle || profile?.rep1Position || profile?.jobTitle || 'Director',
          secondaryRep: fetched?.secondaryRep || profile?.rep2Name || '',
          secondaryTitle: fetched?.secondaryTitle || profile?.rep2Position || '',
          sourceMarkets: fetched?.sourceMarkets || profile?.targetSourceMarkets || ['Nepal', 'India', 'Bangladesh', 'Sri Lanka'],
          preferredDestinations: fetched?.preferredDestinations || profile?.preferredDestinations || ['UK', 'Australia', 'Malta'],
          annualVolume: fetched?.annualVolume || profile?.recruitmentVolume || '0-50 Students',
          visaSuccessRate: fetched?.visaSuccessRate || profile?.visaSuccessRate || '97',
          documents: fetched?.documents || {
            businessRegistration: { fileName: 'BusinessRegistration.pdf', status: 'Verified' },
            panCertificate: { fileName: 'PAN_Certificate.pdf', status: 'Verified' },
            recruitmentLicense: { fileName: 'Recruitment_License.pdf', status: 'Pending Verification' },
            professionalCertificate: { fileName: '', status: 'Missing' }
          },
          references: fetched?.references || profile?.references?.map((r: any) => ({
            institutionName: r.institution || r.institutionName || '',
            refNamePosition: r.referee || r.refNamePosition || '',
            country: r.country || '',
            workEmail: r.email || r.workEmail || '',
            duration: r.duration || '3-6 Years'
          })) || [
            { institutionName: 'London Metropolitan University', refNamePosition: 'International Admissions Team', country: 'United Kingdom', workEmail: 'admissions@londonmet.ac.uk', duration: '3-6 Years' },
            { institutionName: 'Federation University Australia', refNamePosition: 'International Officers', country: 'Australia', workEmail: 'info@federation.edu.au', duration: '1-2 Years' }
          ],
          mfaEnabled: fetched?.mfaEnabled ?? profile?.mfaEnabled ?? false,
          activeDevice: fetched?.activeDevice || { engine: 'Chrome Workspace Engine', ip: '103.25.12.11', location: 'Kathmandu, NP' },
          profilePhotoUrl: fetched?.profilePhotoUrl || profile?.profilePhotoUrl || '',
          profilePhotoData: fetched?.profilePhotoData || profile?.profilePhotoData || ''
        }

        setDbSnapshot(initialTemplate)
        setFormData(initialTemplate)
      } catch (err) {
        console.error("Handshake error:", err)
        setToastMessage({ type: 'error', text: 'Error executing server handshake pipeline.' })
      } finally {
        setIsLoading(false)
      }
    }
    loadConfigData()
  }, [userId])

  const triggerSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    console.log("Saving formData (to-be-sent):", formData)
    try {
      if (userId) {
        try {
          await updateFullAgencyProfile(userId, formData as AgencyProfileFull)
          console.log("Update executed successfully")
          setDbSnapshot(formData as AgencyProfileFull)
          setToastMessage({ type: 'success', text: 'Cloud parameters synchronized smoothly.' })
          toast.success('Cloud parameters synchronized smoothly.')
        } catch (dbErr) {
          console.error("Firestore update error:", dbErr)
          handleFirestoreError(dbErr, OperationType.UPDATE, `users/${userId}`)
          setToastMessage({ type: 'error', text: 'Error executing cloud synchronization.' })
          toast.error('Error executing cloud synchronization.')
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  if (isLoading) {
    return <CentralLoader minHeight="p-24" />
  }

  return (
    <div className="space-y-8 font-sans antialiased text-[#1E293B] w-full">
      
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[300] px-5 py-4 rounded-xl border shadow-xl flex items-center gap-3 animate-bounce ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${toastMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <p className="text-xs font-bold tracking-tight">{toastMessage.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[24px] p-6 space-y-6 shadow-sm">
          
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-200/60">
            <div className="relative w-20 h-20">
              {isUploading ? (
                <div className="w-20 h-20 rounded-[24px] flex items-center justify-center bg-slate-100">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : formData.profilePhotoData || formData.profilePhotoUrl ? (
                <div className="w-20 h-20 rounded-[24px] bg-white border border-slate-200 flex items-center justify-center p-2 shadow-lg overflow-hidden">
                  <img src={formData.profilePhotoData || formData.profilePhotoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-[#0059E7] rounded-[24px] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-200/50">
                  {formData.companyName?.charAt(0)}
                </div>
              )}
              
              <label className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
                <Camera size={14} className="text-slate-600" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !userId) return
                    setIsUploading(true)
                    
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
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                            resolve(dataUrl)
                          }
                          img.onerror = () => reject(new Error("Failed to load image element"))
                        }
                        reader.onerror = () => reject(new Error("Failed to read selected file"))
                      })
                    }

                    try {
                      const compressedBase64 = await compressImage(file)
                      setFormData(prev => ({...prev, profilePhotoData: compressedBase64}))
                      await updateFullAgencyProfile(userId, { profilePhotoData: compressedBase64 })
                      toast.success("Profile photo updated in Firestore")
                    } catch (err: any) {
                      console.error("Upload error details:", err)
                      const msg = err.message || 'Unknown error'
                      toast.error(`Failed to upload photo: ${msg}`)
                    } finally {
                      setIsUploading(false)
                    }
                  }}
                />
              </label>
            </div>
            
            <h3 className="text-lg font-bold mt-4 text-[#1E293B] tracking-tight leading-tight px-2">
              {formData.companyName}
            </h3>
            
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1">
              Recruitment Agency
            </span>
            
            <div className="mt-4 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Account Verified
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Agency Fast Metrics
            </h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="font-semibold text-slate-500">Est. Annual Intake</span>
                <span className="font-bold text-[#1E293B]">{formData.annualVolume}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 px-3 bg-blue-50/40 border border-blue-100/50 rounded-xl">
                <span className="font-semibold text-slate-500">Visa Success Rate</span>
                <span className="font-black text-[#0059E7]">{formData.visaSuccessRate}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              System Integrations
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                <Check size={14} className="shrink-0" />
                <span>Audit Status Clear</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl">
                <Shield size={14} className="shrink-0" />
                <span>Signatory Keys Dynamic</span>
              </div>
            </div>
          </div>

        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-6">
          
          <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
            {['General', 'Recruitment Scope', 'Compliance', 'References', 'Account & Security'].map((tabName) => (
              <button
                type="button"
                key={tabName}
                onClick={() => setActiveTab(tabName)}
                className={`flex-1 text-center py-3 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tabName 
                    ? 'bg-white text-[#0059E7] shadow-sm border border-slate-200/40 font-extrabold' 
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {tabName}
              </button>
            ))}
          </div>

          <form onSubmit={triggerSave} className="space-y-6">
            
            {activeTab === 'General' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B]">Institutional Identification</h2>
                  <p className="text-xs text-slate-400 mt-1">Please update core registration fields. These values synchronize natively across system modules.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput 
                    label="Company Name (Read-only)" 
                    value={formData.companyName} 
                    disabled 
                  />
                  
                  <FormInput 
                    label="Email Address (Read-Only)" 
                    value={formData.email} 
                    disabled 
                  />
                  
                  <FormInput 
                    label="Contact Phone Number" 
                    value={formData.phoneNumber} 
                    onChange={(v) => setFormData({...formData, phoneNumber: v})} 
                  />
                  
                  <FormInput 
                    label="Business Address" 
                    value={formData.businessAddress} 
                    onChange={(v) => setFormData({...formData, businessAddress: v})} 
                  />
                  
                  <FormInput 
                    label="Company Base Country" 
                    value={formData.baseCountry} 
                    onChange={(v) => setFormData({...formData, baseCountry: v})} 
                  />
                </div>

                <div className="pt-6 border-t border-slate-200/80">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-1">Representative Personnel Details</h3>
                  <p className="text-xs text-slate-400 mb-6">Manage primary contacts and signing representatives for institutional alignments.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput 
                      label="Primary Representative (Rep 1)" 
                      value={formData.primaryRep} 
                      onChange={(v) => setFormData({...formData, primaryRep: v})} 
                    />
                    
                    <FormInput 
                      label="Rep 1 Title / Job Position" 
                      value={formData.repTitle} 
                      onChange={(v) => setFormData({...formData, repTitle: v})} 
                    />
                    
                    <FormInput 
                      label="Secondary Representative (Rep 2)" 
                      value={formData.secondaryRep || ''} 
                      placeholder="Representative 2 Name" 
                      onChange={(v) => setFormData({...formData, secondaryRep: v})} 
                    />
                    
                    <FormInput 
                      label="Rep 2 Title / Job Position" 
                      value={formData.secondaryTitle || ''} 
                      placeholder="e.g. Director of Admissions" 
                      onChange={(v) => setFormData({...formData, secondaryTitle: v})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Recruitment Scope' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B]">Recruitment Scope & Intake Flow</h2>
                  <p className="text-xs text-slate-400 mt-1">Define your core market scopes to customize agreement generators and program suggestions.</p>
                </div>
                
                <div className="space-y-6">
                  <TagSelector 
                    SectionTitle="Target Student Source Markets" 
                    ActiveTags={formData.sourceMarkets || []} 
                    SuggestedTags={suggestedMarkets} 
                    OnUpdate={(tags) => setFormData({...formData, sourceMarkets: tags})} 
                  />
                  
                  <TagSelector 
                    SectionTitle="Preferred Study Destinations" 
                    ActiveTags={formData.preferredDestinations || []} 
                    SuggestedTags={suggestedDestinations} 
                    OnUpdate={(tags) => setFormData({...formData, preferredDestinations: tags})} 
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        Annual Recruitment Volume
                      </label>
                      <select 
                        value={formData.annualVolume} 
                        onChange={(e) => setFormData({...formData, annualVolume: e.target.value})}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold text-[#1E293B] hover:bg-slate-100/30 focus:bg-white focus:border-[#0059E7] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                      >
                        <option>0-50 Students</option>
                        <option>51-150 Students</option>
                        <option>150+ Students</option>
                      </select>
                    </div>
                    
                    <FormInput 
                      label="Visa Success Rate (Historical)" 
                      value={formData.visaSuccessRate} 
                      onChange={(v) => setFormData({...formData, visaSuccessRate: v})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Compliance' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B]">Compliance & Certifications</h2>
                  <p className="text-xs text-slate-400 mt-1">Verify identity metrics. All uploaded certificates index natively into security checking pipelines.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(formData.documents || {}).map(([key, docObj]: [string, any]) => (
                    <div key={key} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/30 flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-[#1E293B] capitalize tracking-tight">
                            {key.replace(/([A-Z])/g, ' $1').trim()} (PDF)
                          </span>
                          
                          <span className={`text-[10px] px-2.5 py-1 font-bold rounded-md border ${
                            docObj.status === 'Verified' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : docObj.status === 'Pending Verification' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {docObj.status === 'Verified' ? 'Approved' : docObj.status}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 mt-1.5 truncate font-medium">
                          {docObj.fileName ? `File: ${docObj.fileName}` : 'No archive file registered.'}
                        </p>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => {
                          toast.info(`Triggered mock vault ingestion for: ${key.replace(/([A-Z])/g, ' $1').trim()}`)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:border-blue-500 hover:bg-blue-50/40 hover:text-[#0059E7] transition-all cursor-pointer"
                      >
                        <UploadCloud size={14} />
                        UPLOAD FILE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'References' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B]">Academic References</h2>
                  <p className="text-xs text-slate-400 mt-1">Provide referee details from partner universities to support dynamic alignment validations.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(formData.references || []).map((ref, idx) => (
                    <div key={idx} className="p-5 border border-slate-200 rounded-[20px] space-y-4 bg-slate-50/30">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                          Reference Block {idx + 1}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 font-bold rounded-lg flex items-center gap-1">
                          <Check size={10} strokeWidth={3} />
                          Active Reference
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <FormInput 
                          label="Institution Name" 
                          value={ref.institutionName} 
                          onChange={(v) => {
                            const updated = [...(formData.references || [])]
                            updated[idx].institutionName = v
                            setFormData({...formData, references: updated})
                          }} 
                        />
                        
                        <FormInput 
                          label="Referee Name & Position" 
                          value={ref.refNamePosition} 
                          onChange={(v) => {
                            const updated = [...(formData.references || [])]
                            updated[idx].refNamePosition = v
                            setFormData({...formData, references: updated})
                          }} 
                        />
                        
                        <FormInput 
                          label="Country" 
                          value={ref.country} 
                          onChange={(v) => {
                            const updated = [...(formData.references || [])]
                            updated[idx].country = v
                            setFormData({...formData, references: updated})
                          }} 
                        />
                        
                        <FormInput 
                          label="Official Work Email" 
                          value={ref.workEmail} 
                          onChange={(v) => {
                            const updated = [...(formData.references || [])]
                            updated[idx].workEmail = v
                            setFormData({...formData, references: updated})
                          }} 
                        />
                        
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                            Relationship Duration
                          </label>
                          <select 
                            value={ref.duration}
                            onChange={(e) => {
                              const updated = [...(formData.references || [])]
                              updated[idx].duration = e.target.value
                              setFormData({...formData, references: updated})
                            }}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold text-[#1E293B] outline-none hover:bg-slate-100/30 focus:bg-white focus:border-[#0059E7] transition-all cursor-pointer"
                          >
                            <option>1-2 Years</option>
                            <option>3-6 Years</option>
                            <option>7+ Years</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Account & Security' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-base font-bold text-[#1E293B]">Account Security & Credentials</h2>
                  <p className="text-xs text-slate-400 mt-1">Configure workspace keys, multi-factor triggers, and active logins securely.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                      <KeyRound size={16} className="text-[#0059E7]" />
                      <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider font-mono">
                        Change Passcode
                      </h3>
                    </div>
                    
                    <FormInput label="Current Password" type="password" placeholder="••••••••" />
                    <FormInput label="New Password" type="password" placeholder="••••••••" />
                    <FormInput label="Confirm Password" type="password" placeholder="••••••••" />
                    
                    <button 
                      type="button" 
                      onClick={() => {
                        toast.success('Passcode hash pipeline processed successfully.')
                      }}
                      className="w-full mt-3 bg-[#0059E7] hover:bg-blue-700 py-3 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-100 cursor-pointer active:scale-[0.98] transition-all"
                    >
                      Save Passcode
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="p-5 border border-slate-200 rounded-2xl flex items-center justify-between bg-slate-50/50 shadow-xs">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-[#1E293B] tracking-tight">Multi-Factor Login</h4>
                        <p className="text-[11px] text-slate-400 font-medium">Highly recommended to safeguard student records.</p>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.mfaEnabled || false} 
                          onChange={(e) => setFormData({...formData, mfaEnabled: e.target.checked})} 
                          className="sr-only peer" 
                        />
                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0059E7]"></div>
                      </label>
                    </div>

                    <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-3.5 shadow-xs">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                          Active Workspace Device
                        </h4>
                        
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          Active Session
                        </span>
                      </div>
                      
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                        <Laptop className="text-slate-400 mt-0.5 shrink-0" size={16} />
                        <div>
                          <p className="text-xs font-bold text-[#1E293B]">
                            {formData.activeDevice?.engine || 'Chrome Mac Workspace Engine'}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 mt-1 font-mono">
                            IP: {formData.activeDevice?.ip || '103.25.12.11'} • LOC: {formData.activeDevice?.location || 'Kathmandu, NP'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab !== 'Account & Security' && (
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/80">
                <button
                  type="button" 
                  onClick={() => setFormData(dbSnapshot || {})} 
                  disabled={isSaving}
                  className="px-5 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-[0.98] select-none"
                >
                  Reset Form
                </button>
                
                <button
                  type="submit" 
                  disabled={isSaving}
                  className="px-6 py-3 text-xs font-bold text-white bg-[#0059E7] hover:bg-blue-700 rounded-xl shadow-md shadow-blue-100 transition-all cursor-pointer active:scale-[0.98] flex items-center gap-2 select-none"
                >
                  {isSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

          </form>

        </div>

      </div>
    </div>
  )
}

function FormInput({ 
  label, 
  type = 'text', 
  value = '', 
  disabled = false, 
  placeholder = '', 
  onChange = () => {} 
}: { 
  label: string
  type?: string
  value?: string
  disabled?: boolean
  placeholder?: string
  onChange?: (v: string) => void
}) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
        {label}
      </label>
      <input
        type={type} 
        value={value} 
        disabled={disabled} 
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all ${
          disabled 
            ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed font-medium' 
            : 'bg-slate-50/50 border-slate-200 text-[#1E293B] focus:bg-white focus:border-[#0059E7] focus:ring-4 focus:ring-blue-100'
        }`}
      />
    </div>
  )
}

function TagSelector({ 
  SectionTitle, 
  ActiveTags, 
  SuggestedTags, 
  OnUpdate 
}: { 
  SectionTitle: string
  ActiveTags: string[]
  SuggestedTags: string[]
  OnUpdate: (tags: string[]) => void
}) {
  const [customInput, setCustomInput] = useState('')
  
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
        {SectionTitle}
      </label>
      
      <div className="flex flex-wrap gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl min-h-[50px] items-center">
        {ActiveTags.length === 0 ? (
          <span className="text-xs text-slate-400 font-medium pl-1">No target locales loaded.</span>
        ) : (
          ActiveTags.map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center gap-1.5 bg-white text-[#0059E7] border border-slate-200 font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs"
            >
                 {tag}
              <button 
                type="button" 
                onClick={() => OnUpdate(ActiveTags.filter(t => t !== tag))} 
                className="text-slate-400 hover:text-red-500 font-bold ml-1 cursor-pointer transition-colors"
                title="Remove locale"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
             ))
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {SuggestedTags.filter(t => !ActiveTags.includes(t)).map(tag => (
          <button 
            type="button" 
            key={tag} 
            onClick={() => OnUpdate([...ActiveTags, tag])} 
            className="text-[10px] font-bold text-slate-400 bg-slate-100 hover:bg-blue-50 hover:text-[#0059E7] transition-all cursor-pointer border border-transparent hover:border-blue-100 rounded-xl py-1.5 px-3 uppercase tracking-wide"
          >
            + {tag}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input 
          type="text" 
          value={customInput} 
          placeholder="Type custom market locale to register..." 
          onChange={(e) => setCustomInput(e.target.value)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (customInput.trim()) {
                OnUpdate([...ActiveTags, customInput.trim()])
                setCustomInput('')
              }
            }
          }}
          className="bg-white border border-slate-205 rounded-xl px-4 py-3 text-xs font-medium outline-none flex-1 focus:border-[#0059E7] focus:ring-4 focus:ring-blue-100" 
        />
        
        <button 
          type="button" 
          onClick={() => { 
            if(customInput.trim()) { 
              OnUpdate([...ActiveTags, customInput.trim()]) 
              setCustomInput('') 
            } 
          }} 
          className="bg-[#0059E7] hover:bg-blue-700 px-5 rounded-xl text-xs font-bold text-white cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add Custom
        </button>
      </div>
    </div>
  )
}