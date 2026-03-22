import React, { useState, useEffect } from 'react';
import { Calculator, ArrowLeft, PlayCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { showInterstitialAd } from '../services/admobService';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function MathQuiz({ wallet, onBack, onWatchAd }: any) {
  const [gameData, setGameData] = useState<any>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const today = new Date().toDateString();
  const quizzesToday = wallet?.last_math_date === today ? (wallet?.daily_math || 0) : 0;
  const remainingQuizzes = Math.max(0, 5 - quizzesToday);

  const generateQuiz = () => {
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1, num2, answer;

    if (operator === '+') {
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
    } else if (operator === '-') {
      num1 = Math.floor(Math.random() * 50) + 20;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
    } else {
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
      answer = num1 * num2;
    }

    setGameData({
      question: `${num1} ${operator} ${num2}`,
      answer: answer.toString(),
    });
    
    setUserAnswer('');
    setShowHint(false);
    setIsGameActive(true);
  };

  const handleStart = () => {
    if (remainingQuizzes <= 0) {
      showNotification({ message: "Daily limit reached! Watch an ad for more.", type: 'info' });
      onWatchAd('math');
      return;
    }
    generateQuiz();
  };

  useEffect(() => {
    const handleAdReward = (e: any) => {
      if (e.detail.type === 'math') {
        generateQuiz();
      }
    };
    window.addEventListener('adReward', handleAdReward);
    return () => window.removeEventListener('adReward', handleAdReward);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isGameActive || !userAnswer) return;

    if (userAnswer.trim() === gameData.answer) {
      const reward = 10;
      try {
        const walletRef = doc(db, 'wallets', user!.uid);
        await updateDoc(walletRef, {
          balance: increment(reward),
          total_earned: increment(reward),
          daily_math: increment(1),
          last_math_date: today
        });
        
        const txId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'transactions', txId), {
          user_id: user!.uid,
          amount: reward,
          type: 'math_quiz',
          description: 'Math Quiz Reward',
          created_at: new Date().toISOString()
        });

        showNotification({ message: `Correct! You earned ${reward} coins!`, type: 'success' });
        showInterstitialAd();
        setIsGameActive(false);
      } catch (err) {
        console.error(err);
      }
    } else {
      showNotification({ message: "Wrong answer! Try again.", type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl bg-slate-100">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Math Quiz</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Solve and Earn</p>
        </div>
      </div>

      <Card className="p-8 text-center space-y-8 min-h-[500px] flex flex-col justify-center bg-gradient-to-b from-white to-indigo-50/30">
        {!isGameActive ? (
          <div className="space-y-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto shadow-xl shadow-indigo-100/50">
              <Calculator className="w-12 h-12" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-display font-black text-slate-900">Brain Challenge</h3>
              <p className="text-sm text-slate-500 font-medium px-4 leading-relaxed">
                Solve simple math problems to earn coins.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Limit:</span>
                <span className="text-sm font-black text-indigo-600 tracking-widest">{remainingQuizzes} / 5 Left</span>
              </div>
            </div>
            <Button 
              onClick={handleStart} 
              disabled={remainingQuizzes <= 0}
              className={cn(
                "w-full py-5 text-base font-black uppercase tracking-[0.2em] shadow-2xl",
                remainingQuizzes <= 0 ? "bg-slate-300" : "bg-indigo-600 shadow-indigo-200"
              )}
            >
              {remainingQuizzes <= 0 ? 'Limit Reached' : 'Start Quiz'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center justify-end">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Question
              </div>
            </div>

            <div className="text-6xl font-display font-black tracking-tighter py-8 text-slate-900">
              {gameData.question} = ?
            </div>

            <div className="space-y-4">
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter answer"
                autoFocus
                className="w-full text-center py-6 text-3xl font-display font-black bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 focus:ring-0 transition-all outline-none"
              />
              
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowHint(true)}
                  className="flex-1 py-4 border-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Get Hint
                </Button>
                <Button 
                  type="submit"
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Answer
                </Button>
              </div>

              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-50 border border-amber-100 rounded-2xl"
                  >
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Hint</p>
                    <p className="text-lg font-black text-amber-600">The answer is {gameData.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
