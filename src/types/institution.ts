export type StudyLevel = 'diploma' | 'bachelor' | 'master' | 'doctorate';

export interface InstitutionDocRequirement {
  docId: string;
  displayName: string;
  description: string;
  isMandatory: boolean;
  maxFileSize: string; // e.g., "5MB"
  allowedExtensions: string[]; // e.g., [".pdf", ".jpg"]
  enabledLevels: { [key in StudyLevel]: boolean }; // 🌟 Tracks level toggle states
  isEitherOr?: boolean; // 🔄 Option to make it either/or with another document
  eitherOrDocId?: string; // The docId of the alternative document
  eitherOrName?: string; // Cache the display name of the alternative document for quick rendering
}

export interface InstitutionMatrixConfig {
  institutionId: string; // e.g., "global_college_malta"
  requirements: InstitutionDocRequirement[];
  updatedAt: string;
}
