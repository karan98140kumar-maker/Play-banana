import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Gift, 
  TrendingUp, 
  Users, 
  Clock, 
  ChevronRight, 
  Trophy,
  PlayCircle,
  Play,
  RotateCw,
  History,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  User,
  Layers,
  Palette,
  Copy,
  Calculator,
  Gamepad2,
  Flame,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useApp, DEFAULT_ICON } from '../context/AppContext';
import { Card, Button, CoinCounter } from './UI';
import { formatCoins, cn, coinsToRupees } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc, increment, arrayUnion, serverTimestamp, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import SpinWheel from './SpinWheel';
import ScratchCard from './ScratchCard';
import AdminPanel from './AdminPanel';
import Withdraw from './Withdraw';
import Profile from './Profile';
import { Leaderboard } from './Leaderboard';
import Transactions from './Transactions';
import BalloonGame from './BalloonGame';
import PromoCode from './PromoCode';
import GiftCards from './GiftCards';
import ColorMatch from './ColorMatch';
import MathQuiz from './MathQuiz';
import PrivacyPolicy from './PrivacyPolicy';
import { Ticket } from 'lucide-react';
import { showRewardAd, showInterstitialAd, showBannerAd, hideBannerAd } from '../services/admobService';

import PullToRefresh from './PullToRefresh';

