import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, updateDoc, doc, collectionGroup } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './authUtils';

export interface MessageAttachment {
  fileName: string;
  fileUrl: string;
  fileSize?: string;
}

export interface ApplicationMessage {
  id?: string;
  studentRefNo: string;
  studentName: string;
  courseName: string;
  senderId: string; // Agent user ID or University user ID
  receiverId: string; // University ID or Agent user ID
  senderName?: string;
  messageCategory: 'Pending Documents' | 'Visa Query' | 'Tuition Fee' | 'Entry Requirements' | 'Interview' | 'Scholarship' | 'Admissions Enquiry' | 'Other Query' | 'General';
  subject: string;
  messageBody: string;
  attachments: MessageAttachment[];
  isReadByReceiver: boolean;
  timestamp: any;
}

/**
 * Saves a new message payload into flat 'application_messages' collection with server timestamp.
 */
export async function addMessage(messagePayload: Omit<ApplicationMessage, 'timestamp' | 'id'>): Promise<string> {
  const path = `conversations/${messagePayload.studentRefNo}/messages`;
  try {
    const docRef = await addDoc(collection(db, path), {
      ...messagePayload,
      timestamp: serverTimestamp(),
    });

    try {
      // Create a companion real-time notification document for the receiver
      await addDoc(collection(db, 'notifications'), {
        userId: messagePayload.receiverId,
        applicationId: messagePayload.studentRefNo, // studentRefNo acts as the application ID reference here!
        title: 'New Student Message 💬',
        description: `New message on student: ${messagePayload.studentName || 'Student'} regarding ${messagePayload.messageCategory}.`,
        category: 'messages',
        isUnread: true,
        createdAt: serverTimestamp()
      });
    } catch (notifErr) {
      console.error("Non-blocking message notification error:", notifErr);
    }
    
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Marks a message as read by receiver.
 */
export async function markMessageAsRead(studentRefNo: string, messageId: string): Promise<void> {
  const path = `conversations/${studentRefNo}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'conversations', studentRefNo, 'messages', messageId), {
      isReadByReceiver: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Real-time listener for incoming messages for a specific recipient (e.g. universityId or agentId).
 */
export function subscribeToIncomingMessages(
  receiverId: string,
  onNext: (messages: ApplicationMessage[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'messages';
  const q = query(
    collectionGroup(db, path),
    where('receiverId', '==', receiverId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ApplicationMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as ApplicationMessage);
      });
      // Sort locally to prevent index limits
      messages.sort((a, b) => {
         const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
         const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
         return tB - tA; // Descending
      });
      onNext(messages);
    },
    (err) => {
      console.error('Error listening to incoming application messages:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr);
        return;
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for messages sent by a specific sender.
 */
export function subscribeToSentMessages(
  senderId: string,
  onNext: (messages: ApplicationMessage[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'messages';
  const q = query(
    collectionGroup(db, path),
    where('senderId', '==', senderId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ApplicationMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as ApplicationMessage);
      });
      messages.sort((a, b) => {
         const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
         const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
         return tB - tA; // Descending
      });
      onNext(messages);
    },
    (err) => {
      console.error('Error listening to sent messages:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrappedErr) {
        if (onError) onError(wrappedErr);
        return;
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for a single specific conversation thread.
 */
export function subscribeToConversation(
  studentRefNo: string,
  onNext: (messages: ApplicationMessage[]) => void,
  onError?: (error: unknown) => void
) {
  const path = `conversations/${studentRefNo}/messages`;
  const q = query(
    collection(db, path),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ApplicationMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as ApplicationMessage);
      });
      onNext(messages);
    },
    (err) => {
      console.error('Error listening to conversation thread:', err);
      if (onError) onError(err);
    }
  );
}
