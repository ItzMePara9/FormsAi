import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export async function connectGoogleWithFirebase(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from sign-in');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;

    await fetch('/api/google/sync-client-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: cachedAccessToken,
        email: result.user.email || 'connected_account@gmail.com',
      }),
    });

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Google sign-in failed:', error);
    throw error;
  }
}

export function getCachedGoogleToken(): string | null {
  return cachedAccessToken;
}

export function getCachedGoogleUser(): User | null {
  return cachedUser;
}

export async function disconnectGoogleFirebase(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  await fetch('/api/google/disconnect', { method: 'POST' });
}
