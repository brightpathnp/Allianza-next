'use client'

import React, { useState, useEffect } from 'react'
import { 
  doc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  setDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore'
import { db, handleFirestoreError, OperationType } from '@/lib/firebase'
import { ShieldCheck, Settings, Users, Link2, CreditCard, Activity, Send, Globe, Zap, AlertCircle, Trash2, Mail, Shield, Sliders, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface SystemSettings {
  isMaintenance: boolean
  intakeFrozen: boolean
  sandboxMode: boolean
  creditThreshold: number
  inactivityDays: number
  hiddenCountries?: Record<string, boolean>
  hideLandingPages?: boolean
  hideTrainingHub?: boolean
  hideSupportCenter?: boolean
}

interface AdminUser {
  id: string
  email: string
  roles: string[]
  assignedScope: string
  status: string
}

interface IntegrationConfigs {
  bitrixWebhook: string
  whatsappToken: string
  sendgridKey: string
}

const ALL_COUNTRIES_LIST = ["Australia", "Canada", "France", "Georgia", "Malta", "United Arab Emirates", "United Kingdom", "United States"]

export default function SuperAdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    isMaintenance: false,
    intakeFrozen: false,
    sandboxMode: false,
    creditThreshold: 90,
    inactivityDays: 30,
    hiddenCountries: {},
    hideLandingPages: false,
    hideTrainingHub: false,
    hideSupportCenter: false
  })

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [integrations, setIntegrations] = useState<IntegrationConfigs>({
    bitrixWebhook: '',
    whatsappToken: '',
    sendgridKey: ''
  })

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Compliance Officer')
  const [inputThreshold, setInputThreshold] = useState<number>(90)
  const [inputInactivity, setInputInactivity] = useState<number>(30)
  const [showTokens, setShowTokens] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  const [countryInput, setCountryInput] = useState('')
  const [countrySuggestions, setCountrySuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!countryInput.trim()) {
      setCountrySuggestions([])
      return
    }
    const filtered = ALL_COUNTRIES_LIST.filter(c => 
      c.toLowerCase().includes(countryInput.toLowerCase()) && 
      !settings.hiddenCountries?.[c]
    )
    setCountrySuggestions(filtered)
  }, [countryInput, settings.hiddenCountries])

  useEffect(() => {
    setLoading(true)

    const settingsRef = doc(db, 'config', 'system_settings')
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings
        setSettings(data)
        setInputThreshold(data.creditThreshold || 90)
        setInputInactivity(data.inactivityDays || 30)
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/system_settings')
    })

    const usersRef = collection(db, 'users')
    const adminQuery = query(usersRef, where('roles', 'array-contains', 'admin'))
    const unsubscribeAdmins = onSnapshot(adminQuery, (snapshot) => {
      const staffList: AdminUser[] = []
      snapshot.forEach((doc) => {
        staffList.push({ id: doc.id, ...doc.data() } as AdminUser)
      })
      setAdmins(staffList)
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users')
    })

    const integrationsRef = doc(db, 'config', 'integrations')
    const unsubscribeIntegrations = onSnapshot(integrationsRef, (docSnap) => {
      if (docSnap.exists()) {
        setIntegrations(docSnap.data() as IntegrationConfigs)
      }
      setLoading(false)
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/integrations')
    })

    return () => {
      unsubscribeSettings()
      unsubscribeAdmins()
      unsubscribeIntegrations()
    }
  }, [])

  const handleToggleFlag = async (field: keyof SystemSettings, currentVal: boolean) => {
    const settingsRef = doc(db, 'config', 'system_settings')
    try {
      await setDoc(settingsRef, { [field]: !currentVal }, { merge: true })
      toast.success(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} state updated.`)
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/system_settings')
    }
  }

  const handleToggleCountryHidden = async (countryName: string, currentlyHidden: boolean) => {
    const settingsRef = doc(db, 'config', 'system_settings')
    const updatedHidden = {
      ...(settings.hiddenCountries || {}),
      [countryName]: !currentlyHidden
    }
    try {
      await setDoc(settingsRef, { hiddenCountries: updatedHidden }, { merge: true })
      toast.success(`${countryName} visibility updated.`)
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/system_settings')
    }
  }

  const handleAddCountry = async (countryName: string) => {
    if (!countryName.trim()) return
    const cleanCountry = countryName.trim()
    const settingsRef = doc(db, 'config', 'system_settings')
    const updatedHidden = {
      ...(settings.hiddenCountries || {}),
      [cleanCountry]: true
    }
    try {
      await setDoc(settingsRef, { hiddenCountries: updatedHidden }, { merge: true })
      setCountryInput('')
      setCountrySuggestions([])
      toast.success(`${cleanCountry} added to visibility controls.`)
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/system_settings')
    }
  }

  const handleDeleteCountry = async (countryName: string) => {
    const settingsRef = doc(db, 'config', 'system_settings')
    const updatedHidden = { ...(settings.hiddenCountries || {}) }
    delete updatedHidden[countryName]
    try {
      await setDoc(settingsRef, { hiddenCountries: updatedHidden }, { merge: true })
      toast.success(`${countryName} removed from configuration.`)
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/system_settings')
    }
  }

  const handleUpdateThresholds = async (e: React.FormEvent) => {
    e.preventDefault()
    const settingsRef = doc(db, 'config', 'system_settings')
    try {
      await setDoc(settingsRef, {
        creditThreshold: Number(inputThreshold),
        inactivityDays: Number(inputInactivity)
      }, { merge: true })
      toast.success('Operational warning thresholds successfully updated.')
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/system_settings')
    }
  }

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      await addDoc(collection(db, 'users'), {
        email: inviteEmail.trim().toLowerCase(),
        roles: ['admin'],
        assignedScope: inviteRole,
        status: 'active',
        createdAt: new Date().toISOString()
      })
      setInviteEmail('')
      toast.success('Administrative clearance granted successfully.')
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'users')
    }
  }

  const handleRevokeAdmin = async (id: string) => {
    if (confirm('Are you absolutely sure you want to revoke backoffice clearance for this user?')) {
      try {
        await deleteDoc(doc(db, 'users', id))
        toast.success('Admin clearance revoked.')
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${id}`)
      }
    }
  }

  const handleUpdateIntegrations = async (e: React.FormEvent) => {
    e.preventDefault()
    const integrationsRef = doc(db, 'config', 'integrations')
    try {
      await setDoc(integrationsRef, integrations, { merge: true })
      toast.success('Third-party API credentials successfully updated.')
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/integrations')
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse bg-[#F8F9FA] min-h-screen">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-white border border-slate-200 rounded-xl lg:col-span-1"></div>
          <div className="h-96 bg-white border border-slate-200 rounded-xl lg:col-span-2"></div>
          <div className="h-64 bg-white border border-slate-200 rounded-xl lg:col-span-1"></div>
          <div className="h-64 bg-white border border-slate-200 rounded-xl lg:col-span-2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen text-slate-900 font-sans">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#0059E7] text-white rounded-xl shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit uppercase">
            System Control & Master Infrastructure
          </h1>
        </div>
        <p className="text-sm font-medium text-slate-500 ml-1">
          Architectural dashboard for global operations, backoffice governance, and infrastructure security keys.
        </p>
      </div>

      <hr className="border-slate-200" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                Operational Flags
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Control live microservice visibility</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:border-[#0059E7]/20">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Maintenance Mode</p>
                  <p className="text-[10px] font-medium text-slate-500">Redirect client networks</p>
                </div>
                <button 
                  onClick={() => handleToggleFlag('isMaintenance', settings.isMaintenance)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.isMaintenance ? 'bg-rose-600 shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.isMaintenance ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:border-[#0059E7]/20">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Intake Freeze</p>
                  <p className="text-[10px] font-medium text-slate-500">Lock document creation</p>
                </div>
                <button 
                  onClick={() => handleToggleFlag('intakeFrozen', settings.intakeFrozen)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.intakeFrozen ? 'bg-amber-500 shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.intakeFrozen ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:border-[#0059E7]/20">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Sandbox Override</p>
                  <p className="text-[10px] font-medium text-slate-500">Enable simulated payments</p>
                </div>
                <button 
                  onClick={() => handleToggleFlag('sandboxMode', settings.sandboxMode)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.sandboxMode ? 'bg-blue-600 shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.sandboxMode ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:border-[#0059E7]/20 border-l-4 border-l-[#0059E7]">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Hide Landing Pages</p>
                  <p className="text-[10px] font-medium text-slate-500">Force login interface & private portal</p>
                </div>
                <button 
                  onClick={() => handleToggleFlag('hideLandingPages', settings.hideLandingPages || false)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.hideLandingPages ? 'bg-[#0059E7] shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.hideLandingPages ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:border-[#0059E7]/20 border-l-4 border-l-emerald-500">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Training Hub</p>
                  <p className="text-[10px] font-medium text-slate-500">Hide page in agent/institution dashboards</p>
                </div>
                <button 
                  onClick={() => handleToggleFlag('hideTrainingHub', settings.hideTrainingHub || false)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.hideTrainingHub ? 'bg-emerald-500 shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.hideTrainingHub ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:border-[#0059E7]/20 border-l-4 border-l-purple-600">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Hide Support Center</p>
                  <p className="text-[10px] font-medium text-slate-500">Hide support center & help links across dashboards</p>
                </div>
                <button 
                  onClick={() => handleToggleFlag('hideSupportCenter', settings.hideSupportCenter || false)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${settings.hideSupportCenter ? 'bg-purple-600 shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.hideSupportCenter ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateThresholds} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={16} className="text-blue-600" />
                Alert Thresholds
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Define computational boundaries</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Credit Warning Boundary</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    value={inputThreshold}
                    onChange={(e) => setInputThreshold(Number(e.target.value))}
                    className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] focus:ring-4 focus:ring-[#0059E7]/5 transition-all text-slate-900"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-black">%</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Expiry Limit</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    min="1" 
                    value={inputInactivity}
                    onChange={(e) => setInputInactivity(Number(e.target.value))}
                    className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] focus:ring-4 focus:ring-[#0059E7]/5 transition-all text-slate-900"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs font-black">DAYS</div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full text-xs font-black uppercase tracking-widest bg-slate-900 text-white p-3.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
              >
                Sync Parameters
              </button>
            </div>
          </form>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Globe size={16} className="text-[#0059E7]" />
                Country Filters
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Configure global university restrictions</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Search & Add Country</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    placeholder="Type country name..."
                    className="flex-1 text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] focus:ring-4 focus:ring-[#0059E7]/5 transition-all text-slate-900"
                  />
                  <button 
                    type="button"
                    onClick={() => handleAddCountry(countryInput)}
                    className="px-4 bg-[#0059E7] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#1556D6] transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {countrySuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-[65px] bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {countrySuggestions.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleAddCountry(country)}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-[#0059E7]/10 hover:text-[#0059E7] transition-all"
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Active Rules</label>
                {(!settings.hiddenCountries || Object.keys(settings.hiddenCountries).length === 0) ? (
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No active country filters</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                    {Object.entries(settings.hiddenCountries).map(([countryName, isHidden]) => {
                      const hiddenVal = !!isHidden
                      return (
                        <div key={countryName} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{countryName}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${hiddenVal ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                              {hiddenVal ? 'Hidden' : 'Visible'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hide:</span>
                              <button 
                                type="button"
                                onClick={() => handleToggleCountryHidden(countryName, hiddenVal)}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-all duration-300 ${hiddenVal ? 'bg-red-500 shadow-inner' : 'bg-slate-200'}`}
                              >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${hiddenVal ? 'translate-x-[20px]' : ''}`} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCountry(countryName)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-slate-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Users size={16} className="text-[#0059E7]" />
                Backoffice Admin Team
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Control internal staff clearances</p>
            </div>

            <form onSubmit={handleInviteAdmin} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="md:col-span-6 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="email" 
                  placeholder="Invite workspace email..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs font-bold pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] focus:ring-4 focus:ring-[#0059E7]/5 transition-all"
                  required
                />
              </div>
              <div className="md:col-span-3">
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full text-xs font-bold px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] text-slate-700 h-[44px]"
                >
                  <option value="Compliance Officer">Compliance</option>
                  <option value="Financial Auditor">Audit</option>
                  <option value="Systems Operator">Operations</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <button 
                  type="submit" 
                  className="w-full h-[44px] text-[10px] font-black uppercase tracking-widest bg-[#0059E7] text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send size={12} />
                  Grant Access
                </button>
              </div>
            </form>

            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] font-black tracking-widest text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-4 px-6">Admin Identity</th>
                    <th className="py-4 px-6">Access Group</th>
                    <th className="py-4 px-6 text-center">Security Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-bold bg-slate-50/30">No sub-administrators indexed in secure directory.</td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                           <div className="font-black text-slate-900">{admin.email}</div>
                           <div className="text-[10px] text-slate-400 font-mono">UID: {admin.id.slice(0, 8)}...</div>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-600">{admin.assignedScope}</td>
                        <td className="py-4 px-6 text-center">
                          <span className="px-2.5 py-1 text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg tracking-widest">
                            {admin.status?.toUpperCase() || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => handleRevokeAdmin(admin.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Revoke Clearance"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleUpdateIntegrations} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Link2 size={16} className="text-indigo-500" />
                  Ecosystem Integration Hub
                </h2>
                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Sync global workflows & databases</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowTokens(!showTokens)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-[#0059E7] hover:bg-slate-100 transition-all"
              >
                {showTokens ? 'Mask sensitive data' : 'Reveal sensitive data'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bitrix24 CRM Sync Webhook</label>
                <div className="relative">
                  <Sliders size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type={showTokens ? "text" : "password"} 
                    value={integrations.bitrixWebhook}
                    onChange={(e) => setIntegrations({ ...integrations, bitrixWebhook: e.target.value })}
                    placeholder="https://b24-portal.bitrix24.com/rest/..."
                    className="w-full text-xs font-bold pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp API Endpoint</label>
                <input 
                  type={showTokens ? "text" : "password"} 
                  value={integrations.whatsappToken}
                  onChange={(e) => setIntegrations({ ...integrations, whatsappToken: e.target.value })}
                  placeholder="API Token Key..."
                  className="w-full text-xs font-bold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SendGrid SMTP Relay</label>
                <input 
                  type={showTokens ? "text" : "password"} 
                  value={integrations.sendgridKey}
                  onChange={(e) => setIntegrations({ ...integrations, sendgridKey: e.target.value })}
                  placeholder="Relay Key..."
                  className="w-full text-xs font-bold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0059E7] transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full py-4 bg-[#0059E7] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
              >
                <Activity size={16} />
                Sync Integration Routing Profiles
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}