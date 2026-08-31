// File: src/hooks/useAdmin.ts

import { useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { UserStatus, DropdownSettings } from '../types/admin';

export function useAdmin() {
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const currentAdmin = auth.currentUser;

  const logAction = async (
    actionType: 'USER_APPROVE' | 'USER_SUSPEND' | 'COMMISSION_ADJUST' | 'SETTINGS_MUTATE' | 'IMPERSONATION_START' | 'EMERGENCY_BROADCAST',
    targetEntityId: string,
    details: string
  ) => {
    try {
      const logPayload = {
        timestamp: new Date().toISOString(),
        adminEmail: currentAdmin?.email || 'bec.edu.nep@gmail.com', // fallback to authenticated superadmin
        actionType,
        targetEntityId,
        details,
      };

      await addDoc(collection(db, 'system_logs'), logPayload);
    } catch (error) {
      console.error("Audit log critical failure:", error);
      // We do not block the UI on audit logging failure, but we log it.
    }
  };

  const mutateAccountStatus = async (
    collectionName: 'agents' | 'universities',
    id: string,
    current: UserStatus,
    next: UserStatus
  ): Promise<void> => {
    setIsMutating(true);
    const path = `${collectionName}/${id}`;
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { status: next }, { merge: true });
      
      // Sync status to the user profile document in 'users' collection so they are unlocked or locked from login/routing
      const userRef = doc(db, 'users', id);
      await setDoc(userRef, { status: next }, { merge: true });
      
      const actionType = next === 'approved' ? 'USER_APPROVE' : 'USER_SUSPEND';
      const entityLabel = collectionName === 'agents' ? 'Recruitment Agent' : 'University Client';
      await logAction(
        actionType,
        id,
        `Shifted ${entityLabel} status from '${current}' to '${next}' via unified admin controls.`
      );
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw new Error(error?.message || 'Clearance status mutation failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const adjustCommission = async (
    agentId: string,
    currentRate: number,
    nextRate: number
  ): Promise<void> => {
    setIsMutating(true);
    const path = `agents/${agentId}`;
    try {
      const docRef = doc(db, 'agents', agentId);
      // Update custom commercials structure
      await setDoc(docRef, {
        commercials: {
          baseCommissionPercentage: nextRate
        },
        // Update root field too for database backwards-compatibility
        baseCommissionPercentage: nextRate
      }, { merge: true });

      await logAction(
        'COMMISSION_ADJUST',
        agentId,
        `Adjusted contractual commission mapping from ${currentRate}% to ${nextRate}% for agent.`
      );
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw new Error(error?.message || 'Commission adjustment rejected.');
    } finally {
      setIsMutating(false);
    }
  };

  const updateGlobalSettings = async (
    settingKey: keyof DropdownSettings,
    updatedList: string[]
  ): Promise<void> => {
    setIsMutating(true);
    const path = `platform_settings/configurations`;
    try {
      const docRef = doc(db, 'platform_settings', 'configurations');
      await setDoc(docRef, { [settingKey]: updatedList }, { merge: true });

      await logAction(
        'SETTINGS_MUTATE',
        'configurations',
        `Altered global configurations drop-down index for: ${String(settingKey)}`
      );
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw new Error(error?.message || 'Updating platform settings failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const dispatchEmergencyAnnouncement = async (
    message: string,
    targetAudience: 'all' | 'agents' | 'universities'
  ): Promise<void> => {
    setIsMutating(true);
    const path = `system_announcements`;
    try {
      await addDoc(collection(db, 'system_announcements'), {
        message,
        targetAudience,
        timestamp: new Date().toISOString(),
        senderEmail: currentAdmin?.email || 'bec.edu.nep@gmail.com',
        active: true
      });

      await logAction(
        'EMERGENCY_BROADCAST',
        'global',
        `Broadcasted terminal notification dispatcher warning to [${targetAudience}] audience.`
      );
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw new Error(error?.message || 'Emergency broadcast dispatch failed.');
    } finally {
      setIsMutating(false);
    }
  };

  return {
    mutateAccountStatus,
    adjustCommission,
    updateGlobalSettings,
    dispatchEmergencyAnnouncement,
    isMutating
  };
}
