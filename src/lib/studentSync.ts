import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

export interface StudentProfileData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  uploadedDocuments?: Record<string, any>;
}

/**
 * Syncs student profile and uploaded documents with the 'students' collection in Firestore.
 * If a student document matching agentId and email exists, it updates it (merging uploadedDocuments).
 * If no student document exists, it creates a new one in 'students' collection.
 */
export async function syncStudentProfile(
  agentId: string,
  studentData: StudentProfileData
): Promise<string | null> {
  if (!agentId || !studentData.email || !studentData.email.trim()) return null;

  const emailLower = studentData.email.trim().toLowerCase();

  try {
    const studentQuery = query(
      collection(db, 'students'),
      where('agentId', '==', agentId),
      where('email', '==', emailLower)
    );
    const studentSnap = await getDocs(studentQuery);

    const payloadToSync: any = {
      firstName: studentData.firstName?.trim() || '',
      middleName: studentData.middleName?.trim() || '',
      lastName: studentData.lastName?.trim() || '',
      email: emailLower,
      phone: studentData.phone?.trim() || '',
      nationality: studentData.nationality?.trim() || '',
      passportNumber: studentData.passportNumber?.trim() || '',
      dateOfBirth: studentData.dateOfBirth || '',
      gender: studentData.gender || '',
      updatedAt: serverTimestamp()
    };

    if (studentSnap.empty) {
      // Create new student profile if basic details are present
      const newDocRef = await addDoc(collection(db, 'students'), {
        ...payloadToSync,
        uploadedDocuments: studentData.uploadedDocuments || {},
        agentId,
        createdAt: serverTimestamp()
      });
      return newDocRef.id;
    } else {
      // Update existing student profile(s)
      let firstDocId = '';
      const updatePromises = studentSnap.docs.map((docSnap, index) => {
        if (index === 0) firstDocId = docSnap.id;
        const existingDocs = docSnap.data().uploadedDocuments || {};
        const mergedDocs = {
          ...existingDocs,
          ...(studentData.uploadedDocuments || {})
        };

        return updateDoc(docSnap.ref, {
          ...payloadToSync,
          uploadedDocuments: mergedDocs
        });
      });
      await Promise.all(updatePromises);
      return firstDocId;
    }
  } catch (err) {
    console.error('Error syncing student profile:', err);
    return null;
  }
}

/**
 * Removes a document slot from a student's profile in 'students' collection.
 */
export async function removeStudentDocumentSlot(
  agentId: string,
  email: string,
  slotId: string
): Promise<void> {
  if (!agentId || !email || !email.trim() || !slotId) return;

  const emailLower = email.trim().toLowerCase();

  try {
    const studentQuery = query(
      collection(db, 'students'),
      where('agentId', '==', agentId),
      where('email', '==', emailLower)
    );
    const studentSnap = await getDocs(studentQuery);

    const updatePromises = studentSnap.docs.map((docSnap) => {
      const existingDocs = { ...(docSnap.data().uploadedDocuments || {}) };
      delete existingDocs[slotId];
      return updateDoc(docSnap.ref, {
        uploadedDocuments: existingDocs,
        updatedAt: serverTimestamp()
      });
    });
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Error removing document slot from student profile:', err);
  }
}
