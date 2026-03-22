import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, ShieldCheck, Coins } from 'lucide-react';
import { Button } from './UI';

export default function MockAd() {
  const [adData, setAdData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const handleShowAd = (e: any) => {
      setAdData(e.detail);
      setTimeLeft(e.detail.type === 'rewarded' ? 5 : 3);
      setCanClose(false);
    };

    window.addEventListener('showMockAd', handleShowAd);
    return () => window.removeEventListener('showMockAd', handleShowAd);
  }, []);

  useEffect(() => {
    if (!adData) return;

    if (timeLeft <= 0) {
      setCanClose(true);
      return;
    }

    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, adData]);

  const handleClose = () => {
    if (!canClose) return;
    
    if (adData.type === 'rewarded' && adData.onReward) {
      adData.onReward();
    }
    
    setAdData(null);
  };

  const handleDismiss = () => {
    if (adData.onDismiss) {
      adData.onDismiss();
    }
    setAdData(null);
  };

  return (
    <AnimatePresence>
      {adData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center"
        >
          {/* Ad Header */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Safe Ad Simulator</span>
            </div>
            
            {canClose ? (
              <button 
                onClick={handleClose}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-black text-sm">
                {timeLeft}
              </div>
            )}
          </div>

          {/* Ad Content */}
          <div className="space-y-8 max-w-xs w-full">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="aspect-square bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20"
            >
              <Play className="w-24 h-24 text-white fill-white" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-3xl font-display font-black tracking-tight">
                {adData.type === 'rewarded' ? 'Watch & Earn' : 'Sponsored Ad'}
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                This is a mock ad for testing purposes. In the real app, this would be a Google AdMob video.
              </p>
            </div>

            {adData.type === 'rewarded' && (
              <div className="flex items-center justify-center gap-3 py-4 bg-white/5 rounded-3xl border border-white/5">
                <div className="w-10 h-10 bg-amber-400/20 rounded-full flex items-center justify-center text-amber-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Reward</p>
                  <p className="text-xl font-black text-amber-400 tracking-tight">10 Coins</p>
                </div>
              </div>
            )}
          </div>

          {/* Ad Footer */}
          <div className="absolute bottom-10 left-6 right-6 space-y-4">
            {!canClose && (
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                Reward in {timeLeft} seconds
              </p>
            )}
            
            <Button
              onClick={canClose ? handleClose : handleDismiss}
              className={canClose ? "bg-emerald-600 w-full py-5 text-base font-black uppercase tracking-widest" : "bg-white/10 w-full py-5 text-base font-black uppercase tracking-widest text-white/50"}
            >
              {canClose ? 'Claim Reward' : 'Skip Ad'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
