'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Bell, 
  Check, 
  Trash2, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  FileSignature, 
  CheckSquare, 
  Square,
  Info,
  CalendarDays,
  AlertTriangle,
  XCircle,
  CheckCircle2
} from 'lucide-react'
import { useNotifications, Notification } from '@/contexts/NotificationContext'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'

type FilterType = 'all' | 'unread' | 'applications' | 'ai-alerts'

export default function NotificationsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, activeRole } = useAuth()
  const { 
    notifications, 
    markAsRead, 
    deleteNotification, 
    bulkMarkAsRead, 
    bulkDelete,
    markAllAsRead
  } = useNotifications()

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const isPartnershipNotif = (n: Notification) => {
    const titleL = (n.title || '').toLowerCase()
    const descL = (n.description || '').toLowerCase()
    return titleL.includes('partner') || descL.includes('partner') ||
           titleL.includes('agreement') || descL.includes('agreement') ||
           titleL.includes('proposal') || descL.includes('proposal')
  }

  const nonMessageNotifications = notifications.filter(n => n.category !== 'messages' || isPartnershipNotif(n))

  React.useEffect(() => {
    const unread = nonMessageNotifications.filter(n => n.isUnread)
    if (unread.length > 0) {
      const ids = unread.map(n => n.id)
      bulkMarkAsRead(ids).catch(console.error)
    }
  }, [nonMessageNotifications.length, bulkMarkAsRead])

  const filteredNotifications = nonMessageNotifications.filter(n => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return n.isUnread
    if (activeFilter === 'applications') return n.category === 'applications'
    if (activeFilter === 'ai-alerts') return n.category === 'ai-alerts'
    return true
  })

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredNotifications.map(n => n.id)
    const areAllSelected = allFilteredIds.every(id => selectedIds.includes(id))

    if (areAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const uniqueIds = new Set([...prev, ...allFilteredIds])
        return Array.from(uniqueIds)
      })
    }
  }

  const handleBulkMarkRead = () => {
    bulkMarkAsRead(selectedIds)
    toast.success(`Marked ${selectedIds.length} notification${selectedIds.length > 1 ? 's' : ''} as read`)
    setSelectedIds([])
  }

  const handleBulkDelete = () => {
    bulkDelete(selectedIds)
    toast.success(`Deleted ${selectedIds.length} notification${selectedIds.length > 1 ? 's' : ''}`)
    setSelectedIds([])
  }

  const areAllFilteredSelected = filteredNotifications.length > 0 && 
    filteredNotifications.map(n => n.id).every(id => selectedIds.includes(id))

  const countUnread = (category: 'applications' | 'ai-alerts' | 'all') => {
    if (category === 'all') {
      return nonMessageNotifications.filter(n => n.isUnread).length
    }
    return nonMessageNotifications.filter(n => n.category === category && n.isUnread).length
  }

  const handleNotificationClick = async (notif: Notification) => {
    if (notif.isUnread) {
      markAsRead(notif.id)
    }
    if (isPartnershipNotif(notif)) {
      const targetTab = activeRole === 'university' ? 'Partnership Hub' : 'Network'
      const currentTab = searchParams.get('tab')
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.set('tab', targetTab)
      router.push(`/dashboard?${newParams.toString()}`)
      return
    }
    if (notif.applicationId) {
      const suffix = (notif.title?.toLowerCase().includes('interview') || notif.description?.toLowerCase().includes('interview')) 
        ? '#interview' 
        : ''
      router.push(`/application/${notif.applicationId}${suffix}`)
    } else if (user) {
      try {
        const colRef = collection(db, 'applications')
        const fieldName = activeRole === 'university' ? 'targetUniversityId' : 'agentId'
        const q = query(colRef, where(fieldName, '==', user.uid))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const desc = (notif.description || '').toLowerCase()
          const title = (notif.title || '').toLowerCase()
          
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
          
          const suffix = (notif.title?.toLowerCase().includes('interview') || notif.description?.toLowerCase().includes('interview')) 
            ? '#interview' 
            : ''
          router.push(`/application/${targetAppId}${suffix}`)
        } else {
          router.push('/applications')
        }
      } catch (err) {
        console.error("Error finding fallback application in list:", err)
        router.push('/applications')
      }
    } else {
      router.push('/applications')
    }
  }

  return (
    <div className="space-y-6 font-outfit max-w-5xl">
      {nonMessageNotifications.some(n => n.isUnread) && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              markAllAsRead()
              toast.success('All notifications marked as read')
            }}
            className="px-4 py-3 bg-grad-blue/5 hover:bg-grad-blue/10 text-grad-blue rounded-xl font-bold text-xs transition-colors cursor-pointer w-fit font-outfit"
          >
            Mark all as read
          </button>
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'unread', 'applications', 'ai-alerts'] as FilterType[]).map((filter) => {
          const isActive = activeFilter === filter
          let label = filter.charAt(0).toUpperCase() + filter.slice(1)
          if (filter === 'ai-alerts') label = 'System Alerts'
          
          let unreadBadge = 0
          if (filter === 'all' || filter === 'unread') {
            unreadBadge = nonMessageNotifications.filter(n => n.isUnread).length
          } else {
            unreadBadge = countUnread(filter as any)
          }

          return (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter)
                setSelectedIds([])
              }}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer border font-outfit ${
                isActive 
                  ? 'bg-grad-text-main border-grad-text-main text-white shadow-sm' 
                  : 'bg-grad-card-bg border-grad-border text-grad-text-sub hover:bg-grad-bg'
              }`}
            >
              <span>{label}</span>
              {unreadBadge > 0 && (
                <span className={`text-[9px] px-2.5 py-0.5 rounded-xl font-black leading-none border transition-all ${
                  isActive 
                    ? 'bg-white/20 border-white/10 text-white font-outfit' 
                    : 'bg-red-50 text-red-700 border-red-200 font-outfit'
                }`}>
                  {unreadBadge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filteredNotifications.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-4 bg-grad-bg border border-grad-border rounded-xl">
          <button
            onClick={handleSelectAll}
            className="text-grad-text-sub hover:text-grad-text-main transition-colors cursor-pointer flex items-center gap-2 text-xs font-black font-outfit"
          >
            {areAllFilteredSelected ? (
              <CheckSquare size={16} className="text-grad-blue" />
            ) : (
              <Square size={16} />
            )}
            <span>{areAllFilteredSelected ? 'Deselect All' : 'Select All matching'}</span>
          </button>
          <div className="h-4 w-[1px] bg-grad-border" />
          <span className="text-xs text-grad-text-sub font-bold font-outfit">
            Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-16 bg-grad-card-bg rounded-2xl border border-grad-border shadow-xs flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-16 h-16 bg-grad-bg rounded-2xl flex items-center justify-center text-grad-text-sub/40 mb-4 border border-grad-border">
                <Bell size={28} />
              </div>
              <h4 className="text-grad-text-main font-extrabold text-base font-outfit">Inbox quiet</h4>
              <p className="text-grad-text-sub max-w-sm mt-2 text-xs font-medium font-outfit">
                No notifications match your chosen filter. You are all caught up!
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notif) => {
              const isSelected = selectedIds.includes(notif.id)
              
              let Icon = FileText
              let bgClass = 'bg-blue-50 text-indigo-700 border border-blue-200'
              if (notif.category === 'messages') {
                Icon = MessageSquare
                bgClass = 'bg-amber-50 text-amber-700 border border-amber-200'
              } else if (notif.category === 'ai-alerts') {
                Icon = Sparkles
                bgClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }

              const titleL = (notif.title || '').toLowerCase()
              const descL = (notif.description || '').toLowerCase()

              if (isPartnershipNotif(notif)) {
                Icon = FileSignature
                bgClass = 'bg-blue-50 text-indigo-700 border border-blue-200'
              }
              else if (
                titleL.includes('interview') || 
                descL.includes('interview') || 
                titleL.includes('meet') || 
                descL.includes('meet')
              ) {
                Icon = CalendarDays
                bgClass = 'bg-blue-50 text-indigo-700 border border-blue-200'
              }
              else if (
                titleL.includes('incomplete') || 
                descL.includes('incomplete') || 
                titleL.includes('action needed') || 
                descL.includes('action needed')
              ) {
                Icon = AlertTriangle
                bgClass = 'bg-amber-50 text-amber-700 border border-amber-250'
              }
              else if (
                titleL.includes('reject') || 
                descL.includes('reject') || 
                titleL.includes('rejection') || 
                descL.includes('rejection')
              ) {
                Icon = XCircle
                bgClass = 'bg-red-50 text-red-700 border border-red-200'
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
                bgClass = 'bg-green-50 text-green-700 border border-green-200'
              }

              return (
                <motion.div
                  key={notif.id}
                  layoutId={notif.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`bg-grad-card-bg border rounded-2xl p-6 shadow-xs hover:shadow-sm transition-all flex gap-4 items-start relative group cursor-pointer ${
                    isSelected ? 'border-grad-blue ring-4 ring-grad-blue/5 bg-grad-bg/40' : 'border-grad-border hover:border-grad-border/80'
                  } ${notif.isUnread ? 'border-l-4 border-l-grad-blue' : ''}`}
                >
                  <button
                    onClick={(e) => handleToggleSelect(e, notif.id)}
                    className="mt-1 transition-colors hover:text-grad-blue cursor-pointer text-grad-text-sub shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare size={18} className="text-grad-blue" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0 pr-10">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className={`text-sm sm:text-base font-outfit ${notif.isUnread ? 'font-black text-grad-text-main' : 'font-semibold text-grad-text-sub'}`}>
                        {notif.title}
                      </span>
                      {notif.isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-grad-blue" />
                      )}
                      
                      <span className={`text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-xl border ${
                        notif.category === 'ai-alerts' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : notif.category === 'applications' 
                            ? 'bg-blue-50 text-indigo-700 border-blue-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {notif.category === 'ai-alerts' ? 'System Alert' : notif.category === 'applications' ? 'Application' : 'Message'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-grad-text-sub mt-2 leading-relaxed font-medium font-outfit">
                      {notif.description}
                    </p>

                    <div className="flex items-center gap-1.5 mt-4 text-[10px] sm:text-xs font-semibold text-grad-text-sub/70 font-outfit">
                      <Clock size={12} />
                      <span>{notif.createdAt}</span>
                    </div>
                  </div>

                  <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all bg-grad-card-bg pl-3">
                    {notif.isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notif.id)
                          toast.success('Notification marked as read')
                        }}
                        className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer border border-emerald-200"
                        title="Mark as Read"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                        toast.success('Notification deleted')
                      }}
                      className="p-2 text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-grad-card-bg px-6 py-4 rounded-2xl border border-grad-border flex items-center gap-6 z-50 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-grad-blue/10 flex items-center justify-center text-xs font-black text-grad-blue font-outfit">
                {selectedIds.length}
              </div>
              <p className="text-xs font-black text-grad-text-main font-outfit">selected</p>
            </div>

            <div className="h-5 w-[1px] bg-grad-border" />

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="px-4 py-3 bg-grad-text-main hover:bg-grad-text-main/90 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer outline-none shadow-xs font-outfit"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>Mark Read</span>
              </button>

              <button
                onClick={handleBulkDelete}
                className="px-4 py-3 bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 text-red-700 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer outline-none font-outfit"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-3 text-grad-text-sub hover:text-grad-text-main text-xs font-bold rounded-xl transition-all cursor-pointer font-outfit"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}