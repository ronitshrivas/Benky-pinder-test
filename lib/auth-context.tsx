'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildUserRecord(
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
    phone?: string;
    emailVerified: boolean;
  },
): User {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    ...(user.phone ? { phone: user.phone } : {}),
    role: 'user',
    emailVerified: user.emailVerified,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    purchasedCourses: [],
    registeredRetreats: [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUserData(null);
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      setUserData(userDoc.data() as User);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        } else {
          // Create user document if it doesn't exist
          const newUser = buildUserRecord({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          });
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUserData(newUser);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const newUser = buildUserRecord({
      uid: result.user.uid,
      email: result.user.email || '',
      displayName: name,
      phone: phone || result.user.phoneNumber || undefined,
      photoURL: result.user.photoURL,
      emailVerified: true,
    });
    await setDoc(doc(db, 'users', result.user.uid), newUser);
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      const newUser = buildUserRecord({
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || '',
        photoURL: result.user.photoURL,
        emailVerified: true,
      });
      await setDoc(doc(db, 'users', result.user.uid), newUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  const isAdmin = userData?.role === 'admin';
  const login = signIn;
  const loginWithGoogle = signInWithGoogle;
  const register = signUp;
  const sendOtp = async (email: string) => {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'send' }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }
  };
  const verifyOtp = async (email: string, otp: string) => {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, action: 'verify' }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify OTP');
    }
    await refreshUserData();
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      isAdmin,
      login,
      loginWithGoogle,
      register,
      sendOtp,
      verifyOtp,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
