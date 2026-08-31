import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface PartnershipConfig {
  agreementTitle: string;
  defaultDuration: string;
  commissionAmount: number;
  commissionCurrency: string;
  visaRefusalFee: number;
  additionalTerms: string;
  uploadedFileName: string;
}

export interface HistoryLog {
  id?: string;
  actionText: string;
  dateLabel: string; // e.g., "TODAY", "LAST WEEK"
  timestamp: Timestamp;
}

/**
 * Fetches the active system parameters for the agreement layout form per institutionId.
 */
export const fetchPartnershipConfig = async (institutionId: string): Promise<PartnershipConfig | null> => {
  const path = `institution_agreements/${institutionId}`;
  try {
    const docSnap = await getDoc(doc(db, 'institution_agreements', institutionId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        agreementTitle: data.title || "STUDENT SERVICE REPRESENTATION AGREEMENT",
        defaultDuration: data.agreementDuration || "1 Year",
        commissionAmount: Number(data.commissionAmount) || 1200,
        commissionCurrency: data.commissionCurrency || "EUR",
        visaRefusalFee: Number(data.visaRefusalFee) || 100,
        additionalTerms: data.additionalTerms || "",
        uploadedFileName: data.templateName || data.templateUrl || "standard-agreement-template-v2.pdf"
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

/**
 * Fetches the raw operational history logs for the sidebar timeline widget.
 */
export const fetchPartnershipHistory = async (institutionId: string): Promise<HistoryLog[]> => {
  const path = `institution_agreements/${institutionId}/history_logs`;
  try {
    const q = query(
      collection(db, 'institution_agreements', institutionId, 'history_logs'), 
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const logs: HistoryLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as HistoryLog);
    });
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

/**
 * Persists the operational settings adjustments while adding entry states into the history ledger.
 */
export const savePartnershipConfiguration = async (
  institutionId: string,
  newConfig: PartnershipConfig, 
  oldConfig: PartnershipConfig | null,
  userId: string = 'system'
): Promise<void> => {
  const path = `institution_agreements/${institutionId}`;
  try {
    // Map to InstitutionalAgreementSettings schema in firestore
    const payload = {
      institutionId,
      title: newConfig.agreementTitle,
      agreementDuration: newConfig.defaultDuration,
      commissionAmount: String(newConfig.commissionAmount),
      commissionCurrency: newConfig.commissionCurrency,
      visaRefusalFee: String(newConfig.visaRefusalFee),
      additionalTerms: newConfig.additionalTerms,
      templateName: newConfig.uploadedFileName,
      templateUrl: newConfig.uploadedFileName,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };

    // Update the master config state block
    await setDoc(doc(db, 'institution_agreements', institutionId), payload, { merge: true });

    // Compute what structural values changed to create readable history strings
    let loggedAction = "Agreement parameters updated";
    
    if (oldConfig) {
      if (Number(oldConfig.commissionAmount) !== Number(newConfig.commissionAmount)) {
        loggedAction = `Commission updated to **${newConfig.commissionCurrency}${Number(newConfig.commissionAmount).toLocaleString()}**`;
      } else if (Number(oldConfig.visaRefusalFee) !== Number(newConfig.visaRefusalFee)) {
        loggedAction = `Visa refusal fee adjusted to **${newConfig.commissionCurrency}${Number(newConfig.visaRefusalFee).toLocaleString()}**`;
      } else if (oldConfig.uploadedFileName !== newConfig.uploadedFileName) {
        loggedAction = `New template attached: **${newConfig.uploadedFileName}**`;
      }
    } else {
      loggedAction = "Agreement management workspace initialized";
    }

    // Inject record block to history sub-collection context
    await addDoc(collection(db, 'institution_agreements', institutionId, 'history_logs'), {
      actionText: loggedAction,
      dateLabel: "TODAY",
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
