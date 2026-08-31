"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  Timestamp, 
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  title: string;
  description: string;
  category: 'applications' | 'messages' | 'ai-alerts';
  isUnread: boolean;
  createdAt: string;
  date: Date;
  applicationId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  bulkMarkAsRead: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
}

// Centralized error handling now imported from lib/firebase

// Friendly semantic helper to display time differences
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, activeRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.uid;
  const universityId = profile?.universityId;
  const isSuperAdmin = profile?.roles?.includes('superadmin');

  // Sync notifications with Firestore in real-time
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, 'notifications');
    
    // Listen to notifications strictly based on activeRole to ensure clean counters and complete isolation!
    let targetIds: string[] = [];
    if (activeRole === 'agent') {
      targetIds = [userId];
    } else if (activeRole === 'university') {
      if (universityId) {
        targetIds = [universityId];
      } else {
        targetIds = [userId];
      }
    } else if (activeRole === 'superadmin') {
      targetIds = ['university_admin'];
      if (universityId) {
        targetIds.push(universityId);
      }
    } else {
      // General fallback
      targetIds = [userId];
      if (universityId) {
        targetIds.push(universityId);
      }
      if (isSuperAdmin) {
        targetIds.push('university_admin');
      }
    }

    if (targetIds.length === 0) {
      targetIds = [userId];
    }

    const targetQuery = query(colRef, where('userId', 'in', targetIds));

    const parseDocs = (snapshotDocs: any[]): Notification[] => {
      const fetched: Notification[] = snapshotDocs.map(docSnap => {
        const data = docSnap.data();
        let firestoreDate = new Date();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            firestoreDate = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            firestoreDate = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            firestoreDate = new Date(data.createdAt);
          }
        }
        return {
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'applications',
          isUnread: !!data.isUnread,
          createdAt: formatTimeAgo(firestoreDate),
          date: firestoreDate,
          applicationId: data.applicationId
        };
      });
      fetched.sort((a, b) => b.date.getTime() - a.date.getTime());
      return fetched;
    };

    const unsubscribe = onSnapshot(targetQuery, (snapshot) => {
      setNotifications(parseDocs(snapshot.docs));
      setLoading(false);
    }, (error) => {
      console.warn("Notice: Notifications onSnapshot caught error, using fallback:", error?.message || error);
      getDocs(targetQuery).then(snapshot => {
        setNotifications(parseDocs(snapshot.docs));
      }).catch(err => {
        console.warn("Notice: Notifications fallback fetch error:", err?.message || err);
      }).finally(() => {
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, [userId, universityId, isSuperAdmin, activeRole]);

  const unreadCount = useMemo(() => notifications.filter(n => n.isUnread).length, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n));
    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, { isUnread: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => n.isUnread).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
    try {
      const batch = writeBatch(db);
      unreadIds.forEach(id => {
        const docRef = doc(db, 'notifications', id);
        batch.update(docRef, { isUnread: false });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const docRef = doc(db, 'notifications', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  }, []);

  const bulkMarkAsRead = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, isUnread: false } : n));
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, 'notifications', id);
        batch.update(docRef, { isUnread: false });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }, []);

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, 'notifications', id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }, []);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkMarkAsRead,
    bulkDelete
  }), [
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkMarkAsRead,
    bulkDelete
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}