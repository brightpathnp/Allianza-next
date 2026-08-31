export interface DocumentRequirementRule {
  docId: string;
  displayName: string;
  description: string;
  isMandatory: boolean;
  maxSizeBytes: number;
  allowedExtensions: string[];
}

export interface ComplianceMatrixRule {
  ruleId: string; // E.g., "NP_MT"
  sourceCountry: string; // ISO Code "NP"
  destinationCountry: string; // ISO Code "MT"
  isActive: boolean;
  requirements: DocumentRequirementRule[];
  updatedAt: string;
}

export interface ApplicationChecklistItem extends DocumentRequirementRule {
  uploadedUrl?: string;
  uploadedAt?: string;
  verificationStatus: 'missing' | 'pending_review' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface StudentApplication {
  id: string;
  studentName: string;
  sourceCountry: string;
  destinationCountry: string;
  checklist: ApplicationChecklistItem[];
  status: 'draft' | 'submitted_to_university' | 'visa_processing' | 'archived';
  submittedAt?: string;
  complianceLocked?: boolean;
}
