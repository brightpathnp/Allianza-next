'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MessageSquare, ArrowRight, MailOpen, Paperclip, Check, CheckCheck, Send, Loader2, ChevronRight, ChevronLeft, FileText } from 'lucide-react'
import { subscribeToIncomingMessages, subscribeToSentMessages, markMessageAsRead, addMessage, ApplicationMessage } from '@/lib/messagingService'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { toast } from 'sonner'
import ComplianceChatWorkspace from './ComplianceChatWorkspace'
import { CentralLoader } from './CentralLoader'
import { toTitleCase } from '@/utils/textUtils'

interface ConversationSummary {
  studentRefNo: string
  studentName: string
  latestMessage: ApplicationMessage
  unreadCount: number
}

export const InboxLedgerView: React.FC = () => {
  const { profile, activeRole } = useAuth()
  const { notifications, bulkMarkAsRead } = useNotifications()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRef = searchParams.get('ref')

  const [messages, setMessages] = useState<ApplicationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Unread'>('All')

  const [activeConversationRef, setActiveConversationRef] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<ApplicationMessage[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  
  const [replyBody, setReplyBody] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  const currentUserId = profile?.uid || ''
  const universityId = profile?.universityId || ''
  const currentRecipientId = activeRole === 'university' ? universityId : currentUserId

  useEffect(() => {
    if (!currentRecipientId) {
      setLoading(false)
      return
    }

    setLoading(true)
    let unsubscribeIncoming: () => void
    let unsubscribeSent: () => void
    let mergedMessages: Record<string, ApplicationMessage> = {}

    const updateMessages = () => {
      setMessages(Object.values(mergedMessages).sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0)
        const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0)
        return tB - tA
      }))
      setLoading(false)
    }

    const handleNextIncoming = (receivedList: ApplicationMessage[]) => {
      receivedList.forEach(m => { if (m.id) mergedMessages[m.id] = m })
      updateMessages()
    }

    const handleNextSent = (sentList: ApplicationMessage[]) => {
      sentList.forEach(m => { if (m.id) mergedMessages[m.id] = m })
      updateMessages()
    }

    if (activeRole === 'university') {
      unsubscribeIncoming = subscribeToIncomingMessages(currentRecipientId, handleNextIncoming, (err) => {
        console.error('Subscription error:', err)
        setLoading(false)
      })
      unsubscribeSent = subscribeToSentMessages(currentRecipientId, handleNextSent)
    } else {
      unsubscribeIncoming = subscribeToIncomingMessages(currentUserId, handleNextIncoming, () => setLoading(false))
      unsubscribeSent = subscribeToSentMessages(currentUserId, handleNextSent)
    }

    return () => {
      if (unsubscribeIncoming) unsubscribeIncoming()
      if (unsubscribeSent) unsubscribeSent()
    }
  }, [currentRecipientId, currentUserId, activeRole])

  useEffect(() => {
    if (!activeConversationRef) {
      setThreadMessages([])
      return
    }
    
    setIsLoadingThread(true)
    const msgs = messages
      .filter((m) => m.studentRefNo === activeConversationRef)
      .sort((a, b) => {
         const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0)
         const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0)
         return tA - tB
      })
      
    setThreadMessages(msgs)
    setIsLoadingThread(false)

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    msgs.forEach(m => {
      if (m.receiverId === currentRecipientId && !m.isReadByReceiver && m.id) {
        markMessageAsRead(activeConversationRef, m.id).catch(console.error)
      }
    })
  }, [activeConversationRef, messages, currentRecipientId])

  useEffect(() => {
    if (activeConversationRef && notifications.length > 0) {
      const messageNotifsToClear = notifications
        .filter(n => n.isUnread && n.category === 'messages' && n.applicationId === activeConversationRef)
        .map(n => n.id)
      
      if (messageNotifsToClear.length > 0) {
        bulkMarkAsRead(messageNotifsToClear).catch(console.error)
      }
    }
  }, [activeConversationRef, notifications, bulkMarkAsRead])

  const conversationsMap = new Map<string, ConversationSummary>()
  messages.forEach(msg => {
    const existing = conversationsMap.get(msg.studentRefNo)
    const isUnreadForMe = msg.receiverId === currentRecipientId && !msg.isReadByReceiver
    
    if (!existing) {
      conversationsMap.set(msg.studentRefNo, {
        studentRefNo: msg.studentRefNo,
        studentName: msg.studentName,
        latestMessage: msg,
        unreadCount: isUnreadForMe ? 1 : 0
      })
    } else {
      const existingTime = existing.latestMessage.timestamp?.toDate ? existing.latestMessage.timestamp.toDate().getTime() : 0
      const newTime = msg.timestamp?.toDate ? msg.timestamp.toDate().getTime() : 0
      
      if (newTime > existingTime) {
        existing.latestMessage = msg
      }
      if (isUnreadForMe) existing.unreadCount += 1
    }
  })

  const conversationSummaries = Array.from(conversationsMap.values())

  useEffect(() => {
    if (urlRef) {
      const decodedRef = decodeURIComponent(urlRef)
      if (conversationsMap.has(decodedRef)) {
        setActiveConversationRef(decodedRef)
      } else {
        const match = conversationSummaries.find(c => 
          c.studentRefNo.toLowerCase() === decodedRef.toLowerCase() ||
          (c.studentName && c.studentName.toLowerCase().includes(decodedRef.toLowerCase()))
        )
        if (match) {
          setActiveConversationRef(match.studentRefNo)
        } else {
          setActiveConversationRef(decodedRef)
        }
      }
    }
  }, [urlRef, messages.length])

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Pending Documents': return 'bg-amber-50 text-amber-700 border-amber-200/50'
      case 'Visa Query': return 'bg-blue-50 text-indigo-700 border-blue-200'
      case 'Tuition Fee': return 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
      case 'Entry Requirements': return 'bg-blue-50 text-blue-700 border-blue-200/50'
      case 'Interview': return 'bg-rose-50 text-rose-700 border-rose-200/50'
      case 'Scholarship': return 'bg-cyan-50 text-cyan-700 border-cyan-200/50'
      case 'Admissions Enquiry': return 'bg-sky-50 text-sky-700 border-sky-200/50'
      default: return 'bg-slate-50 text-slate-700 border-slate-200/50'
    }
  }
  
  const getCategoryColorText = (category: string) => {
    switch (category) {
      case 'Pending Documents': return 'text-amber-700'
      case 'Visa Query': return 'text-indigo-700'
      case 'Tuition Fee': return 'text-emerald-700'
      case 'Entry Requirements': return 'text-blue-500'
      case 'Interview': return 'text-rose-500'
      case 'Scholarship': return 'text-cyan-600'
      case 'Admissions Enquiry': return 'text-sky-600'
      default: return 'text-slate-500'
    }
  }

  const filteredConversations = conversationSummaries.filter((summary) => {
    const msg = summary.latestMessage
    const term = searchQuery.toLowerCase().trim()
    
    let textMatch = true
    if (term) {
      const name = msg.studentName?.toLowerCase() || ''
      const rawName = msg.studentName || ''
      textMatch = 
        name.startsWith(term) || 
        !!rawName.split(' ').find(w => w.toLowerCase().startsWith(term)) ||
        msg.studentRefNo?.toLowerCase().includes(term) ||
        msg.messageBody?.toLowerCase().includes(term) ||
        false
    }

    const categoryMatch = selectedCategory === 'All' || msg.messageCategory === selectedCategory
    const statusMatch = selectedStatus === 'All' || summary.unreadCount > 0

    return textMatch && categoryMatch && statusMatch
  })

  const getUnreadCount = () => {
    return conversationSummaries.filter(c => c.unreadCount > 0).length
  }

  const getCountByCategory = (catName: string) => {
    if (loading) return 0
    const baseList = conversationSummaries.filter(c => selectedStatus === 'All' || c.unreadCount > 0)
    if (catName === 'All') return baseList.length
    return baseList.filter(c => c.latestMessage.messageCategory === catName).length
  }

  const handleSendReply = async (e?: React.FormEvent, customText?: string, customAttachments?: any[]) => {
    if (e && e.preventDefault) e.preventDefault()
    const txt = customText !== undefined ? customText : replyBody
    const hasAttachments = customAttachments && customAttachments.length > 0
    if ((!txt.trim() && !hasAttachments) || !activeConversationRef || threadMessages.length === 0) return

    setIsSendingReply(true)
    try {
      const senderName = profile?.institutionName || profile?.fullName || 'University Partner'
      const lastMsg = threadMessages[threadMessages.length - 1] 
      
      const receiverId = lastMsg.senderId === currentRecipientId ? lastMsg.receiverId : lastMsg.senderId
      
      const attachmentsPayload = hasAttachments ? customAttachments.map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize || ''
      })) : []

      const payload = {
        studentRefNo: activeConversationRef,
        studentName: lastMsg.studentName || 'Student',
        courseName: lastMsg.courseName || 'General Program',
        senderId: currentRecipientId,
        receiverId, 
        senderName,
        messageCategory: lastMsg.messageCategory || 'Pending Documents', 
        subject: `Re: ${lastMsg.subject || 'Follow up'}`,
        messageBody: txt.trim() || `Sent ${attachmentsPayload.length} attachment(s)`,
        attachments: attachmentsPayload, 
        isReadByReceiver: false,
      }

      await addMessage(payload)
      if (customText === undefined) {
        setReplyBody('')
      }
    } catch (err: any) {
      console.error('Failed to reply:', err)
      toast.error('Could not send reply. Permissions or offline issues.')
    } finally {
      setIsSendingReply(false)
    }
  }

  const formatMsgTime = (ts: any) => {
    if (!ts) return ''
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()
    } catch { return '' }
  }

  const formatMsgDate = (ts: any) => {
    if (!ts) return ''
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts)
      const today = new Date()
      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      if (isToday) return 'Today'
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()
      if (isYesterday) return 'Yesterday'
      
      return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
    } catch { return '' }
  }

  const activeSummary = conversationsMap.get(activeConversationRef || '')

  return (
    <div className="space-y-6">
      {!activeConversationRef && (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search threads by student reference, name, or keyword..."
                className="w-full h-11 pl-11 pr-4 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-transparent transition-all border border-transparent hover:border-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100/60">
          {['All', 'Unread', 'Pending Documents', 'Visa Query', 'Tuition Fee', 'Entry Requirements'].map((cat) => {
            const isActive = cat === 'Unread' ? selectedStatus === 'Unread' : (selectedCategory === cat && selectedStatus === 'All')
            const count = cat === 'Unread' ? getUnreadCount() : getCountByCategory(cat)
            return (
              <button
                key={cat}
                onClick={() => {
                  if (cat === 'Unread') {
                    setSelectedStatus('Unread')
                    setSelectedCategory('All')
                  } else {
                    setSelectedStatus('All')
                    setSelectedCategory(cat)
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isActive 
                    ? 'bg-[#0052FF]/10 text-[#0052FF] border-[#0052FF]/20 font-extrabold' 
                    : 'bg-white border-slate-200/80 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {cat}
                {count > 0 && (
                  <span className={`px-4 py-0.5 rounded-xl text-[9px] font-extrabold ${isActive ? 'bg-[#0052FF] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      )}

      {!activeConversationRef ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <CentralLoader minHeight="min-h-[300px]" />
          ) : filteredConversations.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-sm">No active threads</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                  No conversations match your current filter. Start a thread from a student's profile!
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-4 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Latest Category</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Sender</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Latest Preview</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 pr-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConversations.map((summary) => {
                      const msg = summary.latestMessage
                      const isUnread = summary.unreadCount > 0
                      const isSentByMe = msg.senderId === currentRecipientId

                      return (
                        <tr 
                          key={summary.studentRefNo} 
                          onClick={() => setActiveConversationRef(summary.studentRefNo)}
                          className={`hover:bg-slate-50/80 border-b border-slate-100 transition-all cursor-pointer ${
                            isUnread ? 'bg-[#0052FF]/[0.02]' : ''
                          }`}
                        >
                          <td className="p-4 pl-6 align-middle">
                            <div className="flex items-center gap-2">
                              {isUnread && (
                                <span className="flex h-2 w-2 relative shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              )}
                              <div>
                                <p className={`text-sm ${isUnread ? 'font-black text-slate-900' : 'font-extrabold text-grad-text-main'} font-outfit`}>
                                  {toTitleCase(summary.studentName)}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider max-w-[120px]">{summary.studentRefNo}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 align-middle">
                            <span className={`inline-block px-4 py-1 rounded-full text-[10px] font-bold border ${getCategoryTheme(msg.messageCategory)}`}>
                              {msg.messageCategory}
                            </span>
                          </td>

                          <td className="p-4 align-middle">
                            <div>
                              <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                                {isSentByMe ? 'You' : msg.senderName || 'Authorized Officer'}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                {formatMsgDate(msg.timestamp)} • {formatMsgTime(msg.timestamp)}
                              </p>
                            </div>
                          </td>

                          <td className="p-4 align-middle min-w-[200px] max-w-[320px]">
                            <div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium max-w-[280px]">
                                {isSentByMe && <CheckCheck size={12} className="inline mr-1 text-[#0052FF]" />}
                                {msg.messageBody?.replace(/\*\*/g, '')}
                              </p>
                            </div>
                          </td>

                          <td className="p-4 align-middle">
                            {isUnread ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#0052FF] px-4 py-0.5 rounded-full shadow-sm shadow-[#0052FF]/30">
                                {summary.unreadCount} New
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-0.5 rounded-full border border-slate-200">
                                No new messages
                              </span>
                            )}
                          </td>

                          <td className="p-4 pr-6 align-middle text-right">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 px-4 py-3 bg-[#0052FF]/10 text-[#0052FF] hover:bg-[#0052FF] hover:text-white rounded-xl font-bold text-[10px] transition-all cursor-pointer"
                            >
                              Open Chat
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-100">
                {filteredConversations.map((summary) => {
                  const msg = summary.latestMessage
                  const isUnread = summary.unreadCount > 0
                  const isSentByMe = msg.senderId === currentRecipientId

                  return (
                    <div 
                      key={summary.studentRefNo} 
                      onClick={() => setActiveConversationRef(summary.studentRefNo)}
                      className={`p-5 hover:bg-slate-50/50 active:bg-slate-50 transition-colors cursor-pointer space-y-4 group ${
                        isUnread ? 'bg-[#0052FF]/[0.01]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <span className="flex h-2.5 w-2.5 relative shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          )}
                          <div>
                            <p className={`text-sm ${isUnread ? 'font-black text-slate-900' : 'font-extrabold text-grad-text-main'} font-outfit`}>
                              {toTitleCase(summary.studentName)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{summary.studentRefNo}</p>
                          </div>
                        </div>

                        {isUnread ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#0052FF] px-3 py-1 rounded-full shadow-sm shadow-[#0052FF]/30 shrink-0">
                            {summary.unreadCount} New
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 shrink-0">
                            No New
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryTheme(msg.messageCategory)}`}>
                          {msg.messageCategory}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {formatMsgDate(msg.timestamp)} • {formatMsgTime(msg.timestamp)}
                        </span>
                      </div>

                      <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 space-y-1.5">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                          Last Message By: <span className="text-slate-700 font-bold">{isSentByMe ? 'You' : msg.senderName || 'Authorized Officer'}</span>
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2 font-medium leading-relaxed">
                          {isSentByMe && <CheckCheck size={12} className="inline mr-1 text-[#0052FF]" />}
                          {msg.messageBody?.replace(/\*\*/g, '')}
                        </p>
                      </div>

                      <div className="flex pt-1">
                        <button
                          type="button"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#0052FF]/10 text-[#0052FF] hover:bg-[#0052FF] hover:text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                        >
                          Open Chat
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <ComplianceChatWorkspace 
          applicationId={activeConversationRef}
          studentName={activeSummary?.studentName ? toTitleCase(activeSummary.studentName) : 'Student'}
          threadMessages={threadMessages}
          currentUserId={currentRecipientId}
          isLoadingThread={isLoadingThread}
          onSendMessage={(txt, atts) => handleSendReply(undefined, txt, atts)}
          onClose={() => setActiveConversationRef(null)}
          isSendingReply={isSendingReply}
        />
      )}
    </div>
  )
}