import express, { Request, Response } from 'express';
import multer from 'multer';
import { getAdminApp, getFirestoreDb } from '@/lib/firebase-admin-init';
const admin = getAdminApp();
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getAi } from '../../lib/gemini-init';
import { ApplicationChecklistItem } from '@/types/compliance';

const router = express.Router();

// Configure memory stream handling for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB file ceiling
});

// Enforce an absolute JSON Response Schema for Gemini
const documentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    displayName: { type: Type.STRING, description: "Clean title of the document requirement." },
    description: { type: Type.STRING, description: "Embassy compliance or institutional validation guidelines." },
    isMandatory: { type: Type.BOOLEAN, description: "True if explicitly required for visa execution." },
    allowedExtensions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Logical format list like ['.pdf']" }
  },
  required: ["displayName", "description", "isMandatory", "allowedExtensions"]
};

const matrixResponseSchema: Schema = {
  type: Type.ARRAY,
  items: documentSchema,
  description: "Comprehensive array checklist extracted from the source matrix sheet."
};

// Helper to call Gemini with exponential backoff retries and fallback to lightweight model
async function callGeminiWithRetry(params: any, retries = 3, delay = 1500) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await getAi().models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const errorMsg = error.message || "";
      const isTransient = errorMsg.includes('429') || error.status === 429 || errorMsg.includes('503') || error.status === 503 || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('capacity') || errorMsg.includes('Resource has been exhausted');
      if (isTransient && attempt < retries) {
        console.warn(`Gemini API transient failure in compliance extraction (status: ${error.status || 'unknown'}). Retrying attempt ${attempt}/${retries} in ${delay * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } else {
        if (params.model === "gemini-3.5-flash" && isTransient) {
          console.warn("Attempting fallback to 'gemini-3.1-flash-lite' due to Gemini API resource constraints...");
          try {
            const fallbackParams = { ...params, model: "gemini-3.1-flash-lite" };
            return await getAi().models.generateContent(fallbackParams);
          } catch (fallbackError: any) {
            console.error("Fallback to 'gemini-3.1-flash-lite' also failed:", fallbackError);
          }
        }
        throw error;
      }
    }
  }
  throw new Error("Failed to call Gemini after multiple retries");
}

// --- ROUTE 1: MULTIMODAL AI PARSING ENGINE ---
router.post('/extract-pdf', upload.single('complianceFile'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Missing standard multipart file payload.' });
      return;
    }

    const pdfPart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    };

    const systemInstruction = `
      You are a specialized visa compliance clerk. Analyze the provided study visa requirement checklist document carefully.
      Extract every unique mandatory or optional submission record. Maintain precise historical parameters regarding timelines or bank metrics.
    `;

    const promptText = `Parse this file. Map every requirement found into the structured JSON schema format provided.`;

    const response = await callGeminiWithRetry({
      model: 'gemini-3.5-flash',
      contents: [pdfPart, promptText],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: matrixResponseSchema,
        temperature: 0.7
      }
    });

    if (!response.text) throw new Error("Empty model output.");

    res.status(200).json({
      success: true,
      recordCount: JSON.parse(response.text).length,
      checklistData: JSON.parse(response.text)
    });

  } catch (error: any) {
    console.error('Extraction Failure:', error);
    res.status(500).json({ success: false, error: 'Critical AI matrix parser execution fault.', details: error.message });
  }
});

// --- ROUTE 2: ATOMIC COMPLIANCE VALIDATOR & TRANSACTION DISPATCH ---
router.post('/validate-and-submit', async (req: Request, res: Response): Promise<void> => {
  const { applicationId } = req.body;
  if (!applicationId) {
    res.status(400).json({ success: false, error: 'Missing target applicationId parameters.' });
    return;
  }

  try {
    const db = getFirestoreDb();
    await db.runTransaction(async (transaction: any) => {
      const appRef = db.collection('applications').doc(applicationId);
      const appDoc = await transaction.get(appRef);

      if (!appDoc.exists) throw new Error('NOT_FOUND');

      const appData = appDoc.data();
      const checklist: ApplicationChecklistItem[] = appData?.checklist || [];

      if (appData?.status === 'submitted_to_university') {
        throw new Error('ALREADY_SUBMITTED');
      }

      // Check for any unverified mandatory items
      const complianceDefects = checklist.filter(item => item.isMandatory && item.verificationStatus !== 'approved');

      if (complianceDefects.length > 0) {
        const errorDetails = new Error('COMPLIANCE_FAILED');
        (errorDetails as any).defects = complianceDefects.map(d => ({ docId: d.docId, name: d.displayName }));
        throw errorDetails;
      }

      // Commit update atomically inside the transactional boundary block
      transaction.update(appRef, {
        status: 'submitted_to_university',
        submittedAt: new Date().toISOString(),
        complianceLocked: true
      });
    });

    res.status(200).json({ success: true, message: 'Application passed compliance audits. Dispatched to queue.' });

  } catch (error: any) {
    if (error.message === 'COMPLIANCE_FAILED') {
      res.status(400).json({ success: false, code: 'COMPLIANCE_VIOLATION', defects: error.defects });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal transactional matrix fault.', details: error.message });
  }
});

export default router;
