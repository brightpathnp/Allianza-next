import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface ReferenceBlock {
  institutionName: string;
  refNamePosition: string;
  country: string;
  workEmail: string;
  duration: string;
}

export interface ComplianceDoc {
  fileName: string;
  status: 'Verified' | 'Pending Verification' | 'Missing';
  url?: string;
}

export interface AgencyProfileFull {
  // General Tab
  companyName: string;
  email: string;
  usernameSlug: string;
  phoneNumber: string;
  businessAddress: string;
  baseCountry: string;
  primaryRep: string;
  repTitle: string;
  secondaryRep: string;
  secondaryTitle: string;
  profilePhotoData?: string;
  profilePhotoUrl?: string;

  // Recruitment Scope Tab
  sourceMarkets: string[];
  preferredDestinations: string[];
  annualVolume: string;
  visaSuccessRate: string;

  // Compliance Tab
  documents: {
    businessRegistration: ComplianceDoc;
    panCertificate: ComplianceDoc;
    recruitmentLicense: ComplianceDoc;
    professionalCertificate: ComplianceDoc;
  };

  // References Tab
  references: ReferenceBlock[];

  // Security Tab
  mfaEnabled: boolean;
  activeDevice: {
    engine: string;
    ip: string;
    location: string;
  };
}

export async function getFullAgencyProfile(agencyId: string): Promise<AgencyProfileFull | null> {
  const docRef = doc(db, 'users', agencyId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  console.log("Fetched data from Firestore:", data);
  return {
    companyName: data.companyName || data.agencyName || '',
    email: data.email || '',
    usernameSlug: data.agencyName || data.usernameSlug || '',
    phoneNumber: data.phoneNumber || '',
    businessAddress: data.address || '',
    baseCountry: data.country || '',
    primaryRep: data.rep1Name || data.fullName || '',
    repTitle: data.rep1Position || data.jobTitle || '',
    secondaryRep: data.rep2Name || '',
    secondaryTitle: data.rep2Position || '',
    sourceMarkets: data.targetSourceMarkets || [],
    preferredDestinations: data.preferredDestinations || [],
    annualVolume: data.recruitmentVolume || '',
    visaSuccessRate: data.visaSuccessRate || '',
    documents: data.docStatuses || {
      businessRegistration: { fileName: 'BusinessRegistration.pdf', status: 'Verified' },
      panCertificate: { fileName: 'PAN_Certificate.pdf', status: 'Verified' },
      recruitmentLicense: { fileName: 'Recruitment_License.pdf', status: 'Pending Verification' },
      professionalCertificate: { fileName: '', status: 'Missing' }
    },
    references: data.references || [],
    mfaEnabled: data.mfaEnabled || false,
    activeDevice: data.activeDevice || { engine: 'Chrome Workspace Engine', ip: '103.25.12.11', location: 'Kathmandu, NP' },
    profilePhotoUrl: data.profilePhotoUrl || '',
    profilePhotoData: data.profilePhotoData || ''
  };
}

export async function updateFullAgencyProfile(agencyId: string, data: Partial<AgencyProfileFull>): Promise<void> {
  const docRef = doc(db, 'users', agencyId);
  
  const updatePayload: any = {};
  if (data.companyName !== undefined) updatePayload.companyName = data.companyName;
  if (data.usernameSlug !== undefined) updatePayload.agencyName = data.usernameSlug;
  if (data.phoneNumber !== undefined) updatePayload.phoneNumber = data.phoneNumber;
  if (data.businessAddress !== undefined) updatePayload.address = data.businessAddress;
  if (data.baseCountry !== undefined) updatePayload.country = data.baseCountry;
  if (data.primaryRep !== undefined) {
    updatePayload.rep1Name = data.primaryRep;
    updatePayload.fullName = data.primaryRep;
  }
  if (data.repTitle !== undefined) {
    updatePayload.rep1Position = data.repTitle;
    updatePayload.jobTitle = data.repTitle;
  }
  if (data.secondaryRep !== undefined) updatePayload.rep2Name = data.secondaryRep;
  if (data.secondaryTitle !== undefined) updatePayload.rep2Position = data.secondaryTitle;
  if (data.sourceMarkets !== undefined) updatePayload.targetSourceMarkets = data.sourceMarkets;
  if (data.preferredDestinations !== undefined) updatePayload.preferredDestinations = data.preferredDestinations;
  if (data.annualVolume !== undefined) updatePayload.recruitmentVolume = data.annualVolume;
  if (data.visaSuccessRate !== undefined) updatePayload.visaSuccessRate = data.visaSuccessRate;
  if (data.documents !== undefined) updatePayload.docStatuses = data.documents;
  if (data.references !== undefined) updatePayload.references = data.references;
  if (data.profilePhotoUrl !== undefined) updatePayload.profilePhotoUrl = data.profilePhotoUrl;
  if (data.profilePhotoData !== undefined) updatePayload.profilePhotoData = data.profilePhotoData;
  
  updatePayload.updatedAt = serverTimestamp();
  
  console.log("Updating Firestore with payload:", updatePayload);
  await updateDoc(docRef, updatePayload);
}
