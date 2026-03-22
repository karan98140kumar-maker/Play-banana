import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface AppConfig {
  app_icon?: string;
  referral_bonus_referrer?: number;
  referral_bonus_new_user?: number;
}

interface AppContextType {
  config: AppConfig | null;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/2909/2909761.png";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configRef = doc(db, 'settings', 'app_config');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        setConfig(data);
        
        // Update favicon
        if (data.app_icon) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = data.app_icon;
          }
        }
      } else {
        setConfig({ app_icon: DEFAULT_ICON });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching app config:', error);
      setConfig({ app_icon: DEFAULT_ICON });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ config, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
