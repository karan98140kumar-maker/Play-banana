import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserProfile {
  uid: string;
  email: string;
  referral_code: string;
  referred_by?: string;
  is_admin: boolean;
  display_name?: string;
  avatar?: string;
  created_at: string;
}

interface WalletData {
  balance: number;
  total_earned: number;
  referral_earnings: number;
  checkin_streak: number;
  last_daily_checkin?: string;
  daily_spins?: number;
  last_spin_date?: string;
  daily_scratches?: number;
  last_scratch_date?: string;
  daily_balloons?: number;
  last_balloon_date?: string;
  daily_colors?: number;
  last_color_date?: string;
  daily_math?: number;
  last_math_date?: string;
  ads_today?: number;
  last_ad_date?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  wallet: WalletData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeWallet: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Cleanup previous listeners if any
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeWallet) unsubscribeWallet();

      if (firebaseUser) {
        // Listen to profile changes
        const profileRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        }, (error) => {
          if (error.message.includes('Missing or insufficient permissions')) {
            const errInfo = {
              error: error.message,
              operationType: 'get',
              path: `users/${firebaseUser.uid}`,
              authInfo: {
                userId: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                emailVerified: auth.currentUser?.emailVerified,
                isAnonymous: auth.currentUser?.isAnonymous,
                providerInfo: auth.currentUser?.providerData.map(p => ({
                  providerId: p.providerId,
                  email: p.email
                })) || []
              }
            };
            console.error('Firestore Error (Profile):', JSON.stringify(errInfo));
          }
        });

        // Listen to wallet changes
        const walletRef = doc(db, 'wallets', firebaseUser.uid);
        unsubscribeWallet = onSnapshot(walletRef, (docSnap) => {
          if (docSnap.exists()) {
            setWallet(docSnap.data() as WalletData);
          } else {
            setWallet(null);
          }
        }, (error) => {
          if (error.message.includes('Missing or insufficient permissions')) {
            const errInfo = {
              error: error.message,
              operationType: 'get',
              path: `wallets/${firebaseUser.uid}`,
              authInfo: {
                userId: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                emailVerified: auth.currentUser?.emailVerified,
                isAnonymous: auth.currentUser?.isAnonymous,
                providerInfo: auth.currentUser?.providerData.map(p => ({
                  providerId: p.providerId,
                  email: p.email
                })) || []
              }
            };
            console.error('Firestore Error (Wallet):', JSON.stringify(errInfo));
          }
        });

        setLoading(false);
      } else {
        setProfile(null);
        setWallet(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeWallet) unsubscribeWallet();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, wallet, loading, logout }}>
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
