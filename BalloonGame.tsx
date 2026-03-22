import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Trophy, PlayCircle, Timer, Sparkles } from 'lucide-react';
import { showInterstitialAd } from '../services/admobService';

interface Balloon {
  id: number;
  x: number;
  color: string;
  speed: number;
  value: number;
  size: number;
}

export default function BalloonGame({ onBack }: { onBack: () => void }) {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [loading, setLoading] = useState(false);
  const { user, wallet } = useAuth();
  const { showNotification } = useNotification();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const colors = [
    'from-red-400 to-red-600', 
    'from-blue-400 to-blue-600', 
    'from-green-400 to-green-600', 
    'from-yellow-400 to-yellow-600', 
    'from-purple-400 to-purple-600', 
    'from-pink-400 to-pink-600',
    'from-orange-400 to-orange-600', 
    'from-primary-light to-primary-dark', 
    'from-cyan-400 to-cyan-600', 
    'from-rose-400 to-rose-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600'
  ];

  const canPlay = () => {
    if (!wallet) return true;
    const today = new Date().toDateString();
    if (wallet.last_balloon_date === today) {
      return (wallet.daily_balloons || 0) < 10;
    }
    return true;
  };

  const spawnBalloon = useCallback(() => {
    if (gameState !== 'playing') return;

    const id = Date.now() + Math.random();
    // Target X position (where it will end up at the top)
    const x = Math.random() * 80 + 10; // 10% to 90% width
    const color = colors[Math.floor(Math.random() * colors.length)];
    const speed = Math.random() * 2 + 5; // 5 to 7 seconds (Slow Motion)
    const value = 0.5;
    const size = Math.random() * 20 + 65; // 65 to 85px

    setBalloons(prev => [...prev, { id, x, color, speed, value, size }]);

    setTimeout(() => {
      setBalloons(prev => prev.filter(b => b.id !== id));
    }, speed * 1000);
  }, [gameState]);

  const startGame = () => {
    if (!canPlay()) {
      showNotification({ message: "Daily limit reached! Come back tomorrow.", type: 'error' });
      return;
    }
    setScore(0);
    setTimeLeft(10);
    setGameState('playing');
    setBalloons([]);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      // Spawn 20 balloons in 10 seconds = one every 500ms (Max 10 coins)
      spawnIntervalRef.current = setInterval(spawnBalloon, 500);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('ended');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
        clearInterval(timer);
      };
    }
  }, [gameState, spawnBalloon]);

  const popBalloon = (id: number, value: number) => {
    setScore(prev => Number((prev + value).toFixed(1)));
    setBalloons(prev => prev.filter(b => b.id !== id));
  };

  const saveScore = async () => {
    if (!user || score <= 0) {
      onBack();
      return;
    }

    setLoading(true);
    try {
      const walletRef = doc(db, 'wallets', user.uid);
      const today = new Date().toDateString();
      
      const newDailyCount = wallet?.last_balloon_date === today 
        ? (wallet?.daily_balloons || 0) + 1 
        : 1;

      await updateDoc(walletRef, {
        balance: increment(score),
        total_earned: increment(score),
        daily_balloons: newDailyCount,
        last_balloon_date: today
      });

      const txId = Math.random().toString(36).substring(2, 15);
      await setDoc(doc(db, 'transactions', txId), {
        user_id: user.uid,
        amount: score,
        type: 'balloon',
        description: 'Balloon Pop Reward',
        created_at: new Date().toISOString()
      });

      showNotification({
        message: `Awesome! You earned ${score} coins!`,
        type: 'success'
      });
      showInterstitialAd();
      onBack();
    } catch (err) {
      console.error(err);
      showNotification({ message: "Failed to save reward", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const dailyPlayed = wallet?.last_balloon_date === new Date().toDateString() ? (wallet?.daily_balloons || 0) : 0;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Balloon Pop</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Daily Limit: {dailyPlayed}/10</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-primary/10 rounded-2xl flex items-center gap-2 border border-primary/10">
            <Timer className="w-5 h-5 text-primary" />
            <span className="font-black text-primary text-lg">{timeLeft}s</span>
          </div>
          <div className="px-4 py-2 bg-accent/10 rounded-2xl flex items-center gap-2 border border-accent/10">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-black text-accent text-lg">{score}</span>
          </div>
        </div>
      </div>

      <Card className="flex-1 relative overflow-hidden bg-gradient-to-b from-sky-50 to-white border-2 border-primary/10 min-h-[450px] rounded-[2.5rem]" ref={gameContainerRef}>
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10"
            >
              <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-primary/30">
                <PlayCircle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 mb-3">Ready to Pop?</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium max-w-[250px]">Pop as many as you can in 10 seconds! 0.5 coins per balloon.</p>
              <Button onClick={startGame} className="w-full max-w-xs py-5 text-base tracking-[0.2em]">Start Game</Button>
            </motion.div>
          )}

          {gameState === 'playing' && balloons.map((balloon) => (
            <motion.button
              key={balloon.id}
              initial={{ top: '100%', left: '50%', opacity: 0, scale: 0.5, x: '-50%' }}
              animate={{ top: '-20%', left: `${balloon.x}%`, opacity: 1, scale: 1 }}
              transition={{ duration: balloon.speed, ease: "linear" }}
              onClick={() => popBalloon(balloon.id, balloon.value)}
              className={`absolute rounded-full shadow-xl flex items-center justify-center text-white font-black text-xs cursor-pointer active:scale-90 transition-transform bg-gradient-to-br ${balloon.color}`}
              style={{ 
                width: balloon.size, 
                height: balloon.size * 1.2,
                borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
              }}
            >
              +{balloon.value}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-slate-300" />
            </motion.button>
          ))}

          {gameState === 'ended' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 bg-white/90 backdrop-blur-md"
            >
              <div className="w-24 h-24 bg-accent rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-accent/30">
                <Trophy className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-display font-black text-slate-900 mb-2">Time's Up!</h3>
              <p className="text-slate-500 mb-8 font-medium text-lg">You earned <span className="text-primary font-black">{score}</span> coins</p>
              <div className="space-y-4 w-full max-w-xs">
                <Button onClick={saveScore} loading={loading} className="w-full py-5 text-base tracking-[0.2em]">Claim Rewards</Button>
                <Button variant="ghost" onClick={startGame} className="w-full font-black uppercase tracking-widest">Try Again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative Clouds */}
        <div className="absolute top-10 left-10 opacity-20 pointer-events-none">
          <div className="w-16 h-8 bg-slate-400 rounded-full blur-xl" />
        </div>
        <div className="absolute top-40 right-10 opacity-20 pointer-events-none">
          <div className="w-20 h-10 bg-slate-400 rounded-full blur-xl" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">High Score</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Best: 120</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3" onClick={onBack}>
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">More Games</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Go Back</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
