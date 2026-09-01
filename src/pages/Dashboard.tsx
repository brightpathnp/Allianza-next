'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Briefcase,
  Shield,
  Home,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import AgentView from '@/components/dashboard/AgentView'
import UniversityView from '@/components/dashboard/UniversityView'
import Settings2 from '@/components/dashboard/Settings2'
import SuperAdminSettings from '@/components/admin/SuperAdminSettings'
import UniversitySettingsView from '@/components/dashboard/UniversitySettingsView'
import NetworkView from '@/components/dashboard/NetworkView'
import PartnershipHub from '@/components/dashboard/PartnershipHubView'
import NotificationsView from '@/components/dashboard/NotificationView'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { InboxLedgerView } from '@/components/dashboard/InboxLedgerView'
import AgentNetworkPage from '@/components/dashboard/AgentNetworkPage'

const Dashboard = () => {
  const { user, profile, activeRole, logout, selectRole } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('Overview')

  // Sync active tab with search parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    } else if (activeTab !== 'Overview') {
      setActiveTab('Overview')
    }
  }, [searchParams])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Scroll to top whenever tab or role changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeTab, activeRole])

  // Auto-select activeRole if it's not set but user only has 1 role
  useEffect(() => {
    if (!activeRole && profile && profile.roles && profile.roles.length === 1) {
      selectRole(profile.roles[0])
    }
  }, [activeRole, profile, selectRole])

  // We restore the "Choose Your Portal" screen here so users with multiple roles can select which dashboard to access.
  if (!activeRole && profile && profile.roles && profile.roles.length > 1) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-4 pt-24">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-grad-text-main font-outfit mb-4">Choose Your Portal</h1>
            <p className="text-slate-500 text-lg">Select which dashboard you would like to access today.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {profile.roles.includes('university') && (
              <motion.button
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => selectRole('university')}
                className="group bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 text-left transition-all"
              >
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <Building2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-grad-text-main font-outfit mb-4">Institution Portal</h3>
                <p className="text-slate-500 mb-8">Manage programs, review applications, and track institutional performance.</p>
                <div className="flex items-center gap-2 text-orange-600 font-bold">
                  Enter Portal <ArrowRight size={20} />
                </div>
              </motion.button>
            )}

            {profile.roles.includes('agent') && (
              <motion.button
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => selectRole('agent')}
                className="group bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 text-left transition-all"
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Briefcase size={32} />
                </div>
                <h3 className="text-2xl font-bold text-grad-text-main font-outfit mb-4">Agent Portal</h3>
                <p className="text-slate-500 mb-8">Manage student profiles, track recruitment progress, and view commissions.</p>
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                  Enter Portal <ArrowRight size={20} />
                </div>
              </motion.button>
            )}

            {profile.roles.includes('superadmin') && (
              <motion.button
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => selectRole('superadmin')}
                className={`group bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 text-left transition-all ${
                  (profile.roles.includes('agent') && profile.roles.includes('university')) ? 'col-span-full md:col-span-2 mt-4' : ''
                }`}
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-bold text-grad-text-main font-outfit mb-4">Superadmin Portal</h3>
                <p className="text-slate-500 mb-8">Manage global platform governance, compliance matrix, and security ledgers.</p>
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                  Enter Portal <ArrowRight size={20} />
                </div>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (activeTab === 'Settings') {
      if (activeRole === 'superadmin') {
        return <SuperAdminSettings />
      }
      if (activeRole === 'university') {
        return <UniversitySettingsView profile={profile} userId={user?.uid || ''} />
      }
      return <Settings2 profile={profile} activeRole={activeRole!} userId={user?.uid || ''} />
    }

    if (activeTab === 'Partnership Hub') {
      return <PartnershipHub />
    }

    if (activeTab === 'Network') {
      if (activeRole === 'agent') {
        return <AgentNetworkPage />
      }
      return <NetworkView activeRole={activeRole!} profile={profile} />
    }

    if (activeTab === 'Messages') {
      return <InboxLedgerView />
    }

    if (activeTab === 'Notifications') {
      return <NotificationsView />
    }

    switch (activeRole) {
      case 'agent':
        return <AgentView profile={profile} />
      case 'university':
        return <UniversityView profile={profile} />
      case 'superadmin':
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Superadmin Control Panel</h1>
            <div className="grid md:grid-cols-3 gap-8">
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total System Users</p>
                  <p className="text-3xl font-bold text-grad-text-main font-outfit">12,842</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-2">Pending Verifications</p>
                  <p className="text-3xl font-bold text-grad-text-main font-outfit">156</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-2">Active Sessions</p>
                  <p className="text-3xl font-bold text-grad-text-main font-outfit">4,102</p>
               </div>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Home size={64} className="text-slate-200 mb-6" />
            <h2 className="text-xl font-bold text-slate-800">Initialising your portal...</h2>
            <p className="text-slate-500">Please wait while we set up your environment.</p>
          </div>
        )
    }
  }

  const getTabTitleAndSubtitle = () => {
    switch (activeTab) {
      case 'Overview':
        return { title: 'Overview', subtitle: '' }
      case 'Applications':
        return { 
          title: 'All Applications', 
          subtitle: 'Track status changes, manage document submissions, and run compliance pipelines.' 
        }
      case 'Network':
        return { 
          title: activeRole === 'university' ? 'Agency Network' : 'Partnership Hub', 
          subtitle: activeRole === 'university' 
            ? 'Review and manage recruitment targets, commission settings, and authorized agencies.'
            : 'Connect dynamically with global institutions matching your preferences.'
        }
      case 'Messages':
        return { 
          title: '', 
          subtitle: '' 
        }
      case 'Notifications':
        return { 
          title: 'Notifications', 
          subtitle: 'Manage application updates, matches, and portal alerts.' 
        }
      case 'Partnership Hub':
        return { 
          title: 'Partnership Hub', 
          subtitle: 'Manage global commission metrics, compliance frameworks, and active contract reviews.' 
        }
      case 'Settings':
        return { 
          title: '', 
          subtitle: '' 
        }
      default:
        return { title: activeTab, subtitle: '' }
    }
  }

  const { title: layoutTitle, subtitle: layoutSubtitle } = getTabTitleAndSubtitle()

  return (
    <DashboardLayout 
      showGreeting 
      title={layoutTitle} 
      subtitle={layoutSubtitle}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole + '-' + activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default Dashboard