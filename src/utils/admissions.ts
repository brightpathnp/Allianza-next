import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InstitutionMatrixConfig, StudyLevel } from '../types/institution';

/**
 * Resolves the precise list of admission requirements a student must clear
 * based on their university selection and target level of study.
 */
export async function resolveStudentAdmissionChecklist(
  chosenInstitutionId: string, 
  studentStudyLevel: StudyLevel // e.g., 'bachelor' or 'master'
) {
  const matrixRef = doc(db, 'institution_matrices', chosenInstitutionId);
  const matrixSnap = await getDoc(matrixRef);

  if (!matrixSnap.exists()) {
    return []; // Return clean empty arrays if no specific criteria is set up yet
  }

  const matrixData = matrixSnap.data() as InstitutionMatrixConfig;
  
  // 🌟 Filter out and return requirements matching the student's level of study
  return matrixData.requirements.filter(req => {
    return req.enabledLevels[studentStudyLevel] === true;
  });
}
