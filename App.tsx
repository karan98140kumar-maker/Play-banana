import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NotificationScheduler from './components/NotificationScheduler';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import MockAd from './components/MockAd';
import { initializeAdMob } from './services/admobService';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { loading: appLoading } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initializeAdMob()
      .then(() => console.log('AdMob Initialized Successfully'))
      .catch(err => console.error('AdMob Init Error:', err));
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => {
      setShowSplash(false);
    }} />;
  }

  if (authLoading || appLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" 
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="antialiased text-slate-900">
        <MockAd />
        <NotificationScheduler />
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Auth />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
