import path from 'path';
import fs from 'fs';
import * as adminModule from 'firebase-admin';

const admin = (adminModule as any).default || adminModule;

let app: any = null;

export function getAdminApp() {
  if (app) return app;

  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  try {
    console.log("Initializing Firebase Admin...");
    
    // Read project configuration dynamically from the process directory
    let projectId = undefined;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        projectId = configData.projectId;
      }
    } catch (err) {
      console.warn("Could not load firebase-applet-config.json for fallback: ", err);
    }

    const initConfig: any = {};
    if (projectId) {
      console.log(`Configuring Firebase Admin for project: ${projectId}`);
      initConfig.projectId = projectId;
    }

    try {
      initConfig.credential = admin.credential.applicationDefault();
      console.log("Using Application Default Credentials.");
    } catch (credError: any) {
      console.warn("applicationDefault() credential retrieval was unsuccessful: ", credError.message);
    }

    app = admin.initializeApp(initConfig);
    console.log("Firebase Admin initialized successfully.");
  } catch (e: any) {
    console.error("CRITICAL WARNING: Firebase Admin SDK failed to initialize on startup!", e);
    // Create a fallback wrapper to avoid crashing the server on startup or during routes import
    app = {
      firestore: (dbId?: string) => {
        return {
          collection: (col: string) => ({
            doc: (docId: string) => ({
              get: () => { throw new Error("Firebase Admin is not successfully initialized: " + e.message); },
              update: () => { throw new Error("Firebase Admin is not successfully initialized: " + e.message); },
              set: () => { throw new Error("Firebase Admin is not successfully initialized: " + e.message); }
            })
          }),
          runTransaction: () => {
            throw new Error("Firebase Admin is not successfully initialized: " + e.message);
          }
        };
      },
      auth: () => {
        return {
          getUserByEmail: () => { throw new Error("Firebase Admin is not successfully initialized: " + e.message); },
          updateUser: () => { throw new Error("Firebase Admin is not successfully initialized: " + e.message); },
          createUser: () => { throw new Error("Firebase Admin is not successfully initialized: " + e.message); }
        };
      }
    };
  }
  return app;
}

let firestoreDb: any = null;

export function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  
  const adminApp = getAdminApp();
  
  let databaseId = undefined;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      databaseId = configData.firestoreDatabaseId;
    }
  } catch (err) {
    console.warn("Could not read database ID from firebase-applet-config.json:", err);
  }
  
  if (databaseId) {
    try {
      firestoreDb = adminApp.firestore(databaseId);
      console.log(`Successfully initialized Firestore with custom databaseId: ${databaseId}`);
    } catch (err) {
      console.warn(`Could not initialize Firestore with custom databaseId (${databaseId}), using default:`, err);
      firestoreDb = adminApp.firestore();
    }
  } else {
    firestoreDb = adminApp.firestore();
  }
  
  return firestoreDb;
}

