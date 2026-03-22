import React, { useState, useEffect } from 'react';
import { Palette, ArrowLeft, PlayCircle, HelpCircle } from 'lucide-react';
import { showInterstitialAd } from '../services/admobService';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const COLORS = [
  { name: 'RED', value: '#EF4444', class: 'bg-red-500' },
  { name: 'BLUE', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'GREEN', value: '#22C55E', class: 'bg-green-500' },
  { name: 'YELLOW', value: '#EAB308', class: 'bg-yellow-500' },
  { name: 'PURPLE', value: '#A855F7', class: 'bg-purple-500' },
  { name: 'ORANGE', value: '#F97316', class: 'bg-orange-500' },
];

export default function ColorMatch({ wallet, onBack, onWatchAd }: any) {
  const [gameData, setGameData] = useState<any>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const today = new Date().toDateString();
  const gamesToday = wallet?.last_color_date === today ? (wallet?.daily_colors || 0) : 0;
  const remainingGames = Math.max(0, 5 - gamesToday);

  const generateGame = () => {
    const wordIdx = Math.floor(Math.random() * COLORS.length);
    const colorIdx = Math.floor(Math.random() * COLORS.length);
    
    // Ensure we have a mix of matching and non-matching for challenge
    const options = [...COLORS].sort(() => Math.random() - 0.5);
    
    setGameData({
      word: COLORS[wordIdx].name,
      color: COLORS[colorIdx].value,
      correctAnswer: COLORS[colorIdx].name,
      options
    });
    
    setShowHint(false);
    setIsGameActive(true);
  };

  const handleStart = () => {
    if (remainingGames <= 0) {
      onWatchAd('color');
      return;
    }

    // Require ad for every game to satisfy "No ad, no coin"
    onWatchAd('color');
  };

  // We need to listen for the 'adReward' event to actually start the game
  useEffect(() => {
    const handleAdReward = (e: any) => {
      if (e.detail.type === 'color') {
        generateGame();
      }
    };
    window.addEventListener('adReward', handleAdReward);
    return () => window.removeEventListener('adReward', handleAdReward);
  }, []);

  const handleAnswer = async (selectedName: string) => {
    if (!isGameActive) return;

    if (selectedName === gameData.correctAnswer) {
      const reward = 10;
      try {
        const walletRef = doc(db, 'wallets', user!.uid);
        await updateDoc(walletRef, {
          balance: increment(reward),
          total_earned: increment(reward),
          daily_colors: increment(1),
          last_color_date: today
        });
        
        const txId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'transactions', txId), {
          user_id: user!.uid,
          amount: reward,
          type: 'color_match',
          description: 'Color Match Reward',
          created_at: new Date().toISOString()
        });

        showNotification({ message: `Correct! You earned ${reward} coins!`, type: 'success' });
        showInterstitialAd();
        setIsGameActive(false);
      } catch (err) {
        console.error(err);
      }
    } else {
      showNotification({ message: "Wrong color! Try again next time.", type: 'error' });
      setIsGameActive(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl bg-slate-100">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Color Match</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Identify the Text Color</p>
        </div>
      </div>

      <Card className="p-10 text-center space-y-10 min-h-[500px] flex flex-col justify-center bg-gradient-to-b from-white to-pink-50/30">
        {!isGameActive ? (
          <div className="space-y-8">
            <div className="w-24 h-24 bg-pink-100 rounded-[2rem] flex items-center justify-center text-pink-600 mx-auto shadow-xl shadow-pink-100/50">
              <Palette className="w-12 h-12" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-display font-black text-slate-900">Color Challenge</h3>
              <p className="text-sm text-slate-500 font-medium px-4 leading-relaxed">
                Pick the button that matches the <span className="text-pink-600 font-black underline decoration-2 underline-offset-4">COLOR</span> of the word shown.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Limit:</span>
                <span className="text-sm font-black text-pink-600 tracking-widest">{remainingGames} / 5 Left</span>
              </div>
            </div>
            <Button 
              onClick={handleStart} 
              disabled={remainingGames <= 0}
              className={cn(
                "w-full py-5 text-base font-black uppercase tracking-[0.2em] shadow-2xl",
                remainingGames <= 0 ? "bg-slate-300" : "bg-pink-600 shadow-pink-200"
              )}
            >
              {remainingGames <= 0 ? 'Limit Reached' : 'Start Game'}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Identify Color
              </div>
            </div>

            <div 
              className="text-7xl font-display font-black tracking-tighter py-12 drop-shadow-sm"
              style={{ color: gameData.color }}
            >
              {gameData.word}
            </div>

            <div className="grid grid-cols-2 gap-5">
              {gameData.options.map((opt: any) => (
                <button
                  key={opt.name}
                  onClick={() => handleAnswer(opt.name)}
                  className={cn(
                    "py-5 rounded-[1.5rem] text-white font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl hover:brightness-110",
                    opt.class,
                    showHint && opt.name === gameData.correctAnswer && "ring-4 ring-yellow-400 ring-offset-4 animate-pulse"
                  )}
                >
                  {opt.name}
                </button>
              ))}
            </div>

            <div className="pt-4">
              <Button 
                variant="outline"
                onClick={() => setShowHint(true)}
                disabled={showHint}
                className="w-full py-4 border-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                {showHint ? 'Hint Active' : 'Get Hint'}
              </Button>
              <AnimatePresence>
                {showHint && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-[10px] font-black text-amber-600 uppercase tracking-widest"
                  >
                    The correct color is highlighted!
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
