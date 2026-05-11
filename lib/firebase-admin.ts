import { readFileSync } from 'fs';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^"(.*)"$/, '$1');
}

function createAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const credentialsPath = cleanEnv(process.env.FIREBASE_ADMIN_CREDENTIALS_PATH);
  const projectId = cleanEnv(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = cleanEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  if (credentialsPath) {
    const rawCredentials = readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(rawCredentials) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
      throw new Error(
        'Firebase Admin credentials file is missing project_id, client_email, or private_key.',
      );
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: credentials.project_id,
        clientEmail: credentials.client_email,
        privateKey: credentials.private_key,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return adminApp;
  }

  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return adminApp;
  }

  // In build and hosted environments, Firebase Admin can fall back to the
  // runtime's default credentials. We avoid throwing here so Next.js can build.
  adminApp = initializeApp({
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}

export const adminAuth = getAuth(createAdminApp());
export const adminDb = getFirestore(createAdminApp());
export const adminStorage = getStorage(createAdminApp());

export default createAdminApp();
