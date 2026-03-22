import React, { useState } from 'react';
import { RotateCw, Sparkles, PlayCircle, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const REWARDS = [2, 5, 8, 10, 12, 15, 18, 20];

export default function SpinWheel({ wallet, onWatchAd }: any) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const today = new Date().toDateString();
  const spinsToday = wallet?.last_spin_date === today ? (wallet?.daily_spins || 0) : 0;
  const remainingSpins = Math.max(0, 10 - spinsToday);

  const handleSpin = async () => {
    if (isSpinning || !user) return;
    
    if (remainingSpins <= 0) {
      onWatchAd('spin');
      return;
    }

    // Require ad for every spin to satisfy "No ad, no coin"
    onWatchAd('spin');
  };

  // We need to listen for the 'adReward' event to actually start the spin
  React.useEffect(() => {
    const handleAdReward = (e: any) => {
      if (e.detail.type === 'spin') {
        startSpinLogic();
      }
    };
    window.addEventListener('adReward', handleAdReward);
    return () => window.removeEventListener('adReward', handleAdReward);
  }, [remainingSpins, isSpinning]);

  const startSpinLogic = async () => {
    if (isSpinning) return;

    const rewardIdx = Math.floor(Math.random() * REWARDS.length);
    const reward = REWARDS[rewardIdx];
    
    const extraRotation = 360 - (rewardIdx * 45 + 22.5);
    const newRotation = rotation + (360 * 5) + extraRotation;
    
    setIsSpinning(true);
    setRotation(newRotation);

    setTimeout(async () => {
      try {
        const walletRef = doc(db, 'wallets', user!.uid);
        await updateDoc(walletRef, {
          balance: increment(reward),
          total_earned: increment(reward),
          daily_spins: increment(1),
          last_spin_date: today
        });
        
        const txId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'transactions', txId), {
          user_id: user!.uid,
          amount: reward,
          type: 'spin',
          description: 'Lucky Spin Reward',
          created_at: new Date().toISOString()
        });

        showNotification({
          message: reward > 0 ? `Congratulations! You won ${reward} coins!` : "Better luck next time!",
          type: reward > 0 ? 'success' : 'info'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSpinning(false);
      }
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Lucky Spin</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">WIN UP TO 20 COINS</p>
      </div>

      <Card className="p-10 flex flex-col items-center justify-center gap-10 bg-gradient-to-b from-white to-primary/5">
        <div className="relative group">
          {/* Decorative Outer Ring with Pegs */}
          <div className="absolute -inset-6 rounded-full border-2 border-primary/10 pointer-events-none">
            {[...Array(24)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-2 h-2 bg-primary/20 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 15}deg) translateY(-150px) translateX(-50%)`
                }}
              />
            ))}
          </div>

          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 3, ease: [0.45, 0.05, 0.55, 0.95] }}
            className="w-72 h-72 rounded-full border-[12px] border-primary relative flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.3)] bg-white overflow-hidden"
          >
            {/* Wheel Segments */}
            {REWARDS.map((reward, i) => (
              <div 
                key={i}
                className="absolute inset-0 origin-center"
                style={{ 
                  transform: `rotate(${i * 45}deg)`,
                  clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)'
                }}
              >
                <motion.div 
                  animate={!isSpinning ? { 
                    backgroundColor: i % 2 === 0 ? ["#4f46e5", "#6366f1", "#4f46e5"] : ["#4338ca", "#4f46e5", "#4338ca"]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  className={cn("w-full h-full relative", i % 2 === 0 ? "bg-primary" : "bg-primary-dark")}
                >
                  <div 
                    className="absolute inset-0 flex items-start justify-center"
                    style={{ transform: 'rotate(22.5deg)' }}
                  >
                    <motion.span 
                      animate={!isSpinning ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                      className="mt-10 text-white font-black text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                    >
                      {reward}
                    </motion.span>
                  </div>
                </motion.div>
              </div>
            ))}
            
            <div className="absolute inset-0 rounded-full border-4 border-white/20 pointer-events-none" />
            <div className="z-10 bg-white p-5 rounded-full shadow-2xl border-4 border-primary/5">
              <RotateCw className={cn("w-12 h-12 text-primary", isSpinning && "animate-spin")} />
            </div>
          </motion.div>
          
          {/* Enhanced Pointer */}
          <motion.div 
            animate={isSpinning ? { 
              rotate: [0, -15, 10, -15, 10, 0],
              y: [0, -2, 0]
            } : {}}
            transition={{ duration: 0.2, repeat: isSpinning ? 15 : 0 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="relative">
              {/* Pointer Body */}
              <div className="w-10 h-12 bg-gradient-to-b from-accent to-amber-600 clip-path-pointer shadow-lg" 
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}
              />
              {/* Pointer Glow */}
              <div className="absolute -inset-3 bg-accent/30 blur-md rounded-full -z-10" />
              {/* Pointer Pin */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </motion.div>
        </div>

        <div className="w-full space-y-5">
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Limit</p>
            <p className="text-sm font-black text-primary tracking-widest">{remainingSpins} / 10 Spins Left</p>
          </div>
          
          <Button 
            onClick={handleSpin} 
            disabled={isSpinning || remainingSpins <= 0}
            className={cn(
              "w-full py-5 text-base font-black uppercase tracking-[0.2em] shadow-xl",
              remainingSpins <= 0 ? "bg-slate-300" : "bg-primary shadow-primary/30"
            )}
          >
            {isSpinning ? 'Spinning...' : remainingSpins <= 0 ? 'Limit Reached' : 'Spin Now'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
