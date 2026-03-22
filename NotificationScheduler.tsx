import { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

export default function NotificationScheduler() {
  const { showNotification } = useNotification();

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const hour = now.getHours();
      const today = now.toDateString();
      
      const lastMorning = localStorage.getItem('last_morning_notif');
      const lastEvening = localStorage.getItem('last_evening_notif');

      // Morning: 8 AM to 11 AM
      if (hour >= 8 && hour < 11 && lastMorning !== today) {
        showNotification({
          message: "Aaj ka free spin check kiya? 🎡",
          type: 'info'
        });
        localStorage.setItem('last_morning_notif', today);
      }

      // Evening: 6 PM to 9 PM
      if (hour >= 18 && hour < 21 && lastEvening !== today) {
        showNotification({
          message: "Aapke 2000 Coins bas thodi door hain! 💸",
          type: 'info'
        });
        localStorage.setItem('last_evening_notif', today);
      }
    };

    // Check immediately on mount
    checkNotifications();

    // Check every 5 minutes
    const interval = setInterval(checkNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showNotification]);

  return null;
}
