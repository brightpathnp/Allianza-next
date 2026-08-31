import express, { Request, Response } from 'express';
import multer from 'multer';
import { GoogleGenAI, Type, Schema } from '@google/genai';

import { getAi } from '../../lib/gemini-init';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // Caps memory parsing stream at 15MB
});

// Configure exact rigid schemas matching the visual ledger items
const ledgerRuleItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    displayName: {
      type: Type.STRING,
      description: "Clean title headers for processing grids (e.g., 'School Enrolment Letter', 'Sponsor Financial Guarantee Summary')."
    },
    description: {
      type: Type.STRING,
      description: "Extracted visa details, constraints, bank parameters, and conditions explicitly parsed from text frameworks."
    },
    isMandatory: {
      type: Type.BOOLEAN,
      description: "True if indicated as mandatory or highly critical for successful visa authorization processes."
    },
    maxFileSize: {
      type: Type.STRING,
      description: "Safe file bounds constraint parameter matching requirements profile, defaulting standardly to '5 MEGABYTE'."
    },
    allowedExtensions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Allowed file extensions vector based on target document profile (e.g., ['.pdf'] or ['.pdf', '.jpg'])."
    }
  },
  required: ["displayName", "description", "isMandatory", "maxFileSize", "allowedExtensions"]
};

const pipelineMatrixSchema: Schema = {
  type: Type.ARRAY,
  items: ledgerRuleItemSchema,
  description: "Normalized array checklist matching processing pipelines."
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
        console.warn(`Gemini API transient failure in matrix extraction (status: ${error.status || 'unknown'}). Retrying attempt ${attempt}/${retries} in ${delay * attempt}ms...`);
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

router.post('/extract-matrix', upload.single('matrixFile'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Target file binary data array context absent.' });
      return;
    }

    const { sourceIso, targetIso } = req.body;

    // Convert document block straight to base64 encoding inline part mapping
    const promptDocumentAsset = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      }
    };

    const enforcementSystemRules = `
      You are an expert global visa systems integration specialist. Process the attached compliance document file rules thoroughly.
      Isolate every single mandatory, conditional, or optional documentation requirement mentioned for target pathway route: ${sourceIso} to ${targetIso}.
      
      CRITICAL DATA RULE EXTRACTION PARAMETERS:
      - Isolate distinct details regarding expiration limits and specific guidelines (e.g., 'Passport must maintain 10 months validity remaining', 'Bank statement matching 75% of national minimum wages updates').
      - Isolate sub-conditional structures cleanly (e.g., If tracking Sponsor files, separate into individual requirements: 'Sponsor Bank Statement', 'Signed Declaration Letter from Sponsor', 'Sponsor ID Passport Bio Page').
    `;

    const instructionsPrompt = `
      Parse the attached guidelines data matrix asset. 
      Map every requirement discovered straight into the output response schema framework array format.
    `;

    // Trigger generate content with retry and fallback mechanics
    const executionResult = await callGeminiWithRetry({
      model: 'gemini-3.5-flash',
      contents: [promptDocumentAsset, instructionsPrompt],
      config: {
        systemInstruction: enforcementSystemRules,
        responseMimeType: 'application/json',
        responseSchema: pipelineMatrixSchema,
        temperature: 0.7
      }
    });

    const resultingJsonText = executionResult.text;
    if (!resultingJsonText) throw new Error("Empty character generation exception returned from processing center.");

    // Inject unique document tracking ids to items on backend array structures
    const rawRequirements = JSON.parse(resultingJsonText);
    const finalizedRequirements = rawRequirements.map((item: any, idx: number) => ({
      ...item,
      docId: `ai_rule_${Date.now()}_${idx}`
    }));

    res.status(200).json({
      success: true,
      corridorId: `${sourceIso}_${targetIso}`,
      requirements: finalizedRequirements
    });

  } catch (error: any) {
    console.error('AI Configuration Engine Extraction Error:', error);
    res.status(500).json({ success: false, error: 'Ingestion pipeline execution failure.', details: error.message });
  }
});

export default router;

