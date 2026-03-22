import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Gift, 
  Users,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, query, collection, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { useApp, DEFAULT_ICON } from '../context/AppContext';
import { cn } from '../lib/utils';
import { getAuthErrorMessage } from '../lib/auth-errors';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const { config } = useApp();
  const appIcon = config?.app_icon || DEFAULT_ICON;

  const setupUserInFirestore = async (userId: string, userEmail: string, referralBy?: string) => {
    const userRef = doc(db, 'users', userId);
    const walletRef = doc(db, 'wallets', userId);
    
    try {
      const userSnapActual = await getDoc(userRef);
      if (!userSnapActual.exists()) {
        const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Default admin check
        const isAdmin = userEmail === 'vinodram011982@gmail.com';

        let referrerUid = null;
        const refBonusReferrer = config?.referral_bonus_referrer || 200;
        const refBonusNewUser = config?.referral_bonus_new_user || 50;

        if (referralBy) {
          try {
            const referrersQuery = query(collection(db, 'users'), where('referral_code', '==', referralBy));
            const referrerSnap = await getDocs(referrersQuery);
            
            if (!referrerSnap.empty) {
              const referrerDoc = referrerSnap.docs[0];
              referrerUid = referrerDoc.id;
              
              // Give reward to referrer
              const referrerWalletRef = doc(db, 'wallets', referrerUid);
              const txId = Math.random().toString(36).substring(2, 15);
              const txRef = doc(db, 'transactions', txId);

              await updateDoc(referrerWalletRef, {
                balance: increment(refBonusReferrer),
                total_earned: increment(refBonusReferrer),
                referral_earnings: increment(refBonusReferrer),
                referral_count: increment(1)
              });

              await setDoc(txRef, {
                user_id: referrerUid,
                amount: refBonusReferrer,
                type: 'referral',
                description: `Referral Bonus (${userEmail.split('@')[0]})`,
                created_at: new Date().toISOString()
              });
            }
          } catch (err) {
            console.error("Error processing referral:", err);
          }
        }

        await setDoc(userRef, {
          uid: userId,
          email: userEmail,
          referral_code: myReferralCode,
          referred_by: referralBy || null,
          is_admin: isAdmin,
          created_at: new Date().toISOString()
        });

        // Give joining bonus if referred
        const joiningBonus = referralBy ? refBonusNewUser : 0;

        await setDoc(walletRef, {
          uid: userId,
          display_name: userEmail.split('@')[0],
          balance: joiningBonus,
          total_earned: joiningBonus,
          referral_earnings: 0,
          referral_count: 0,
          checkin_streak: 0,
          last_daily_checkin: null,
          ads_today: 0,
          last_ad: null
        });

        if (joiningBonus > 0) {
          const txId = Math.random().toString(36).substring(2, 15);
          const txRef = doc(db, 'transactions', txId);
          await setDoc(txRef, {
            user_id: userId,
            amount: joiningBonus,
            type: 'referral',
            description: 'Joining Bonus (Referral)',
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      console.error("Error setting up user in Firestore:", err);
      showNotification({ 
        message: "Failed to initialize your account. Please try again.", 
        type: 'error' 
      });
      throw err; // Re-throw to prevent login if setup fails
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setupUserInFirestore(userCredential.user.uid, email, referralCode);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = getAuthErrorMessage(err.code);
      showNotification({ 
        message: errorMessage, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await setupUserInFirestore(result.user.uid, result.user.email!, referralCode);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error(err);
      const errorMessage = getAuthErrorMessage(err.code);
      showNotification({ 
        message: errorMessage, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/10 rounded-full blur-3xl animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-24 h-24 mx-auto mb-6 shadow-2xl shadow-primary/20 rounded-[2rem] overflow-hidden bg-white p-1"
          >
            <img 
              src={appIcon} 
              alt="Play Mango" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-5xl font-display font-black text-slate-900 tracking-tighter mb-2">Play Banana</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Turn your time into real rewards</p>
        </div>

        <Card className="p-8 shadow-2xl border-none glass">
          <div className="flex p-1.5 bg-slate-100/50 rounded-2xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                isLogin ? "bg-white text-primary shadow-md" : "text-slate-400"
              )}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                !isLogin ? "bg-white text-primary shadow-md" : "text-slate-400"
              )}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-14 pr-5 py-4 text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all font-bold outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-14 pr-5 py-4 text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all font-bold outline-none"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                <div className="relative">
                  <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type="text" 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="ABCDEF"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-14 pr-5 py-4 text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 transition-all font-bold outline-none"
                  />
                </div>
              </motion.div>
            )}

            <Button 
              type="submit" 
              className="w-full py-5 text-sm font-black uppercase tracking-[0.2em] mt-4 group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em]">
              <span className="bg-white px-4 text-slate-300">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="secondary" 
            className="w-full py-4 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border-2 border-slate-100 shadow-sm"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-bold text-slate-700 tracking-normal capitalize">Google Account</span>
          </Button>
        </Card>

        <div className="mt-10 grid grid-cols-3 gap-4">
          <FeatureBadge icon={ShieldCheck} label="Secure" />
          <FeatureBadge icon={Gift} label="Daily Bonus" />
          <FeatureBadge icon={Users} label="Referrals" />
        </div>
      </motion.div>
    </div>
  );
}

function FeatureBadge({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
