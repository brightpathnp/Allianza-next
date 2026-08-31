export interface Program {
  name: string;
  fee?: string | null;
  discount?: string | null;
  scholarship?: string | null;
  level?: string | null;
  duration?: string | null;
  credit?: string | null;
  visaFee?: string | null;
  collegeApplicationDeadline?: string | null;
  visaSubmissionDeadline?: string | null;
  intake?: string | null;
  rncpNo?: string | null;
  totalTuitionFee?: string | null;
  firstYearFee?: string | null;
  firstYearFeeAfterDiscount?: string | null;
  adminCost?: string | null;
  accommodationFee?: string | null;
}

export interface University {
  id: string;
  name: string;
  country: string;
  website: string;
  programs: Program[];
  domains?: string[];
  levels?: string[];
  intakes?: string[];
  location?: string | null;
  fee?: string | null;
  currency?: string | null;
  applicationFee?: string | null;
  registrationFee?: string | null;
  vfsFee?: string | null;
  scholarship?: string | null;
  notes?: string[];
  alpha_two_code?: string;
  "state-province"?: string | null;
  ranking?: string | null;
  established?: string | null;
  studentCount?: string | null;
  institutionType?: string | null;
  description?: string | null;
  schoolId?: string | null;
  logo?: string;
}

export interface AgreementParameter {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface AgreementClause {
  id: string;
  title: string;
  text: string;
}

export interface InstitutionalAgreementSettings {
  institutionId: string;
  title: string;
  commissionAmount: string;
  commissionCurrency: string;
  agreementDuration: string;
  visaRefusalFee: string;
  templateUrl?: string;
  templateName?: string;
  additionalTerms?: string;
  parameters: AgreementParameter[];
  preamble?: string;
  clauses?: AgreementClause[];
  witnessWhereOf?: string;
  signatures?: {
    institution: string;
    agent: string;
    institutionSealUrl?: string;
    agentSealUrl?: string;
  };
  schedule1?: {
    title: string;
    table: { program: string; rate: string }[];
    note: string;
  };
  agreement_template?: string;
  updatedAt: any;
  updatedBy: string;
}

export interface AgreementRecord {
  id?: string;
  agentId: string;
  universityId: string;
  universityName: string;
  agentName: string;
  status: 'new' | 'under_review' | 'approved' | 'rejected' | 'signed';
  agentDetails: {
    companyName: string;
    representativeName: string;
    position: string;
    address: string;
    date: string;
    signatureUrl?: string;
    sealUrl?: string;
    signedDate?: any;
  };
  institutionDetails: {
    representativeName?: string;
    position?: string;
    date?: string;
    signatureUrl?: string;
    sealUrl?: string;
    signedDate?: any;
  };
  finalHtml?: string;
  googleDocId?: string;
  googleDocUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface DocumentRequirementRule {
  docId: string;
  displayName: string;
  description: string;
  isMandatory: boolean;
  maxSizeBytes: number; // e.g., 5242880 for 5MB
  allowedExtensions: string[]; // e.g., ['.pdf', '.jpeg']
}

export interface ComplianceMatrixRule {
  ruleId: string; // Composite key like "NP_MT" or "NP_GE"
  sourceCountry: string; // ISO 2-letter format: "NP", "IN"
  destinationCountry: string; // "MT", "GE"
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
  requirements: DocumentRequirementRule[];
}

export interface ApplicationChecklistItem extends DocumentRequirementRule {
  uploadedUrl?: string;
  uploadedAt?: string;
  verificationStatus: 'missing' | 'pending_review' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export const COUNTRIES = [
  "Australia",
  "France",
  "Georgia",
  "Malta",
  "United Arab Emirates",
  "United Kingdom"
] as const;

export const CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
] as const;

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  date: string;
  author: string;
  category: string;
  categoryId?: number;
  tags?: string[];
  image: string;
  slug: string;
  readTime?: string;
}

