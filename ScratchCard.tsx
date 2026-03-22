import React, { useState } from 'react';
import { Layers, Sparkles, PlayCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function ScratchCard({ wallet, onWatchAd }: any) {
  const [isScratched, setIsScratched] = useState(false);
  const [currentReward, setCurrentReward] = useState<number | null>(null);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const today = new Date().toDateString();
  const scratchesToday = wallet?.last_scratch_date === today ? (wallet?.daily_scratches || 0) : 0;
  const remainingScratches = Math.max(0, 5 - scratchesToday);

  const handleScratch = async () => {
    if (isScratched || !user) return;
    
    if (remainingScratches <= 0) {
      onWatchAd('scratch');
      return;
    }

    // Require ad for every scratch to satisfy "No ad, no coin"
    onWatchAd('scratch');
  };

  // We need to listen for the 'adReward' event to actually start the scratch
  React.useEffect(() => {
    const handleAdReward = (e: any) => {
      if (e.detail.type === 'scratch') {
        startScratchLogic();
      }
    };
    window.addEventListener('adReward', handleAdReward);
    return () => window.removeEventListener('adReward', handleAdReward);
  }, [remainingScratches, isScratched]);

  const startScratchLogic = async () => {
    if (isScratched) return;

    const rewards = [2, 5, 8, 10, 12, 15, 18, 20];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    setCurrentReward(reward);
    setIsScratched(true);
    
    try {
      const walletRef = doc(db, 'wallets', user!.uid);
      await updateDoc(walletRef, {
        balance: increment(reward),
        total_earned: increment(reward),
        daily_scratches: increment(1),
        last_scratch_date: today
      });
      
      const txId = Math.random().toString(36).substring(2, 15);
      await setDoc(doc(db, 'transactions', txId), {
        user_id: user!.uid,
        amount: reward,
        type: 'scratch',
        description: 'Scratch Card Reward',
        created_at: new Date().toISOString()
      });

      showNotification({
        message: reward > 0 ? `You found ${reward} coins!` : "Better luck next time!",
        type: reward > 0 ? 'success' : 'info'
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Scratch & Win</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Watch Ad to Unlock Card</p>
      </div>

      <Card className="p-10 flex flex-col items-center justify-center gap-10 aspect-square relative overflow-hidden group bg-slate-50">
        <div className="absolute inset-0 flex items-center justify-center">
          {isScratched ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-28 h-28 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trophy className="w-14 h-14 text-accent" />
              </div>
              <h3 className="text-5xl font-display font-black text-slate-900 mb-2">{currentReward}</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Coins Won</p>
              <Button 
                className="mt-10 font-black uppercase tracking-[0.2em] py-4 px-10"
                onClick={() => {
                  setIsScratched(false);
                  setCurrentReward(null);
                }}
              >
                Next Card
              </Button>
            </motion.div>
          ) : (
            <div className="text-center opacity-10">
              <Layers className="w-40 h-40 text-slate-400" />
            </div>
          )}
        </div>
        
        <AnimatePresence>
          {!isScratched && (
            <motion.div
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark z-10 flex flex-col items-center justify-center text-white p-8 text-center shadow-2xl"
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="grid grid-cols-4 gap-4 p-4">
                  {[...Array(16)].map((_, i) => (
                    <Sparkles key={i} className="w-10 h-10" />
                  ))}
                </div>
              </div>
              
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm border border-white/30">
                <Sparkles className="w-12 h-12 text-white animate-pulse" />
              </div>
              
              <h3 className="text-3xl font-display font-black mb-3 tracking-tight">SCRATCH ME!</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-10">
                {remainingScratches <= 0 ? 'Limit Reached' : 'Tap to Reveal'}
              </p>
              
              <Button 
                variant="secondary" 
                disabled={remainingScratches <= 0}
                className={cn(
                  "bg-white text-primary font-black uppercase tracking-[0.2em] px-10 py-5 shadow-2xl",
                  remainingScratches <= 0 && "opacity-50"
                )}
                onClick={handleScratch}
              >
                {remainingScratches <= 0 ? 'Limit Reached' : 'Scratch Now'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="w-full space-y-5">
        <div className="flex justify-between items-center px-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Limit</p>
          <p className="text-sm font-black text-primary tracking-widest">{remainingScratches} / 5 Cards Left</p>
        </div>
      </div>
    </div>
  );
}
