import { auth } from './firebase';
import { FirebaseError } from 'firebase/app';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function safeStringify(obj: any): string {
  try {
    const seen = new WeakSet();
    const cleanObject = (val: any, depth = 0): any => {
      if (depth > 6) return '[Max Depth Exceeded]';
      if (val === null || val === undefined) return val;
      if (typeof val !== 'object') return val;
      
      // Handle DOM element
      if (val.nodeType || val instanceof HTMLElement || (typeof val.nodeName === 'string' && val.ownerDocument)) {
        return `[DOM Element: ${val.nodeName || 'unknown'}]`;
      }
      
      // Handle Error objects specifically (including iframe errors)
      if (val instanceof Error || (val && typeof val === 'object' && typeof val.message === 'string' && typeof val.name === 'string')) {
        return {
          name: val.name,
          message: val.message,
          stack: typeof val.stack === 'string' ? val.stack : undefined
        };
      }

      // Handle Date objects specifically
      if (val instanceof Date) {
        return val.toISOString();
      }

      // Handle RegExp objects specifically
      if (val instanceof RegExp) {
        return String(val);
      }

      // Handle obfuscated/minified classes or known external library objects safely to prevent circular issues
      if (val.constructor && typeof val.constructor.name === 'string') {
        const cName = val.constructor.name;
        if (cName === 'Y2' || cName === 'Ka' || cName.length <= 2) {
          return `[Object ${cName}]`;
        }
      }

      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);

      if (Array.isArray(val)) {
        return val.map(item => {
          try {
            return cleanObject(item, depth + 1);
          } catch {
            return '[Unreadable Item]';
          }
        });
      }

      const copy: any = {};
      const keys = Object.keys(val);
      for (const key of keys) {
        try {
          copy[key] = cleanObject(val[key], depth + 1);
        } catch {
          copy[key] = '[Unreadable Property]';
        }
      }
      return copy;
    };

    const cleaned = cleanObject(obj);
    return JSON.stringify(cleaned);
  } catch (err) {
    console.warn("safeStringify encountered error, using fallback serialization:", err instanceof Error ? err.message : String(err));
    try {
      if (obj && typeof obj === 'object') {
        const fallbackObj: any = {};
        for (const k of Object.keys(obj)) {
          try {
            const val = obj[k];
            if (typeof val === 'object' && val !== null) {
              fallbackObj[k] = '[Object]';
            } else {
              fallbackObj[k] = String(val);
            }
          } catch {
            fallbackObj[k] = '[Unreadable]';
          }
        }
        return JSON.stringify(fallbackObj);
      }
      return String(obj);
    } catch {
      return "[Unserializable Object]";
    }
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuotaError = errMsg.includes("Quota limit exceeded") || errMsg.includes("quota") || errMsg.includes("resource-exhausted") || errMsg.includes("Free daily read units");

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const serialized = safeStringify(errInfo);
  if (isQuotaError) {
    console.warn('Notice: Firestore quota limit reached for operation:', operationType, path);
  } else {
    console.error('Firestore Error: ', serialized);
  }
  if (shouldThrow && !isQuotaError) {
    throw new Error(serialized);
  }
}

export const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error) return parsed.error;
    } catch {
      // Not a JSON error
    }
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet.';
      default:
        return `Authentication error: ${error.code.replace('auth/', '').replace(/-/g, ' ')}`;
    }
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    // Fallback for non-FirebaseError but still having a code
    return `Error: ${(error as any).code.replace('auth/', '').replace(/-/g, ' ')}`;
  }
  return 'An unexpected error occurred.';
};