export default function Dashboard() {
  const { user, profile, wallet, logout } = useAuth();
  const { config } = useApp();
  const appIcon = config?.app_icon || DEFAULT_ICON;
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'spin' | 'scratch' | 'withdraw' | 'profile' | 'leaderboard' | 'history' | 'wallet' | 'rewards' | 'admin' | 'balloon' | 'promo' | 'giftcards' | 'color' | 'privacy' | 'math' | 'games'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adReason, setAdReason] = useState<'generic' | 'checkin' | 'double' | 'spin' | 'scratch' | 'color' | 'math'>('generic');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Calculate effective streak
  const getEffectiveStreak = () => {
    if (!wallet?.last_daily_checkin) return 0;
    const now = new Date();
    const lastCheckin = new Date(wallet.last_daily_checkin);
    
    // If last checkin was today or yesterday, streak is still valid
    if (lastCheckin.toDateString() === now.toDateString()) return wallet.checkin_streak || 0;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastCheckin.toDateString() === yesterday.toDateString()) return wallet.checkin_streak || 0;
    
    return 0; // Streak broken
  };

  const effectiveStreak = getEffectiveStreak();
  const hasCheckedInToday = wallet?.last_daily_checkin ? new Date(wallet.last_daily_checkin).toDateString() === new Date().toDateString() : false;

  const fetchRecentActivity = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'transactions'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setRecentActivity(list);
    } catch (err) {
      console.error('Error fetching activity:', err);
    }
  };

  useEffect(() => {
    const handleTabChangeEvent = (e: any) => {
      setActiveTab(e.detail);
      // Show interstitial occasionally on external tab changes
      if (Math.random() > 0.7) {
        showInterstitialAd();
      }
    };
    window.addEventListener('changeTab', handleTabChangeEvent);
    return () => window.removeEventListener('changeTab', handleTabChangeEvent);
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'home') {
      showBannerAd();
    } else {
      hideBannerAd();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    // Re-fetch activity and maybe other things if needed
    await fetchRecentActivity();
    // Since wallet/profile are onSnapshot, they will update automatically if changed on server
    // but we can add a small delay to make the refresh feel real
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleCheckin = async () => {
    if (!wallet || !user) return;
    
    const now = new Date();
    const lastCheckin = wallet.last_daily_checkin ? new Date(wallet.last_daily_checkin) : null;
    
    if (lastCheckin && lastCheckin.toDateString() === now.toDateString()) {
      showNotification({ message: "You have already claimed your daily bonus today!", type: 'info' });
      return;
    }

    triggerAd('checkin');
  };

  const triggerAd = async (reason: 'generic' | 'checkin' | 'double' | 'spin' | 'scratch' | 'color' = 'generic') => {
    if (!wallet) return;

    // Check daily ad limit (4 ads per day) for generic ads
    if (reason === 'generic') {
      const today = new Date().toDateString();
      const lastAdDate = wallet.last_ad_date ? new Date(wallet.last_ad_date).toDateString() : '';
      const adsToday = lastAdDate === today ? (wallet.ads_today || 0) : 0;

      if (adsToday >= 4) {
        showNotification({ message: "Daily ad limit reached! Come back tomorrow.", type: 'info' });
        return;
      }
    }

    setAdReason(reason);
    try {
      await showRewardAd(
        (reward) => {
          console.log('AdMob Reward earned:', reward);
          onAdComplete(reason);
        },
        () => {
          // Ad failed or dismissed without reward
          // In some apps, you might still reward or show a message
          // For now, we just reset the reason
          setAdReason('generic');
        }
      );
    } catch (err) {
      console.error('AdMob Trigger Error:', err);
      setAdReason('generic');
    }
  };

  const onAdComplete = async (reasonOverride?: string) => {
    if (!user || !wallet) return;
    const currentReason = reasonOverride || adReason;

    try {
      const walletRef = doc(db, 'wallets', user.uid);
      const txId = Math.random().toString(36).substring(2, 15);
      const txRef = doc(db, 'transactions', txId);

      if (currentReason === 'double') {
        // This would need logic to know what the last reward was
        // For simplicity in migration, let's just add a fixed bonus for now
        const bonus = 50;
        await updateDoc(walletRef, {
          balance: increment(bonus),
          total_earned: increment(bonus)
        });
        await setDoc(txRef, {
          user_id: user.uid,
          amount: bonus,
          type: 'ad',
          description: 'Ad Reward (Double)',
          created_at: new Date().toISOString()
        });
        showNotification({ message: `Success! Reward doubled. You earned an extra ${bonus} coins!`, type: 'success' });
      } else if (currentReason === 'checkin') {
        const now = new Date();
        const lastCheckin = wallet.last_daily_checkin ? new Date(wallet.last_daily_checkin) : null;
        
        let newStreak = 1;
        if (lastCheckin) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastCheckin.toDateString() === yesterday.toDateString()) {
            newStreak = (wallet.checkin_streak || 0) + 1;
          } else {
            newStreak = 1; // Missed a day, reset
          }
        }

        const reward = Math.min(newStreak * 10, 100);
        await updateDoc(walletRef, {
          balance: increment(reward),
          total_earned: increment(reward),
          checkin_streak: newStreak,
          last_daily_checkin: new Date().toISOString()
        });
        await setDoc(txRef, {
          user_id: user.uid,
          amount: reward,
          type: 'checkin',
          description: `Daily Bonus (Day ${newStreak})`,
          created_at: new Date().toISOString()
        });
        showNotification({ message: `Success! You earned ${reward} coins. Day ${newStreak} streak!`, type: 'success' });
      } else if (currentReason === 'spin') {
        showNotification({ message: "Spin unlocked! You can now spin the wheel.", type: 'success' });
        window.dispatchEvent(new CustomEvent('adReward', { detail: { type: 'spin' } }));
      } else if (currentReason === 'scratch') {
        showNotification({ message: "Scratch card unlocked! Reveal your reward.", type: 'success' });
        window.dispatchEvent(new CustomEvent('adReward', { detail: { type: 'scratch' } }));
      } else if (currentReason === 'color') {
        showNotification({ message: "Color game unlocked! Match to earn coins.", type: 'success' });
        window.dispatchEvent(new CustomEvent('adReward', { detail: { type: 'color' } }));
      } else if (currentReason === 'math') {
        showNotification({ message: "Math quiz unlocked! Solve to earn coins.", type: 'success' });
        window.dispatchEvent(new CustomEvent('adReward', { detail: { type: 'math' } }));
      } else {
        const reward = 10;
        const today = new Date().toISOString();
        const lastAdDate = wallet?.last_ad_date ? new Date(wallet.last_ad_date).toDateString() : '';
        const isNewDay = lastAdDate !== new Date().toDateString();

        await updateDoc(walletRef, {
          balance: increment(reward),
          total_earned: increment(reward),
          ads_today: isNewDay ? 1 : increment(1),
          last_ad_date: today
        });
        await setDoc(txRef, {
          user_id: user.uid,
          amount: reward,
          type: 'ad',
          description: 'Watched Ad',
          created_at: new Date().toISOString()
        });
        showNotification({ message: `Success! You earned ${reward} coins.`, type: 'success' });
      }
    } catch (err) {
      console.error(err);
      showNotification({ message: "Failed to claim reward", type: 'error' });
    } finally {
      setAdReason('generic');
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
    
    // Show interstitial occasionally when switching tabs
    // 30% chance to show an ad to avoid annoying users
    if (Math.random() > 0.7) {
      showInterstitialAd();
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentWallet: any = wallet || {};
  const activity = recentActivity || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg overflow-hidden p-0.5">
              <div className="w-full h-full bg-white rounded-[6px] flex items-center justify-center overflow-hidden">
                <img 
                  src={appIcon} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-0.5"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <span className="font-display font-black text-xl text-slate-900 tracking-tighter">Play Banana</span>
          </motion.div>
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05, y: -1 }}
              className="bg-primary/5 px-3 py-1.5 rounded-full flex items-center gap-2 border border-primary/10"
            >
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                <Wallet className="text-white w-3 h-3" />
              </div>
              <span className="font-black text-primary text-sm">
                <CoinCounter value={Math.floor(currentWallet.balance || 0)} /> Coins
              </span>
            </motion.div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Sidebar/Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-lg">Menu</span>
                <button onClick={() => setIsMenuOpen(false)}>
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Account</p>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-6">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      profile?.email?.[0].toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-bold truncate">{profile?.email}</p>
                    <p className="text-[10px] text-primary font-black uppercase tracking-wider mt-0.5">Ref: {profile?.referral_code}</p>
                  </div>
                </div>

                <button 
                  onClick={() => handleTabChange('withdraw')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-slate-600 transition-colors"
                >
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-medium">Withdraw Coins</span>
                </button>

                <button 
                  onClick={() => handleTabChange('history')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-slate-600 transition-colors"
                >
                  <History className="w-5 h-5 text-primary" />
                  <span className="font-medium">Transaction History</span>
                </button>

                <button 
                  onClick={() => handleTabChange('leaderboard')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-slate-600 transition-colors"
                >
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-medium">Leaderboard</span>
                </button>

                <button 
                  onClick={() => handleTabChange('promo')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-slate-600 transition-colors"
                >
                  <Ticket className="w-5 h-5 text-primary" />
                  <span className="font-medium">Redeem Promo Code</span>
                </button>

                <button 
                  onClick={() => handleTabChange('giftcards')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-slate-600 transition-colors"
                >
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="font-medium">My Gift Cards</span>
                </button>

                <button 
                  onClick={() => handleTabChange('privacy')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-slate-600 transition-colors"
                >
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span className="font-medium">Privacy Policy</span>
                </button>

                {user?.email === 'vinodram011982@gmail.com' && (
                  <button 
                    onClick={() => handleTabChange('admin')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-primary transition-colors"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium">Admin Panel</span>
                  </button>
                )}
                
                <div className="space-y-3">
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'home' && (
              <PullToRefresh onRefresh={handleRefresh}>
                {/* User Profile Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-display font-black overflow-hidden shadow-lg shadow-primary/20">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        profile?.email?.[0].toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-black text-slate-900 leading-tight">
                        {profile?.display_name || profile?.email?.split('@')[0]}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Welcome back!
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTabChange('profile')}
                      className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-600"
                    >
                      <User className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Daily Streak Tracker */}
                <Card className="p-6 overflow-hidden relative mb-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                          <Flame className={cn("w-6 h-6", effectiveStreak > 0 ? "text-orange-600 animate-pulse" : "text-slate-400")} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 leading-tight">Daily Streak</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {effectiveStreak} Days Active
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Next Reward</p>
                        <p className="text-lg font-black text-slate-900">{Math.min((effectiveStreak + 1) * 10, 100)} Coins</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const isCompleted = effectiveStreak >= day || (hasCheckedInToday && effectiveStreak >= day);
                        const isToday = !hasCheckedInToday && effectiveStreak === day - 1;
                        
                        return (
                          <div key={day} className="flex flex-col items-center gap-2">
                            <div className={cn(
                              "w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-500",
                              isCompleted ? "bg-primary text-white shadow-lg shadow-primary/20" : 
                              isToday ? "bg-white border-2 border-primary text-primary animate-bounce" : 
                              "bg-slate-100 text-slate-400"
                            )}>
                              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-black">{day}</span>}
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-tighter text-slate-400">Day {day}</p>
                          </div>
                        );
                      })}
                    </div>

                    {!hasCheckedInToday && (
                      <Button 
                        onClick={handleCheckin}
                        className="w-full mt-6 py-4 bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                      >
                        Claim Day {effectiveStreak + 1} Bonus
                      </Button>
                    )}
                    {hasCheckedInToday && (
                      <div className="w-full mt-6 py-4 bg-emerald-50 rounded-2xl flex items-center justify-center gap-2 border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Today's Bonus Claimed</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Balance Card - Immersive Design */}
                <motion.div
                  animate={{ 
                    y: [0, -4, 0],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <Card className="p-6 bg-gradient-to-br from-primary to-orange-600 border-none shadow-xl shadow-primary/20 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Total Balance</p>
                        <div className="flex items-baseline gap-2">
                          <motion.h3 
                            key={currentWallet.balance}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="text-4xl font-display font-black text-white tracking-tight"
                          >
                            <CoinCounter value={Math.floor(currentWallet.balance || 0)} />
                          </motion.h3>
                          <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Coins</span>
                        </div>
                        <p className="text-white/40 text-[10px] font-bold mt-1">
                          Approx. Value: <span className="text-white">₹{coinsToRupees(currentWallet.balance || 0)}</span>
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleTabChange('withdraw')}
                          className="bg-white text-primary hover:bg-primary/5 border-none font-black uppercase tracking-widest text-[10px] px-6 h-11 shadow-lg shadow-black/10"
                        >
                          Withdraw Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Quick Actions Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Quick Actions</h3>
                    <div className="h-px flex-1 bg-slate-100 ml-4" />
                  </div>
                  
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05
                        }
                      }
                    }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {[
                      { icon: RotateCw, label: "Spin Wheel", sublabel: "Win up to 500 coins", color: "orange", onClick: () => handleTabChange('spin') },
                      { icon: Layers, label: "Scratch Card", sublabel: "Reveal your luck", color: "rose", onClick: () => handleTabChange('scratch') },
                      { icon: Gift, label: "Daily Bonus", sublabel: "Claim your streak", color: "amber", onClick: handleCheckin },
                      { 
                        icon: PlayCircle, 
                        label: "Watch Ad", 
                        sublabel: `Earn 10 coins (${wallet?.last_ad_date === new Date().toDateString() ? 4 - (wallet?.ads_today || 0) : 4} left)`,
                        color: "emerald",
                        onClick: () => triggerAd('generic'),
                        badge: wallet?.last_ad_date === new Date().toDateString() ? `${4 - (wallet?.ads_today || 0)} left` : "4 left"
                      },
                      { 
                        icon: Calculator, 
                        label: "Math Quiz", 
                        sublabel: `Solve & Earn (${wallet?.last_math_date === new Date().toDateString() ? 5 - (wallet?.daily_math || 0) : 5} left)`, 
                        color: "indigo", 
                        onClick: () => handleTabChange('math'),
                        badge: wallet?.last_math_date === new Date().toDateString() ? `${5 - (wallet?.daily_math || 0)} left` : "5 left"
                      },
                      { icon: Wallet, label: "Withdraw", sublabel: "Redeem your coins", color: "violet", onClick: () => handleTabChange('withdraw') }
                    ].map((card, i) => (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 }
                        }}
                      >
                        <ActionCard {...card as any} />
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.2
                        }
                      }
                    }}
                    className="grid grid-cols-3 md:grid-cols-6 gap-3"
                  >
                    {[
                      { icon: Play, label: "Balloon", color: "orange", onClick: () => handleTabChange('balloon') },
                      { icon: Palette, label: "Color", color: "pink", onClick: () => handleTabChange('color') },
                      { icon: Calculator, label: "Math", color: "indigo", onClick: () => handleTabChange('math') },
                      { icon: Ticket, label: "Promo", color: "emerald", onClick: () => handleTabChange('promo') },
                      { icon: RotateCw, label: "Spin", color: "orange", onClick: () => handleTabChange('spin'), className: "md:hidden" },
                      { icon: Layers, label: "Scratch", color: "rose", onClick: () => handleTabChange('scratch'), className: "md:hidden" },
                      { icon: History, label: "History", color: "blue", onClick: () => handleTabChange('history') }
                    ].map((card, i) => (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0, scale: 0.8 },
                          visible: { opacity: 1, scale: 1 }
                        }}
                      >
                        <MiniActionCard {...card as any} />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recent Activity</h3>
                    <button 
                      onClick={() => handleTabChange('history')}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70"
                    >
                      View All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentActivity.length > 0 ? recentActivity.map((tx: any) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={tx.id}
                      >
                        <Card className="p-3 flex items-center justify-between border-slate-100/50 hover:border-primary/20 transition-colors h-full">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {tx.type === 'checkin' && <Trophy className="w-5 h-5" />}
                              {tx.type === 'ad' && <PlayCircle className="w-5 h-5" />}
                              {tx.type === 'referral' && <Users className="w-5 h-5" />}
                              {tx.type === 'spin' && <RotateCw className="w-5 h-5" />}
                              {tx.type === 'color_match' && <Palette className="w-5 h-5" />}
                              {tx.type === 'withdraw' && <Wallet className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">{tx.description}</p>
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-md tracking-tighter">
                                  {tx.type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold tracking-wider">
                                {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-black text-sm",
                              tx.amount > 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </p>
                          </div>
                        </Card>
                      </motion.div>
                    )) : (
                      <div className="md:col-span-2 text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No activity yet</p>
                      </div>
                    )}
                  </div>
                </div>

              </PullToRefresh>
            )}

          {activeTab === 'spin' && (
            <SpinWheel 
              wallet={currentWallet}
              onWatchAd={triggerAd}
            />
          )}

          {activeTab === 'scratch' && (
            <ScratchCard 
              wallet={currentWallet}
              onWatchAd={triggerAd}
            />
          )}

          {activeTab === 'balloon' && (
            <BalloonGame onBack={() => handleTabChange('home')} />
          )}

          {activeTab === 'promo' && (
            <PromoCode />
          )}

          {activeTab === 'giftcards' && (
            <GiftCards onBack={() => handleTabChange('home')} />
          )}

          {activeTab === 'admin' && (
            <AdminPanel />
          )}

          {activeTab === 'color' && (
            <ColorMatch 
              wallet={currentWallet}
              onBack={() => handleTabChange('home')} 
              onWatchAd={triggerAd}
            />
          )}

          {activeTab === 'math' && (
            <MathQuiz 
              wallet={currentWallet}
              onBack={() => handleTabChange('home')} 
              onWatchAd={triggerAd}
            />
          )}

          {activeTab === 'withdraw' && (
            <Withdraw 
              balance={currentWallet.balance || 0} 
              onSuccess={() => {}} 
              onBack={() => handleTabChange('home')} 
            />
          )}

          {activeTab === 'profile' && (
            <Profile onTabChange={handleTabChange} />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard onBack={() => handleTabChange('home')} />
          )}

          {activeTab === 'history' && (
            <Transactions onBack={() => handleTabChange('home')} />
          )}

          {activeTab === 'games' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">All Games</h3>
                <div className="h-px flex-1 bg-slate-100 ml-4" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: RotateCw, label: "Spin Wheel", sublabel: "Win up to 500 coins", color: "orange", onClick: () => handleTabChange('spin') },
                  { icon: Layers, label: "Scratch Card", sublabel: "Reveal your luck", color: "rose", onClick: () => handleTabChange('scratch') },
                  { icon: Play, label: "Balloon Pop", sublabel: "Pop & Earn", color: "orange", onClick: () => handleTabChange('balloon') },
                  { icon: Palette, label: "Color Match", sublabel: "Match colors", color: "pink", onClick: () => handleTabChange('color') },
                  { icon: Calculator, label: "Math Quiz", sublabel: "Solve & Earn", color: "indigo", onClick: () => handleTabChange('math') },
                ].map((card, i) => (
                  <ActionCard key={i} {...card as any} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <PrivacyPolicy onBack={() => handleTabChange('home')} />
          )}

          {activeTab === 'wallet' && (
            <Withdraw 
              balance={currentWallet.balance || 0} 
              onSuccess={() => {}} 
              onBack={() => handleTabChange('home')} 
            />
          )}

          {activeTab === 'rewards' && (
            <div className="text-center py-20">
              <Gift className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <h2 className="text-xl font-bold text-slate-900">Coming Soon</h2>
              <p className="text-slate-500">We're working hard to bring you more features!</p>
              <Button className="mt-6 mx-auto" onClick={() => handleTabChange('home')}>Go Back Home</Button>
            </div>
          )}
          </motion.div>
        </AnimatePresence>
      </main>

    {/* Bottom Navigation */}
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-4 py-4 z-40">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <NavItem icon={TrendingUp} label="Home" active={activeTab === 'home'} onClick={() => handleTabChange('home')} />
        <NavItem icon={Gamepad2} label="Games" active={activeTab === 'games'} onClick={() => handleTabChange('games')} />
        <NavItem icon={Wallet} label="Wallet" active={activeTab === 'withdraw' || activeTab === 'wallet'} onClick={() => handleTabChange('withdraw')} />
        <NavItem icon={Trophy} label="Rank" active={activeTab === 'leaderboard'} onClick={() => handleTabChange('leaderboard')} />
        <NavItem icon={User} label="Profile" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} />
      </div>
    </nav>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <motion.button 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all relative px-2",
        active ? "text-primary" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-4 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
        />
      )}
      <Icon className={cn("w-6 h-6", active && "drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]")} />
      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
    </motion.button>
  );
}

