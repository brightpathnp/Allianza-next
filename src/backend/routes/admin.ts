import express, { Request, Response } from 'express';
import { getAdminApp, getFirestoreDb } from '@/lib/firebase-admin-init';
const admin = getAdminApp();
import { ApplicationChecklistItem } from '@/types/compliance';

const router = express.Router();

// POST Route: /api/admin/verify-document
router.post('/verify-document', async (req: Request, res: Response): Promise<void> => {
  const { applicationId, docId, status, rejectionReason } = req.body;

  // Validation Check Gate
  if (!applicationId || !docId || !status) {
    res.status(400).json({ success: false, error: 'Missing active operational validation parameters.' });
    return;
  }

  if (status === 'rejected' && !rejectionReason?.trim()) {
    res.status(400).json({ success: false, error: 'Rejection modifications require a tracking feedback reason log.' });
    return;
  }

  try {
    const db = getFirestoreDb();
    const appRef = db.collection('applications').doc(applicationId);
    
    await db.runTransaction(async (transaction: any) => {
      const appDoc = await transaction.get(appRef);
      if (!appDoc.exists) throw new Error('APPLICATION_NOT_FOUND');

      const appData = appDoc.data();
      const checklist: ApplicationChecklistItem[] = appData?.checklist || [];

      // Update targeted document criteria within the collection array
      const updatedChecklist = checklist.map((item) => {
        if (item.docId === docId) {
          return {
            ...item,
            verificationStatus: status,
            rejectionReason: status === 'rejected' ? rejectionReason.trim() : ""
          };
        }
        return item;
      });

      // Commit changes inside the transactional wrapper frame
      transaction.update(appRef, {
        checklist: updatedChecklist,
        lastReviewedAt: new Date().toISOString()
      });
    });

    res.status(200).json({ 
      success: true, 
      message: `Document milestone marker updated to ${status} successfully.` 
    });

  } catch (error: any) {
    console.error('Critical Document Audit Failure:', error);
    res.status(500).json({ success: false, error: 'Internal transaction database error.', details: error.message });
  }
});

export default router;
