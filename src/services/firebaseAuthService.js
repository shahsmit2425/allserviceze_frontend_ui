import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  deleteUser,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  inMemoryPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';

const FIREBASE_AUTH_TIMEOUT_MS = 15000;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

let persistenceReady = false;

const missingFirebaseConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const getFirebaseAuth = () => {
  if (missingFirebaseConfigKeys.length > 0) {
    throw new Error(`Firebase configuration is missing: ${missingFirebaseConfigKeys.join(', ')}`);
  }

  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(firebaseApp);
};

const buildActionCodeSettings = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return {
    url: `${window.location.origin}/auth`,
    handleCodeInApp: false,
  };
};

const isNativePlatform = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.Capacitor?.isNativePlatform?.() ?? false;
};

const isNativeIosPlatform = () => {
  if (!isNativePlatform()) {
    return false;
  }

  return window.Capacitor?.getPlatform?.() === 'ios';
};

const withTimeout = (promise, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, FIREBASE_AUTH_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

const mapFirebaseRestAuthError = (code) => {
  switch (code) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'Invalid email or password';
    case 'USER_DISABLED':
      return 'This account has been disabled';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Too many sign-in attempts. Please try again later.';
    default:
      return null;
  }
};

const signInWithPasswordRest = async (email, password) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorCode = data?.error?.message;
    throw new Error(mapFirebaseRestAuthError(errorCode) || 'Sign in failed. Please try again.');
  }

  return {
    user: {
      uid: data.localId,
      email: data.email,
      getIdToken: async () => data.idToken,
    },
  };
};

const ensurePersistence = async () => {
  if (persistenceReady) {
    return;
  }

  const auth = getFirebaseAuth();
  const nativePlatform = isNativePlatform();

  persistenceReady = true;

  try {
    if (nativePlatform) {
      await setPersistence(auth, inMemoryPersistence);
      return;
    }

    await setPersistence(auth, browserLocalPersistence);
  } catch {
    await setPersistence(auth, inMemoryPersistence);
  }
};

const isContinueUrlError = (error) => {
  return error?.code === 'auth/unauthorized-continue-uri' || error?.code === 'auth/invalid-continue-uri';
};

class FirebaseAuthService {
  static async register(email, password, fullName) {
    const auth = getFirebaseAuth();
    await ensurePersistence();
    const credential = await withTimeout(
      createUserWithEmailAndPassword(auth, email, password),
      'Registration timed out before Firebase completed. Please try again.'
    );

    if (fullName) {
      await updateProfile(credential.user, { displayName: fullName });
    }

    return credential;
  }

  static async signIn(email, password) {
    if (isNativeIosPlatform()) {
      return withTimeout(
        signInWithPasswordRest(email, password),
        'Sign in timed out before Firebase completed. Please try again.'
      );
    }

    const auth = getFirebaseAuth();
    await ensurePersistence();
    return withTimeout(
      signInWithEmailAndPassword(auth, email, password),
      'Sign in timed out before Firebase completed. Please try again.'
    );
  }

  static async sendVerificationEmail(user = getFirebaseAuth().currentUser) {
    if (!user) {
      throw new Error('No signed-in Firebase user available for verification');
    }

    try {
      return await sendEmailVerification(user, buildActionCodeSettings());
    } catch (error) {
      if (isContinueUrlError(error)) {
        return sendEmailVerification(user);
      }
      throw error;
    }
  }

  static async sendPasswordReset(email) {
    const auth = getFirebaseAuth();
    await ensurePersistence();
    try {
      return await sendPasswordResetEmail(auth, email, buildActionCodeSettings());
    } catch (error) {
      if (isContinueUrlError(error)) {
        return sendPasswordResetEmail(auth, email);
      }
      throw error;
    }
  }

  static async reloadCurrentUser() {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      return null;
    }

    await auth.currentUser.reload();
    return auth.currentUser;
  }

  static getCurrentUser() {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  }

  static async getIdToken(forceRefresh = false) {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      return null;
    }

    return auth.currentUser.getIdToken(forceRefresh);
  }

  static async signOut() {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }

  static async deleteCurrentUser() {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      return;
    }

    await deleteUser(auth.currentUser);
  }

  static async signInWithGooglePopup() {
    const auth = getFirebaseAuth();
    await ensurePersistence();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  }

  static async signInWithGoogleRedirect() {
    const auth = getFirebaseAuth();
    await ensurePersistence();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithRedirect(auth, provider);
  }

  static async getGoogleRedirectResult() {
    const auth = getFirebaseAuth();
    await ensurePersistence();
    return getRedirectResult(auth);
  }

  static async signInWithGoogleIdToken(idToken) {
    const auth = getFirebaseAuth();
    await ensurePersistence();
    const credential = GoogleAuthProvider.credential(idToken);
    return withTimeout(
      signInWithCredential(auth, credential),
      'Google sign in timed out before Firebase completed. Please try again.'
    );
  }
}

export default FirebaseAuthService;