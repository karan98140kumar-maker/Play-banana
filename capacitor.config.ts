import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.playbanana.rewards.app',
  appName: 'Play Banana',
  webDir: 'dist',
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-3940256099942544~3347511713', // Test App ID
    },
  },
};

export default config;