function ActionCard({ icon: Icon, label, sublabel, color, onClick, badge }: any) {
  const colors: any = {
    amber: "bg-amber-50 text-amber-500",
    primary: "bg-primary/5 text-primary",
    violet: "bg-violet-50 text-violet-500",
    emerald: "bg-success/10 text-success",
    blue: "bg-blue-50 text-blue-500",
    rose: "bg-rose-50 text-rose-500",
    pink: "bg-pink-50 text-pink-500",
    orange: "bg-orange-50 text-orange-500",
    cyan: "bg-cyan-50 text-cyan-500"
  };

  return (
    <Card 
      hover
      className="p-5 flex flex-col items-start text-left relative overflow-hidden group" 
      onClick={onClick}
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", colors[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display font-black text-slate-900 text-sm leading-tight">{label}</h3>
      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">{sublabel}</p>
      {badge && (
        <div className="absolute top-4 right-4 px-2 py-0.5 bg-primary rounded-full shadow-lg shadow-primary/20">
          <p className="text-[8px] text-white font-black uppercase tracking-widest">{badge}</p>
        </div>
      )}
    </Card>
  );
}

function MiniActionCard({ icon: Icon, label, color, onClick }: any) {
  const colors: any = {
    amber: "bg-amber-50 text-amber-500",
    primary: "bg-primary/5 text-primary",
    violet: "bg-violet-50 text-violet-500",
    emerald: "bg-success/10 text-success",
    blue: "bg-blue-50 text-blue-500",
    rose: "bg-rose-50 text-rose-500",
    pink: "bg-pink-50 text-pink-500",
    orange: "bg-orange-50 text-orange-500",
    emerald_dark: "bg-success text-white"
  };

  return (
    <Card 
      hover
      className="p-3 flex flex-col items-center text-center gap-2" 
      onClick={onClick}
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colors[color])}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
    </Card>
  );
}
