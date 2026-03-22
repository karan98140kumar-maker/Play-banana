import React, { useState } from 'react';
import { Wallet, ArrowLeft, CheckCircle2, AlertCircle, Phone, CreditCard, Landmark, ShoppingBag, Play, Smartphone, QrCode, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, updateDoc, increment, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn, coinsToRupees } from '../lib/utils';

import { showInterstitialAd } from '../services/admobService';

const REWARDS = [
  { coins: 1400, rupees: 10 },
  { coins: 2800, rupees: 20 },
  { coins: 6000, rupees: 50 },
  { coins: 12000, rupees: 100 },
];

export default function Withdraw({ balance, onSuccess, onBack }: any) {
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [method, setMethod] = useState('upi');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) {
      showNotification({ message: "Please select a reward amount", type: 'error' });
      return;
    }
    if (!details) {
      showNotification({ message: "Please enter your payment details", type: 'error' });
      return;
    }
    
    const coins = selectedReward.coins;
    if (coins > balance) {
      showNotification({ message: "Insufficient balance", type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const walletRef = doc(db, 'wallets', user!.uid);
      await updateDoc(walletRef, {
        balance: increment(-coins)
      });

      const withdrawalData = {
        user_id: user!.uid,
        email: user!.email,
        display_name: profile?.display_name || user!.email?.split('@')[0],
        amount: coins,
        rupees: selectedReward.rupees,
        method,
        details,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'withdrawals'), withdrawalData);

      // Add to transactions history
      const txId = Math.random().toString(36).substring(2, 15);
      await setDoc(doc(db, 'transactions', txId), {
        user_id: user!.uid,
        amount: -coins,
        type: 'withdraw',
        description: `Withdrawal Request (${method.toUpperCase()})`,
        created_at: new Date().toISOString()
      });

      setShowSuccess(true);
      showInterstitialAd();
    } catch (err) {
      console.error(err);
      showNotification({ message: "Failed to submit request", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch(method) {
      case 'upi': return 'Enter UPI ID (e.g. user@okaxis)';
      case 'amazon': return 'Enter Email for Gift Card';
      case 'googleplay': return 'Enter Email for Play Code';
      default: return 'Enter Details';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.2 
                  }}
                >
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </motion.div>
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Request Submitted!</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                Your request for ₹{selectedReward?.rupees} via {method.toUpperCase()} has been received. It will be processed within 24-48 hours.
              </p>
              <Button 
                onClick={onBack} 
                className="w-full py-4 text-sm font-display font-black uppercase tracking-widest"
              >
                Back to Wallet
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Redeem</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Convert Coins to Cash</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-gradient-to-br from-primary to-primary-dark text-white border-none shadow-xl shadow-primary/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Balance</p>
                <h3 className="text-3xl font-display font-black">{balance.toLocaleString()} <span className="text-sm font-medium opacity-80 uppercase tracking-tighter">Coins</span></h3>
                <p className="text-white/80 text-xs font-bold mt-1">Value: ₹{coinsToRupees(balance)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Withdrawal Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MethodCard 
                active={method === 'upi'} 
                onClick={() => setMethod('upi')} 
                icon={QrCode} 
                label="UPI" 
                description="Instant Transfer"
              />
              <MethodCard 
                active={method === 'amazon'} 
                onClick={() => setMethod('amazon')} 
                icon={ShoppingBag} 
                label="Amazon" 
                description="Gift Voucher"
              />
              <MethodCard 
                active={method === 'googleplay'} 
                onClick={() => setMethod('googleplay')} 
                icon={Play} 
                label="Play Store" 
                description="Redeem Code"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Amount</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REWARDS.map((reward) => (
                <button
                  key={reward.coins}
                  onClick={() => setSelectedReward(reward)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group",
                    selectedReward?.coins === reward.coins 
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                      : "border-slate-100 bg-white hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                      selectedReward?.coins === reward.coins ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400"
                    )}>
                      {method === 'upi' ? <QrCode className="w-6 h-6" /> : method === 'amazon' ? <ShoppingBag className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-display font-black text-slate-900">₹{reward.rupees} {method.toUpperCase()}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{reward.coins.toLocaleString()} Coins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {balance >= reward.coins ? (
                      <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                    ) : (
                      <p className="text-[10px] font-black text-red-500 uppercase">Need {reward.coins - balance}</p>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedReward && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {method === 'upi' ? 'UPI ID' : 'Email Address'}
                    </label>
                    <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Required</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {method === 'upi' ? <QrCode className="w-4 h-4" /> : method === 'amazon' ? <ShoppingBag className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </div>
                    <input 
                      type="text" 
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder={getPlaceholder()}
                      className="w-full bg-white border-slate-100 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-primary shadow-sm transition-all"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                    Withdrawals are processed within 24-48 hours. Please ensure your {method === 'upi' ? 'UPI ID' : 'Email'} is correct as we cannot reverse transactions.
                  </p>
                </div>

                <Button 
                  onClick={handleWithdraw} 
                  className="w-full py-5 text-lg font-display font-black uppercase tracking-widest shadow-xl shadow-primary/20" 
                  disabled={loading || balance < selectedReward.coins}
                  loading={loading}
                >
                  Redeem ₹{selectedReward.rupees}
                </Button>

                <p className="text-[9px] text-slate-400 text-center italic mt-4">
                  * Amazon and Google Play are trademarks of their respective owners. This app is not affiliated with or endorsed by them.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MethodCard({ active, onClick, icon: Icon, label, description }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all duration-300 group",
        active 
          ? "border-primary bg-primary/5 text-primary shadow-xl shadow-primary/10 scale-[1.02]" 
          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      {active && (
        <div className="absolute top-3 right-3">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
        active ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 text-slate-400"
      )}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="text-center">
        <span className="block text-xs font-black uppercase tracking-widest">{label}</span>
        <span className="block text-[9px] font-bold opacity-60 mt-0.5">{description}</span>
      </div>
    </button>
  );
}
