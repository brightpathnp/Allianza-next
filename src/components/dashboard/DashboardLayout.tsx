'use client'

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { 
  Building2, 
  Home,
  Link2,
  ChevronLeft,
  ChevronRight,
  FileText, 
  MessageSquare, 
  Bell,
  Settings,
  FileSignature,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  GraduationCap,
  BookOpen,
  Sparkles,
  Check,
  Clock,
  Trash2,
  User,
  Users,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  CreditCard,
  Sliders,
  Terminal,
  Megaphone,
  CalendarDays,
  AlertTriangle,
  XCircle,
  CheckCircle2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { collection, query, where, limit, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import DashboardTopBar from './DashboardTopBar'
import { useDashboardState } from '@/contexts/DashboardStateContext'

interface DashboardLayoutProps {
  children: React.ReactNode
  activeItem?: string
  title?: string
  subtitle?: string
  showGreeting?: boolean
  topNavLeft?: React.ReactNode
  hideHeader?: boolean
}

export default function DashboardLayout({ 
  children, 
  activeItem,
  title,
  subtitle,
  showGreeting = false,
  topNavLeft,
  hideHeader = false
}: DashboardLayoutProps) {
  const { mode } = useDashboardState()
  const { user, profile, activeRole, logout, selectRole, hideTrainingHub } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)

  const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([])

  useEffect(() => {
    const q = query(
      collection(db, 'system_announcements'),
      where('active', '==', true)
    )
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const filtered = docs.filter((ann: any) => {
        if (ann.targetAudience === 'all') return true
        if (ann.targetAudience === 'agents' && activeRole === 'agent') return true
        if (ann.targetAudience === 'universities' && activeRole === 'university') return true
        if (activeRole === 'superadmin') return true
        return false
      })
      filtered.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      setActiveAnnouncements(filtered)
    }, (err) => {
      console.warn("Announcements loading block caught exception:", err)
    })

    return () => unsub()
  }, [activeRole])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isEffectiveCollapsed = !isHovered && !isMobile

  useLayoutEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (document.documentElement) document.documentElement.scrollTop = 0
    if (document.body) document.body.scrollTop = 0

    const raf = requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname, searchParams.toString(), activeItem])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const getActiveItem = () => {
    if (activeItem) return activeItem
    
    if (pathname.startsWith('/students')) {
      return 'Students'
    }
    if (pathname.startsWith('/training-hub')) {
      return 'Training Hub'
    }
    if (pathname.startsWith('/applications') || pathname.startsWith('/application/') || pathname.startsWith('/new-application')) {
      return 'Applications'
    }
    
    if (pathname === '/admin' || pathname.startsWith('/admin/overview')) {
      return 'Command Center'
    }
    if (pathname.startsWith('/admin/analytics')) {
      return 'Enrollment Intelligence'
    }
    if (pathname.startsWith('/admin/governance')) {
      return 'Partner Governance'
    }
    if (pathname.startsWith('/admin/ledger')) {
      return 'Commercials Ledger'
    }
    if (pathname.startsWith('/admin/matrix')) {
      return 'Platform Matrix'
    }
    if (pathname.startsWith('/admin/compliance')) {
      return 'Document Matrix'
    }
    if (pathname.startsWith('/admin/terminal')) {
      return 'Security Terminal'
    }
    if (pathname.startsWith('/admin/settings')) {
      return 'Global Settings'
    }

    const tab = searchParams.get('tab')
    if (tab) {
      const allowedTabs = ['Overview', 'Network', 'Messages', 'Notifications', 'Settings', 'Academic Settings', 'Partnership Hub']
      if (allowedTabs.includes(tab)) {
        if (tab === 'Network' && activeRole === 'agent') {
          return 'Partnership Hub'
        }
        return tab as any
      }
    }
    
    return 'Overview'
  }

  const currentActive = getActiveItem()

  const navItems = [
    { label: 'Overview', icon: Home, path: '/dashboard?tab=Overview' },
    ...(activeRole !== 'superadmin' ? [
      { label: 'Applications', icon: FileText, path: '/applications' },
      ...(activeRole === 'agent' ? [
        { label: 'Students', icon: GraduationCap, path: '/students' }
      ] : []),
      ...(activeRole === 'agent'
        ? [{ label: 'Partnership Hub', icon: FileSignature, path: '/dashboard?tab=Network', font: 'font-outfit' }]
        : [{ label: 'Network', icon: Users, path: '/dashboard?tab=Network', font: 'font-outfit' }]
      )
    ] : []),
    ...(activeRole === 'university' ? [{ label: 'Partnership Hub', icon: FileSignature, path: '/dashboard?tab=Partnership Hub' }] : []),
    ...(activeRole === 'superadmin' ? [
      { label: 'Command Center', icon: TrendingUp, path: '/admin/overview' },
      { label: 'Enrollment Intelligence', icon: BarChart3, path: '/admin/analytics', font: 'font-outfit' },
      { label: 'Partner Governance', icon: Users, path: '/admin/governance' },
      { label: 'Academic Blueprint', icon: BookOpen, path: '/admin/blueprint' },
      { label: 'Document Ledger', icon: ShieldCheck, path: '/admin/compliance' },
      { label: 'Security Terminal', icon: Terminal, path: '/admin/terminal' },
      { label: 'Global Settings', icon: Settings, path: '/admin/settings' }
    ] : []),
    ...(activeRole !== 'superadmin' ? [{ label: 'Messages', icon: MessageSquare, path: '/dashboard?tab=Messages' }] : []),
    { label: 'Notifications', icon: Bell, path: '/dashboard?tab=Notifications' },
    ...(activeRole !== 'superadmin' && !hideTrainingHub ? [{ label: 'Training Hub', icon: BookOpen, path: '/training-hub' }] : []),
    ...(activeRole !== 'superadmin' ? [{ label: 'Settings', icon: Settings, path: '/dashboard?tab=Settings' }] : []),
  ]

  const handleNavigation = (path: string) => {
    const [basePath, queryString] = path.split('?')
    const params = new URLSearchParams(queryString || '')
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleNotificationClick = async (notification: any) => {
    if (notification.isUnread) {
      markAsRead(notification.id)
    }
    setIsNotificationsOpen(false)

    const titleL = (notification.title || '').toLowerCase()
    const descL = (notification.description || '').toLowerCase()

    const isPartnership = 
      titleL.includes('partner') || 
      descL.includes('partner') || 
      titleL.includes('agreement') || 
      descL.includes('agreement') ||
      titleL.includes('proposal') || 
      descL.includes('proposal')

    if (isPartnership) {
      const targetTab = activeRole === 'university' ? 'Partnership Hub' : 'Network'
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', targetTab)
      router.push(`/dashboard?${params.toString()}`)
      return
    }

    if (notification.category === 'messages') {
      const refParam = notification.applicationId ? `&ref=${encodeURIComponent(notification.applicationId)}` : ''
      const params = new URLSearchParams(`tab=Messages${refParam}`)
      router.push(`/dashboard?${params.toString()}`)
      return
    }
    if (notification.applicationId) {
      const suffix = (notification.title?.toLowerCase().includes('interview') || notification.description?.toLowerCase().includes('interview')) 
        ? '#interview' 
        : ''
      router.push(`/application/${notification.applicationId}${suffix}`)
    } else if (user) {
      try {
        const colRef = collection(db, 'applications')
        const fieldName = activeRole === 'university' ? 'targetUniversityId' : 'agentId'
        const q = query(colRef, where(fieldName, '==', user.uid))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const desc = (notification.description || '').toLowerCase()
          const title = (notification.title || '').toLowerCase()
          
          let targetAppId = snapshot.docs[0].id
          const matchedDoc = snapshot.docs.find(docSnap => {
            const appData = docSnap.data()
            const firstName = (appData.studentFirstName || '').toLowerCase().trim()
            const lastName = (appData.studentLastName || '').toLowerCase().trim()
            const fullName = `${firstName} ${lastName}`.trim()
            
            if (fullName && (desc.includes(fullName) || title.includes(fullName))) return true
            if (firstName && firstName.length > 2 && (desc.includes(firstName) || title.includes(firstName))) return true
            if (lastName && lastName.length > 2 && (desc.includes(lastName) || title.includes(lastName))) return true
            return false
          })
          
          if (matchedDoc) {
            targetAppId = matchedDoc.id
          }
          
          const suffix = (notification.title?.toLowerCase().includes('interview') || notification.description?.toLowerCase().includes('interview')) 
            ? '#interview' 
            : ''
          router.push(`/application/${targetAppId}${suffix}`)
        } else {
          router.push('/dashboard?tab=Notifications')
        }
      } catch (err) {
        console.error("Error finding fallback application in dropdown:", err)
        router.push('/dashboard?tab=Notifications')
      }
    } else {
      router.push('/dashboard?tab=Notifications')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans relative">
      {mode === 'quota-standby' && (
        <div className="bg-amber-600 text-white text-xs font-semibold text-center py-2 px-4 z-[100] sticky top-0 flex items-center justify-center gap-2 flex-wrap shadow-sm">
          <span>Notice: Firestore daily free read quota limit has been reached. System is actively operating in local cached mode.</span>
          <a
            href="https://console.firebase.google.com/project/gen-lang-client-0880308022/firestore/databases/ai-studio-d215f7b7-5f80-4d87-bed7-ffe6af3b56eb/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold hover:text-amber-100 transition-colors ml-1"
          >
            Upgrade Quota in Firebase Console →
          </a>
        </div>
      )}
      <DashboardTopBar 
          user={{
            name: profile?.fullName || "User",
            email: profile?.email || "",
            role: activeRole === 'university' ? 'Institution' : activeRole,
            avatarUrl: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || "User")}&background=0D8ABC&color=fff`
          }}
          notificationCount={unreadCount}
          onSignOut={handleLogout}
          onNavigate={(r) => {
            if (r === 'settings') {
              if (activeRole === 'superadmin') {
                router.push('/admin/settings')
              } else {
                router.push('/dashboard?tab=Settings')
              }
            } else {
              router.push(`/${r}`)
            }
          }}
          onNotificationClick={() => {
            const nextOpen = !isNotificationsOpen
            setIsNotificationsOpen(nextOpen)
            if (nextOpen && unreadCount > 0) markAllAsRead().catch(console.error)
          }}
          onMobileMenuClick={() => setIsSidebarOpen(true)}
        />
      
      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[190] lg:hidden"
            />
          )}
        </AnimatePresence>

        <aside 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            fixed lg:static inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col z-[200] lg:z-30 transform transition-all duration-300 pt-5 pb-6 shrink-0 overflow-y-auto overflow-x-hidden no-scrollbar shadow-xs h-full
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${isEffectiveCollapsed ? 'w-16 px-3' : 'w-60 px-4'}
          `}
        >
          <div className="flex items-center justify-between px-4 pb-4 mb-2 border-b border-slate-100 lg:hidden shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-[#0059E7] shadow-sm">
                <GraduationCap size={18} />
              </div>
              <span className="font-bold text-slate-800 text-base font-outfit">Allianza</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 flex flex-col pr-0.5">
            <div className="space-y-1 flex-1">
              {navItems.map((item) => {
                const isActive = currentActive === item.label
                
                let badgeCount = 0
                let showDot = false
                let dotColor = 'bg-[#0052FF]'
                
                if (item.label === 'Applications') {
                  badgeCount = notifications.filter(n => n.category === 'applications' && n.isUnread).length
                  showDot = badgeCount > 0
                  dotColor = activeRole === 'university' ? 'bg-orange-500' : 'bg-[#0052FF]'
                } else if (item.label === 'Messages') {
                  badgeCount = notifications.filter(n => n.category === 'messages' && n.isUnread).length
                  showDot = badgeCount > 0
                  dotColor = 'bg-emerald-500'
                } else if (item.label === 'Notifications') {
                  badgeCount = notifications.filter(n => n.category !== 'messages' && n.isUnread).length
                  showDot = badgeCount > 0
                  dotColor = 'bg-indigo-500'
                } else if (item.label === 'Partnership Hub' || item.label === 'Network') {
                  badgeCount = notifications.filter(n => n.category === 'ai-alerts' && n.isUnread).length
                  showDot = badgeCount > 0
                  dotColor = 'bg-blue-500'
                } else if (activeRole === 'superadmin') {
                  if (item.label === 'Partner Governance') {
                    badgeCount = notifications.filter(n => n.description?.toLowerCase().includes('partner') && n.isUnread).length
                    showDot = badgeCount > 0
                    dotColor = 'bg-rose-500'
                  } else if (item.label === 'Academic Blueprint' || item.label === 'Document Ledger') {
                    badgeCount = notifications.filter(n => n.description?.toLowerCase().includes('matrix') && n.isUnread).length
                    showDot = badgeCount > 0
                    dotColor = 'bg-[#0052FF]'
                  }
                }

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      handleNavigation(item.path)
                      setIsSidebarOpen(false)
                    }}
                    title={isEffectiveCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${isEffectiveCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-[#0059E7] font-bold border border-blue-100 shadow-xs'
                        : 'text-slate-400 hover:bg-[#F8F9FA] hover:text-slate-800 transition-all font-bold text-sm font-outfit'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <item.icon size={16} className={`${isActive ? 'text-[#0059E7]' : 'text-slate-400'} shrink-0`} />
                        {showDot && isEffectiveCollapsed && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
                          </span>
                        )}
                      </div>
                      {!isEffectiveCollapsed && (
                        <span className={`transition-opacity duration-200 flex items-center gap-1.5 ${
                          // @ts-ignore
                          (item as any).font || ''
                        }`}>
                          {item.label === 'Network' && activeRole === 'university' ? 'Agency Network' : item.label}
                          {showDot && (
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`}></span>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {badgeCount > 0 && !isEffectiveCollapsed && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black leading-none text-white ${dotColor} shrink-0 animate-pulse ${
                        // @ts-ignore
                        (item as any).font || ''
                      }`}>
                        {badgeCount}
                      </span>
                    )}
                    {isActive && !isEffectiveCollapsed && badgeCount === 0 && (
                      <div className={`w-1 h-1 rounded-full bg-[#0059E7] shadow-sm`} />
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-100 shrink-0 space-y-4">
            <div>
              <button 
                onClick={handleLogout}
                title={isEffectiveCollapsed ? 'Log Out' : undefined}
                className={`w-full flex items-center ${isEffectiveCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm font-outfit`}
              >
                <LogOut size={16} className="shrink-0" />
                {!isEffectiveCollapsed && <span className="">Log Out</span>}
              </button>
            </div>

            {profile && profile.roles.length > 1 && (
              <div className="pt-4 border-t border-slate-100 shrink-0">
                {!isEffectiveCollapsed && (
                  <p className="text-[11px] font-bold text-slate-400 px-4 mb-4 font-outfit">Platform Access</p>
                )}
                <div className="space-y-1.5">
                  {profile.roles.map((role) => {
                    const isCurrent = activeRole === role
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          selectRole(role)
                          setIsSidebarOpen(false)
                        }}
                        title={isEffectiveCollapsed ? `Switch to ${role} portal` : undefined}
                        className={`w-full flex items-center ${isEffectiveCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all text-sm font-bold font-outfit ${
                          isCurrent 
                            ? 'bg-[#F8F9FA] text-slate-800 cursor-default shadow-xs border border-slate-200' 
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          role === 'agent' ? 'bg-[#0059E7]' : 
                          role === 'university' ? 'bg-amber-500' : 'bg-indigo-500'
                        }`} />
                        {!isEffectiveCollapsed && (
                          <span className="capitalize">{role === 'university' ? 'Institution' : role}</span>
                        )}
                        {isCurrent && !isEffectiveCollapsed && (
                          <span className="ml-auto text-[8px] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs text-slate-400 leading-none">ACTIVE</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 relative flex flex-col overflow-hidden bg-[#F8F9FA]">
          <div 
            ref={mainScrollRef} 
            id="dashboard-main-scroll-container" 
            data-scroll-container="true" 
            className="flex-1 overflow-y-auto w-full relative"
          >
            
            <div className="absolute top-0 right-4 lg:right-6 z-[300]">
               <div ref={dropdownRef} className="relative">
                 <AnimatePresence>
                   {isNotificationsOpen && (
                     <motion.div
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       transition={{ duration: 0.15 }}
                       className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-[300] text-left"
                       style={{ borderRadius: '12px' }}
                     >
                       <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white">
                         <span className="font-extrabold text-slate-800 text-sm">Notifications</span>
                         {unreadCount > 0 && (
                           <button
                             onClick={() => {
                               markAllAsRead()
                             }}
                             className="text-xs font-bold text-[#0052FF] hover:text-[#003db3] transition-colors cursor-pointer"
                           >
                             Mark all as read
                           </button>
                         )}
                       </div>

                       <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto">
                         {notifications.length === 0 ? (
                           <div className="px-6 py-10 text-center">
                             <p className="text-xs font-semibold text-slate-400">No new notifications</p>
                           </div>
                         ) : (
                           notifications.slice(0, 5).map((notification) => {
                             let Icon = FileText
                             let bgClass = 'bg-blue-50 text-blue-600'
                             if (notification.category === 'messages') {
                               Icon = MessageSquare
                               bgClass = 'bg-orange-50 text-orange-600'
                             } else if (notification.category === 'ai-alerts') {
                               Icon = Sparkles
                               bgClass = 'bg-blue-50 text-[#0052FF]'
                             }

                             const titleL = (notification.title || '').toLowerCase()
                             const descL = (notification.description || '').toLowerCase()

                             if (
                               titleL.includes('interview') || 
                               descL.includes('interview') || 
                               titleL.includes('meet') || 
                               descL.includes('meet')
                             ) {
                               Icon = CalendarDays
                               bgClass = 'bg-blue-50 text-indigo-700'
                             }
                             else if (
                               titleL.includes('partner') || 
                               descL.includes('partner') || 
                               titleL.includes('agreement') || 
                               descL.includes('agreement') ||
                               titleL.includes('proposal') || 
                               descL.includes('proposal')
                             ) {
                               Icon = FileSignature
                               bgClass = 'bg-blue-50 text-indigo-700'
                             }
                             else if (
                               titleL.includes('incomplete') || 
                               descL.includes('incomplete') || 
                               titleL.includes('action needed') || 
                               descL.includes('action needed')
                             ) {
                               Icon = AlertTriangle
                               bgClass = 'bg-amber-50 text-amber-500'
                             }
                             else if (
                               titleL.includes('reject') || 
                               descL.includes('reject') || 
                               titleL.includes('rejection') || 
                               descL.includes('rejection')
                             ) {
                               Icon = XCircle
                               bgClass = 'bg-red-50 text-red-500'
                             }
                             else if (
                               titleL.includes('approved') || 
                               descL.includes('approved') || 
                               titleL.includes('confirm') || 
                               descL.includes('confirm') || 
                               titleL.includes('rectified') || 
                               descL.includes('rectified') || 
                               titleL.includes('success') || 
                               descL.includes('success')
                             ) {
                               Icon = CheckCircle2
                               bgClass = 'bg-green-50 text-green-500'
                             }

                             return (
                               <div
                                 key={notification.id}
                                 onClick={() => handleNotificationClick(notification)}
                                 className={`px-6 py-3 flex gap-2 transition-colors hover:bg-slate-50/70 group relative cursor-pointer ${
                                   notification.isUnread ? 'bg-blue-500/[0.015]' : ''
                                 }`}
                               >
                                 <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`} style={{ borderRadius: '12px' }}>
                                   <Icon size={18} />
                                 </div>
                                 
                                 <div className="flex-1 min-w-0 pr-6">
                                   <p className={`text-xs text-slate-700 leading-normal ${notification.isUnread ? 'font-black text-grad-text-main font-outfit' : 'font-medium'}`}>
                                     {notification.description}
                                   </p>
                                   <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400">
                                     <Clock size={10} />
                                     <span>{notification.createdAt}</span>
                                   </div>
                                 </div>

                                 {notification.isUnread && (
                                   <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-xl border border-slate-100 shadow-sm z-10">
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         markAsRead(notification.id)
                                       }}
                                       title="Mark as Read"
                                       className="w-6 h-6 rounded-xl text-emerald-700 hover:bg-emerald-50 flex items-center justify-center cursor-pointer transition-colors"
                                     >
                                       <Check size={14} strokeWidth={3} />
                                     </button>
                                   </div>
                                 )}
                               </div>
                             )
                           })
                         )}
                       </div>

                       <div className="p-3 border-t border-slate-50 bg-slate-50/50 text-center">
                         <button
                           onClick={() => {
                             setIsNotificationsOpen(false)
                             router.push('/dashboard?tab=Notifications')
                           }}
                           className="w-full py-3 bg-white border border-slate-200/50 rounded-xl hover:bg-slate-50 text-xs font-black text-slate-700 hover:text-[#0052FF] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                         >
                           View All Notifications
                         </button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
            </div>

            <AnimatePresence>
              {activeAnnouncements.map((ann) => (
                <motion.div
                  key={ann.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#FFF9E6] border-b border-amber-150 overflow-hidden shrink-0"
                >
                  <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-semibold text-amber-900">
                    <div className="flex items-center gap-2.5 text-left">
                      <span className="p-1 px-1.5 bg-amber-100/70 text-amber-800 rounded-lg text-[9px] font-black tracking-widest animate-pulse flex items-center gap-1 shrink-0">
                        <Megaphone size={11} />
                        Alert
                      </span>
                      <span className="leading-relaxed font-sans font-medium text-slate-800">{ann.message}</span>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        try {
                          const docRef = doc(db, 'system_announcements', ann.id)
                          await updateDoc(docRef, { active: false })
                        } catch (err) {
                          setActiveAnnouncements(prev => prev.filter(a => a.id !== ann.id))
                        }
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="max-w-[1240px] mx-auto px-2 sm:px-10 lg:px-14">
              <div className={` ${hideHeader ? 'px-2 py-5 sm:p-6 sm:pt-5 lg:p-8 lg:pt-5' : 'px-2 py-6 sm:p-6 lg:p-8'}`}>
                {!(showGreeting && currentActive === 'Overview') && !hideHeader && (
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 ${topNavLeft ? 'pb-4' : ''}`}>
                    <div className="space-y-0.5">
                      <h1 className="text-xl md:text-2xl font-bold font-outfit text-[#1E293B] tracking-tight leading-snug">
                        {title || currentActive}
                      </h1>
                      {subtitle && (
                        <p className="text-[12px] font-medium text-slate-500 font-sans mt-0.5">{subtitle}</p>
                      )}
                    </div>
                    {topNavLeft && <div>{topNavLeft}</div>}
                  </div>
                )}

                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}