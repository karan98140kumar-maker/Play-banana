import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, Gift } from 'lucide-react';
import { Button } from '../components/UI';
import { cn } from '../lib/utils';

type NotificationType = 'success' | 'error' | 'info' | 'confirm';

interface NotificationOptions {
  message: string;
  type: NotificationType;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  showNotification: (options: NotificationOptions) => void;
  closeNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<NotificationOptions | null>(null);

  const showNotification = useCallback((options: NotificationOptions) => {
    setNotification(options);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification }}>
      {children}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeNotification}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-xs relative shadow-2xl text-center"
            >
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg",
                  notification.type === 'success' ? "bg-emerald-500 text-white shadow-emerald-200" :
                  notification.type === 'error' ? "bg-red-500 text-white shadow-red-200" :
                  "bg-primary text-white shadow-primary/20"
                )}
              >
                {notification.type === 'success' && <Trophy className="w-8 h-8" />}
                {notification.type === 'error' && <X className="w-8 h-8" />}
                {(notification.type === 'info' || notification.type === 'confirm') && <Gift className="w-8 h-8" />}
              </motion.div>
              <h3 className="font-black text-xl text-slate-900 mb-2">
                {notification.type === 'confirm' ? 'Confirm Action' : 
                 notification.type === 'success' ? 'Great Job!' : 
                 notification.type === 'error' ? 'Oops!' : 'Notification'}
              </h3>
              <p className="text-sm text-slate-500 font-medium mb-6">{notification.message}</p>
              
              <div className="flex flex-col gap-2">
                {notification.type === 'confirm' ? (
                  <>
                    <Button onClick={() => {
                      notification.onConfirm?.();
                      closeNotification();
                    }}>Confirm</Button>
                    <Button variant="secondary" onClick={() => {
                      notification.onCancel?.();
                      closeNotification();
                    }}>Cancel</Button>
                  </>
                ) : (
                  <Button onClick={closeNotification}>Close</Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
