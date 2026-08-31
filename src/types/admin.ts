// File: src/types/admin.ts

export type UserStatus = 'pending' | 'approved' | 'suspended';

export interface AgencyCommercials {
  baseCommissionPercentage: number;
  walletBalance: number;
  creditLimit: number;
}

export interface AgencyLocation {
  city: string;
  country: string;
}

export interface AgencyPartner {
  id: string;
  uid: string;
  agencyName: string;
  primaryEmail: string;
  email: string;
  location: AgencyLocation | string;
  status: UserStatus;
  commercials: AgencyCommercials;
  // Fallbacks for backward compatibility
  baseCommissionPercentage?: number;
  walletBalance?: number;
  creditLimit?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UniversityProfile {
  id: string;
  uid: string;
  name: string;
  country: string;
  status: UserStatus;
  intakes: string[];
  disciplines?: string[];
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DropdownSettings {
  countries: string[];
  degrees: string[];
  disciplines: string[];
  currencies: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  actionType: 'USER_APPROVE' | 'USER_SUSPEND' | 'COMMISSION_ADJUST' | 'SETTINGS_MUTATE' | 'IMPERSONATION_START' | 'EMERGENCY_BROADCAST';
  targetEntityId: string;
  details: string;
  payload?: {
    before?: Record<string, any> | null;
    after?: Record<string, any>;
  };
}
