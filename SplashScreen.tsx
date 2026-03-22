import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp } from 'lucide-react';
import { useApp, DEFAULT_ICON } from '../context/AppContext';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { config } = useApp();
  const appIcon = config?.app_icon || DEFAULT_ICON;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for exit animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6"
        >
          <div className="relative">
            {/* Background Glow */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-primary blur-3xl rounded-full"
            />

            {/* Logo Container */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 overflow-hidden p-1"
              >
                <img 
                  src={appIcon} 
                  alt="Play Banana" 
                  className="w-full h-full object-contain p-4"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-5xl font-display font-black text-slate-900 tracking-tighter mb-2"
              >
                Play Banana
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]"
              >
                Play • Earn • Redeem
              </motion.p>
            </motion.div>
          </div>

          {/* Loading Bar */}
          <div className="absolute bottom-20 w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 text-[10px] font-black text-slate-300 uppercase tracking-widest"
          >
            Powered by Play Banana
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
